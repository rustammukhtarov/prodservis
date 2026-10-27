import type { Metadata } from 'next'
import Link from 'next/link'

import type { Buyer } from '@/payload-types'
import { availableSlots } from '@/lib/delivery'

import { placeOrder, setCartQty } from '../actions'
import { AutoSubmit, RemoveFromCart } from '../components/ClientBits'
import { BuyControl } from '../components/ProductCard'
import { Shell } from '../components/Shell'
import { buildCart, readCart } from '../lib/cart'
import { priceNote, rub, slotLabel, UNIT_SHORT } from '../lib/catalog'
import { dayToDate, getViewer } from '../lib/viewer'
import { CheckoutForm } from './CheckoutForm'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Корзина' }

export default async function CartPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const viewer = await getViewer()
  const { customer, buyer } = viewer
  const options = availableSlots(viewer.slots, new Date(), 7)
  const wanted = (await searchParams).slot
  const chosen = options.find((o) => `${o.day}_${o.slot.code}` === wanted) ?? options[0]
  const slotValue = chosen ? `${chosen.day}_${chosen.slot.code}` : ''
  const cart = await buildCart(viewer, await readCart(), chosen ? dayToDate(chosen.day) : undefined)

  const isPerson = customer?.segment === 'individual'
  const parent = buyer && typeof buyer.parent === 'object' ? (buyer.parent as Buyer) : null
  const points = [...(buyer?.deliveryPoints ?? []), ...(parent?.deliveryPoints ?? [])].map((p) => ({
    value: p.id ?? p.address,
    label: p.title ? `${p.title} — ${p.address}` : p.address,
  }))

  let disabled: string | null = null
  if (customer && customer.status !== 'active')
    disabled = 'Заказы станут доступны, когда менеджер проверит заявку и назначит цены.'
  else if (customer && !isPerson && !buyer)
    disabled = 'К вашему аккаунту ещё не привязана организация. Свяжитесь с менеджером.'
  else if (cart.blocked.length) disabled = 'Уберите товары без цены, чтобы оформить заказ.'
  else if (!cart.minOrder.ok)
    disabled = `Минимальная сумма заказа — ${rub(cart.minOrder.minOrderSum)}. Добавьте товаров ещё на ${rub(cart.minOrder.missing)}.`
  else if (!chosen) disabled = 'Нет доступных рейсов доставки. Свяжитесь с менеджером.'

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>Корзина</span>
      </nav>
      <div className="page-head">
        <h1>Корзина</h1>
        {cart.count > 0 && <span className="muted">{cart.count} позиций</span>}
      </div>

      {cart.count === 0 ? (
        <div className="empty">
          <p>В корзине пока пусто.</p>
          <Link href="/catalog" className="btn btn-primary">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="cart">
          <section aria-label="Товары в корзине" className="cart-lines">
            {cart.lines.map((l) => {
              const unit = UNIT_SHORT[l.product.unit] ?? l.product.unit
              const note = priceNote(l.product.price)
              return (
                <article key={l.product.id} className="cart-line">
                  <Link href={`/product/${l.product.slug}`} className="cart-img" tabIndex={-1} aria-hidden="true">
                    {l.product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.product.image.url} alt="" loading="lazy" />
                    ) : null}
                  </Link>
                  <div className="cart-info">
                    <Link href={`/product/${l.product.slug}`} className="card-title">
                      {l.product.title}
                    </Link>
                    <span className="muted small">
                      {l.product.price ? `${rub(l.product.price.price)} за ${unit}` : 'Нет цены — товар нельзя заказать'}
                    </span>
                    {note && <span className={`chip chip-${note.tone}`}>{note.text}</span>}
                  </div>
                  <div className="cart-qty">
                    {l.product.price ? <BuyControl p={l.product} qty={l.qty} /> : null}
                    <RemoveFromCart productId={l.product.id} action={setCartQty} />
                  </div>
                  <strong className="cart-sum">{l.sum != null ? rub(l.sum) : '—'}</strong>
                </article>
              )
            })}
          </section>

          <aside className="cart-side" aria-label="Оформление заказа">
            <div className="cart-total">
              <span>Итого</span>
              <strong>{rub(cart.total)}</strong>
            </div>
            {cart.minOrder.minOrderSum > 0 && (
              <p className={`small ${cart.minOrder.ok ? 'muted' : 'form-error'}`}>
                Минимальный заказ — {rub(cart.minOrder.minOrderSum)}
              </p>
            )}

            {options.length > 0 && (
              <AutoSubmit className="form">
                <label className="field">
                  <span>Доставка</span>
                  <select name="slot" defaultValue={slotValue}>
                    {options.map((o) => (
                      <option key={`${o.day}_${o.slot.code}`} value={`${o.day}_${o.slot.code}`}>
                        {slotLabel(o, true)}
                      </option>
                    ))}
                  </select>
                </label>
                <noscript>
                  <button type="submit" className="btn btn-outline">
                    Пересчитать
                  </button>
                </noscript>
                {chosen && (
                  <span className="muted small">
                    Приём заказов на этот рейс до{' '}
                    {chosen.deadline.toLocaleString('ru-RU', {
                      timeZone: 'Europe/Moscow',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    . Цены — на день доставки.
                  </span>
                )}
              </AutoSubmit>
            )}

            {!customer ? (
              <div className="form">
                <p className="notice notice-warn">Чтобы оформить заказ, войдите — корзина сохранится.</p>
                <Link href="/login?next=/cart" className="btn btn-primary btn-lg">
                  Войти и оформить
                </Link>
              </div>
            ) : (
              <>
                {!isPerson && buyer && (
                  <p className="small">
                    Покупатель: <strong>{buyer.title}</strong>
                    {viewer.buyers.length > 1 && <span className="muted"> (сменить — в шапке сайта)</span>}
                  </p>
                )}
                <CheckoutForm
                  action={placeOrder}
                  slot={slotValue}
                  isPerson={isPerson}
                  buyerId={isPerson ? null : (buyer?.id ?? null)}
                  points={points}
                  addresses={(customer.addresses ?? []).map((a) => a.address)}
                  contactName={customer.name ?? ''}
                  contactPhone={customer.phone ?? ''}
                  disabled={disabled}
                  total={rub(cart.total)}
                />
              </>
            )}
          </aside>
        </div>
      )}
    </Shell>
  )
}
