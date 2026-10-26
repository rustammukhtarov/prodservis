import type { Metadata, Viewport } from 'next'
import React from 'react'

import './styles.css'

export const metadata: Metadata = {
  title: { default: 'Продсервис — свежие продукты для ресторанов и магазинов', template: '%s — Продсервис' },
  description:
    'Поставки овощей, фруктов и бакалеи ресторанам, кафе, гостиницам и магазинам Москвы. Персональные цены, доставка на следующий день.',
}

export const viewport: Viewport = { themeColor: '#2F6E0E' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
