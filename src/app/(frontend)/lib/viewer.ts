import { cookies, headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { cache } from 'react'

import config from '@/payload.config'
import type { Buyer, Customer, SiteSetting } from '@/payload-types'

export const BUYER_COOKIE = 'ps-buyer'

export interface Viewer {
  payload: Payload
  /** Вошедший клиент (сотрудник на витрине считается гостем). */
  customer: Customer | null
  /** Юрлица, от имени которых клиент может заказывать. */
  buyers: Buyer[]
  /** Выбранное юрлицо. */
  buyer: Buyer | null
  settings: SiteSetting
  /** День доставки, на который показываются цены. */
  deliveryDate: Date
}

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : (v as number)

/** Москва: время сейчас в минутах от полуночи и календарный день. */
const moscowNow = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  return get('hour') * 60 + get('minute')
}

/** Заказ до времени отсечки — доставка завтра, позже — послезавтра. */
export const nextDeliveryDate = (cutoff = '17:00'): Date => {
  const [h, m] = cutoff.split(':').map(Number)
  const limit = (h || 17) * 60 + (m || 0)
  const days = moscowNow() < limit ? 1 : 2
  // Полдень по Москве нужного дня — чтобы календарный день не съехал из-за часового пояса.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
  const d = new Date(`${today}T12:00:00+03:00`)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export const getPayloadClient = cache(async () => getPayload({ config: await config }))

/** Кто смотрит страницу — один раз на запрос. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as SiteSetting
  const deliveryDate = nextDeliveryDate(settings.orderCutoff ?? '17:00')

  if (!user || user.collection !== 'customers') {
    return { payload, customer: null, buyers: [], buyer: null, settings, deliveryDate }
  }

  const customer = (await payload.findByID({
    collection: 'customers',
    id: user.id,
    depth: 0,
    overrideAccess: true,
  })) as Customer

  const buyerIds = (customer.buyers ?? []).map(idOf).filter((v): v is number => v != null)
  const buyers = buyerIds.length
    ? ((
        await payload.find({
          collection: 'buyers',
          where: { id: { in: buyerIds } },
          depth: 1,
          limit: 100,
          overrideAccess: true,
        })
      ).docs as Buyer[])
    : []

  const chosen = Number((await cookies()).get(BUYER_COOKIE)?.value)
  const buyer = buyers.find((b) => b.id === chosen) ?? buyers[0] ?? null

  return { payload, customer, buyers, buyer, settings, deliveryDate }
})
