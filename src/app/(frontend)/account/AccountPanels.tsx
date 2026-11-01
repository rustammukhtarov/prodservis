'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'

import type { FormState } from '../account-actions'

type Action = (prev: FormState, fd: FormData) => Promise<FormState>

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

function Result({ state, ok }: { state: FormState; ok: string }) {
  if (state?.error)
    return (
      <p className="form-error" role="alert">
        {state.error}
      </p>
    )
  if (state?.ok)
    return (
      <p className="form-ok" role="status">
        {ok}
      </p>
    )
  return null
}

/** Форма, которая очищается после успешной отправки (для «добавить»). */
function useResetOnOk(state: FormState) {
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) ref.current?.reset()
  }, [state])
  return ref
}

export function ProfileForm({ action, name, phone, email }: { action: Action; name: string; phone: string; email: string }) {
  const [state, formAction, pending] = useActionState(action, null)
  const f = state?.fields ?? { name, phone }
  return (
    <form action={formAction} className="form">
      <Field label="Имя" name="name" required value={f.name} autoComplete="name" />
      <Field label="Телефон" name="phone" type="tel" required value={f.phone} autoComplete="tel" inputMode="tel" />
      <label className="field">
        <span>Email (логин)</span>
        <input value={email} readOnly disabled />
        <small className="muted">Сменить email можно через менеджера.</small>
      </label>
      <Result state={state} ok="Сохранено." />
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? 'Сохраняем…' : 'Сохранить'}
      </button>
    </form>
  )
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  const ref = useResetOnOk(state)
  return (
    <form action={formAction} className="form" ref={ref}>
      <Field label="Текущий пароль" name="current" type="password" required autoComplete="current-password" />
      <div className="field-row">
        <Field label="Новый пароль" name="password" type="password" required autoComplete="new-password" hint="Не короче 8 символов" />
        <Field label="Ещё раз" name="password2" type="password" required autoComplete="new-password" />
      </div>
      <Result state={state} ok="Пароль изменён." />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? 'Меняем…' : 'Сменить пароль'}
      </button>
    </form>
  )
}

export function AddressForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  const ref = useResetOnOk(state)
  const f = state?.ok ? {} : (state?.fields ?? {})
  return (
    <form action={formAction} className="form acc-add" ref={ref}>
      <Field
        label="Новый адрес"
        name="address"
        required
        value={f.address}
        autoComplete="street-address"
        placeholder="Город, улица, дом, подъезд, квартира"
      />
      <Field label="Комментарий для водителя" name="comment" value={f.comment} placeholder="Код домофона, этаж, как подъехать" />
      <Result state={state} ok="Адрес добавлен — он появится в корзине при оформлении." />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? 'Добавляем…' : 'Добавить адрес'}
      </button>
    </form>
  )
}

export function OrgForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  const ref = useResetOnOk(state)
  const f = state?.ok ? {} : (state?.fields ?? {})
  return (
    <form action={formAction} className="form acc-add" ref={ref}>
      <div className="field-row">
        <Field label="ИНН" name="inn" required value={f.inn} inputMode="numeric" maxLength={12} hint="10 или 12 цифр" />
        <Field label="КПП" name="kpp" value={f.kpp} inputMode="numeric" maxLength={9} />
      </div>
      <Field label="Название" name="title" value={f.title} placeholder="ООО «Ромашка»" />
      <Result state={state} ok="Отправлено. Менеджер привяжет организацию и назначит цены." />
      <button type="submit" className="btn btn-outline" disabled={pending}>
        {pending ? 'Отправляем…' : 'Добавить организацию'}
      </button>
    </form>
  )
}

/** Кнопка «Удалить» в строке списка (форма с серверным действием). */
export function RemoveButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className="link-btn small acc-remove" disabled={pending} aria-label={label}>
      {pending ? 'Удаляем…' : 'Удалить'}
    </button>
  )
}
