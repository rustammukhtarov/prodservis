import type { CollectionConfig } from 'payload'

import { anyone, salesAccess } from '../access'
import { guid1CField } from '../fields/common'

/** Прайсы (виды цен 1С): Прайс 2, Прайс 3, Прайс 4… */
export const PriceTypes: CollectionConfig = {
  slug: 'price-types',
  labels: { singular: 'Прайс', plural: 'Прайсы' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isGuestDefault', 'sort'],
    group: 'Цены',
    description: 'Виды цен из 1С. Клиенту назначается один прайс; гость видит прайс «по умолчанию».',
  },
  access: { read: anyone, create: salesAccess, update: salesAccess, delete: salesAccess },
  defaultSort: 'sort',
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true },
    {
      name: 'isGuestDefault',
      label: 'Показывать гостям (без входа)',
      type: 'checkbox',
      defaultValue: false,
    },
    { name: 'sort', label: 'Порядок', type: 'number', defaultValue: 100 },
    guid1CField,
  ],
}
