import type { Metadata } from 'next'
import Link from 'next/link'

import { requestPasswordReset } from '../account-actions'
import { ForgotForm } from '../components/AccountForms'
import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Восстановление пароля' }

export default async function ForgotPage() {
  const viewer = await getViewer()
  return (
    <Shell viewer={viewer}>
      <div className="auth auth-narrow">
        <div className="auth-box">
          <h1>Восстановление пароля</h1>
          <p className="muted">Пришлём на email ссылку для смены пароля.</p>
          <ForgotForm action={requestPasswordReset} />
          <p className="small">
            <Link href="/login">Вернуться ко входу</Link>
          </p>
        </div>
      </div>
    </Shell>
  )
}
