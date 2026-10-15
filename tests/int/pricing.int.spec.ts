import { describe, expect, it } from 'vitest'

import { type Agreement, moscowDay, resolvePrice } from '@/lib/pricing/resolvePrice'

const P2 = 'price-2'
const P4 = 'price-4'
const P5 = 'price-5'
const base = [
  { priceTypeId: P2, value: 100 },
  { priceTypeId: P4, value: 102 },
  { priceTypeId: P5, value: 103 },
]

const agreement = (over: Partial<Agreement> & Pick<Agreement, 'kind'>): Agreement => ({
  id: 'a1',
  validFrom: '2026-10-19',
  validTo: '2026-10-25',
  prices: new Map([['42', 90]]),
  ...over,
})

const monday = new Date('2026-10-19T09:00:00+03:00')

describe('resolvePrice', () => {
  it('гость видит гостевой прайс', () => {
    expect(resolvePrice(42, base, { date: monday, guestPriceTypeId: P5 })).toEqual({
      price: 103,
      source: 'guest',
      priceTypeId: P5,
    })
  })

  it('клиент без торгов получает свой прайс', () => {
    const r = resolvePrice(42, base, { date: monday, customerId: 1, priceTypeId: P4, guestPriceTypeId: P5 })
    expect(r).toMatchObject({ price: 102, source: 'price-type' })
  })

  it('цена торгов сети важнее прайса клиента', () => {
    const r = resolvePrice(
      42,
      base,
      { date: monday, customerId: 1, groupId: 'net', priceTypeId: P4 },
      [agreement({ kind: 'tender', groupId: 'net' })],
    )
    expect(r).toMatchObject({ price: 90, source: 'tender', validTo: '2026-10-25' })
  })

  it('индивидуальная цена важнее торгов', () => {
    const r = resolvePrice(
      42,
      base,
      { date: monday, customerId: 1, groupId: 'net', priceTypeId: P4 },
      [
        agreement({ kind: 'tender', groupId: 'net' }),
        agreement({ id: 'ind', kind: 'individual', customerId: 1, prices: new Map([['42', 85]]) }),
      ],
    )
    expect(r).toMatchObject({ price: 85, source: 'individual', agreementId: 'ind' })
  })

  it('товар не из торгов идёт по прайсу клиента', () => {
    const r = resolvePrice(
      7,
      base,
      { date: monday, customerId: 1, groupId: 'net', priceTypeId: P2 },
      [agreement({ kind: 'tender', groupId: 'net' })],
    )
    expect(r).toMatchObject({ price: 100, source: 'price-type' })
  })

  it('торги чужой сети не применяются', () => {
    const r = resolvePrice(
      42,
      base,
      { date: monday, customerId: 1, groupId: 'other', priceTypeId: P4 },
      [agreement({ kind: 'tender', groupId: 'net' })],
    )
    expect(r?.source).toBe('price-type')
  })

  it('срок действия: последний день включительно, следующий — уже нет', () => {
    const ctx = { customerId: 1, groupId: 'net', priceTypeId: P4 }
    const list = [agreement({ kind: 'tender', groupId: 'net' })]
    expect(resolvePrice(42, base, { ...ctx, date: new Date('2026-10-25T23:30:00+03:00') }, list)?.source).toBe(
      'tender',
    )
    expect(resolvePrice(42, base, { ...ctx, date: new Date('2026-10-26T00:10:00+03:00') }, list)?.source).toBe(
      'price-type',
    )
    expect(resolvePrice(42, base, { ...ctx, date: new Date('2026-10-18T12:00:00+03:00') }, list)?.source).toBe(
      'price-type',
    )
  })

  it('из двух действующих торгов берётся более свежий', () => {
    const r = resolvePrice(
      42,
      base,
      { date: monday, groupId: 'net', priceTypeId: P4 },
      [
        agreement({ id: 'old', kind: 'tender', groupId: 'net', validFrom: '2026-10-12', validTo: '2026-10-31' }),
        agreement({ id: 'new', kind: 'tender', groupId: 'net', prices: new Map([['42', 88]]) }),
      ],
    )
    expect(r).toMatchObject({ price: 88, agreementId: 'new' })
  })

  it('без цен возвращает null', () => {
    expect(resolvePrice(42, [], { date: monday })).toBeNull()
  })

  it('moscowDay учитывает часовой пояс Москвы', () => {
    expect(moscowDay(new Date('2026-10-18T22:30:00Z'))).toBe('2026-10-19')
  })
})
