/**
 * Рейсы доставки. Склад работает без выходных, два рейса в сутки:
 * утренний (отгрузка в 6:00) и дневной (отгрузка в 14:00).
 * Заказ на рейс принимается до «отгрузка минус N часов».
 * Все времена — московские.
 */

export interface DeliverySlot {
  code: string
  title: string
  /** Время отгрузки со склада, ЧЧ:ММ. */
  shipAt: string
  /** За сколько часов до отгрузки закрывается приём заказов. */
  cutoffHours: number
}

export const DEFAULT_SLOTS: DeliverySlot[] = [
  { code: 'morning', title: 'Утренняя доставка', shipAt: '06:00', cutoffHours: 4 },
  { code: 'day', title: 'Дневная доставка', shipAt: '14:00', cutoffHours: 4 },
]

export interface SlotOption {
  /** День доставки YYYY-MM-DD (по Москве). */
  day: string
  slot: DeliverySlot
  /** Когда закрывается приём заказов на этот рейс. */
  deadline: Date
}

const HOUR = 60 * 60 * 1000
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' })

export const moscowToday = (now: Date) => dayFmt.format(now)

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00+03:00`)
  d.setUTCDate(d.getUTCDate() + n)
  return dayFmt.format(d)
}

const validTime = (t: string) => (/^\d{1,2}:\d{2}$/.test(t) ? t.padStart(5, '0') : '06:00')

export const shipmentAt = (day: string, slot: DeliverySlot) => new Date(`${day}T${validTime(slot.shipAt)}:00+03:00`)

export const deadlineOf = (day: string, slot: DeliverySlot) =>
  new Date(shipmentAt(day, slot).getTime() - Math.max(0, Number(slot.cutoffHours) || 0) * HOUR)

/** Слоты из настроек; если там пусто — два рейса по умолчанию. */
export const normalizeSlots = (
  raw: { code?: string | null; title?: string | null; shipAt?: string | null; cutoffHours?: number | null }[] | null | undefined,
): DeliverySlot[] => {
  const list = (raw ?? [])
    .filter((s) => s && s.code && s.shipAt)
    .map((s) => ({
      code: String(s.code),
      title: s.title || String(s.code),
      shipAt: validTime(String(s.shipAt)),
      cutoffHours: Number(s.cutoffHours ?? 4),
    }))
  return (list.length ? list : DEFAULT_SLOTS).sort((a, b) => a.shipAt.localeCompare(b.shipAt))
}

/** Рейсы, на которые ещё можно оформить заказ, на ближайшие `days` дней. */
export function availableSlots(slots: DeliverySlot[], now: Date, days = 7): SlotOption[] {
  const today = moscowToday(now)
  const out: SlotOption[] = []
  for (let i = 0; i <= days; i++) {
    const day = addDays(today, i)
    for (const slot of slots) {
      const deadline = deadlineOf(day, slot)
      if (deadline.getTime() > now.getTime()) out.push({ day, slot, deadline })
    }
  }
  return out
}

/** Можно ли ещё заказать на этот день и рейс. */
export const isSlotOpen = (slots: DeliverySlot[], day: string, code: string, now: Date) => {
  const slot = slots.find((s) => s.code === code)
  if (!slot || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false
  if (day > addDays(moscowToday(now), 14)) return false
  return deadlineOf(day, slot).getTime() > now.getTime()
}
