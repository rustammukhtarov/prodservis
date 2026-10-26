import type { Metadata } from 'next'

import { getCategories } from '../../lib/catalog'
import { CatalogView, type SearchParams } from '../CatalogView'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const cat = (await getCategories()).find((c) => c.slug === slug)
  return { title: cat?.seo?.title || cat?.title || 'Каталог', description: cat?.seo?.description || undefined }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  return <CatalogView slug={decodeURIComponent(slug)} searchParams={await searchParams} />
}
