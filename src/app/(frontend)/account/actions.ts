'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { validateInn } from '@/collections/SupplierApplications'
import { emailLayout, sendSafe, siteURL, staffRecipients } from '@/lib/email'
import { allow } from '@/lib/rateLimit'
import type { Customer } from '@/payload-types'

import type { FormState } from '../account-actions'
import { setAuthCookie } from '../lib/authCookie'
import { getViewer } from '../lib/viewer'

const HOUR = 60 * 60 * 1000
const MAX_ADDRESSES = 20
const MAX_ORGS = 10

const str = (fd: FormData, k: string, max = 300) =>
  String(fd.get(k) ?? '')
    .trim()
    .slice(0, max)
const digits = (s: string) => s.replace(/\D/g, '')

/** Вошедший клиент; без входа — на страницу входа. Все правки — только своей записи. */
async function me() {
  const viewer = await getViewer()
  if (!viewer.customer) redirect('/login?next=/account')
  return { payload: viewer.payload, customer: viewer.customer, buyers: viewer.buyers }
}

async function save(customer: Customer, data: Partial<Customer>) {
  const { payload } = await me()
  await payload.update({ collection: 'customers', id: customer.id, data: data as never, overrideAccess: true })
  revalidatePath('/account')
}

/** Имя и телефон. Email — логин, его меняет менеджер. */
export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { customer } = await me()
  const name = str(fd, 'name', 120)
  const phone = str(fd, 'phone', 40)
  const fields = { name, phone }
  if (name.length < 2) return { error: 'Укажите имя.', fields }
  if (digits(phone).length < 10) return { error: 'Укажите телефон для связи.', fields }
  try {
    await save(customer, { name, phone })
  } catch {
    return { error: 'Не получилось сохранить. Попробуйте ещё раз.', fields }
  }
  return { ok: true, fields }
}

/** Смена пароля: нужен текущий; после смены вход обновляется, чтобы не выкинуло с сайта. */
export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const { payload, customer } = await me()
  if (!allow(`password:${customer.id}`, 5, HOUR)) return { error: 'Слишком много попыток. Попробуйте через час.' }
  const current = String(fd.get('current') ?? '')
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'Новый пароль — не короче 8 символов.' }
  if (password !== String(fd.get('password2') ?? '')) return { error: 'Новые пароли не совпадают.' }
  if (password === current) return { error: 'Новый пароль совпадает с текущим.' }

  try {
    await payload.login({ collection: 'customers', data: { email: customer.email, password: current } })
  } catch {
    return { error: 'Текущий пароль указан неверно.' }
  }
  try {
    await payload.update({ collection: 'customers', id: customer.id, data: { password }, overrideAccess: true })
    const res = await payload.login({ collection: 'customers', data: { email: customer.email, password } })
    if (res.token) await setAuthCookie(res.token, res.exp)
  } catch {
    return { error: 'Не получилось сменить пароль. Попробуйте ещё раз.' }
  }
  // Старый вход после смены пароля недействителен, а страница в этом же ответе
  // отрисовалась бы со старым cookie — поэтому открываем кабинет заново, уже с новым.
  redirect('/account?password=changed')
}

/** Новый адрес доставки — потом подставляется в корзине. */
export async function addAddress(_prev: FormState, fd: FormData): Promise<FormState> {
  const { customer } = await me()
  const address = str(fd, 'address', 300)
  const comment = str(fd, 'comment', 300)
  const fields = { address, comment }
  if (address.length < 5) return { error: 'Укажите адрес: город, улица, дом.', fields }
  const list = customer.addresses ?? []
  if (list.length >= MAX_ADDRESSES) return { error: `Не больше ${MAX_ADDRESSES} адресов.`, fields }
  if (list.some((a) => a.address.trim().toLowerCase() === address.toLowerCase()))
    return { error: 'Такой адрес уже есть.', fields }
  try {
    await save(customer, { addresses: [...list, { address, comment: comment || null }] })
  } catch {
    return { error: 'Не получилось сохранить адрес.', fields }
  }
  return { ok: true }
}

export async function removeAddress(fd: FormData): Promise<void> {
  const { customer } = await me()
  const id = str(fd, 'id', 64)
  const list = customer.addresses ?? []
  if (!list.some((a) => a.id === id)) return
  await save(customer, { addresses: list.filter((a) => a.id !== id) })
}

/** Ещё одна организация: клиент вводит ИНН, менеджер находит её в 1С и привязывает. */
export async function requestOrg(_prev: FormState, fd: FormData): Promise<FormState> {
  const { payload, customer, buyers } = await me()
  const inn = digits(str(fd, 'inn', 20))
  const kpp = digits(str(fd, 'kpp', 20))
  const title = str(fd, 'title', 200)
  const fields = { inn, kpp, title }
  const innOk = validateInn(inn)
  if (innOk !== true) return { error: innOk, fields }
  if (!allow(`org:${customer.id}`, 10, HOUR)) return { error: 'Слишком много заявок. Попробуйте через час.', fields }

  const requested = customer.requestedOrgs ?? []
  if (buyers.some((b) => b.inn === inn)) return { error: 'Эта организация уже привязана к вашему кабинету.', fields }
  if (requested.some((o) => o.inn === inn)) return { error: 'Эта организация уже на проверке.', fields }
  if (requested.length >= MAX_ORGS) return { error: `Не больше ${MAX_ORGS} заявок на организации.`, fields }

  try {
    await save(customer, { requestedOrgs: [...requested, { inn, kpp: kpp || null, title: title || null }] })
  } catch {
    return { error: 'Не получилось отправить. Проверьте ИНН.', fields }
  }

  await sendSafe(payload, {
    to: await staffRecipients(payload),
    subject: `Клиент добавил организацию: ИНН ${inn}`,
    html: emailLayout({
      title: 'Нужно привязать организацию к клиенту',
      paragraphs: [
        `Клиент: ${customer.name}, ${customer.email}${customer.phone ? `, ${customer.phone}` : ''}`,
        `Организация: ${title || '—'}, ИНН ${inn}${kpp ? `, КПП ${kpp}` : ''}`,
        'Найдите её в 1С и добавьте в поле «Юрлица и партнёры» у клиента в админке.',
      ],
      button: { text: 'Открыть клиента', url: `${siteURL()}/admin/collections/customers/${customer.id}` },
    }),
  })
  return { ok: true }
}

export async function removeRequestedOrg(fd: FormData): Promise<void> {
  const { customer } = await me()
  const id = str(fd, 'id', 64)
  const list = customer.requestedOrgs ?? []
  if (!list.some((o) => o.id === id)) return
  await save(customer, { requestedOrgs: list.filter((o) => o.id !== id) })
}
