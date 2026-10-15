import { describe, expect, it } from 'vitest'

import { checkMinOrder } from '@/lib/orderRules'
import { buildPriceContext } from '@/lib/pricing/priceContext'
import { resolvePrice } from '@/lib/pricing/resolvePrice'
import { validateInn } from '@/collections/SupplierApplications'

const settings = {
  guestPriceType: { id: 30 },
  segments: { individual: { defaultPriceType: 25 }, horeca: { defaultPriceType: null } },
}
const base = [
  { priceTypeId: 4, value: 102 },
  { priceTypeId: 25, value: 120 },
  { priceTypeId: 30, value: 125 },
]
const date = new Date('2026-10-19T10:00:00+03:00')

describe('buildPriceContext', () => {
  it('гость видит Прайс 30', () => {
    const ctx = buildPriceContext(null, settings, date)
    expect(resolvePrice(1, base, ctx)).toMatchObject({ price: 125, source: 'guest' })
  })

  it('клиент на проверке видит гостевой прайс, даже если прайс уже назначен', () => {
    const ctx = buildPriceContext({ id: 7, status: 'pending', priceType: 4, segment: 'horeca' }, settings, date)
    expect(resolvePrice(1, base, ctx)?.price).toBe(125)
  })

  it('активный ресторан видит свой прайс', () => {
    const ctx = buildPriceContext({ id: 7, status: 'active', priceType: { id: 4 }, segment: 'horeca' }, settings, date)
    expect(resolvePrice(1, base, ctx)).toMatchObject({ price: 102, source: 'price-type' })
  })

  it('физлицо без своего прайса получает прайс своего типа', () => {
    const ctx = buildPriceContext({ id: 8, status: 'active', segment: 'individual' }, settings, date)
    expect(resolvePrice(1, base, ctx)?.price).toBe(120)
  })

  it('заблокированный клиент не получает торги своей сети', () => {
    const ctx = buildPriceContext({ id: 9, status: 'blocked', group: 3, priceType: 4 }, settings, date)
    expect(ctx.groupId).toBeUndefined()
  })
})

describe('validateInn', () => {
  it('принимает корректные ИНН юрлица и ИП', () => {
    expect(validateInn('7707083893')).toBe(true) // ПАО Сбербанк
    expect(validateInn('500100732259')).toBe(true)
  })
  it('отклоняет ошибки', () => {
    expect(validateInn('7707083890')).toBe('Неверный ИНН')
    expect(validateInn('12345')).toBe('ИНН — 10 или 12 цифр')
  })
})

describe('checkMinOrder', () => {
  const s = { segments: { individual: { minOrderSum: 15000 }, horeca: { minOrderSum: 0 } } }
  it('физлицо: корзина 12 400 ₽ — не хватает 2 600 ₽', () => {
    expect(checkMinOrder('individual', 12400, s)).toEqual({ ok: false, minOrderSum: 15000, missing: 2600 })
  })
  it('физлицо: ровно 15 000 ₽ — можно оформить', () => {
    expect(checkMinOrder('individual', 15000, s).ok).toBe(true)
  })
  it('ресторан без ограничения', () => {
    expect(checkMinOrder('horeca', 500, s).ok).toBe(true)
  })
})
