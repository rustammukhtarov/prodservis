'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import type { FormState } from '../account-actions'

type Action = (prev: FormState, fd: FormData) => Promise<FormState>

const SEGMENTS = [
  { value: 'horeca', title: 'Ресторан, кафе, отель', note: 'Персональные цены и торги сети' },
  { value: 'retail', title: 'Магазин', note: 'Персональный прайс, отсрочка' },
  { value: 'wholesale', title: 'Крупный опт', note: 'Цены от объёма, менеджер' },
  { value: 'individual', title: 'Для дома', note: 'Заказ от 15 000 ₽, доставка до двери' },
]

/** Невидимое поле-ловушка: человек его не заполнит, бот — заполнит. */
const Honeypot = () => (
  <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
    <label>
      Сайт компании
      <input name="company_site" tabIndex={-1} autoComplete="off" />
    </label>
  </div>
)

function Field(props: {
  label: string
  name: string
  type?: string
  required?: boolean
  value?: string
  autoComplete?: string
  placeholder?: string
  hint?: string
  inputMode?: 'numeric' | 'tel' | 'email' | 'text'
  maxLength?: number
}) {
  return (
    <label className="field">
      <span>
        {props.label}
        {props.required && <span className="req"> *</span>}
      </span>
      <input
        name={props.name}
        type={props.type ?? 'text'}
        required={props.required}
        defaultValue={props.value}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        maxLength={props.maxLength}
      />
      {props.hint && <small className="muted">{props.hint}</small>}
    </label>
  )
}

const Consent = () => (
  <label className="check consent">
    <input type="checkbox" name="consent" required />
    <span>
      Согласен на обработку персональных данных в соответствии с{' '}
      <Link href="/info/politika-konfidentsialnosti" target="_blank">
        политикой
      </Link>
    </span>
  </label>
)

const Errors = ({ state }: { state: FormState }) =>
  state?.error ? (
    <p className="form-error" role="alert">
      {state.error}
    </p>
  ) : null

export function RegisterForm({
  action,
  initialType,
  open,
}: {
  action: Action
  initialType: string
  /** Типы клиентов, которые сейчас принимаем (настройки сайта). */
  open: string[]
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const f = state?.fields ?? {}
  const choices = SEGMENTS.filter((s) => open.includes(s.value))
  const [segment, setSegment] = useState(f.segment || initialType || choices[0]?.value || 'horeca')
  const b2b = segment !== 'individual'

  return (
    <form action={formAction} className="form register">
      <Honeypot />
      <fieldset className="segments-pick">
        <legend>Кто вы?</legend>
        {choices.map((s) => (
          <label key={s.value} className={`seg ${segment === s.value ? 'is-on' : ''}`}>
            <input
              type="radio"
              name="segment"
              value={s.value}
              checked={segment === s.value}
              onChange={() => setSegment(s.value)}
            />
            <strong>{s.title}</strong>
            <span className="muted small">{s.note}</span>
          </label>
        ))}
      </fieldset>

      {b2b && (
        <fieldset className="form-block">
          <legend>Организация</legend>
          <div className="field-row">
            <Field
              label="ИНН"
              name="inn"
              required
              value={f.inn}
              inputMode="numeric"
              maxLength={12}
              hint="10 цифр для организации, 12 — для ИП"
            />
            <Field label="КПП" name="kpp" value={f.kpp} inputMode="numeric" maxLength={9} />
          </div>
          <Field label="Название" name="orgTitle" value={f.orgTitle} placeholder="ООО «Ромашка»" />
          <Field label="Адрес доставки" name="address" value={f.address} hint="Если точек несколько — укажите основную" />
        </fieldset>
      )}

      <fieldset className="form-block">
        <legend>Контакты</legend>
        <Field label={b2b ? 'Контактное лицо' : 'Имя'} name="name" required value={f.name} autoComplete="name" />
        <div className="field-row">
          <Field label="Телефон" name="phone" type="tel" required value={f.phone} autoComplete="tel" inputMode="tel" />
          <Field label="Email" name="email" type="email" required value={f.email} autoComplete="email" />
        </div>
        {!b2b && (
          <>
            <Field
              label="Адрес доставки"
              name="address"
              required
              value={f.address}
              autoComplete="street-address"
              placeholder="Город, улица, дом, подъезд, квартира"
            />
            <Field label="Комментарий для водителя" name="comment" value={f.comment} />
          </>
        )}
        <div className="field-row">
          <Field label="Пароль" name="password" type="password" required autoComplete="new-password" hint="Не короче 8 символов" />
          <Field label="Пароль ещё раз" name="password2" type="password" required autoComplete="new-password" />
        </div>
      </fieldset>

      <Consent />
      <Errors state={state} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Отправляем…' : b2b ? 'Отправить заявку' : 'Зарегистрироваться'}
      </button>
      <p className="muted small">
        {b2b
          ? 'Менеджер проверит организацию и назначит ваши цены — обычно в течение рабочего дня.'
          : 'Аккаунт активируется сразу.'}{' '}
        Уже есть аккаунт? <Link href="/login">Войти</Link>
      </p>
    </form>
  )
}

export function SupplierForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  const f = state?.fields ?? {}
  if (state?.ok) {
    return (
      <div className="notice notice-ok notice-big" role="status">
        Заявка отправлена. Отдел закупок свяжется с вами в течение нескольких рабочих дней.
      </div>
    )
  }
  return (
    <form action={formAction} className="form">
      <Honeypot />
      <div className="field-row">
        <Field label="Организация" name="company" required value={f.company} />
        <Field label="ИНН" name="inn" required value={f.inn} inputMode="numeric" maxLength={12} />
      </div>
      <Field label="Контактное лицо" name="contactName" required value={f.contactName} autoComplete="name" />
      <div className="field-row">
        <Field label="Телефон" name="phone" type="tel" required value={f.phone} autoComplete="tel" />
        <Field label="Email" name="email" type="email" required value={f.email} autoComplete="email" />
      </div>
      <Field label="Сайт" name="website" value={f.website} placeholder="https://" />
      <label className="field">
        <span>Что поставляете</span>
        <textarea name="assortment" rows={4} maxLength={4000} defaultValue={f.assortment} placeholder="Категории, бренды, объёмы, регион" />
      </label>
      <label className="field">
        <span>Коммерческое предложение или прайс</span>
        <input type="file" name="offer" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
        <small className="muted">PDF, Word, Excel или фото, до 10 МБ</small>
      </label>
      <Consent />
      <Errors state={state} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </form>
  )
}

export function ForgotForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  if (state?.ok)
    return (
      <p className="notice notice-ok notice-big" role="status">
        Если такой email зарегистрирован, мы отправили на него ссылку для смены пароля. Проверьте и папку «Спам».
      </p>
    )
  return (
    <form action={formAction} className="form">
      <Field label="Email" name="email" type="email" required value={state?.fields?.email} autoComplete="email" />
      <Errors state={state} />
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Отправляем…' : 'Получить ссылку'}
      </button>
    </form>
  )
}

export function ResetForm({ action, token }: { action: Action; token: string }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="form">
      <input type="hidden" name="token" value={token} />
      <Field label="Новый пароль" name="password" type="password" required autoComplete="new-password" hint="Не короче 8 символов" />
      <Field label="Пароль ещё раз" name="password2" type="password" required autoComplete="new-password" />
      <Errors state={state} />
      {state?.error && (
        <p className="small">
          <Link href="/forgot-password">Запросить новую ссылку</Link>
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
        {pending ? 'Сохраняем…' : 'Сохранить и войти'}
      </button>
    </form>
  )
}
