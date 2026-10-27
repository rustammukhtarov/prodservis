import type { Metadata } from 'next'
import Link from 'next/link'

import { resetPassword } from '../account-actions'
import { ResetForm } from '../components/AccountForms'
import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Новый пароль' }

export default async function ResetPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const viewer = await getViewer()
  const token = (await searchParams).token ?? ''
  return (
    <Shell viewer={viewer}>
      <div className="auth auth-narrow">
        <div className="auth-box">
          <h1>Новый пароль</h1>
          {token ? (
            <ResetForm action={resetPassword} token={token} />
          ) : (
            <p>
              Ссылка неполная. <Link href="/forgot-password">Запросите новую</Link>.
            </p>
          )}
        </div>
      </div>
    </Shell>
  )
}
