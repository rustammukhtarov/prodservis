import type { CollectionConfig } from 'payload'

import { salesAccess, staffOnly } from '../access'
import { guid1CField } from '../fields/common'

/** Сети ресторанов и производств. Цены торгов назначаются на сеть целиком. */
export const CustomerGroups: CollectionConfig = {
  slug: 'customer-groups',
  labels: { singular: 'Сеть', plural: 'Сети клиентов' },
  admin: { useAsTitle: 'title', group: 'Клиенты' },
  access: { read: staffOnly, create: salesAccess, update: salesAccess, delete: salesAccess },
  fields: [
    { name: 'title', label: 'Название сети', type: 'text', required: true },
    { name: 'note', label: 'Комментарий', type: 'textarea' },
    guid1CField,
  ],
}
