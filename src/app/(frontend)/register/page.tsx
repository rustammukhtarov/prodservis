import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { openSegments } from '@/lib/segments'

import { registerCustomer } from '../account-actions'
import { RegisterForm } from '../components/AccountForms'
import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Регистрация' }

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const viewer = await getViewer()
  if (viewer.customer) redirect('/catalog')
  const type = (await searchParams).type
  const open = openSegments(viewer.settings)
  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>Регистрация</span>
      </nav>
      <div className="auth auth-wide">
        <div className="auth-box">
          <h1>Стать клиентом</h1>
          <p className="muted">Зарегистрируйтесь — и каталог покажет ваши цены.</p>
          <RegisterForm action={registerCustomer} open={open} initialType={open.includes(type) ? type : (open[0] ?? 'horeca')} />
        </div>
        <aside className="auth-side">
          <h2 className="h3">Как это работает</h2>
          <ol className="plain-steps">
            <li>Заполните форму — это займёт пару минут.</li>
            <li>Менеджер найдёт вашу организацию по ИНН и назначит цены: прайс, торги сети, индивидуальные условия.</li>
            <li>Заказывайте онлайн круглосуточно, два рейса доставки в день.</li>
          </ol>
          <p className="small muted">
            Поставщик? <Link href="/suppliers">Оставьте заявку для отдела закупок</Link>.
          </p>
        </aside>
      </div>
    </Shell>
  )
}
