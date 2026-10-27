import type { CollectionConfig } from 'payload'

import { adminOnly, salesAccess, staffOrOwnCustomer } from '../access'

/**
 * Заказы. Клиент создаёт заказ только через серверный эндпоинт оформления
 * (цены пересчитываются на сервере — цене из браузера не доверяем).
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Заказ', plural: 'Заказы' },
  admin: {
    useAsTitle: 'number',
    defaultColumns: ['number', 'customer', 'buyer', 'total', 'deliveryDate', 'deliverySlotTitle', 'status', 'exportedTo1C'],
    group: 'Продажи',
  },
  access: {
    read: staffOrOwnCustomer,
    create: salesAccess,
    update: salesAccess,
    delete: adminOnly,
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'number', label: 'Номер', type: 'text', index: true, admin: { readOnly: true } },
    { name: 'customer', label: 'Клиент', type: 'relationship', relationTo: 'customers', required: true, index: true },
    {
      type: 'row',
      fields: [
        { name: 'buyer', label: 'Покупатель (юрлицо)', type: 'relationship', relationTo: 'buyers' },
        {
          name: 'deliveryDate',
          label: 'Дата доставки',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd.MM.yyyy' } },
        },
        { name: 'deliverySlot', label: 'Рейс', type: 'text', admin: { description: 'Код рейса из настроек' } },
        { name: 'deliverySlotTitle', label: 'Рейс (название)', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'contactName', label: 'Контактное лицо', type: 'text' },
        { name: 'contactPhone', label: 'Телефон', type: 'text' },
        {
          name: 'paymentMethod',
          label: 'Оплата',
          type: 'select',
          defaultValue: 'contract',
          options: [
            { label: 'По договору (безнал)', value: 'contract' },
            { label: 'Наличными курьеру', value: 'cash' },
            { label: 'Картой курьеру', value: 'card' },
            { label: 'Онлайн при оформлении', value: 'online' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'address', label: 'Адрес доставки', type: 'text' },
        { name: 'deliveryPointGuid1C', label: 'ID точки доставки в 1С', type: 'text' },
      ],
    },
    {
      name: 'items',
      label: 'Состав',
      type: 'array',
      required: true,
      labels: { singular: 'Позиция', plural: 'Позиции' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'product', label: 'Товар', type: 'relationship', relationTo: 'products', required: true },
            { name: 'qty', label: 'Кол-во', type: 'number', required: true, min: 0 },
            { name: 'price', label: 'Цена', type: 'number', required: true, min: 0 },
            { name: 'sum', label: 'Сумма', type: 'number', required: true, min: 0 },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'title', label: 'Название на момент заказа', type: 'text' },
            { name: 'sku', label: 'Артикул', type: 'text' },
            {
              name: 'priceSource',
              label: 'Источник цены',
              type: 'select',
              options: [
                { label: 'Индивидуальная', value: 'individual' },
                { label: 'Торги', value: 'tender' },
                { label: 'Прайс клиента', value: 'price-type' },
                { label: 'Гостевой прайс', value: 'guest' },
              ],
            },
          ],
        },
      ],
    },
    { name: 'total', label: 'Итого, ₽', type: 'number', required: true, min: 0 },
    { name: 'comment', label: 'Комментарий клиента', type: 'textarea' },
    {
      name: 'status',
      label: 'Статус',
      type: 'select',
      defaultValue: 'new',
      index: true,
      options: [
        { label: 'Новый', value: 'new' },
        { label: 'Принят', value: 'accepted' },
        { label: 'Собирается', value: 'picking' },
        { label: 'В пути', value: 'shipping' },
        { label: 'Доставлен', value: 'delivered' },
        { label: 'Отменён', value: 'cancelled' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'exportedTo1C',
      label: 'Выгружен в 1С',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'guid1C', label: 'ID в 1С', type: 'text', index: true, admin: { position: 'sidebar', readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && !data.number) {
          const { totalDocs } = await req.payload.count({ collection: 'orders', req })
          data.number = `ПС-${String(totalDocs + 1).padStart(6, '0')}`
        }
        return data
      },
    ],
  },
}
