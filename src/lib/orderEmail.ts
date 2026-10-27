import { escapeHtml as esc } from './email'

const rub = (n: number) => `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n)} ₽`
const day = (iso: string) =>
  new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', weekday: 'long' }).format(
    new Date(iso),
  )

export const ORDER_STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  accepted: 'Принят',
  picking: 'Собирается',
  shipping: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}

interface OrderLike {
  number?: string | null
  deliveryDate: string
  deliverySlotTitle?: string | null
  address?: string | null
  contactName?: string | null
  contactPhone?: string | null
  comment?: string | null
  total: number
  items?: { title?: string | null; sku?: string | null; qty: number; price: number; sum: number }[] | null
}

/** Строки «Доставка / Адрес / Контакт» и таблица состава заказа для письма. */
export function orderSummaryHtml(o: OrderLike, buyerTitle?: string | null): string {
  const meta = [
    ['Доставка', `${day(o.deliveryDate)}${o.deliverySlotTitle ? `, ${o.deliverySlotTitle}` : ''}`],
    ['Покупатель', buyerTitle ?? ''],
    ['Адрес', o.address ?? ''],
    ['Контакт', [o.contactName, o.contactPhone].filter(Boolean).join(', ')],
    ['Комментарий', o.comment ?? ''],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#5B6155">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join('')
  const rows = (o.items ?? [])
    .map(
      (it) =>
        `<tr><td style="padding:6px 8px 6px 0;border-bottom:1px solid #E2E8D8">${esc(it.title ?? '')}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #E2E8D8;text-align:right;white-space:nowrap">${it.qty}</td>` +
        `<td style="padding:6px 8px;border-bottom:1px solid #E2E8D8;text-align:right;white-space:nowrap">${rub(it.price)}</td>` +
        `<td style="padding:6px 0 6px 8px;border-bottom:1px solid #E2E8D8;text-align:right;white-space:nowrap">${rub(it.sum)}</td></tr>`,
    )
    .join('')
  return (
    `<table style="border-collapse:collapse;font-size:14px;margin:8px 0 16px">${meta}</table>` +
    `<table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr>` +
    `<th style="text-align:left;padding:6px 8px 6px 0;border-bottom:2px solid #E2E8D8">Товар</th>` +
    `<th style="text-align:right;padding:6px 8px;border-bottom:2px solid #E2E8D8">Кол-во</th>` +
    `<th style="text-align:right;padding:6px 8px;border-bottom:2px solid #E2E8D8">Цена</th>` +
    `<th style="text-align:right;padding:6px 0 6px 8px;border-bottom:2px solid #E2E8D8">Сумма</th></tr></thead>` +
    `<tbody>${rows}</tbody><tfoot><tr><td colspan="3" style="padding:10px 8px 0 0;font-weight:700">Итого</td>` +
    `<td style="padding:10px 0 0 8px;text-align:right;font-weight:700;white-space:nowrap">${rub(o.total)}</td></tr></tfoot></table>`
  )
}
