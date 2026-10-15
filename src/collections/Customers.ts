import type { CollectionConfig, FieldAccess } from 'payload'

type FieldAccessConfig = { create: FieldAccess; update: FieldAccess }

import { isStaff, salesAccess } from '../access'
import { guid1C } from '../fields/common'
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
    defaultColumns: ['name', 'email', 'priceType', 'group', 'status'],
    group: 'Клиенты',
    listSearchableFields: ['name', 'email', 'phone'],
  },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    admin: () => false,
    // Регистрация открыта; новый клиент получает статус «на проверке».
    create: () => true,
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
      name: 'organizations',
      label: 'Организации',
      type: 'array',
      labels: { singular: 'Организация', plural: 'Организации' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', label: 'Название', type: 'text', required: true },
            { name: 'inn', label: 'ИНН', type: 'text', required: true, validate: validateInn },
            { name: 'kpp', label: 'КПП', type: 'text' },
          ],
        },
        { name: 'guid1C', label: 'ID контрагента в 1С', type: 'text', access: staffWriteOnly },
      ],
    },
    {
      name: 'addresses',
      label: 'Адреса доставки',
      type: 'array',
      labels: { singular: 'Адрес', plural: 'Адреса' },
      fields: [
        { name: 'address', label: 'Адрес', type: 'text', required: true },
        { name: 'comment', label: 'Комментарий для водителя', type: 'text' },
      ],
    },
    {
      type: 'collapsible',
      label: 'Условия (назначает менеджер или 1С)',
      admin: { position: 'sidebar' },
      fields: [
        {
          name: 'priceType',
          label: 'Прайс',
          type: 'relationship',
          relationTo: 'price-types',
          access: staffWriteOnly,
        },
        {
          name: 'group',
          label: 'Сеть',
          type: 'relationship',
          relationTo: 'customer-groups',
          access: staffWriteOnly,
        },
        {
          name: 'manager',
          label: 'Персональный менеджер',
          type: 'relationship',
          relationTo: 'users',
          access: staffWriteOnly,
        },
      ],
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
