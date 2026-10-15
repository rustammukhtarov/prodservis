import type { SettingsLike } from './pricing/priceContext'

type SegmentRules = { minOrderSum?: number | null }

export interface MinOrderCheck {
  ok: boolean
  minOrderSum: number
  /** Сколько не хватает до минимальной суммы, ₽. */
  missing: number
}

/** Проверка минимальной суммы корзины для типа клиента (физлица — 15 000 ₽ и т. п.). */
export function checkMinOrder(
  segment: string | null | undefined,
  total: number,
  settings: SettingsLike & { segments?: Record<string, SegmentRules | null | undefined> | null },
): MinOrderCheck {
  const minOrderSum = Math.max(0, Number(segment ? settings.segments?.[segment]?.minOrderSum ?? 0 : 0))
  const missing = Math.max(0, Math.round((minOrderSum - total) * 100) / 100)
  return { ok: missing === 0, minOrderSum, missing }
}
