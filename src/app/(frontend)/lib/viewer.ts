import { cookies, headers } from 'next/headers'
import { getPayload, type Payload } from 'payload'
import { cache } from 'react'

import { availableSlots, type DeliverySlot, moscowToday, normalizeSlots, type SlotOption } from '@/lib/delivery'
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
  /** Рейсы доставки из настроек. */
  slots: DeliverySlot[]
  /** Ближайший рейс, на который ещё принимаются заказы. */
  nextSlot: SlotOption | null
  /** День доставки, на который показываются цены (ближайший рейс). */
  deliveryDate: Date
}

const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : (v as number)

/** Полдень по Москве указанного дня — чтобы календарный день не съехал из-за часового пояса. */
export const dayToDate = (day: string) => new Date(`${day}T12:00:00+03:00`)

export const getPayloadClient = cache(async () => getPayload({ config: await config }))

/** Кто смотрит страницу — один раз на запрос. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const payload = await getPayloadClient()
  const { user } = await payload.auth({ headers: await headers() })
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as SiteSetting
  const slots = normalizeSlots(settings.deliverySlots)
  const nextSlot = availableSlots(slots, new Date())[0] ?? null
  const deliveryDate = dayToDate(nextSlot?.day ?? moscowToday(new Date()))
  const common = { payload, settings, slots, nextSlot, deliveryDate }

  if (!user || user.collection !== 'customers') {
    return { ...common, customer: null, buyers: [], buyer: null }
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

  return { ...common, customer, buyers, buyer }
})
