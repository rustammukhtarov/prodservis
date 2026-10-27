/**
 * Простое ограничение частоты в памяти процесса: «не больше N раз за окно» по ключу (IP + действие).
 * Сайт работает одним процессом, поэтому этого достаточно против ботов и случайных повторов.
 */
const hits = new Map<string, number[]>()

export function allow(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (list.length >= limit) {
    hits.set(key, list)
    return false
  }
  list.push(now)
  hits.set(key, list)
  // Чистим старые ключи, чтобы память не росла.
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k)
  return true
}

/** IP посетителя за обратным прокси Caddy. */
export const clientIp = (h: Headers) =>
  (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || h.get('x-real-ip') || 'unknown'
