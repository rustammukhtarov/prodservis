'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { validateInn } from '@/collections/SupplierApplications'
import { emailLayout, sendSafe, siteURL, staffRecipients } from '@/lib/email'
import { allow, clientIp } from '@/lib/rateLimit'
import { isB2B, SEGMENTS } from '@/lib/segments'

import { setAuthCookie } from './lib/authCookie'
import { getPayloadClient } from './lib/viewer'

export type FormState = { error?: string; ok?: boolean; fields?: Record<string, string> } | null

const HOUR = 60 * 60 * 1000
const str = (fd: FormData, k: string, max = 300) =>
  String(fd.get(k) ?? '')
    .trim()
    .slice(0, max)
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const digits = (s: string) => s.replace(/\D/g, '')
/** Что вернуть в форму, чтобы человек не набирал всё заново (пароли — никогда). */
const keep = (fd: FormData, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, str(fd, k, 2000)]))

const REG_FIELDS = [
  'segment',
  'name',
  'phone',
  'email',
  'inn',
  'orgTitle',
  'kpp',
  'address',
  'comment',
]

/** Регистрация клиента: юрлица — «на проверке», физлица — сразу активны (по настройкам типа). */
export async function registerCustomer(_prev: FormState, fd: FormData): Promise<FormState> {
  const fields = keep(fd, REG_FIELDS)
  const fail = (error: string): FormState => ({ error, fields })

  if (str(fd, 'company_site')) return fail('Не удалось отправить форму.') // ловушка для ботов
  const ip = clientIp(await headers())
  if (!allow(`register:${ip}`, 5, HOUR))
    return fail('Слишком много регистраций с этого адреса. Попробуйте через час.')

  const segment = str(fd, 'segment')
  if (!SEGMENTS.some((s) => s.value === segment))
    return fail('Выберите, кто вы: ресторан, магазин, опт или для дома.')
  const b2b = isB2B(segment)
  const name = str(fd, 'name', 120)
  const phone = str(fd, 'phone', 40)
  const email = str(fd, 'email', 120).toLowerCase()
  const password = String(fd.get('password') ?? '')
  const inn = digits(str(fd, 'inn', 20))
  const address = str(fd, 'address', 300)

  if (name.length < 2) return fail('Укажите имя контактного лица.')
  if (digits(phone).length < 10) return fail('Укажите телефон для связи.')
  if (!isEmail(email)) return fail('Проверьте email.')
  if (password.length < 8) return fail('Пароль — не короче 8 символов.')
  if (password !== String(fd.get('password2') ?? '')) return fail('Пароли не совпадают.')
  if (b2b) {
    const innOk = validateInn(inn)
    if (innOk !== true) return fail(innOk)
  } else if (address.length < 5) return fail('Укажите адрес доставки.')
  if (fd.get('consent') !== 'on') return fail('Нужно согласие на обработку персональных данных.')

  const payload = await getPayloadClient()
  const exists = await payload.count({
    collection: 'customers',
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  if (exists.totalDocs)
    return fail('Этот email уже зарегистрирован. Войдите или восстановите пароль.')

  const settings = (await payload.findGlobal({
    slug: 'site-settings',
    depth: 0,
    overrideAccess: true,
  })) as {
    segments?: Record<string, { autoApprove?: boolean | null } | null>
  }
  const autoApprove = settings.segments?.[segment]?.autoApprove ?? !b2b
  const status = autoApprove ? 'active' : 'pending'

  try {
    await payload.create({
      collection: 'customers',
      overrideAccess: true,
      data: {
        email,
        password,
        name,
        phone,
        segment: segment as never,
        status,
        consent: { accepted: true, acceptedAt: new Date().toISOString() },
        requestedOrgs: b2b
          ? [
              {
                inn,
                title: str(fd, 'orgTitle', 200) || null,
                kpp: digits(str(fd, 'kpp', 20)) || null,
              },
            ]
          : [],
        addresses: address ? [{ address, comment: str(fd, 'comment', 300) || null }] : [],
      } as never,
    })
  } catch (e) {
    payload.logger.error(`Регистрация не сохранена: ${e instanceof Error ? e.message : String(e)}`)
    return fail('Не получилось зарегистрироваться. Проверьте поля и попробуйте ещё раз.')
  }

  const login = await payload.login({
    collection: 'customers',
    data: { email, password },
    overrideAccess: true,
  })
  if (login.token) await setAuthCookie(login.token, login.exp)

  // Уведомления (ошибка почты регистрацию не отменяет).
  const typeLabel = SEGMENTS.find((s) => s.value === segment)?.label ?? segment
  await sendSafe(payload, {
    to: await staffRecipients(payload),
    subject: `Новый клиент на сайте: ${name}${b2b ? ` (ИНН ${inn})` : ''}`,
    html: emailLayout({
      title: b2b ? 'Новая заявка клиента — нужна проверка' : 'Новый покупатель-физлицо',
      paragraphs: [
        `Тип: ${typeLabel}`,
        `Контакт: ${name}, ${phone}, ${email}`,
        ...(b2b
          ? [`Организация: ${str(fd, 'orgTitle', 200) || '—'}, ИНН ${inn}`]
          : [`Адрес: ${address}`]),
        b2b
          ? 'Найдите организацию в 1С, привяжите её к клиенту в админке и поставьте статус «Активен».'
          : 'Аккаунт уже активен.',
      ],
      button: {
        text: 'Открыть клиентов в админке',
        url: `${siteURL()}/admin/collections/customers`,
      },
    }),
  })
  await sendSafe(payload, {
    to: email,
    subject: 'Вы зарегистрированы на сайте Продсервис',
    html: emailLayout({
      title: `${name}, добро пожаловать!`,
      paragraphs: b2b
        ? [
            'Мы получили вашу заявку. Менеджер проверит организацию и назначит ваши цены — обычно в течение рабочего дня.',
            'Пока можно смотреть каталог: цены показываются для гостей.',
          ]
        : ['Аккаунт активен — можно заказывать.', 'Минимальная сумма заказа указана в корзине.'],
      button: { text: 'Перейти в каталог', url: `${siteURL()}/catalog` },
    }),
  })

  redirect(`/register/done?type=${b2b ? 'b2b' : 'person'}`)
}

const SUP_FIELDS = ['company', 'inn', 'contactName', 'phone', 'email', 'website', 'assortment']
const MAX_FILE = 10 * 1024 * 1024
const FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

/** Заявка поставщика с коммерческим предложением (файл — в закрытую папку). */
export async function submitSupplier(_prev: FormState, fd: FormData): Promise<FormState> {
  const fields = keep(fd, SUP_FIELDS)
  const fail = (error: string): FormState => ({ error, fields })

  if (str(fd, 'company_site')) return fail('Не удалось отправить форму.')
  const ip = clientIp(await headers())
  if (!allow(`supplier:${ip}`, 3, HOUR))
    return fail('Слишком много заявок с этого адреса. Попробуйте через час.')

  const company = str(fd, 'company', 200)
  const inn = digits(str(fd, 'inn', 20))
  const contactName = str(fd, 'contactName', 120)
  const phone = str(fd, 'phone', 40)
  const email = str(fd, 'email', 120).toLowerCase()
  if (company.length < 2) return fail('Укажите организацию.')
  const innOk = validateInn(inn)
  if (innOk !== true) return fail(innOk)
  if (contactName.length < 2) return fail('Укажите контактное лицо.')
  if (digits(phone).length < 10) return fail('Укажите телефон.')
  if (!isEmail(email)) return fail('Проверьте email.')
  if (fd.get('consent') !== 'on') return fail('Нужно согласие на обработку персональных данных.')

  const file = fd.get('offer')
  const hasFile = file instanceof File && file.size > 0
  if (hasFile && file.size > MAX_FILE) return fail('Файл больше 10 МБ.')
  if (hasFile && !FILE_TYPES.has(file.type)) return fail('Файл — PDF, Word, Excel, JPG или PNG.')

  const payload = await getPayloadClient()
  let offer: number | null = null
  try {
    if (hasFile) {
      const doc = await payload.create({
        collection: 'documents',
        overrideAccess: true,
        data: { note: `КП поставщика: ${company}, ИНН ${inn}` },
        file: {
          data: Buffer.from(await file.arrayBuffer()),
          mimetype: file.type,
          name: file.name.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || 'offer',
          size: file.size,
        },
      })
      offer = doc.id as number
    }

    await payload.create({
      collection: 'supplier-applications',
      overrideAccess: true,
      data: {
        company,
        inn,
        contactName,
        phone,
        email,
        website: str(fd, 'website', 200) || null,
        assortment: str(fd, 'assortment', 4000) || null,
        offer,
        consent: true,
      } as never,
    })
  } catch (e) {
    payload.logger.error(
      `Заявка поставщика не сохранена: ${e instanceof Error ? e.message : String(e)}`,
    )
    return fail(
      hasFile
        ? 'Не получилось сохранить заявку: файл не открывается. Проверьте файл или отправьте заявку без него.'
        : 'Не получилось сохранить заявку. Попробуйте ещё раз.',
    )
  }

  await sendSafe(payload, {
    to: await staffRecipients(payload),
    subject: `Заявка поставщика: ${company}`,
    html: emailLayout({
      title: 'Новая заявка поставщика',
      paragraphs: [
        `${company}, ИНН ${inn}`,
        `Контакт: ${contactName}, ${phone}, ${email}`,
        `Ассортимент: ${str(fd, 'assortment', 600) || '—'}`,
        hasFile ? 'Коммерческое предложение приложено к заявке в админке.' : 'Файл не приложен.',
      ],
      button: {
        text: 'Открыть заявки',
        url: `${siteURL()}/admin/collections/supplier-applications`,
      },
    }),
  })
  return { ok: true }
}

/** Письмо со ссылкой на смену пароля. Ответ одинаковый, есть такой email или нет. */
export async function requestPasswordReset(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email', 120).toLowerCase()
  if (!isEmail(email)) return { error: 'Проверьте email.', fields: { email } }
  const ip = clientIp(await headers())
  if (!allow(`reset:${ip}`, 5, HOUR))
    return { error: 'Слишком много попыток. Попробуйте через час.', fields: { email } }
  const payload = await getPayloadClient()
  await payload.forgotPassword({ collection: 'customers', data: { email } }).catch(() => null)
  return { ok: true }
}

/** Новый пароль по ссылке из письма; после смены — сразу вход. */
export async function resetPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, 'token', 200)
  const password = String(fd.get('password') ?? '')
  if (password.length < 8) return { error: 'Пароль — не короче 8 символов.' }
  if (password !== String(fd.get('password2') ?? '')) return { error: 'Пароли не совпадают.' }
  const payload = await getPayloadClient()
  try {
    const res = await payload.resetPassword({
      collection: 'customers',
      data: { token, password },
      overrideAccess: true,
    })
    if (res.token) await setAuthCookie(res.token)
  } catch {
    return { error: 'Ссылка устарела или уже использована. Запросите новую.' }
  }
  redirect('/catalog')
}
