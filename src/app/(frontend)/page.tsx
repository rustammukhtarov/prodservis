import Link from 'next/link'

import type { Media, Product } from '@/payload-types'

import { IconCalendar, IconCheck, IconTag, IconTruck } from './components/Icons'
import { ProductGrid } from './components/ProductCard'
import { GuestPriceNotice, Shell } from './components/Shell'
import { getCategories, parentId, toCards } from './lib/catalog'
import { getViewer } from './lib/viewer'

export const dynamic = 'force-dynamic'

const TILE_COLORS = ['#E6F6CF', '#FFF1D6', '#DDF3E4', '#F1EBE2', '#FCE4EC', '#F6EEDC', '#FFF6CC', '#EAF0F6']

const SEGMENTS = [
  {
    title: 'Ресторанам, кафе, отелям',
    perks: ['Персональные цены и торги сети', 'Отсрочка платежа', 'Доставка на следующий день'],
    cta: 'Стать клиентом',
  },
  { title: 'Магазинам', perks: ['Персональный прайс', 'Отсрочка платежа', 'Поставки по графику'], cta: 'Стать клиентом' },
  { title: 'Крупный опт', perks: ['Цены от объёма', 'Доставка или самовывоз', 'Персональный менеджер'], cta: 'Обсудить условия' },
  {
    title: 'Для дома',
    perks: ['Те же продукты, что у ресторанов', 'Заказ от 15 000 ₽', 'Доставка до двери'],
    cta: 'Заказать домой',
  },
]

export default async function HomePage() {
  const viewer = await getViewer()
  const cutoff = viewer.settings.orderCutoff || '17:00'
  const categories = (await getCategories()).filter((c) => !parentId(c))

  const fresh = await viewer.payload.find({
    collection: 'products',
    where: { and: [{ isActive: { not_equals: false } }, { stock: { greater_than: 0 } }] },
    sort: '-updatedAt',
    limit: 10,
    depth: 1,
  })
  const cards = await toCards(viewer, fresh.docs as Product[])
  const isGuestPrices = !viewer.customer || viewer.customer.status !== 'active'

  return (
    <Shell viewer={viewer}>
      <section className="hero">
        <div className="hero-text">
          <span className="pill">Заказ до {cutoff} — доставка завтра</span>
          <h1>Свежие овощи, фрукты и бакалея для ресторанов и магазинов</h1>
          <p className="lead">
            Войдите — и каталог покажет ваши цены: прайс, цены торгов вашей сети и индивидуальные условия.
          </p>
          <div className="row-btns">
            <Link href="/catalog" className="btn btn-primary btn-lg">
              Перейти в каталог
            </Link>
            {!viewer.customer && (
              <Link href="/login" className="btn btn-outline btn-lg">
                Войти
              </Link>
            )}
          </div>
        </div>
        <div className="hero-card">
          <p className="hero-slogan">Доставляем лучшее — каждый день!</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fruits.png" alt="" aria-hidden="true" width={200} height={200} />
        </div>
      </section>

      <section aria-label="Условия" className="perks">
        <div className="perk">
          <span className="perk-ico">
            <IconCalendar />
          </span>
          <span>
            <strong>Отсрочка платежа</strong>
            <span className="muted small">Для юрлиц по договору</span>
          </span>
        </div>
        <div className="perk">
          <span className="perk-ico">
            <IconTag />
          </span>
          <span>
            <strong>Персональные цены</strong>
            <span className="muted small">Прайс, торги сети, инд. условия</span>
          </span>
        </div>
        <div className="perk">
          <span className="perk-ico">
            <IconTruck />
          </span>
          <span>
            <strong>Доставка завтра</strong>
            <span className="muted small">При заказе до {cutoff}</span>
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Каталог</h2>
          <Link href="/catalog">Все товары</Link>
        </div>
        <div className="tiles">
          {categories.map((c, i) => {
            const img = c.image && typeof c.image === 'object' ? (c.image as Media) : null
            return (
              <Link
                key={c.id}
                href={`/catalog/${c.slug}`}
                className="tile"
                style={{ background: TILE_COLORS[i % TILE_COLORS.length] }}
              >
                <span className="tile-title">{c.title}</span>
                {img?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.sizes?.card?.url || img.url} alt="" loading="lazy" />
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {cards.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>В наличии сейчас</h2>
            <Link href="/catalog?inStock=1">Смотреть все</Link>
          </div>
          {isGuestPrices && !viewer.customer && <GuestPriceNotice />}
          <ProductGrid items={cards} />
        </section>
      )}

      <section className="section">
        <h2>Работаем с вами, кем бы вы ни были</h2>
        <div className="segments">
          {SEGMENTS.map((s) => (
            <div key={s.title} className="segment">
              <strong>{s.title}</strong>
              <ul>
                {s.perks.map((perk) => (
                  <li key={perk}>
                    <IconCheck /> {perk}
                  </li>
                ))}
              </ul>
              <Link href="/info/kontakty">{s.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      <section className="section steps-box">
        <h2>Как начать работать</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <strong>Оставьте заявку</strong>
            <span className="muted">Ресторан, магазин, опт или для дома</span>
          </li>
          <li>
            <span className="step-num">2</span>
            <strong>Укажите организацию</strong>
            <span className="muted">По ИНН — менеджер найдёт вас в учёте</span>
          </li>
          <li>
            <span className="step-num">3</span>
            <strong>Получите свои цены</strong>
            <span className="muted">Менеджер назначит прайс и подключит торги</span>
          </li>
          <li>
            <span className="step-num">4</span>
            <strong>Заказывайте онлайн</strong>
            <span className="muted">Круглосуточно, с повтором прошлых заказов</span>
          </li>
        </ol>
      </section>
    </Shell>
  )
}
