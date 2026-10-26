'use server'

import { cookies } from 'next/headers'

import { BUYER_COOKIE, getViewer } from './lib/viewer'

/** Клиент выбирает юрлицо, от имени которого смотрит цены и заказывает. */
export async function chooseBuyer(formData: FormData) {
  const id = Number(formData.get('buyer'))
  const { buyers } = await getViewer()
  if (!buyers.some((b) => b.id === id)) return
  ;(await cookies()).set(BUYER_COOKIE, String(id), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  })
}
