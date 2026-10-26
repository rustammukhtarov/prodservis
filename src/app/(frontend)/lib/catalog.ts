import { cache } from 'react'

import type { Category, Media, Product } from '@/payload-types'
import { getPrices } from '@/lib/pricing/service'
import type { ResolvedPrice } from '@/lib/pricing/resolvePrice'

import { getPayloadClient, type Viewer } from './viewer'

export const UNIT_SHORT: Record<string, string> = { kg: 'кг', pcs: 'шт', pack: 'упак', box: 'кор', l: 'л' }
export const STORAGE_LABEL: Record<string, string> = {
  frozen: 'Заморозка (−18 °C)',
  chilled: 'Охлаждённое (0…+4 °C)',
  fresh: 'Свежее (+2…+8 °C)',
  dry: 'Сухое хранение',
}

const rubInt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const rubKop = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** 1 290 ₽ или 921,60 ₽ */
export const rub = (n: number) => `${(Number.isInteger(n) ? rubInt : rubKop).format(n)} ₽`

const dayFormat = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long' })
const weekdayFormat = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
/** «19 октября» */
export const dayLabel = (d: Date | string) =>
  dayFormat.format(typeof d === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T12:00:00+03:00` : d) : d)
/** «пятница, 17 октября» */
export const weekdayLabel = (d: Date) => weekdayFormat.format(d)

/** Все видимые категории, один раз на запрос. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'categories',
    where: { isVisible: { not_equals: false } },
    sort: 'sort',
    limit: 1000,
    depth: 1,
  })
  return res.docs as Category[]
})

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : (v as number)

export const parentId = (c: Category) => idOf(c.parent)

/** Категория и все её подкатегории (любой глубины). */
export const subtreeIds = (all: Category[], rootId: number): number[] => {
  const out = [rootId]
  for (let i = 0; i < out.length; i++) {
    for (const c of all) if (parentId(c) === out[i] && !out.includes(c.id)) out.push(c.id)
  }
  return out
}

/** Цепочка от корня до категории — для хлебных крошек. */
export const categoryPath = (all: Category[], cat: Category): Category[] => {
  const path: Category[] = []
  let cur: Category | undefined = cat
  while (cur && path.length < 10) {
    path.unshift(cur)
    const pid = parentId(cur)
    cur = pid ? all.find((c) => c.id === pid) : undefined
  }
  return path
}

export interface CardProduct {
  id: number
  slug: string
  title: string
  sku?: string | null
  unit: string
  minQty: number
  step: number
  stock: number
  nextDelivery?: string | null
  country?: string | null
  storage?: string | null
  image: { url: string; alt: string } | null
  price: ResolvedPrice | null
}

const imageOf = (p: Product, size: 'card' | 'large' = 'card'): CardProduct['image'] => {
  const first = (p.images ?? [])[0]
  if (!first || typeof first !== 'object') return null
  const m = first as Media
  const url = m.sizes?.[size]?.url || m.url
  return url ? { url, alt: m.alt || p.title } : null
}

export const allImages = (p: Product) =>
  (p.images ?? [])
    .filter((m): m is Media => typeof m === 'object' && m != null)
    .map((m) => ({ url: m.sizes?.large?.url || m.url || '', thumb: m.sizes?.thumb?.url || m.url || '', alt: m.alt || p.title }))
    .filter((m) => m.url)

/** Товары → карточки с ценой для этого посетителя. */
export async function toCards(viewer: Viewer, products: Product[]): Promise<CardProduct[]> {
  const prices = products.length
    ? await getPrices(viewer.payload, {
        customer: viewer.customer as never,
        buyerId: viewer.buyer?.id ?? null,
        productIds: products.map((p) => p.id),
        date: viewer.deliveryDate,
      })
    : new Map()
  return products.map((p) => ({
    id: p.id,
    slug: p.slug || String(p.id),
    title: p.title,
    sku: p.sku,
    unit: p.unit,
    minQty: p.minQty ?? 1,
    step: p.step ?? 1,
    stock: p.stock ?? 0,
    nextDelivery: p.nextDelivery,
    country: p.country,
    storage: p.storage,
    image: imageOf(p),
    price: prices.get(p.id) ?? null,
  }))
}

/** Подпись к цене: откуда она. */
export const priceNote = (price: ResolvedPrice | null): { text: string; tone: 'tender' | 'personal' } | null => {
  if (!price) return null
  const until = price.validTo ? ` · до ${dayLabel(price.validTo)}` : ''
  if (price.source === 'tender') return { text: `Цена торгов сети${until}`, tone: 'tender' }
  if (price.source === 'individual') return { text: `Ваша цена${until}`, tone: 'personal' }
  return null
}
