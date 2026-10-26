import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LoginForm } from '../components/ClientBits'
import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Вход для клиентов' }

/** Куда вернуть после входа: только адреса этого сайта. */
const safeNext = (v: unknown) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/catalog')

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const next = safeNext((await searchParams).next)
  const viewer = await getViewer()
  if (viewer.customer) redirect(next)

  return (
    <Shell viewer={viewer}>
      <div className="auth">
        <div className="auth-box">
          <h1>Вход для клиентов</h1>
          <p className="muted">После входа каталог покажет ваши цены.</p>
          <LoginForm next={next} />
        </div>
        <div className="auth-side">
          <h2 className="h3">Ещё не клиент?</h2>
          <p>
            Онлайн-регистрация откроется в ближайшее время. Пока оставьте заявку по телефону
            {viewer.settings.phone ? ` ${viewer.settings.phone}` : ''} — менеджер создаст доступ и назначит цены.
          </p>
          <Link href="/info/kontakty">Контакты</Link>
        </div>
      </div>
    </Shell>
  )
}
