import type { CollectionConfig } from 'payload'

import { anyone, contentAccess } from '../access'
import { guid1CField, seoFields, slugField } from '../fields/common'

/** Дерево каталога: раздел → подраздел. Приходит из групп номенклатуры 1С. */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Категория', plural: 'Категории' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'parent', 'sort', 'isVisible'],
    group: 'Каталог',
  },
  access: { read: anyone, create: contentAccess, update: contentAccess, delete: contentAccess },
  defaultSort: 'sort',
  fields: [
    { name: 'title', label: 'Название', type: 'text', required: true },
    slugField(),
    {
      name: 'parent',
      label: 'Родительская категория',
      type: 'relationship',
      relationTo: 'categories',
      admin: { position: 'sidebar' },
    },
    { name: 'image', label: 'Картинка', type: 'upload', relationTo: 'media' },
    { name: 'description', label: 'SEO-текст под списком товаров', type: 'richText' },
    { name: 'sort', label: 'Порядок', type: 'number', defaultValue: 500, admin: { position: 'sidebar' } },
    {
      name: 'isVisible',
      label: 'Показывать на сайте',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    guid1CField,
    seoFields,
  ],
}
