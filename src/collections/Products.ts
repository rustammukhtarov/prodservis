import type { CollectionConfig } from 'payload'

import { anyone, contentAccess, staffFieldOnly } from '../access'
import { guid1CField, seoFields, slugField } from '../fields/common'

/**
 * Товар. Учётные поля (название, артикул, единица, цены, остаток) приходят из 1С;
 * фото, описание и SEO заполняются в админке.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Товар', plural: 'Товары' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'sku', 'category', 'stock', 'isActive'],
    group: 'Каталог',
    listSearchableFields: ['title', 'sku'],
  },
  access: { read: anyone, create: contentAccess, update: contentAccess, delete: contentAccess },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Основное',
          fields: [
            { name: 'title', label: 'Название', type: 'text', required: true },
            {
              type: 'row',
              fields: [
                { name: 'sku', label: 'Артикул', type: 'text', index: true },
                { name: 'brand', label: 'Бренд', type: 'text', index: true },
                { name: 'country', label: 'Страна', type: 'text', index: true },
              ],
            },
            {
              name: 'category',
              label: 'Категория',
              type: 'relationship',
              relationTo: 'categories',
              required: true,
              index: true,
            },
            {
              name: 'collections',
              label: 'Подборки (кухни, акции)',
              type: 'relationship',
              relationTo: 'collections',
              hasMany: true,
            },
            { name: 'images', label: 'Фото', type: 'upload', relationTo: 'media', hasMany: true },
            { name: 'description', label: 'Описание', type: 'richText' },
          ],
        },
        {
          label: 'Фасовка и заказ',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'unit',
                  label: 'Единица цены',
                  type: 'select',
                  required: true,
                  defaultValue: 'kg',
                  options: [
                    { label: 'кг', value: 'kg' },
                    { label: 'шт', value: 'pcs' },
                    { label: 'упак', value: 'pack' },
                    { label: 'кор', value: 'box' },
                    { label: 'л', value: 'l' },
                  ],
                },
                { name: 'minQty', label: 'Минимальный заказ', type: 'number', defaultValue: 1, min: 0 },
                { name: 'step', label: 'Кратность', type: 'number', defaultValue: 1, min: 0 },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'weight', label: 'Вес единицы, кг', type: 'number', min: 0 },
                { name: 'packQty', label: 'Вложение в короб', type: 'text' },
                { name: 'shelfLife', label: 'Срок годности', type: 'text' },
              ],
            },
            {
              name: 'storage',
              label: 'Температурный режим',
              type: 'select',
              options: [
                { label: 'Заморозка (−18 °C)', value: 'frozen' },
                { label: 'Охлаждённое (0…+4 °C)', value: 'chilled' },
                { label: 'Свежее (+2…+8 °C)', value: 'fresh' },
                { label: 'Сухое хранение', value: 'dry' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'isHalal', label: 'Халяль', type: 'checkbox' },
                { name: 'isVet', label: 'Ветеринарный (Меркурий)', type: 'checkbox' },
                { name: 'isMarked', label: 'Маркировка «Честный знак»', type: 'checkbox' },
              ],
            },
          ],
        },
        {
          label: 'Цены и остатки',
          description: 'Заполняется обменом с 1С. Покупатели эти цены не видят — им отдаётся только их итоговая цена.',
          fields: [
            {
              name: 'prices',
              label: 'Цены по прайсам',
              type: 'array',
              access: { read: staffFieldOnly },
              labels: { singular: 'Цена', plural: 'Цены' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'priceType',
                      label: 'Прайс',
                      type: 'relationship',
                      relationTo: 'price-types',
                      required: true,
                    },
                    { name: 'value', label: 'Цена, ₽', type: 'number', required: true, min: 0 },
                  ],
                },
              ],
            },
            { name: 'stock', label: 'Остаток', type: 'number', defaultValue: 0 },
            {
              name: 'nextDelivery',
              label: 'Ближайшая поставка (если нет в наличии)',
              type: 'date',
              admin: { date: { pickerAppearance: 'dayOnly' } },
            },
          ],
        },
        { label: 'SEO', fields: [seoFields] },
      ],
    },
    slugField(),
    {
      name: 'isActive',
      label: 'Показывать на сайте',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    guid1CField,
  ],
}
