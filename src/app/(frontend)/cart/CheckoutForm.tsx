'use client'

import { useActionState } from 'react'

import type { CheckoutState } from '../actions'

export interface CheckoutProps {
  action: (prev: CheckoutState, fd: FormData) => Promise<CheckoutState>
  slot: string
  isPerson: boolean
  buyerId: number | null
  points: { value: string; label: string }[]
  addresses: string[]
  contactName: string
  contactPhone: string
  disabled?: string | null
  total: string
}

export function CheckoutForm(p: CheckoutProps) {
  const [state, formAction, pending] = useActionState(p.action, null)
  return (
    <form action={formAction} className="form checkout">
      <input type="hidden" name="slot" value={p.slot} />
      {p.buyerId != null && <input type="hidden" name="buyer" value={p.buyerId} />}

      {p.isPerson ? (
        <label className="field">
          <span>Адрес доставки</span>
          <input
            name="address"
            required
            list="my-addresses"
            defaultValue={p.addresses[0] ?? ''}
            placeholder="Город, улица, дом, подъезд, квартира"
            autoComplete="street-address"
          />
          <datalist id="my-addresses">
            {p.addresses.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </label>
      ) : p.points.length > 0 ? (
        <label className="field">
          <span>Точка доставки</span>
          <select name="point" required defaultValue={p.points[0]?.value}>
            {p.points.map((pt) => (
              <option key={pt.value} value={pt.value}>
                {pt.label}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="muted small">Точки доставки не заведены — менеджер уточнит адрес при подтверждении.</p>
      )}

      <div className="field-row">
        <label className="field">
          <span>Контактное лицо</span>
          <input name="contactName" defaultValue={p.contactName} autoComplete="name" />
        </label>
        <label className="field">
          <span>Телефон</span>
          <input name="contactPhone" type="tel" defaultValue={p.contactPhone} autoComplete="tel" required={p.isPerson} />
        </label>
      </div>

      {p.isPerson && (
        <fieldset className="field">
          <legend>Оплата</legend>
          <label className="check">
            <input type="radio" name="payment" value="cash" defaultChecked /> Наличными курьеру
          </label>
          <label className="check">
            <input type="radio" name="payment" value="card" /> Картой курьеру
          </label>
          <span className="muted small">Онлайн-оплата при оформлении появится позже.</span>
        </fieldset>
      )}

      <label className="field">
        <span>Комментарий к заказу</span>
        <textarea name="comment" rows={3} maxLength={2000} placeholder="Например: въезд со двора, позвонить за час" />
      </label>

      {state?.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {p.disabled ? (
        <p className="notice notice-warn">{p.disabled}</p>
      ) : (
        <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
          {pending ? 'Оформляем…' : `Оформить заказ · ${p.total}`}
        </button>
      )}
    </form>
  )
}
