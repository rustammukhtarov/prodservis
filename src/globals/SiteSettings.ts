import type { GlobalConfig } from 'payload'

import { adminOnly, anyone } from '../access'
import { SEGMENTS } from '../lib/segments'

/** Общие настройки сайта: контакты, условия заказа, баннеры главной. */
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Настройки сайта',
  admin: { group: 'Настройки' },
  access: { read: anyone, update: adminOnly },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Контакты',
          fields: [
            { name: 'phone', label: 'Телефон', type: 'text', defaultValue: '' },
            { name: 'email', label: 'E-mail', type: 'email' },
            { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
            { name: 'telegram', label: 'Telegram-канал', type: 'text' },
            { name: 'address', label: 'Адрес офиса', type: 'text' },
            { name: 'workHours', label: 'Часы работы', type: 'text' },
            { name: 'requisites', label: 'Реквизиты', type: 'textarea' },
            {
              name: 'notifyEmails',
              label: 'Куда слать уведомления менеджерам',
              type: 'text',
              admin: {
                description:
                  'Адреса через запятую: новые заказы, регистрации клиентов, заявки поставщиков. Пусто — на ящик сайта (prodservice@prodmskshop.ru).',
              },
            },
          ],
        },
        {
          label: 'Заказ и цены',
          fields: [
            {
              name: 'deliverySlots',
              label: 'Рейсы доставки',
              type: 'array',
              labels: { singular: 'Рейс', plural: 'Рейсы' },
              admin: {
                description:
                  'Склад работает без выходных. Заказ на рейс принимается до «время отгрузки минус N часов». Пусто — утро 6:00 и день 14:00, приём за 4 часа.',
              },
              defaultValue: [
                { code: 'morning', title: 'Утренняя доставка', shipAt: '06:00', cutoffHours: 4 },
                { code: 'day', title: 'Дневная доставка', shipAt: '14:00', cutoffHours: 4 },
              ],
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'title', label: 'Название', type: 'text', required: true },
                    { name: 'code', label: 'Код (латиницей)', type: 'text', required: true },
                    {
                      name: 'shipAt',
                      label: 'Отгрузка со склада (ЧЧ:ММ)',
                      type: 'text',
                      required: true,
                      validate: (v: unknown) =>
                        typeof v === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(v) ? true : 'Формат ЧЧ:ММ, например 06:00',
                    },
                    { name: 'cutoffHours', label: 'Приём заказов закрывается за, ч', type: 'number', min: 0, defaultValue: 4 },
                  ],
                },
              ],
            },
            {
              name: 'guestPriceType',
              label: 'Прайс для гостей',
              type: 'relationship',
              relationTo: 'price-types',
              admin: { description: 'Какие цены видит посетитель без входа. Пусто — цены скрыты до входа.' },
            },
            {
              name: 'segments',
              label: 'Условия по типам клиентов',
              type: 'group',
              fields: SEGMENTS.map((segment) => ({
                name: segment.value,
                label: segment.label,
                type: 'group' as const,
                fields: [
                  {
                    type: 'row' as const,
                    fields: [
                      {
                        name: 'minOrderSum',
                        label: 'Мин. сумма заказа, ₽',
                        type: 'number' as const,
                        defaultValue: 0,
                        min: 0,
                      },
                      {
                        name: 'defaultPriceType',
                        label: 'Прайс по умолчанию',
                        type: 'relationship' as const,
                        relationTo: 'price-types' as const,
                        admin: { description: 'Если клиенту не назначен свой прайс' },
                      },
                      {
                        name: 'autoApprove',
                        label: 'Активировать без проверки',
                        type: 'checkbox' as const,
                        defaultValue: !segment.b2b,
                        admin: {
                          description: segment.b2b
                            ? 'Для юрлиц не рекомендуется: менеджер проверяет ИНН и назначает прайс'
                            : 'Физлицо может заказывать сразу после регистрации',
                        },
                      },
                    ],
                  },
                ],
              })),
            },
          ],
        },
        {
          label: 'Главная',
          fields: [
            {
              name: 'banners',
              label: 'Баннеры',
              type: 'array',
              fields: [
                { name: 'image', label: 'Картинка', type: 'upload', relationTo: 'media', required: true },
                { name: 'title', label: 'Заголовок', type: 'text' },
                { name: 'link', label: 'Ссылка', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
