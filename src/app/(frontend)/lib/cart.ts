import { cookies } from 'next/headers'
import { cache } from 'react'

import { parseCart, serializeCart } from '@/lib/cartQty'
import { checkMinOrder } from '@/lib/orderRules'
import type { Product } from '@/payload-types'

import { type CardProduct, toCards } from './catalog'
import { getViewer, type Viewer } from './viewer'

export const CART_COOKIE = 'ps-cart'

export interface CartLine {
  product: CardProduct
  qty: number
  /** null — цены нет (товар нельзя заказать). */
  sum: number | null
}

export interface CartView {
  lines: CartLine[]
  total: number
  count: number
  /** Позиции без цены или снятые с продажи. */
  blocked: CartLine[]
  minOrder: ReturnType<typeof checkMinOrder>
}

export const readCart = async () => parseCart((await cookies()).get(CART_COOKIE)?.value)

export const writeCart = async (cart: Map<number, number>) => {
  const value = serializeCart(cart)
  const store = await cookies()
  if (!value) store.delete(CART_COOKIE)
  else store.set(CART_COOKIE, value, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Корзина с ценами на нужную дату доставки. */
export async function buildCart(viewer: Viewer, cart: Map<number, number>, date?: Date): Promise<CartView> {
  const ids = [...cart.keys()]
  const docs = ids.length
    ? ((
        await viewer.payload.find({
          collection: 'products',
          where: { and: [{ id: { in: ids } }, { isActive: { not_equals: false } }] },
          limit: ids.length,
          depth: 1,
          pagination: false,
        })
      ).docs as Product[])
    : []
  const cards = await toCards(date ? { ...viewer, deliveryDate: date } : viewer, docs)
  const byId = new Map(cards.map((c) => [c.id, c]))

  const lines: CartLine[] = []
  for (const [id, qty] of cart) {
    const product = byId.get(id)
    if (!product) continue
    lines.push({ product, qty, sum: product.price ? round2(product.price.price * qty) : null })
  }
  const total = round2(lines.reduce((s, l) => s + (l.sum ?? 0), 0))
  const segment = viewer.customer?.segment ?? null
  return {
    lines,
    total,
    count: lines.length,
    blocked: lines.filter((l) => l.sum == null),
    minOrder: checkMinOrder(segment, total, viewer.settings as never),
  }
}

/** Корзина текущего посетителя на ближайший рейс — для шапки. */
export const getCart = cache(async (): Promise<CartView> => buildCart(await getViewer(), await readCart()))
