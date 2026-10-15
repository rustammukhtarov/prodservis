import type { CollectionConfig } from 'payload'

import { isStaff, salesAccess } from '../access'
import { guid1C } from '../fields/common'
import { validateInn } from './SupplierApplications'

const staffOnlyRead = { read: ({ req: { user } }: { req: { user: unknown } }) => isStaff(user as never) }

/**
 * Покупатели так, как они заведены в 1С:
 *   Контрагент — основное юрлицо; к нему относятся Партнёры (могут быть другими юрлицами);
 *   у каждого — свои точки доставки. Сеть — папка (группа) в 1С.
 * Прайс и сеть, не заданные у партнёра, наследуются от его контрагента.
 * Заполняется обменом с 1С; вручную — только в исключительных случаях.
 */
export const Buyers: CollectionConfig = {
  slug: 'buyers',
  labels: { singular: 'Покупатель (юрлицо)', plural: 'Покупатели (юрлица)' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'inn', 'kind', 'parent', 'group', 'priceType'],
    group: 'Клиенты',
    listSearchableFields: ['title', 'inn'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (isStaff(user)) return true
      // Клиент видит только юрлица, к которым его привязал менеджер.
      if (user?.collection === 'customers') {
        const ids = ((user as { buyers?: unknown[] }).buyers ?? []).map((b) =>
          typeof b === 'object' && b !== null ? (b as { id: number }).id : b,
        )
        return { id: { in: ids.length ? ids : [-1] } }
      }
      return false
    },
    create: salesAccess,
    update: salesAccess,
    delete: salesAccess,
  },
  fields: [
    { name: 'title', label: 'Наименование', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        { name: 'inn', label: 'ИНН', type: 'text', index: true, validate: (v: unknown) => (v ? validateInn(v) : true) },
        { name: 'kpp', label: 'КПП', type: 'text' },
        {
          name: 'kind',
          label: 'Вид в 1С',
          type: 'select',
          defaultValue: 'counterparty',
          options: [
            { label: 'Контрагент (основное юрлицо)', value: 'counterparty' },
            { label: 'Партнёр', value: 'partner' },
          ],
        },
      ],
    },
    {
      name: 'parent',
      label: 'Контрагент',
      type: 'relationship',
      relationTo: 'buyers',
      filterOptions: { kind: { equals: 'counterparty' } },
      admin: { condition: (data) => data?.kind === 'partner', description: 'К какому контрагенту относится партнёр' },
    },
    {
      name: 'deliveryPoints',
      label: 'Точки доставки',
      type: 'array',
      labels: { singular: 'Точка', plural: 'Точки доставки' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'title', label: 'Название точки', type: 'text' },
            { name: 'address', label: 'Адрес', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'comment', label: 'Комментарий для водителя', type: 'text' },
            { name: 'guid1C', label: 'ID в 1С', type: 'text', admin: { readOnly: true } },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Условия (из 1С)',
      admin: { position: 'sidebar' },
      fields: [
        {
          name: 'group',
          label: 'Сеть (папка в 1С)',
          type: 'relationship',
          relationTo: 'customer-groups',
          access: staffOnlyRead,
          admin: { description: 'Пусто — берётся у контрагента' },
        },
        {
          name: 'priceType',
          label: 'Прайс',
          type: 'relationship',
          relationTo: 'price-types',
          access: staffOnlyRead,
          admin: { description: 'Пусто — берётся у контрагента' },
        },
        { name: 'manager', label: 'Менеджер', type: 'relationship', relationTo: 'users' },
        { name: 'isActive', label: 'Активен', type: 'checkbox', defaultValue: true },
      ],
    },
    guid1C(),
  ],
}
