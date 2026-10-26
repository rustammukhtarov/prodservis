import type { Metadata } from 'next'

import { CatalogView, type SearchParams } from './CatalogView'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Каталог' }

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <CatalogView searchParams={await searchParams} />
}
