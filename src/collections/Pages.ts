import type { CollectionConfig } from 'payload'

import { anyone, contentAccess } from '../access'
import { seoFields, slugField } from '../fields/common'

/** Информационные страницы: о компании, доставка, отсрочка, поставщикам, документы. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Страница', plural: 'Страницы' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', 'updatedAt'], group: 'Контент' },
  access: { read: anyone, create: contentAccess, update: contentAccess, delete: contentAccess },
  versions: { drafts: true, maxPerDoc: 20 },
  fields: [
    { name: 'title', label: 'Заголовок', type: 'text', required: true },
    slugField(),
    { name: 'lead', label: 'Подзаголовок', type: 'textarea' },
    { name: 'content', label: 'Текст', type: 'richText' },
    {
      name: 'faq',
      label: 'Вопросы и ответы',
      type: 'array',
      fields: [
        { name: 'question', label: 'Вопрос', type: 'text', required: true },
        { name: 'answer', label: 'Ответ', type: 'textarea', required: true },
      ],
    },
    seoFields,
  ],
}
