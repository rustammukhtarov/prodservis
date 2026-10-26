import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import type { Category, Product } from '@/payload-types'

import { Availability, PriceLine, ProductGrid } from '../../components/ProductCard'
import { GuestPriceNotice, Shell } from '../../components/Shell'
import {
  allImages,
  categoryPath,
  getCategories,
  priceNote,
  STORAGE_LABEL,
  toCards,
  UNIT_SHORT,
  weekdayLabel,
} from '../../lib/catalog'
import { getPayloadClient, getViewer } from '../../lib/viewer'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

const findProduct = cache(async (slug: string): Promise<Product | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'products',
    where: { and: [{ slug: { equals: slug } }, { isActive: { not_equals: false } }] },
    limit: 1,
    depth: 1,
  })
  return (res.docs[0] as Product) ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await findProduct(decodeURIComponent((await params).slug))
  return p ? { title: p.seo?.title || p.title, description: p.seo?.description || undefined } : {}
}

export default async function ProductPage({ params }: Props) {
  const product = await findProduct(decodeURIComponent((await params).slug))
  if (!product) notFound()

  const viewer = await getViewer()
  const [card] = await toCards(viewer, [product])
  const unit = UNIT_SHORT[product.unit] ?? product.unit
  const note = priceNote(card.price)
  const images = allImages(product)
  const all = await getCategories()
  const cat = typeof product.category === 'object' ? (product.category as Category) : null
  const crumbs = cat ? categoryPath(all, all.find((c) => c.id === cat.id) ?? cat) : []

  const relatedDocs = cat
    ? (
        await viewer.payload.find({
          collection: 'products',
          where: {
            and: [{ category: { equals: cat.id } }, { id: { not_equals: product.id } }, { isActive: { not_equals: false } }],
          },
          limit: 5,
          depth: 1,
        })
      ).docs
    : []
  const related = await toCards(viewer, relatedDocs as Product[])

  const specs: [string, string | null | undefined][] = [
    ['Артикул', product.sku],
    ['Бренд', product.brand],
    ['Страна', product.country],
    ['Единица', unit],
    ['Вес единицы', product.weight ? `${product.weight} кг` : null],
    ['Вложение в короб', product.packQty],
    ['Хранение', product.storage ? STORAGE_LABEL[product.storage] : null],
    ['Срок годности', product.shelfLife],
    ['Халяль', product.isHalal ? 'Да' : null],
    ['Ветеринарный (Меркурий)', product.isVet ? 'Да' : null],
    ['Маркировка «Честный знак»', product.isMarked ? 'Да' : null],
  ]

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <Link href="/catalog">Каталог</Link>
        {crumbs.map((c) => (
          <span key={c.id} className="crumbs-part">
            <span aria-hidden="true">/</span>
            <Link href={`/catalog/${c.slug}`}>{c.title}</Link>
          </span>
        ))}
      </nav>

      <div className="product">
        <div className="gallery">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="gallery-main" src={images[0].url} alt={images[0].alt} />
          ) : (
            <div className="gallery-main gallery-empty">Фото скоро</div>
          )}
          {images.length > 1 && (
            <div className="gallery-thumbs">
              {images.slice(1, 5).map((im) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={im.url} src={im.thumb} alt={im.alt} loading="lazy" />
              ))}
            </div>
          )}
        </div>

        <div className="buy">
          <div className="card-tags">
            <Availability p={card} />
            {product.storage && <span className="chip chip-soft">{STORAGE_LABEL[product.storage]}</span>}
            {product.country && <span className="chip chip-muted">{product.country}</span>}
          </div>
          <h1>{product.title}</h1>

          <div className="buy-box">
            {note && <span className={`chip chip-${note.tone}`}>{note.text}</span>}
            <PriceLine p={card} big />
            <span className="muted">
              Минимальный заказ — {card.minQty} {unit}
              {card.step > 1 ? `, кратно ${card.step}` : ''}. Цена на доставку: {weekdayLabel(viewer.deliveryDate)}.
            </span>
            {viewer.customer ? (
              <p className="muted small">Заказ через корзину появится в следующем обновлении сайта.</p>
            ) : (
              <Link href={`/login?next=/product/${product.slug}`} className="btn btn-primary btn-lg">
                Войти, чтобы заказать
              </Link>
            )}
          </div>
          {!viewer.customer && <GuestPriceNotice />}

          <section>
            <h2 className="h3">Характеристики</h2>
            <dl className="specs">
              {specs
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {product.description && (
            <section className="rich">
              <h2 className="h3">Описание</h2>
              <RichText data={product.description} />
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="section">
          <h2>Из этой же категории</h2>
          <ProductGrid items={related} />
        </section>
      )}
    </Shell>
  )
}
