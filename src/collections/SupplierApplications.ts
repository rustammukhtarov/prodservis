import type { CollectionConfig } from 'payload'

import { isStaff, salesAccess, staffOnly } from '../access'

/** Заявки поставщиков: «Стать поставщиком» на сайте. */
export const SupplierApplications: CollectionConfig = {
  slug: 'supplier-applications',
  labels: { singular: 'Заявка поставщика', plural: 'Заявки поставщиков' },
  admin: {
    useAsTitle: 'company',
    defaultColumns: ['company', 'inn', 'contactName', 'phone', 'status', 'createdAt'],
    group: 'Клиенты',
  },
  access: { create: staffOnly, read: staffOnly, update: salesAccess, delete: salesAccess },
  defaultSort: '-createdAt',
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'company', label: 'Организация', type: 'text', required: true },
        { name: 'inn', label: 'ИНН', type: 'text', required: true, validate: validateInn },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'contactName', label: 'ФИО', type: 'text', required: true },
        { name: 'phone', label: 'Телефон', type: 'text', required: true },
        { name: 'email', label: 'E-mail', type: 'email', required: true },
      ],
    },
    { name: 'website', label: 'Сайт', type: 'text' },
    { name: 'assortment', label: 'Что поставляете', type: 'textarea' },
    { name: 'offer', label: 'Коммерческое предложение', type: 'upload', relationTo: 'documents' },
    {
      name: 'consent',
      label: 'Согласие на обработку персональных данных',
      type: 'checkbox',
      required: true,
      validate: (value: unknown) => (value === true ? true : 'Нужно согласие на обработку персональных данных'),
    },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'new',
      options: [
        { label: 'Новая', value: 'new' },
        { label: 'В работе', value: 'review' },
        { label: 'Договор', value: 'contract' },
        { label: 'Отказ', value: 'rejected' },
      ],
      access: { create: ({ req: { user } }) => isStaff(user), update: ({ req: { user } }) => isStaff(user) },
      admin: { position: 'sidebar' },
    },
    { name: 'managerNote', label: 'Комментарий менеджера', type: 'textarea', access: { read: ({ req: { user } }) => isStaff(user) } },
  ],
}

/** ИНН: 10 цифр (юрлицо) или 12 (ИП) с проверкой контрольных разрядов. */
export function validateInn(value: unknown): true | string {
  if (typeof value !== 'string' || !/^\d{10}(\d{2})?$/.test(value)) return 'ИНН — 10 или 12 цифр'
  const d = value.split('').map(Number)
  const check = (weights: number[]) => (weights.reduce((sum, w, i) => sum + w * d[i], 0) % 11) % 10
  if (d.length === 10) return check([2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9] ? true : 'Неверный ИНН'
  const ok =
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[10] && check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[11]
  return ok ? true : 'Неверный ИНН'
}
