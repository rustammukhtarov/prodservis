import { describe, expect, it } from 'vitest'

import { availableSlots, DEFAULT_SLOTS, isSlotOpen, normalizeSlots } from '@/lib/delivery'

const at = (iso: string) => new Date(iso)

describe('рейсы доставки', () => {
  it('днём доступен дневной рейс сегодня, если приём ещё открыт', () => {
    const now = at('2026-10-27T09:30:00+03:00') // дневной рейс 14:00, приём до 10:00
    const first = availableSlots(DEFAULT_SLOTS, now)[0]
    expect(first.day).toBe('2026-10-27')
    expect(first.slot.code).toBe('day')
  })

  it('после закрытия приёма ближайший — утренний рейс завтра', () => {
    const now = at('2026-10-27T10:05:00+03:00')
    const first = availableSlots(DEFAULT_SLOTS, now)[0]
    expect(first).toMatchObject({ day: '2026-10-28', slot: { code: 'morning' } })
  })

  it('ночью до 2:00 ещё можно успеть на утренний рейс', () => {
    const now = at('2026-10-27T01:30:00+03:00')
    expect(availableSlots(DEFAULT_SLOTS, now)[0]).toMatchObject({ day: '2026-10-27', slot: { code: 'morning' } })
    expect(isSlotOpen(DEFAULT_SLOTS, '2026-10-27', 'morning', at('2026-10-27T02:01:00+03:00'))).toBe(false)
  })

  it('учитывает московское время, а не время сервера', () => {
    // 23:30 UTC = 02:30 по Москве следующего дня
    const now = at('2026-10-26T23:30:00Z')
    expect(availableSlots(DEFAULT_SLOTS, now)[0]).toMatchObject({ day: '2026-10-27', slot: { code: 'day' } })
  })

  it('нельзя заказать на прошедший день, неизвестный рейс или слишком далеко', () => {
    const now = at('2026-10-27T12:00:00+03:00')
    expect(isSlotOpen(DEFAULT_SLOTS, '2026-10-26', 'day', now)).toBe(false)
    expect(isSlotOpen(DEFAULT_SLOTS, '2026-10-28', 'night', now)).toBe(false)
    expect(isSlotOpen(DEFAULT_SLOTS, '2026-12-01', 'day', now)).toBe(false)
    expect(isSlotOpen(DEFAULT_SLOTS, '2026-10-28', 'morning', now)).toBe(true)
  })

  it('пустые настройки — рейсы по умолчанию', () => {
    expect(normalizeSlots([]).map((s) => s.code)).toEqual(['morning', 'day'])
  })
})
