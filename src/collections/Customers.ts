import type { CollectionConfig, FieldAccess } from 'payload'

type FieldAccessConfig = { create: FieldAccess; update: FieldAccess }

import { isStaff, salesAccess } from '../access'
import { guid1C } from '../fields/common'
import { emailLayout, sendSafe, siteURL } from '../lib/email'
import { SEGMENT_OPTIONS } from '../lib/segments'
import { validateInn } from './SupplierApplications'

/** Поля, которые клиент не может задать сам ни при регистрации, ни потом. */
const staffWriteOnly: FieldAccessConfig = {
  create: ({ req: { user } }) => isStaff(user),
  update: ({ req: { user } }) => isStaff(user),
}

/** Клиенты — входят в личный кабинет на сайте. */
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Клиент', plural: 'Клиенты' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'segment', 'buyers', 'status'],
    group: 'Клиенты',
    listSearchableFields: ['name', 'email', 'phone'],
  },
  auth: {
    forgotPassword: {
      generateEmailSubject: () => 'Восстановление пароля — Продсервис',
      generateEmailHTML: (args) =>
        emailLayout({
          title: 'Восстановление пароля',
          paragraphs: [
            'Вы запросили смену пароля для входа на сайт Продсервис.',
            'Ссылка действует 1 час. Если вы ничего не запрашивали, просто проигнорируйте это письмо.',
          ],
          button: { text: 'Задать новый пароль', url: `${siteURL()}/reset-password?token=${args?.token ?? ''}` },
        }),
    },
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    admin: () => false,
    // Регистрация идёт через форму сайта (серверное действие с проверками и ограничением частоты).
    create: ({ req: { user } }) => isStaff(user),
    read: ({ req: { user } }) => {
      if (isStaff(user)) return true
      if (user?.collection === 'customers') return { id: { equals: user.id } }
      return false
    },
    update: ({ req: { user } }) => {
      if (isStaff(user)) return true
      if (user?.collection === 'customers') return { id: { equals: user.id } }
      return false
    },
    delete: salesAccess,
  },
  fields: [
    { name: 'name', label: 'Контактное лицо', type: 'text', required: true },
    { name: 'phone', label: 'Телефон', type: 'text' },
    {
      name: 'segment',
      label: 'Тип клиента',
      type: 'select',
      required: true,
      defaultValue: 'horeca',
      options: SEGMENT_OPTIONS,
      // Выбирается при регистрации; дальше меняет только сотрудник.
      access: { update: ({ req: { user } }) => isStaff(user) },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'На проверке', value: 'pending' },
        { label: 'Активен', value: 'active' },
        { label: 'Заблокирован', value: 'blocked' },
      ],
      access: staffWriteOnly,
      admin: { position: 'sidebar' },
    },
    {
      name: 'buyers',
      label: 'Юрлица и партнёры, от имени которых заказывает',
      type: 'relationship',
      relationTo: 'buyers',
      hasMany: true,
      access: staffWriteOnly,
      saveToJWT: true,
      admin: { description: 'Привязывает менеджер после проверки. Цены берутся от выбранного юрлица.' },
    },
    {
      name: 'requestedOrgs',
      label: 'Организации, указанные клиентом',
      type: 'array',
      labels: { singular: 'Организация', plural: 'Организации' },
      admin: { description: 'Клиент вводит ИНН сам; менеджер находит это юрлицо в 1С и привязывает выше.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'inn', label: 'ИНН', type: 'text', required: true, validate: validateInn },
            { name: 'title', label: 'Название', type: 'text' },
            { name: 'kpp', label: 'КПП', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'addresses',
      label: 'Адреса доставки (для физлиц)',
      type: 'array',
      labels: { singular: 'Адрес', plural: 'Адреса' },
      fields: [
        { name: 'address', label: 'Адрес', type: 'text', required: true },
        { name: 'comment', label: 'Комментарий для водителя', type: 'text' },
      ],
    },
    {
      name: 'manager',
      label: 'Персональный менеджер',
      type: 'relationship',
      relationTo: 'users',
      access: staffWriteOnly,
      admin: { position: 'sidebar' },
    },
    {
      name: 'consent',
      label: 'Согласие на обработку персональных данных',
      type: 'group',
      access: { update: ({ req: { user } }) => isStaff(user) },
      fields: [
        {
          name: 'accepted',
          label: 'Согласие получено',
          type: 'checkbox',
          validate: (
            value: unknown,
            { req, operation }: { req: { user?: unknown; payloadAPI?: string }; operation?: string },
          ) =>
            operation === 'create' && req.payloadAPI !== 'local' && !isStaff(req.user as never) && value !== true
              ? 'Нужно согласие на обработку персональных данных'
              : true,
        },
        { name: 'acceptedAt', label: 'Дата согласия', type: 'date', admin: { readOnly: true } },
      ],
    },
    guid1C(false),
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || previousDoc?.status === 'active' || doc.status !== 'active') return doc
        await sendSafe(req.payload, {
          to: doc.email,
          subject: 'Ваш аккаунт активирован — Продсервис',
          html: emailLayout({
            title: 'Ваши цены готовы',
            paragraphs: [
              `${doc.name}, менеджер проверил вашу заявку и назначил цены.`,
              'Войдите на сайт — каталог покажет ваш прайс, цены торгов и индивидуальные условия.',
            ],
            button: { text: 'Перейти в каталог', url: `${siteURL()}/catalog` },
          }),
        })
        return doc
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // Сотрудник в админке и служебные скрипты (обмен с 1С, импорт) задают статус сами.
        if (operation !== 'create' || isStaff(req.user) || req.payloadAPI === 'local') return data
        // Самостоятельная регистрация: статус решает сервер, а не форма.
        const settings = await req.payload.findGlobal({ slug: 'site-settings', req, depth: 0 })
        const rules = (settings.segments as Record<string, { autoApprove?: boolean | null } | undefined>)?.[
          data.segment
        ]
        data.status = rules?.autoApprove ? 'active' : 'pending'
        data.consent = { ...(data.consent ?? {}), acceptedAt: new Date().toISOString() }
        return data
      },
    ],
  },
}
