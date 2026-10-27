import { describe, expect, it } from 'vitest'

import { normalizeQty, parseCart, serializeCart, stepQty } from '@/lib/cartQty'

describe('количество в корзине', () => {
  it('не меньше минимального заказа', () => {
    expect(normalizeQty(2, 5, 1)).toBe(5)
  })
  it('кратно шагу, округление вверх', () => {
    expect(normalizeQty(13, 12, 12)).toBe(24)
    expect(normalizeQty(0.35, 0.1, 0.1)).toBe(0.4)
    expect(normalizeQty(0.3, 0.1, 0.1)).toBe(0.3)
  })
  it('ноль и мусор — удалить из корзины', () => {
    expect(normalizeQty(0, 1, 1)).toBe(0)
    expect(normalizeQty(Number.NaN, 1, 1)).toBe(0)
  })
  it('плюс и минус', () => {
    expect(stepQty(0, 1, 5, 1)).toBe(5)
    expect(stepQty(5, 1, 5, 1)).toBe(6)
    expect(stepQty(5, -1, 5, 1)).toBe(0)
    expect(stepQty(24, -1, 12, 12)).toBe(12)
  })
  it('cookie туда и обратно, мусор отбрасывается', () => {
    const c = parseCart('3:2|x:1|5:0.5|7:-1')
    expect([...c.entries()]).toEqual([
      [3, 2],
      [5, 0.5],
    ])
    expect(serializeCart(c)).toBe('3:2|5:0.5')
  })
})
