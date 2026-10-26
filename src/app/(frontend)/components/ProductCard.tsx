import Link from 'next/link'

import { type CardProduct, dayLabel, priceNote, rub, UNIT_SHORT } from '../lib/catalog'

export function Availability({ p }: { p: CardProduct }) {
  if (p.stock > 0) return <span className="chip chip-soft">В наличии</span>
  if (p.nextDelivery) return <span className="chip chip-muted">Поставка {dayLabel(p.nextDelivery)}</span>
  return <span className="chip chip-muted">Под заказ</span>
}

export function PriceLine({ p, big }: { p: CardProduct; big?: boolean }) {
  const unit = UNIT_SHORT[p.unit] ?? p.unit
  if (!p.price) return <span className="muted">Цена по запросу</span>
  return (
    <span className={big ? 'price price-big' : 'price'}>
      <strong>{rub(p.price.price)}</strong>
      <span className="muted"> за {unit}</span>
    </span>
  )
}

export function ProductCard({ p }: { p: CardProduct }) {
  const unit = UNIT_SHORT[p.unit] ?? p.unit
  const note = priceNote(p.price)
  const href = `/product/${p.slug}`
  return (
    <article className="card">
      <Link href={href} className="card-img" tabIndex={-1} aria-hidden="true">
        {p.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image.url} alt="" loading="lazy" />
        ) : (
          <span className="card-noimg">Фото скоро</span>
        )}
      </Link>
      <div className="card-tags">
        <Availability p={p} />
        {p.country && <span className="chip chip-muted">{p.country}</span>}
      </div>
      <Link href={href} className="card-title">
        {p.title}
      </Link>
      {note && <span className={`chip chip-${note.tone}`}>{note.text}</span>}
      <PriceLine p={p} />
      <span className="muted small">
        От {p.minQty} {unit}
        {p.step > 1 ? `, кратно ${p.step}` : ''}
      </span>
    </article>
  )
}

export function ProductGrid({ items }: { items: CardProduct[] }) {
  return (
    <div className="grid-cards">
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  )
}
