import type { Payload } from 'payload'

import { buildPriceContext, type BuyerLike, type CustomerLike } from './priceContext'
import { type Agreement, moscowDay, resolvePrice, type ResolvedPrice } from './resolvePrice'

type Rel = number | { id: number } | null | undefined
const idOf = (v: Rel) => (v == null ? null : typeof v === 'object' ? v.id : v)

const DAY = 24 * 60 * 60 * 1000

/**
 * Цены для списка товаров глазами конкретного посетителя.
 * Единственное место, где сервер читает закрытые прайсы, — наружу уходит только итог.
 *
 * @param customer  вошедший клиент или null для гостя
 * @param buyerId   юрлицо, от имени которого клиент смотрит каталог (для физлица — null)
 * @param date      дата доставки, на которую считаются цены
 */
export async function getPrices(
  payload: Payload,
  opts: { customer: CustomerLike | null; buyerId?: number | null; productIds: number[]; date?: Date },
): Promise<Map<number, ResolvedPrice | null>> {
  const date = opts.date ?? new Date()
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })

  let buyer: BuyerLike | null = null
  if (opts.customer && opts.buyerId) {
    const doc = await payload
      .findByID({ collection: 'buyers', id: opts.buyerId, depth: 1, overrideAccess: true })
      .catch(() => null)
    if (doc) {
      const parent = doc.parent && typeof doc.parent === 'object' ? doc.parent : null
      buyer = {
        id: doc.id,
        isActive: doc.isActive,
        group: idOf(doc.group as Rel),
        priceType: idOf(doc.priceType as Rel),
        parent: parent
          ? { id: parent.id, group: idOf(parent.group as Rel), priceType: idOf(parent.priceType as Rel) }
          : idOf(doc.parent as Rel),
      }
    }
  }

  const ctx = buildPriceContext(opts.customer, buyer, settings as never, date)

  const products = await payload.find({
    collection: 'products',
    where: { id: { in: opts.productIds } },
    limit: opts.productIds.length || 1,
    depth: 0,
    overrideAccess: true,
    select: { prices: true },
  })

  // Торги сети и инд. цены покупателя, которые могут действовать на эту дату (±1 день на часовой пояс).
  const agreements: Agreement[] = []
  const targets = [
    ...(ctx.groupId != null ? [{ and: [{ kind: { equals: 'tender' } }, { group: { equals: ctx.groupId } }] }] : []),
    ...(ctx.buyerIds?.length ? [{ and: [{ kind: { equals: 'individual' } }, { buyer: { in: ctx.buyerIds } }] }] : []),
  ]
  if (targets.length) {
    const found = await payload.find({
      collection: 'price-agreements',
      where: {
        and: [
          { or: targets },
          { validFrom: { less_than_equal: new Date(date.getTime() + DAY).toISOString() } },
          { validTo: { greater_than_equal: new Date(date.getTime() - DAY).toISOString() } },
        ],
      } as never,
      limit: 200,
      depth: 0,
      overrideAccess: true,
    })
    for (const a of found.docs) {
      agreements.push({
        id: a.id,
        kind: a.kind,
        groupId: idOf(a.group as Rel),
        buyerId: idOf(a.buyer as Rel),
        validFrom: moscowDay(a.validFrom),
        validTo: moscowDay(a.validTo),
        prices: new Map((a.items ?? []).map((it) => [String(idOf(it.product as Rel)), it.price])),
      })
    }
  }

  const out = new Map<number, ResolvedPrice | null>()
  for (const p of products.docs) {
    const base = (p.prices ?? []).map((row) => ({ priceTypeId: idOf(row.priceType as Rel) as number, value: row.value }))
    out.set(p.id, resolvePrice(p.id, base, ctx, agreements))
  }
  return out
}
