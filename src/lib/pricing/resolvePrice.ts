/**
 * Расчёт цены товара для клиента.
 *
 * Порядок (первое совпадение выигрывает):
 *   1. Индивидуальная цена покупателя (партнёра или его контрагента) на товар, действующая на дату.
 *   2. Цена торгов для сети клиента, действующая на дату.
 *   3. Цена по прайсу клиента (Прайс 2, 3, 4…).
 *   4. Цена по гостевому прайсу (клиент без прайса или не вошёл).
 * Если подходит несколько документов одного уровня — берётся начавшийся позже всех.
 */

export type ID = string | number

export type PriceSource = 'individual' | 'tender' | 'price-type' | 'guest'

export interface BasePrice {
  priceTypeId: ID
  value: number
}

export interface Agreement {
  id: ID
  kind: 'individual' | 'tender'
  /** Покупатель (партнёр или контрагент), для которого заведены индивидуальные цены. */
  buyerId?: ID | null
  groupId?: ID | null
  /** Начало действия (ISO-дата или дата-время). */
  validFrom: string
  /** Окончание действия включительно (ISO-дата или дата-время). */
  validTo: string
  /** Цены по товарам: id товара → цена. */
  prices: ReadonlyMap<string, number>
}

export interface PriceContext {
  /**
   * Покупатель и его контрагент: [партнёр, контрагент].
   * Индивидуальные цены партнёра важнее цен его контрагента.
   */
  buyerIds?: readonly ID[]
  groupId?: ID | null
  priceTypeId?: ID | null
  guestPriceTypeId?: ID | null
  /** Дата, на которую считаем цену (обычно — дата доставки). */
  date: Date
}

export interface ResolvedPrice {
  price: number
  source: PriceSource
  priceTypeId?: ID
  agreementId?: ID
  /** До какого дня включительно действует цена (для торгов и инд. цен). */
  validTo?: string
}

const TZ = 'Europe/Moscow'
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Календарный день по Москве в виде YYYY-MM-DD. */
export const moscowDay = (value: Date | string): string => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return dayFormatter.format(typeof value === 'string' ? new Date(value) : value)
}

const sameId = (a: ID | null | undefined, b: ID | null | undefined): boolean =>
  a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b)

const isActiveOn = (agreement: Agreement, day: string): boolean =>
  moscowDay(agreement.validFrom) <= day && day <= moscowDay(agreement.validTo)

const pickLatest = (
  agreements: readonly Agreement[],
  productId: string,
): { agreement: Agreement; price: number } | null => {
  let best: { agreement: Agreement; price: number } | null = null
  for (const agreement of agreements) {
    const price = agreement.prices.get(productId)
    if (price === undefined) continue
    if (!best || moscowDay(agreement.validFrom) > moscowDay(best.agreement.validFrom)) {
      best = { agreement, price }
    }
  }
  return best
}

export function resolvePrice(
  productId: ID,
  basePrices: readonly BasePrice[],
  ctx: PriceContext,
  agreements: readonly Agreement[] = [],
): ResolvedPrice | null {
  const day = moscowDay(ctx.date)
  const pid = String(productId)
  const active = agreements.filter((a) => isActiveOn(a, day))

  for (const buyerId of ctx.buyerIds ?? []) {
    const individual = pickLatest(
      active.filter((a) => a.kind === 'individual' && sameId(a.buyerId, buyerId)),
      pid,
    )
    if (individual) {
      return {
        price: individual.price,
        source: 'individual',
        agreementId: individual.agreement.id,
        validTo: moscowDay(individual.agreement.validTo),
      }
    }
  }

  if (ctx.groupId != null) {
    const tender = pickLatest(
      active.filter((a) => a.kind === 'tender' && sameId(a.groupId, ctx.groupId)),
      pid,
    )
    if (tender) {
      return {
        price: tender.price,
        source: 'tender',
        agreementId: tender.agreement.id,
        validTo: moscowDay(tender.agreement.validTo),
      }
    }
  }

  const byType = (typeId: ID | null | undefined) =>
    typeId == null ? undefined : basePrices.find((p) => sameId(p.priceTypeId, typeId))

  const own = byType(ctx.priceTypeId)
  if (own) return { price: own.value, source: 'price-type', priceTypeId: own.priceTypeId }

  const guest = byType(ctx.guestPriceTypeId)
  if (guest) return { price: guest.value, source: 'guest', priceTypeId: guest.priceTypeId }

  return null
}
