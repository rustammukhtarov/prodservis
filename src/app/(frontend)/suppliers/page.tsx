import type { Metadata } from 'next'
import Link from 'next/link'

import { submitSupplier } from '../account-actions'
import { SupplierForm } from '../components/AccountForms'
import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Поставщикам' }

export default async function SuppliersPage() {
  const viewer = await getViewer()
  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>Поставщикам</span>
      </nav>
      <div className="auth auth-wide">
        <div className="auth-box">
          <h1>Стать поставщиком</h1>
          <p className="muted">Расскажите о компании и ассортименте — отдел закупок рассмотрит заявку.</p>
          <SupplierForm action={submitSupplier} />
        </div>
        <aside className="auth-side">
          <h2 className="h3">Что мы ищем</h2>
          <p>Овощи, фрукты, зелень, грибы, ягоды, бакалею, масла и соусы, консервацию для ресторанов, гостиниц и магазинов Москвы.</p>
          <p className="small muted">
            Условия работы с поставщиками — на странице <Link href="/info/postavschikam">«Поставщикам»</Link>.
          </p>
        </aside>
      </div>
    </Shell>
  )
}
