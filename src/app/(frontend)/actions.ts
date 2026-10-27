'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { normalizeQty } from '@/lib/cartQty'
import { isSlotOpen } from '@/lib/delivery'
import { emailLayout, sendSafe, siteURL, staffRecipients } from '@/lib/email'
import { orderSummaryHtml } from '@/lib/orderEmail'
import type { Buyer, Order, Product } from '@/payload-types'

import { buildCart, readCart, writeCart } from './lib/cart'
import { BUYER_COOKIE, dayToDate, getViewer } from './lib/viewer'

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : (v as number)

/** Клиент выбирает юрлицо, от имени которого смотрит цены и заказывает. */
export async function chooseBuyer(formData: FormData) {
  const id = Number(formData.get('buyer'))
  const { buyers } = await getViewer()
  if (!buyers.some((b) => b.id === id)) return
  ;(await cookies()).set(BUYER_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  })
}

/** Поставить количество товара в корзине (0 — убрать). Возвращает итоговое количество. */
export async function setCartQty(productId: number, qty: number): Promise<number> {
  const { payload } = await getViewer()
  const cart = await readCart()
  const product = (await payload
    .findByID({ collection: 'products', id: productId, depth: 0 })
    .catch(() => null)) as Product | null
  if (!product || product.isActive === false) {
    cart.delete(productId)
    await writeCart(cart)
    return 0
  }
  const q = normalizeQty(qty, product.minQty ?? 1, product.step ?? 1)
  if (q > 0) cart.set(productId, q)
  else cart.delete(productId)
  await writeCart(cart)
  return q
}

export async function clearCart() {
  await writeCart(new Map())
}

/** Повторить заказ: добавить его товары в корзину. */
export async function repeatOrder(formData: FormData) {
  const viewer = await getViewer()
  if (!viewer.customer) redirect('/login')
  const order = (await viewer.payload
    .findByID({ collection: 'orders', id: Number(formData.get('order')), depth: 1, overrideAccess: true })
    .catch(() => null)) as Order | null
  if (!order || idOf(order.customer) !== viewer.customer.id) redirect('/orders')
  const cart = await readCart()
  for (const it of order.items ?? []) {
    const p = typeof it.product === 'object' ? (it.product as Product) : null
    if (!p || p.isActive === false) continue
    cart.set(p.id, normalizeQty((cart.get(p.id) ?? 0) + it.qty, p.minQty ?? 1, p.step ?? 1))
  }
  await writeCart(cart)
  redirect('/cart')
}

export type CheckoutState = { error?: string } | null

/** Оформление заказа. Цены и условия пересчитываются здесь, браузеру не доверяем. */
export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const viewer = await getViewer()
  const { customer, payload } = viewer
  if (!customer) return { error: 'Войдите, чтобы оформить заказ.' }
  if (customer.status !== 'active')
    return { error: 'Заказы станут доступны, когда менеджер проверит вашу заявку и назначит цены.' }

  // Рейс доставки
  const [day, code] = String(formData.get('slot') ?? '').split('_')
  if (!isSlotOpen(viewer.slots, day, code, new Date()))
    return { error: 'Приём заказов на этот рейс уже закрыт. Выберите другую дату или рейс.' }
  const slot = viewer.slots.find((s) => s.code === code)!

  // Кто покупает и куда везти
  const isPerson = customer.segment === 'individual'
  let buyer: Buyer | null = null
  let address = ''
  let pointGuid: string | null = null
  if (isPerson) {
    address = String(formData.get('address') ?? '').trim()
    if (address.length < 5) return { error: 'Укажите адрес доставки.' }
  } else {
    buyer = viewer.buyers.find((b) => b.id === Number(formData.get('buyer'))) ?? null
    if (!buyer) return { error: 'Выберите организацию, на которую оформить заказ.' }
    if (buyer.isActive === false) return { error: 'Эта организация недоступна для заказа. Свяжитесь с менеджером.' }
    const parent = typeof buyer.parent === 'object' ? (buyer.parent as Buyer) : null
    const points = [...(buyer.deliveryPoints ?? []), ...(parent?.deliveryPoints ?? [])]
    const point = points.find((p) => (p.id ?? p.address) === String(formData.get('point')))
    if (points.length && !point) return { error: 'Выберите точку доставки.' }
    address = point?.address ?? ''
    pointGuid = point?.guid1C ?? null
  }
  const contactName = String(formData.get('contactName') ?? '').trim() || customer.name
  const contactPhone = String(formData.get('contactPhone') ?? '').trim() || customer.phone || ''
  if (isPerson && contactPhone.replace(/\D/g, '').length < 10) return { error: 'Укажите телефон для связи.' }
  const payment = isPerson ? String(formData.get('payment') ?? 'cash') : 'contract'
  if (!['contract', 'cash', 'card'].includes(payment)) return { error: 'Выберите способ оплаты.' }

  // Цены на день доставки — для выбранного юрлица.
  const priced = await buildCart(
    { ...viewer, buyer: buyer ?? viewer.buyer },
    await readCart(),
    dayToDate(day),
  )
  if (!priced.lines.length) return { error: 'Корзина пуста.' }
  if (priced.blocked.length)
    return { error: `Нет цены на: ${priced.blocked.map((l) => l.product.title).join(', ')}. Уберите эти товары.` }
  if (!priced.minOrder.ok)
    return { error: `Минимальная сумма заказа — ${priced.minOrder.minOrderSum.toLocaleString('ru-RU')} ₽.` }

  const order = (await payload.create({
    collection: 'orders',
    overrideAccess: true,
    data: {
      customer: customer.id,
      buyer: buyer?.id ?? null,
      deliveryDate: dayToDate(day).toISOString(),
      deliverySlot: slot.code,
      deliverySlotTitle: `${slot.title} (отгрузка ${slot.shipAt})`,
      address,
      deliveryPointGuid1C: pointGuid,
      contactName,
      contactPhone,
      paymentMethod: payment as Order['paymentMethod'],
      comment: String(formData.get('comment') ?? '').slice(0, 2000) || null,
      items: priced.lines.map((l) => ({
        product: l.product.id,
        title: l.product.title,
        sku: l.product.sku ?? null,
        qty: l.qty,
        price: l.product.price!.price,
        sum: l.sum!,
        priceSource: l.product.price!.source,
      })),
      total: priced.total,
      status: 'new',
    },
  })) as Order

  await writeCart(new Map())

  // Письма: менеджерам — новый заказ, клиенту — подтверждение. Ошибка почты заказ не отменяет.
  const summary = orderSummaryHtml(order, buyer?.title)
  await sendSafe(payload, {
    to: await staffRecipients(payload),
    subject: `Новый заказ ${order.number} — ${buyer?.title ?? customer.name} — ${priced.total.toLocaleString('ru-RU')} ₽`,
    html: emailLayout({
      title: `Новый заказ ${order.number}`,
      paragraphs: [`Клиент: ${customer.name} (${customer.email})`],
      extraHtml: summary,
      button: { text: 'Открыть заказ в админке', url: `${siteURL()}/admin/collections/orders/${order.id}` },
    }),
  })
  await sendSafe(payload, {
    to: customer.email,
    subject: `Заказ ${order.number} принят — Продсервис`,
    html: emailLayout({
      title: `Заказ ${order.number} принят`,
      paragraphs: ['Спасибо! Мы получили ваш заказ. Если что-то нужно уточнить, менеджер свяжется с вами.'],
      extraHtml: summary,
      button: { text: 'Мои заказы', url: `${siteURL()}/orders/${order.id}` },
    }),
  })

  redirect(`/orders/${order.id}?created=1`)
}
