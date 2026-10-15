import type { CollectionConfig } from 'payload'

import { salesAccess, staffOnly } from '../access'
import { guid1CField } from '../fields/common'

/**
 * Цены торгов (на сеть) и индивидуальные цены (на клиента) на период.
 * Ведутся в 1С и приходят обменом; вручную правятся только в исключительных случаях.
 */
export const PriceAgreements: CollectionConfig = {
  slug: 'price-agreements',
  labels: { singular: 'Цены на период', plural: 'Торги и инд. цены' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'kind', 'group', 'buyer', 'validFrom', 'validTo'],
    group: 'Цены',
  },
  access: { read: staffOnly, create: salesAccess, update: salesAccess, delete: salesAccess },
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true },
    {
      name: 'kind',
      label: 'Тип',
      type: 'select',
      required: true,
      defaultValue: 'tender',
      options: [
        { label: 'Торги (на сеть)', value: 'tender' },
        { label: 'Индивидуальные цены покупателя', value: 'individual' },
      ],
    },
    {
      name: 'group',
      label: 'Сеть',
      type: 'relationship',
      relationTo: 'customer-groups',
      admin: { condition: (data) => data?.kind === 'tender' },
      validate: (value: unknown, { siblingData }: { siblingData: { kind?: string } }) =>
        siblingData?.kind === 'tender' && !value ? 'Для торгов укажите сеть' : true,
    },
    {
      name: 'buyer',
      label: 'Покупатель (контрагент или партнёр)',
      type: 'relationship',
      relationTo: 'buyers',
      admin: { condition: (data) => data?.kind === 'individual' },
      validate: (value: unknown, { siblingData }: { siblingData: { kind?: string } }) =>
        siblingData?.kind === 'individual' && !value ? 'Для индивидуальных цен укажите покупателя' : true,
    },
    {
      type: 'row',
      fields: [
        {
          name: 'validFrom',
          label: 'Действует с',
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
        {
          name: 'validTo',
          label: 'Действует по (включительно)',
          type: 'date',
          required: true,
          index: true,
          admin: { date: { pickerAppearance: 'dayOnly' } },
        },
      ],
    },
    {
      name: 'items',
      label: 'Товары и цены',
      type: 'array',
      required: true,
      labels: { singular: 'Позиция', plural: 'Позиции' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'product', label: 'Товар', type: 'relationship', relationTo: 'products', required: true },
            { name: 'price', label: 'Цена, ₽', type: 'number', required: true, min: 0 },
          ],
        },
      ],
    },
    guid1CField,
  ],
}
