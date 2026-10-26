import Link from 'next/link'

import type { Viewer } from '../lib/viewer'
import { Footer, Header } from './Chrome'
import { IconInfo } from './Icons'

/** Общая обёртка страницы витрины: шапка, предупреждения о статусе, подвал. */
export function Shell({ viewer, query, children }: { viewer: Viewer; query?: string; children: React.ReactNode }) {
  const { customer } = viewer
  return (
    <>
      <Header viewer={viewer} query={query} />
      {customer && customer.status !== 'active' && (
        <div className="wrap">
          <p className="notice notice-warn">
            <IconInfo />
            {customer.status === 'blocked'
              ? 'Доступ к заказам приостановлен. Свяжитесь с вашим менеджером.'
              : 'Ваша заявка на проверке: менеджер привяжет организацию и назначит цены. Пока показываем цены для гостей.'}
          </p>
        </div>
      )}
      <main className="wrap main">{children}</main>
      <Footer viewer={viewer} />
    </>
  )
}

export function GuestPriceNotice() {
  return (
    <p className="notice notice-warn">
      <IconInfo />
      <span>
        Вы видите цены для гостей. <Link href="/login">Войдите</Link> — покажем ваши персональные цены.
      </span>
    </p>
  )
}
