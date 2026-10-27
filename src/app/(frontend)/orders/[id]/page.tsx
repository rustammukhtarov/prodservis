import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import type { Buyer, Order, Product } from '@/payload-types'

import { repeatOrder } from '../../actions'
import { IconCheck } from '../../components/Icons'
import { Shell } from '../../components/Shell'
import { dayLabel, rub, UNIT_SHORT } from '../../lib/catalog'
import { getViewer } from '../../lib/viewer'
import { ORDER_STATUS, PAYMENT_LABEL } from '../status'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Заказ' }

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }

const SOURCE: Record<string, string> = { individual: 'ваша цена', tender: 'торги сети' }

export default async function OrderPage({ params, searchParams }: Props) {
  const viewer = await getViewer()
  const { id } = await params
  if (!viewer.customer) redirect(`/login?next=/orders/${id}`)
  const created = (await searchParams).created === '1'

  const order = (await viewer.payload
    .findByID({ collection: 'orders', id: Number(id), depth: 1, overrideAccess: true })
    .catch(() => null)) as Order | null
  const ownerId = order && (typeof order.customer === 'object' ? order.customer.id : order.customer)
  if (!order || ownerId !== viewer.customer.id) notFound()

  const st = ORDER_STATUS[order.status ?? 'new'] ?? ORDER_STATUS.new
  const buyer = typeof order.buyer === 'object' ? (order.buyer as Buyer | null) : null

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <Link href="/orders">Мои заказы</Link>
        <span aria-hidden="true">/</span>
        <span>{order.number}</span>
      </nav>

      {created && (
        <p className="notice notice-ok notice-big">
          <IconCheck /> Заказ {order.number} принят. Менеджер получил его и подтвердит при необходимости.
        </p>
      )}

      <div className="page-head">
        <h1>Заказ {order.number}</h1>
        <span className={`status status-${st.tone}`}>{st.label}</span>
      </div>

      <dl className="specs order-meta">
        <div>
          <dt>Доставка</dt>
          <dd>
            {dayLabel(order.deliveryDate)}
            {order.deliverySlotTitle ? `, ${order.deliverySlotTitle}` : ''}
          </dd>
        </div>
        {buyer && (
          <div>
            <dt>Покупатель</dt>
            <dd>{buyer.title}</dd>
          </div>
        )}
        {order.address && (
          <div>
            <dt>Адрес</dt>
            <dd>{order.address}</dd>
          </div>
        )}
        {(order.contactName || order.contactPhone) && (
          <div>
            <dt>Контакт</dt>
            <dd>{[order.contactName, order.contactPhone].filter(Boolean).join(', ')}</dd>
          </div>
        )}
        <div>
          <dt>Оплата</dt>
          <dd>{PAYMENT_LABEL[order.paymentMethod ?? 'contract']}</dd>
        </div>
        {order.comment && (
          <div>
            <dt>Комментарий</dt>
            <dd>{order.comment}</dd>
          </div>
        )}
      </dl>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Товар</th>
              <th scope="col" className="num">
                Кол-во
              </th>
              <th scope="col" className="num">
                Цена
              </th>
              <th scope="col" className="num">
                Сумма
              </th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it, i) => {
              const p = typeof it.product === 'object' ? (it.product as Product) : null
              const unit = p ? (UNIT_SHORT[p.unit] ?? p.unit) : ''
              return (
                <tr key={it.id ?? i}>
                  <td>
                    {p?.slug ? <Link href={`/product/${p.slug}`}>{it.title ?? p.title}</Link> : (it.title ?? '—')}
                    {it.priceSource && SOURCE[it.priceSource] && (
                      <span className="muted small"> · {SOURCE[it.priceSource]}</span>
                    )}
                  </td>
                  <td className="num">
                    {it.qty.toLocaleString('ru-RU')} {unit}
                  </td>
                  <td className="num">{rub(it.price)}</td>
                  <td className="num">{rub(it.sum)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>
                Итого
              </th>
              <td className="num">
                <strong>{rub(order.total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <form action={repeatOrder} className="row-btns order-actions">
        <input type="hidden" name="order" value={order.id} />
        <button type="submit" className="btn btn-primary">
          Повторить заказ
        </button>
        <Link href="/orders" className="btn btn-outline">
          Все заказы
        </Link>
      </form>
    </Shell>
  )
}
