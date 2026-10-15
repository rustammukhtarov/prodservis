import type { GlobalConfig } from 'payload'

import { adminOnly, anyone } from '../access'

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
          label: 'Заказ и доставка',
          fields: [
            { name: 'minOrderSum', label: 'Минимальная сумма заказа, ₽', type: 'number', defaultValue: 0 },
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
