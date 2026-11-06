/**
 * Типы клиентов, которые выбираются при регистрации.
 * Поставщики регистрируются отдельно — через заявку (коллекция supplier-applications).
 */
export const SEGMENTS = [
  {
    value: 'horeca',
    label: 'Ресторан, кафе, отель (HoReCa)',
    b2b: true,
    perks: ['Персональные цены и торги', 'Отсрочка платежа', 'Доставка на следующий день'],
  },
  {
    value: 'retail',
    label: 'Магазин',
    b2b: true,
    perks: ['Персональные цены', 'Отсрочка платежа', 'Регулярные поставки по графику'],
  },
  {
    value: 'wholesale',
    label: 'Крупный опт',
    b2b: true,
    perks: ['Цены от объёма', 'Доставка или самовывоз со склада', 'Персональный менеджер'],
  },
  {
    value: 'individual',
    label: 'Для себя (физическое лицо)',
    b2b: false,
    perks: ['Свежие продукты домой', 'Оплата при получении или онлайн', 'Минимальная сумма заказа'],
  },
] as const

export type Segment = (typeof SEGMENTS)[number]['value']

export const SEGMENT_OPTIONS = SEGMENTS.map(({ label, value }) => ({ label, value }))

export const isB2B = (segment: string | null | undefined): boolean =>
  SEGMENTS.some((s) => s.value === segment && s.b2b)

type SegmentSettings = { segments?: Record<string, { isOpen?: boolean | null } | null> | null } | null | undefined

/** Принимает ли сайт этот тип клиентов (настройка «Принимаем на сайте»). Пусто — юрлица да, физлица нет. */
export const isSegmentOpen = (settings: SegmentSettings, segment: string): boolean =>
  settings?.segments?.[segment]?.isOpen ?? isB2B(segment)

/** Типы клиентов, которые сейчас можно выбрать при регистрации. */
export const openSegments = (settings: SegmentSettings): string[] =>
  SEGMENTS.map((s) => s.value).filter((v) => isSegmentOpen(settings, v))
