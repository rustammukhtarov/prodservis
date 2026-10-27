import { describe, expect, it } from 'vitest'

import { allow, clientIp } from '@/lib/rateLimit'

describe('ограничение частоты', () => {
  it('пускает N раз за окно, потом закрывает, после окна снова пускает', () => {
    const t = 1_000_000
    expect(allow('k1', 2, 1000, t)).toBe(true)
    expect(allow('k1', 2, 1000, t + 10)).toBe(true)
    expect(allow('k1', 2, 1000, t + 20)).toBe(false)
    expect(allow('k1', 2, 1000, t + 1500)).toBe(true)
  })
  it('разные ключи независимы', () => {
    expect(allow('a', 1, 1000, 5)).toBe(true)
    expect(allow('b', 1, 1000, 5)).toBe(true)
  })
  it('IP берётся из первого адреса x-forwarded-for', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
    expect(clientIp(new Headers())).toBe('unknown')
  })
})
