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
          ],
        },
        {
          label: 'Заказ и цены',
          fields: [
            {
              name: 'orderCutoff',
              label: 'Время приёма заказов на завтра (ЧЧ:ММ)',
              type: 'text',
              defaultValue: '17:00',
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
