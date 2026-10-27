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

const fmtQty = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 3 })

/** Кнопка «В корзину» и счётчик −/+ с учётом минимального заказа и кратности. */
export function CartControl({
  productId,
  initialQty,
  minQty,
  step,
  unit,
  action,
  big,
}: {
  productId: number
  initialQty: number
  minQty: number
  step: number
  unit: string
  action: (id: number, qty: number) => Promise<number>
  big?: boolean
}) {
  const router = useRouter()
  const [qty, setQty] = useState(initialQty)
  const [draft, setDraft] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const commit = (next: number) => {
    setQty(next)
    setDraft(null)
    start(async () => {
      const saved = await action(productId, next)
      setQty(saved)
      router.refresh()
    })
  }
  const s = step > 0 ? step : 1
  const min = minQty > 0 ? minQty : s
  const plus = () => commit(qty <= 0 ? min : Math.round((qty + s) * 1000) / 1000)
  const minus = () => {
    const next = Math.round((qty - s) * 1000) / 1000
    commit(next < min - 1e-9 ? 0 : next)
  }

  if (qty <= 0) {
    return (
      <button type="button" className={`btn btn-primary ${big ? 'btn-lg' : ''} cart-add`} onClick={plus} disabled={pending}>
        В корзину
      </button>
    )
  }
  return (
    <div className={`stepper ${big ? 'stepper-big' : ''}`} aria-busy={pending}>
      <button type="button" aria-label="Меньше" onClick={minus}>
        −
      </button>
      <label>
        <span className="sr-only">Количество, {unit}</span>
        <input
          inputMode="decimal"
          value={draft ?? fmtQty(qty)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft == null) return
            const n = Number(draft.replace(',', '.').replace(/\s/g, ''))
            commit(Number.isFinite(n) ? n : qty)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          }}
        />
        <span className="stepper-unit">{unit}</span>
      </label>
      <button type="button" aria-label="Больше" onClick={plus}>
        +
      </button>
    </div>
  )
}

export function RemoveFromCart({ productId, action }: { productId: number; action: (id: number, qty: number) => Promise<number> }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className="link-btn small muted-link"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await action(productId, 0)
          router.refresh()
        })
      }
    >
      Удалить
    </button>
  )
}
