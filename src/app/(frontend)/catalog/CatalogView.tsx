import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Where } from 'payload'

import type { Category, Product } from '@/payload-types'

import { AutoSubmit, MobileCollapse } from '../components/ClientBits'
import { IconCheck } from '../components/Icons'
import { ProductGrid } from '../components/ProductCard'
import { GuestPriceNotice, Shell } from '../components/Shell'
import { categoryPath, getCategories, parentId, STORAGE_LABEL, slotLabel, subtreeIds, toCards, weekdayLabel } from '../lib/catalog'
import { getViewer } from '../lib/viewer'

export type SearchParams = Record<string, string | string[] | undefined>

const PAGE = 24
const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean)
const one = (v: string | string[] | undefined) => list(v)[0] ?? ''

const SORTS = [
  { value: '', label: 'Сначала в наличии' },
  { value: 'mine', label: 'Сначала мои цены' },
  { value: 'cheap', label: 'Дешевле' },
  { value: 'expensive', label: 'Дороже' },
  { value: 'name', label: 'По названию' },
]

export async function CatalogView({ slug, searchParams }: { slug?: string; searchParams: SearchParams }) {
  const viewer = await getViewer()
  const all = await getCategories()

  let current: Category | null = null
  if (slug) {
    current = all.find((c) => c.slug === slug) ?? null
    if (!current) notFound()
  }

  const q = one(searchParams.q).trim()
  const inStock = one(searchParams.inStock) === '1'
  const countries = list(searchParams.country)
  const storages = list(searchParams.storage)
  const priceFrom = Number(one(searchParams.from)) || 0
  const priceTo = Number(one(searchParams.to)) || 0
  const sort = one(searchParams.sort)
  const page = Math.max(1, Number(one(searchParams.page)) || 1)

  const base: Where[] = [{ isActive: { not_equals: false } }]
  if (current) base.push({ category: { in: subtreeIds(all, current.id) } })
  if (q) base.push({ or: [{ title: { like: q } }, { sku: { like: q } }, { brand: { like: q } }] })
  if (inStock) base.push({ stock: { greater_than: 0 } })
  if (storages.length) base.push({ storage: { in: storages } })

  const found = await viewer.payload.find({
    collection: 'products',
    where: { and: base },
    sort: 'title',
    limit: 3000,
    depth: 1,
    pagination: false,
  })
  const docs = found.docs as Product[]
  const countryList = [...new Set(docs.map((p) => p.country).filter((c): c is string => Boolean(c)))].sort((a, b) =>
    a.localeCompare(b, 'ru'),
  )

  let cards = await toCards(viewer, countries.length ? docs.filter((p) => countries.includes(p.country ?? '')) : docs)
  if (priceFrom) cards = cards.filter((c) => (c.price?.price ?? Infinity) >= priceFrom)
  if (priceTo) cards = cards.filter((c) => (c.price?.price ?? Infinity) <= priceTo)

  const mine = (c: (typeof cards)[number]) => (c.price?.source === 'individual' ? 0 : c.price?.source === 'tender' ? 1 : 2)
  const byName = (a: (typeof cards)[number], b: (typeof cards)[number]) => a.title.localeCompare(b.title, 'ru')
  cards.sort((a, b) => {
    if (sort === 'cheap') return (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity)
    if (sort === 'expensive') return (b.price?.price ?? -1) - (a.price?.price ?? -1)
    if (sort === 'name') return byName(a, b)
    if (sort === 'mine') return mine(a) - mine(b) || byName(a, b)
    return Number(b.stock > 0) - Number(a.stock > 0) || byName(a, b)
  })

  const shown = cards.slice(0, page * PAGE)
  const activeFilters = [inStock, countries.length, storages.length, priceFrom || priceTo].filter(Boolean).length
  const hasMine = cards.some((c) => c.price?.source === 'tender' || c.price?.source === 'individual')

  // Ссылки сохраняют текущие фильтры.
  const withParams = (patch: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) for (const x of list(v)) sp.append(k, x)
    for (const [k, v] of Object.entries(patch)) {
      sp.delete(k)
      if (v) sp.set(k, v)
    }
    const s = sp.toString()
    return s ? `?${s}` : '?'
  }

  const children = all.filter((c) => parentId(c) === (current?.id ?? null))
  const crumbs = current ? categoryPath(all, current) : []
  const title = current ? current.title : q ? `Поиск: «${q}»` : 'Каталог'
  const isGuest = !viewer.customer

  return (
    <Shell viewer={viewer} query={q}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        {current ? <Link href="/catalog">Каталог</Link> : <span>Каталог</span>}
        {crumbs.slice(0, -1).map((c) => (
          <span key={c.id} className="crumbs-part">
            <span aria-hidden="true">/</span>
            <Link href={`/catalog/${c.slug}`}>{c.title}</Link>
          </span>
        ))}
        {current && (
          <span className="crumbs-part">
            <span aria-hidden="true">/</span>
            <span>{current.title}</span>
          </span>
        )}
      </nav>

      <div className="page-head">
        <h1>{title}</h1>
        <span className="muted">{cards.length} товаров</span>
      </div>

      {children.length > 0 && (
        <div className="chips-row">
          <Link href={current ? `/catalog/${current.slug}` : '/catalog'} className="chip-link is-active">
            Все
          </Link>
          {children.map((c) => (
            <Link key={c.id} href={`/catalog/${c.slug}`} className="chip-link">
              {c.title}
            </Link>
          ))}
        </div>
      )}

      <div className="catalog">
        <aside aria-label="Фильтры" className="filters">
          <MobileCollapse summary={`Фильтры${activeFilters ? ` · ${activeFilters}` : ''}`}>
          <AutoSubmit className="filters-form">
            {q && <input type="hidden" name="q" value={q} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <fieldset>
              <legend>Показать</legend>
              <label className="check">
                <input type="checkbox" name="inStock" value="1" defaultChecked={inStock} /> Только в наличии
              </label>
            </fieldset>
            {countryList.length > 0 && (
              <fieldset>
                <legend>Страна</legend>
                {countryList.slice(0, 6).map((c) => (
                  <label key={c} className="check">
                    <input type="checkbox" name="country" value={c} defaultChecked={countries.includes(c)} /> {c}
                  </label>
                ))}
                {countryList.length > 6 && (
                  <details className="more-list" open={countryList.slice(6).some((c) => countries.includes(c))}>
                    <summary>Показать ещё {countryList.length - 6}</summary>
                    {countryList.slice(6).map((c) => (
                      <label key={c} className="check">
                        <input type="checkbox" name="country" value={c} defaultChecked={countries.includes(c)} /> {c}
                      </label>
                    ))}
                  </details>
                )}
              </fieldset>
            )}
            <fieldset>
              <legend>Хранение</legend>
              {Object.entries(STORAGE_LABEL).map(([value, label]) => (
                <label key={value} className="check">
                  <input type="checkbox" name="storage" value={value} defaultChecked={storages.includes(value)} />{' '}
                  {label}
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Цена за единицу, ₽</legend>
              <div className="range">
                <label>
                  от
                  <input type="number" name="from" min={0} inputMode="numeric" defaultValue={priceFrom || ''} />
                </label>
                <label>
                  до
                  <input type="number" name="to" min={0} inputMode="numeric" defaultValue={priceTo || ''} />
                </label>
              </div>
            </fieldset>
            <div className="filters-actions">
              <button type="submit" className="btn btn-primary">
                Применить
              </button>
              <Link href={current ? `/catalog/${current.slug}` : '/catalog'} className="link-btn">
                Сбросить
              </Link>
            </div>
          </AutoSubmit>
          </MobileCollapse>
        </aside>

        <section aria-label="Товары" className="catalog-list">
          <div className="list-head">
            <p className="notice notice-ok">
              <IconCheck size={16} /> Цены на доставку {viewer.nextSlot ? slotLabel(viewer.nextSlot) : weekdayLabel(viewer.deliveryDate)}
            </p>
            <AutoSubmit className="sort-form">
              {Object.entries(searchParams)
                .filter(([k]) => k !== 'sort' && k !== 'page')
                .flatMap(([k, v]) => list(v).map((x, i) => <input key={`${k}-${i}`} type="hidden" name={k} value={x} />))}
              <label>
                Сортировка{' '}
                <select name="sort" defaultValue={sort}>
                  {SORTS.filter((s) => s.value !== 'mine' || hasMine).map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <noscript>
                <button type="submit">OK</button>
              </noscript>
            </AutoSubmit>
          </div>
          {isGuest && <GuestPriceNotice />}
          {shown.length ? (
            <ProductGrid items={shown} />
          ) : (
            <div className="empty">
              <p>Ничего не нашли. Попробуйте изменить запрос или сбросить фильтры.</p>
              <Link href="/catalog" className="btn btn-outline">
                Весь каталог
              </Link>
            </div>
          )}
          {cards.length > shown.length && (
            <Link href={withParams({ page: String(page + 1) })} scroll={false} className="btn btn-outline btn-lg more">
              Показать ещё
            </Link>
          )}
        </section>
      </div>
    </Shell>
  )
}
