import type { ID, PriceContext } from './resolvePrice'

type Rel<T = object> = ID | ({ id: ID } & Partial<T>) | null | undefined

const idOf = (value: Rel<unknown>): ID | null =>
  value == null ? null : typeof value === 'object' ? value.id : value

export interface BuyerLike {
  id: ID
  isActive?: boolean | null
  group?: Rel
  priceType?: Rel
  /** Контрагент партнёра — у него берутся сеть и прайс, если у партнёра не заданы. */
  parent?: Rel<BuyerLike>
}

export interface CustomerLike {
  id: ID
  status?: string | null
  segment?: string | null
  buyers?: readonly Rel<unknown>[] | null
}

export interface SettingsLike {
  guestPriceType?: Rel
  segments?: Record<string, { defaultPriceType?: Rel } | null | undefined> | null
}

/**
 * По каким правилам считать цены для того, кто смотрит каталог.
 *
 * - Гость, клиент «на проверке» или заблокированный — гостевой прайс.
 * - Физлицо — прайс по умолчанию для своего типа (розничный).
 * - Клиент-юрлицо заказывает от имени выбранного покупателя (партнёра или контрагента):
 *   прайс и сеть — партнёра, а если не заданы — его контрагента;
 *   индивидуальные цены — сначала партнёра, потом контрагента.
 *   Покупатель должен быть привязан к клиенту, иначе — как гость.
 */
export function buildPriceContext(
  customer: CustomerLike | null | undefined,
  buyer: BuyerLike | null | undefined,
  settings: SettingsLike,
  date: Date = new Date(),
): PriceContext {
  const guest: PriceContext = { date, guestPriceTypeId: idOf(settings.guestPriceType) }
  if (!customer || customer.status !== 'active') return guest

  const segmentDefault = customer.segment ? idOf(settings.segments?.[customer.segment]?.defaultPriceType) : null

  if (!buyer) return { ...guest, priceTypeId: segmentDefault }

  const linked = (customer.buyers ?? []).some((b) => String(idOf(b)) === String(buyer.id))
  if (!linked || buyer.isActive === false) return guest

  const parent = buyer.parent && typeof buyer.parent === 'object' ? buyer.parent : null
  const parentId = idOf(buyer.parent)

  return {
    ...guest,
    buyerIds: parentId != null ? [buyer.id, parentId] : [buyer.id],
    groupId: idOf(buyer.group) ?? idOf(parent?.group),
    priceTypeId: idOf(buyer.priceType) ?? idOf(parent?.priceType) ?? segmentDefault,
  }
}
