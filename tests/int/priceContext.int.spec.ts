import { describe, expect, it } from 'vitest'

import { checkMinOrder } from '@/lib/orderRules'
import { buildPriceContext } from '@/lib/pricing/priceContext'
import { resolvePrice } from '@/lib/pricing/resolvePrice'
import { validateInn } from '@/collections/SupplierApplications'

const RETAIL = 25
const settings = {
  guestPriceType: { id: 30 },
  segments: { individual: { defaultPriceType: RETAIL }, horeca: { defaultPriceType: null } },
}
const base = [
  { priceTypeId: 3, value: 101 },
  { priceTypeId: 4, value: 102 },
  { priceTypeId: RETAIL, value: 120 },
  { priceTypeId: 30, value: 125 },
]
const date = new Date('2026-10-19T10:00:00+03:00')

// Контрагент (сеть 7, Прайс 3) и его партнёр без своих условий.
const counterparty = { id: 100, group: 7, priceType: 3 }
const partner = { id: 101, parent: counterparty }
const restaurant = { id: 1, status: 'active', segment: 'horeca', buyers: [{ id: 101 }, 100] }

describe('buildPriceContext', () => {
  it('гость видит Прайс 30', () => {
    expect(resolvePrice(1, base, buildPriceContext(null, null, settings, date))).toMatchObject({
      price: 125,
      source: 'guest',
    })
  })

  it('клиент на проверке видит гостевой прайс', () => {
    const ctx = buildPriceContext({ ...restaurant, status: 'pending' }, partner, settings, date)
    expect(resolvePrice(1, base, ctx)?.price).toBe(125)
  })

  it('партнёр без своих условий берёт сеть и прайс у контрагента', () => {
    const ctx = buildPriceContext(restaurant, partner, settings, date)
    expect(ctx).toMatchObject({ buyerIds: [101, 100], groupId: 7, priceTypeId: 3 })
    expect(resolvePrice(1, base, ctx)).toMatchObject({ price: 101, source: 'price-type' })
  })

  it('свой прайс партнёра важнее прайса контрагента', () => {
    const ctx = buildPriceContext(restaurant, { ...partner, priceType: { id: 4 } }, settings, date)
    expect(ctx.priceTypeId).toBe(4)
  })

  it('чужое юрлицо — только гостевые цены', () => {
    const ctx = buildPriceContext(restaurant, { id: 555, priceType: 3 }, settings, date)
    expect(ctx.buyerIds).toBeUndefined()
    expect(resolvePrice(1, base, ctx)?.price).toBe(125)
  })

  it('неактивное в 1С юрлицо — только гостевые цены', () => {
    const ctx = buildPriceContext(restaurant, { ...counterparty, isActive: false }, settings, date)
    expect(resolvePrice(1, base, ctx)?.source).toBe('guest')
  })

  it('физлицо получает розничный прайс', () => {
    const ctx = buildPriceContext({ id: 8, status: 'active', segment: 'individual' }, null, settings, date)
    expect(resolvePrice(1, base, ctx)).toMatchObject({ price: 120, source: 'price-type' })
  })
})

describe('validateInn', () => {
  it('принимает корректные ИНН юрлица и ИП', () => {
    expect(validateInn('7707083893')).toBe(true)
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
