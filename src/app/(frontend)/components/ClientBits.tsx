'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/** Выбор юрлица: отправляет форму сразу при смене. */
export function BuyerSelect({
  action,
  buyers,
  current,
}: {
  action: (fd: FormData) => Promise<void>
  buyers: { id: number; title: string }[]
  current: number | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <form
      action={(fd) =>
        start(async () => {
          await action(fd)
          router.refresh()
        })
      }
    >
      <label className="sr-only" htmlFor="buyer-select">
        Заказываю от имени
      </label>
      <select
        id="buyer-select"
        name="buyer"
        className="buyer-select"
        defaultValue={current ?? undefined}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {buyers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </select>
    </form>
  )
}

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        await fetch('/api/customers/logout', { method: 'POST', credentials: 'include' }).catch(() => null)
        router.push('/')
        router.refresh()
      }}
    >
      Выйти
    </button>
  )
}

/** Форма входа клиента. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        setBusy(true)
        setError(null)
        try {
          const res = await fetch('/api/customers/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }),
          })
          if (res.ok) {
            router.push(next)
            router.refresh()
            return
          }
          const body = await res.json().catch(() => null)
          const msg: string = body?.errors?.[0]?.message ?? ''
          setError(
            res.status === 401 && /lock/i.test(msg)
              ? 'Слишком много попыток. Попробуйте через 15 минут.'
              : res.status === 401
                ? 'Неверный email или пароль.'
                : 'Не получилось войти. Попробуйте ещё раз.',
          )
        } catch {
          setError('Нет связи с сервером. Проверьте интернет.')
        } finally {
          setBusy(false)
        }
      }}
    >
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        <span>Пароль</span>
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
        {busy ? 'Входим…' : 'Войти'}
      </button>
    </form>
  )
}

/** Автоотправка формы фильтров при изменении галочек. */
export function AutoSubmit({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form
      className={className}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement
        if (t.type === 'checkbox' || t.tagName === 'SELECT') e.currentTarget.requestSubmit()
      }}
    >
      {children}
    </form>
  )
}

/** Блок, который на телефоне свёрнут (фильтры), а на компьютере всегда раскрыт. */
export function MobileCollapse({ summary, children }: { summary: string; children: React.ReactNode }) {
  return (
    <details
      className="collapse"
      open
      ref={(el) => {
        if (el && !el.dataset.init) {
          el.dataset.init = '1'
          if (window.matchMedia('(max-width: 700px)').matches) el.open = false
        }
      }}
    >
      <summary>{summary}</summary>
      {children}
    </details>
  )
}
