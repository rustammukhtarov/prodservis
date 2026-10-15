import type { CollectionConfig } from 'payload'

import { anyone, contentAccess } from '../access'
import { seoFields, slugField } from '../fields/common'

/** Подборки товаров: «Паназия», «Кофейня», «Акции недели» — собираются вручную в админке. */
export const ProductCollections: CollectionConfig = {
  slug: 'collections',
  labels: { singular: 'Подборка', plural: 'Подборки' },
  admin: { useAsTitle: 'title', group: 'Каталог' },
  access: { read: anyone, create: contentAccess, update: contentAccess, delete: contentAccess },
  defaultSort: 'sort',
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true },
    slugField(),
    {
      name: 'kind',
      label: 'Тип',
      type: 'select',
      defaultValue: 'cuisine',
      options: [
        { label: 'Кухня / формат заведения', value: 'cuisine' },
        { label: 'Акция', value: 'promo' },
        { label: 'Сезонное', value: 'season' },
      ],
    },
    { name: 'image', label: 'Картинка', type: 'upload', relationTo: 'media' },
    { name: 'sort', label: 'Порядок', type: 'number', defaultValue: 100 },
    seoFields,
  ],
}
