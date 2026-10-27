/** Количество в корзине с учётом минимального заказа и кратности. */
const round3 = (n: number) => Math.round(n * 1000) / 1000

export function normalizeQty(qty: number, minQty = 1, step = 1): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0
  const s = step > 0 ? step : 1
  const min = minQty > 0 ? minQty : s
  const q = Math.max(qty, min)
  // Кратность: округляем вверх до ближайшего кратного шагу (с допуском на дроби вроде 0,1 кг).
  return round3(Math.ceil(round3(q / s) - 1e-9) * s)
}

/** Следующее значение при нажатии «+» / «−». */
export function stepQty(current: number, dir: 1 | -1, minQty = 1, step = 1): number {
  const s = step > 0 ? step : 1
  if (dir > 0) return current <= 0 ? normalizeQty(minQty, minQty, s) : normalizeQty(current + s, minQty, s)
  const next = round3(current - s)
  return next < (minQty || s) - 1e-9 ? 0 : normalizeQty(next, minQty, s)
}

/** Корзина в cookie: «id:кол-во|id:кол-во». */
export const parseCart = (raw: string | undefined | null): Map<number, number> => {
  const out = new Map<number, number>()
  for (const part of (raw ?? '').split('|')) {
    const [id, q] = part.split(':')
    const n = Number(id)
    const qty = Number(q)
    if (Number.isInteger(n) && n > 0 && Number.isFinite(qty) && qty > 0) out.set(n, round3(qty))
  }
  return out
}

export const serializeCart = (cart: Map<number, number>) =>
  [...cart.entries()]
    .filter(([, q]) => q > 0)
    .slice(0, 300)
    .map(([id, q]) => `${id}:${q}`)
    .join('|')
