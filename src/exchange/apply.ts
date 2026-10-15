import type { CollectionSlug, Payload, PayloadRequest, Where } from 'payload'

import { slugify } from '../fields/common'
import type {
  AgreementRec,
  BuyerGroupRec,
  BuyerRec,
  GroupRec,
  ImportBatch,
  ImportResult,
  PriceRec,
  PriceTypeRef,
  ProductRec,
  ProductRef,
  StockRec,
} from './types'

type Doc = { id: number; [k: string]: unknown }

/** Дата YYYY-MM-DD → полдень по UTC, чтобы календарный день не съезжал при смене часового пояса. */
export const dayToISO = (day: string): string => `${day}T12:00:00.000Z`

/**
 * Применяет пачку данных обмена к базе сайта.
 * Порядок важен: справочники раньше тех, кто на них ссылается.
 * Ошибка одной записи не останавливает остальные.
 */
export async function applyBatch(payload: Payload, batch: ImportBatch, req?: PayloadRequest): Promise<ImportResult> {
  const result: ImportResult = { stats: {}, errors: [] }
  const ctx = new Ctx(payload, req)

  const run = async <T>(entity: keyof ImportBatch, items: T[] | undefined, fn: (item: T) => Promise<'created' | 'updated'>, refOf: (item: T) => string) => {
    if (!items?.length) return
    const stats = { received: items.length, created: 0, updated: 0 }
    result.stats[entity] = stats
    for (const item of items) {
      try {
        stats[await fn(item)]++
      } catch (e) {
        result.errors.push({ entity, ref: refOf(item), message: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  // Группы: родитель может прийти позже ребёнка — сначала создаём все, потом проставляем родителей.
  await run('groups', batch.groups, (g) => ctx.upsertGroup(g), (g) => g.guid)
  for (const g of batch.groups ?? []) {
    if (g.parentGuid) await ctx.linkGroupParent(g).catch(() => undefined)
  }
  await run('priceTypes', batch.priceTypes, (t) => ctx.upsertPriceType(t), (t) => t.guid || t.name)
  await run('products', batch.products, (p) => ctx.upsertProduct(p), (p) => p.sku || p.guid || p.name)
  await run('prices', groupPrices(batch.prices), (p) => ctx.applyPrices(p), (p) => p.product.sku || p.product.guid || '?')
  await run('stock', batch.stock, (s) => ctx.applyStock(s), (s) => s.product.sku || s.product.guid || '?')
  await run('buyerGroups', batch.buyerGroups, (g) => ctx.upsertBuyerGroup(g), (g) => g.guid)
  // Контрагенты раньше партнёров: партнёр ссылается на контрагента.
  const buyers = [...(batch.buyers ?? [])].sort((a, b) => Number(a.kind === 'partner') - Number(b.kind === 'partner'))
  await run('buyers', buyers, (b) => ctx.upsertBuyer(b), (b) => b.guid)
  await run('agreements', batch.agreements, (a) => ctx.upsertAgreement(a), (a) => a.guid)

  return result
}

/** Все цены одного товара — одной записью, чтобы обновить массив цен за один раз. */
type ProductPrices = { product: ProductRef; items: { priceType: PriceTypeRef; value: number }[] }
function groupPrices(prices: PriceRec[] | undefined): ProductPrices[] | undefined {
  if (!prices) return undefined
  const map = new Map<string, ProductPrices>()
  for (const p of prices) {
    const key = `${p.product.guid ?? ''}|${p.product.sku ?? ''}`
    const entry = map.get(key) ?? { product: p.product, items: [] }
    entry.items.push({ priceType: p.priceType, value: p.value })
    map.set(key, entry)
  }
  return [...map.values()]
}

class Ctx {
  private cache = new Map<string, number | null>()

  constructor(
    private payload: Payload,
    private req?: PayloadRequest,
  ) {}

  private async findOne(collection: CollectionSlug, where: Where): Promise<Doc | null> {
    const res = await this.payload.find({ collection, where, limit: 1, depth: 0, overrideAccess: true, req: this.req })
    return (res.docs[0] as unknown as Doc) ?? null
  }

  private async save(collection: CollectionSlug, existing: Doc | null, data: Record<string, unknown>) {
    if (existing) {
      await this.payload.update({ collection, id: existing.id, data: data as never, overrideAccess: true, depth: 0, req: this.req })
      return { id: existing.id, op: 'updated' as const }
    }
    const doc = (await this.payload.create({ collection, data: data as never, overrideAccess: true, depth: 0, req: this.req })) as unknown as Doc
    return { id: doc.id, op: 'created' as const }
  }

  private async idByGuid(collection: CollectionSlug, guid: string | null | undefined): Promise<number | null> {
    if (!guid) return null
    const key = `${collection}:${guid}`
    if (!this.cache.has(key)) {
      const doc = await this.findOne(collection, { guid1C: { equals: guid } })
      this.cache.set(key, doc?.id ?? null)
    }
    return this.cache.get(key) ?? null
  }

  private async requireByGuid(collection: CollectionSlug, guid: string, what: string): Promise<number> {
    const id = await this.idByGuid(collection, guid)
    if (id == null) throw new Error(`${what} с кодом «${guid}» не найден(а)`)
    return id
  }

  /** Свободный slug: если занят другим документом — добавляем суффикс. */
  private async freeSlug(collection: CollectionSlug, base: string, selfId?: number): Promise<string> {
    const root = slugify(base) || 'item'
    for (let i = 0; i < 50; i++) {
      const slug = i === 0 ? root : `${root}-${i + 1}`
      const doc = await this.findOne(collection, { slug: { equals: slug } })
      if (!doc || doc.id === selfId) return slug
    }
    return `${root}-${Date.now()}`
  }

  async upsertGroup(g: GroupRec) {
    const existing = await this.findOne('categories', { guid1C: { equals: g.guid } })
    const data: Record<string, unknown> = {
      title: g.name,
      guid1C: g.guid,
      isVisible: g.isActive !== false,
    }
    if (g.sort != null) data.sort = g.sort
    if (!existing) data.slug = await this.freeSlug('categories', g.name)
    const { id, op } = await this.save('categories', existing, data)
    this.cache.set(`categories:${g.guid}`, id)
    return op
  }

  async linkGroupParent(g: GroupRec) {
    const id = await this.requireByGuid('categories', g.guid, 'Категория')
    const parent = await this.requireByGuid('categories', g.parentGuid as string, 'Родительская категория')
    await this.payload.update({ collection: 'categories', id, data: { parent }, overrideAccess: true, req: this.req })
  }

  async priceTypeId(ref: PriceTypeRef | null | undefined, createIfMissing = false): Promise<number | null> {
    if (!ref) return null
    const byGuid = await this.idByGuid('price-types', ref.guid)
    if (byGuid != null) return byGuid
    if (!ref.name) return null
    const key = `price-types:name:${ref.name}`
    if (!this.cache.has(key)) {
      const doc = await this.findOne('price-types', { title: { equals: ref.name } })
      this.cache.set(key, doc?.id ?? null)
    }
    let id = this.cache.get(key) ?? null
    if (id == null && createIfMissing) {
      id = (await this.save('price-types', null, { title: ref.name, guid1C: ref.guid || undefined })).id
      this.cache.set(key, id)
    }
    return id
  }

  async upsertPriceType(t: { guid?: string | null; name: string }) {
    const existing =
      (t.guid ? await this.findOne('price-types', { guid1C: { equals: t.guid } }) : null) ??
      (await this.findOne('price-types', { title: { equals: t.name } }))
    const data: Record<string, unknown> = { title: t.name }
    if (t.guid) data.guid1C = t.guid
    const { id, op } = await this.save('price-types', existing, data)
    this.cache.set(`price-types:name:${t.name}`, id)
    if (t.guid) this.cache.set(`price-types:${t.guid}`, id)
    return op
  }

  async findProduct(ref: ProductRef): Promise<Doc | null> {
    if (ref.guid) {
      const doc = await this.findOne('products', { guid1C: { equals: ref.guid } })
      if (doc) return doc
    }
    if (ref.sku) return this.findOne('products', { sku: { equals: ref.sku } })
    return null
  }

  private async productId(ref: ProductRef): Promise<number> {
    const key = `products:${ref.guid ?? ''}|${ref.sku ?? ''}`
    if (!this.cache.has(key)) this.cache.set(key, (await this.findProduct(ref))?.id ?? null)
    const id = this.cache.get(key)
    if (id == null) throw new Error(`Товар ${ref.sku ? `с артикулом «${ref.sku}»` : `с кодом «${ref.guid}»`} не найден`)
    return id
  }

  async upsertProduct(p: ProductRec) {
    if (!p.sku) throw new Error('Не указан артикул')
    const category = await this.requireByGuid('categories', p.groupGuid, 'Категория')
    const existing = await this.findProduct({ guid: p.guid, sku: p.sku })
    const data: Record<string, unknown> = {
      title: p.name,
      sku: p.sku,
      category,
      unit: p.unit,
      isActive: p.isActive !== false,
    }
    const optional: (keyof ProductRec)[] = ['minQty', 'step', 'weight', 'packQty', 'country', 'brand', 'storage', 'isHalal', 'isVet', 'isMarked', 'stock']
    for (const k of optional) if (p[k] != null) data[k] = p[k]
    if (p.nextDelivery) data.nextDelivery = dayToISO(p.nextDelivery)
    if (p.guid) data.guid1C = p.guid
    if (!existing) data.slug = await this.freeSlug('products', `${p.name} ${p.sku}`)
    const { id, op } = await this.save('products', existing, data)
    this.cache.set(`products:${p.guid ?? ''}|${p.sku}`, id)
    return op
  }

  async applyPrices(entry: ProductPrices) {
    const id = await this.productId(entry.product)
    const current = (await this.payload.findByID({ collection: 'products', id, depth: 0, overrideAccess: true, req: this.req })) as unknown as {
      prices?: { priceType: number; value: number }[] | null
    }
    const byType = new Map<number, number>((current.prices ?? []).map((p) => [Number(p.priceType), p.value]))
    for (const item of entry.items) {
      if (!Number.isFinite(item.value) || item.value < 0) throw new Error(`Неверная цена «${item.value}»`)
      const typeId = await this.priceTypeId(item.priceType, true)
      if (typeId == null) throw new Error(`Прайс «${item.priceType.name ?? item.priceType.guid}» не найден`)
      byType.set(typeId, Math.round(item.value * 100) / 100)
    }
    await this.payload.update({
      collection: 'products',
      id,
      data: { prices: [...byType].map(([priceType, value]) => ({ priceType, value })) },
      overrideAccess: true,
      req: this.req,
    })
    return 'updated' as const
  }

  async applyStock(s: StockRec) {
    const id = await this.productId(s.product)
    const data: Record<string, unknown> = { stock: s.qty }
    if (s.nextDelivery !== undefined) data.nextDelivery = s.nextDelivery ? dayToISO(s.nextDelivery) : null
    await this.payload.update({ collection: 'products', id, data, overrideAccess: true, req: this.req })
    return 'updated' as const
  }

  async upsertBuyerGroup(g: BuyerGroupRec) {
    const existing = await this.findOne('customer-groups', { guid1C: { equals: g.guid } })
    const { id, op } = await this.save('customer-groups', existing, { title: g.name, guid1C: g.guid })
    this.cache.set(`customer-groups:${g.guid}`, id)
    return op
  }

  async upsertBuyer(b: BuyerRec) {
    const existing = await this.findOne('buyers', { guid1C: { equals: b.guid } })
    const data: Record<string, unknown> = {
      title: b.name,
      guid1C: b.guid,
      kind: b.kind,
      inn: b.inn || undefined,
      kpp: b.kpp || undefined,
      isActive: b.isActive !== false,
      group: b.groupGuid ? await this.requireByGuid('customer-groups', b.groupGuid, 'Сеть') : null,
      priceType: (await this.priceTypeId(b.priceType)) ?? null,
      parent: b.kind === 'partner' && b.parentGuid ? await this.requireByGuid('buyers', b.parentGuid, 'Контрагент') : null,
    }
    if (b.priceType && data.priceType == null) throw new Error(`Прайс «${b.priceType.name ?? b.priceType.guid}» не найден`)
    if (b.deliveryPoints) {
      data.deliveryPoints = b.deliveryPoints.map((d) => ({ title: d.name || undefined, address: d.address, guid1C: d.guid || undefined }))
    }
    const { id, op } = await this.save('buyers', existing, data)
    this.cache.set(`buyers:${b.guid}`, id)
    return op
  }

  async upsertAgreement(a: AgreementRec) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(a.validTo)) {
      throw new Error('Даты действия — в формате ГГГГ-ММ-ДД')
    }
    if (a.validTo < a.validFrom) throw new Error('Дата окончания раньше даты начала')
    const existing = await this.findOne('price-agreements', { guid1C: { equals: a.guid } })
    if (a.isActive === false) {
      if (existing) await this.payload.delete({ collection: 'price-agreements', id: existing.id, overrideAccess: true, req: this.req })
      return 'updated' as const
    }
    const items: { product: number; price: number }[] = []
    for (const it of a.items) items.push({ product: await this.productId(it.product), price: it.price })
    const data: Record<string, unknown> = {
      title: a.name,
      guid1C: a.guid,
      kind: a.kind,
      validFrom: dayToISO(a.validFrom),
      validTo: dayToISO(a.validTo),
      items,
      group: a.kind === 'tender' ? await this.requireByGuid('customer-groups', a.groupGuid ?? '', 'Сеть') : null,
      buyer: a.kind === 'individual' ? await this.requireByGuid('buyers', a.buyerGuid ?? '', 'Покупатель') : null,
    }
    return (await this.save('price-agreements', existing, data)).op
  }
}
