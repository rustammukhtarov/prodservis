import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import type { Buyer, Order } from '@/payload-types'

import { Shell } from '../components/Shell'
import { dayLabel, rub } from '../lib/catalog'
import { getViewer } from '../lib/viewer'
import { ORDER_STATUS } from './status'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Мои заказы' }

export default async function OrdersPage() {
  const viewer = await getViewer()
  if (!viewer.customer) redirect('/login?next=/orders')

  const { docs } = await viewer.payload.find({
    collection: 'orders',
    where: { customer: { equals: viewer.customer.id } },
    sort: '-createdAt',
    limit: 100,
    depth: 1,
    overrideAccess: true,
  })
  const orders = docs as Order[]

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>Мои заказы</span>
      </nav>
      <div className="page-head">
        <h1>Мои заказы</h1>
      </div>
      {orders.length === 0 ? (
        <div className="empty">
          <p>Заказов пока нет.</p>
          <Link href="/catalog" className="btn btn-primary">
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Номер</th>
                <th scope="col">Доставка</th>
                <th scope="col">Покупатель</th>
                <th scope="col">Позиций</th>
                <th scope="col" className="num">
                  Сумма
                </th>
                <th scope="col">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const st = ORDER_STATUS[o.status ?? 'new'] ?? ORDER_STATUS.new
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`}>{o.number}</Link>
                    </td>
                    <td>
                      {dayLabel(o.deliveryDate)}
                      {o.deliverySlotTitle ? <span className="muted small"> · {o.deliverySlotTitle}</span> : null}
                    </td>
                    <td>{typeof o.buyer === 'object' && o.buyer ? (o.buyer as Buyer).title : '—'}</td>
                    <td>{o.items?.length ?? 0}</td>
                    <td className="num">{rub(o.total)}</td>
                    <td>
                      <span className={`status status-${st.tone}`}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  )
}
