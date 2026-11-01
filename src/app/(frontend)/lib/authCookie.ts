import { cookies } from 'next/headers'

import { siteURL } from '@/lib/email'

/**
 * Ставит cookie входа так же, как это делает сам Payload.
 * Лежит отдельно от файлов 'use server': оттуда каждая экспортируемая функция
 * становится доступной из браузера, а эта должна вызываться только на сервере.
 */
export async function setAuthCookie(token: string, exp?: number) {
  ;(await cookies()).set('payload-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: siteURL().startsWith('https://'),
    expires: exp ? new Date(exp * 1000) : undefined,
  })
}
