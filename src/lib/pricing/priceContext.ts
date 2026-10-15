import type { ID, PriceContext } from './resolvePrice'

type Rel = ID | { id: ID } | null | undefined

const idOf = (value: Rel): ID | null =>
  value == null ? null : typeof value === 'object' ? value.id : value

export interface CustomerLike {
  id: ID
  status?: string | null
  segment?: string | null
  priceType?: Rel
  group?: Rel
}

export interface SettingsLike {
  guestPriceType?: Rel
  segments?: Record<string, { defaultPriceType?: Rel } | null | undefined> | null
}

/**
 * Кто смотрит цены и по каким правилам.
 * Гость и клиент «на проверке» или заблокированный видят гостевой прайс.
 * Активный клиент — свой прайс, а если он не назначен — прайс по умолчанию для его типа.
 */
export function buildPriceContext(
  customer: CustomerLike | null | undefined,
  settings: SettingsLike,
  date: Date = new Date(),
): PriceContext {
  const guestPriceTypeId = idOf(settings.guestPriceType)
  if (!customer || customer.status !== 'active') return { date, guestPriceTypeId }

  const segmentDefault = customer.segment ? idOf(settings.segments?.[customer.segment]?.defaultPriceType) : null
  return {
    date,
    customerId: customer.id,
    groupId: idOf(customer.group),
    priceTypeId: idOf(customer.priceType) ?? segmentDefault,
    guestPriceTypeId,
  }
}
