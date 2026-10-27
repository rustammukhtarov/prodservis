import Link from 'next/link'

import { chooseBuyer } from '../actions'
import { getCart } from '../lib/cart'
import { rub } from '../lib/catalog'
import type { Viewer } from '../lib/viewer'
import { BuyerSelect, LogoutButton } from './ClientBits'
import { IconCart, IconMenu, IconOrders, IconPin, IconSearch, IconUser } from './Icons'

const INFO_LINKS = [
  { href: '/info/dostavka', label: 'Доставка' },
  { href: '/info/otsrochka-platezha', label: 'Отсрочка платежа' },
  { href: '/suppliers', label: 'Поставщикам' },
  { href: '/info/o-kompanii', label: 'О компании' },
  { href: '/info/kontakty', label: 'Контакты' },
]

const telHref = (phone?: string | null) => (phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : undefined)

export async function Header({ viewer, query }: { viewer: Viewer; query?: string }) {
  const cart = await getCart()
  const { customer, buyers, buyer, settings } = viewer
  const phone = settings.phone
  const initial = (customer?.name || customer?.email || '?').trim().charAt(0).toUpperCase()
  const groupTitle =
    buyer && typeof buyer.group === 'object' && buyer.group
      ? buyer.group.title
      : buyer && typeof buyer.parent === 'object' && buyer.parent && typeof buyer.parent.group === 'object'
        ? buyer.parent.group?.title
        : null

  return (
    <>
      <div className="topbar">
        <div className="wrap topbar-in">
          <span className="topbar-city">
            <IconPin /> Москва и область
          </span>
          <nav aria-label="Информация" className="topbar-nav">
            {INFO_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          {phone && (
            <a className="topbar-phone" href={telHref(phone)}>
              {phone}
            </a>
          )}
        </div>
      </div>
      <header className="header">
        <div className="wrap header-in">
          <Link href="/" className="logo" aria-label="Продсервис — на главную">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Продсервис" width={147} height={48} />
          </Link>
          <Link href="/catalog" className="btn btn-primary btn-catalog">
            <IconMenu /> Каталог
          </Link>
          <form role="search" action="/catalog" className="search">
            <label htmlFor="q" className="sr-only">
              Поиск по товарам
            </label>
            <input id="q" name="q" type="search" placeholder="Томаты черри, рис для суши, масло…" defaultValue={query} />
            <button type="submit" aria-label="Найти">
              <IconSearch size={18} />
            </button>
          </form>
          {customer && (
            <div className="account">
              <span className="avatar" aria-hidden="true">
                {initial}
              </span>
              <div className="account-text">
                {buyers.length > 1 ? (
                  <BuyerSelect
                    action={chooseBuyer}
                    buyers={buyers.map((b) => ({ id: b.id, title: b.title }))}
                    current={buyer?.id ?? null}
                  />
                ) : (
                  <strong>{buyer?.title ?? customer.name}</strong>
                )}
                <span className="muted small">{groupTitle ?? customer.email}</span>
              </div>
              <LogoutButton className="link-btn small" />
            </div>
          )}
          <nav aria-label="Личный кабинет" className="header-icons">
            {!customer && (
              <Link href="/login">
                <IconUser />
                Войти
              </Link>
            )}
            <Link href={customer ? '/orders' : '/login?next=/orders'}>
              <IconOrders />
              Заказы
            </Link>
            <Link href="/cart" className={cart.count ? 'has-cart' : undefined}>
              <span className="cart-ico">
                <IconCart />
                {cart.count > 0 && <span className="cart-badge">{cart.count}</span>}
              </span>
              {cart.count > 0 ? rub(cart.total) : 'Корзина'}
            </Link>
          </nav>
        </div>
      </header>
    </>
  )
}

export function Footer({ viewer }: { viewer: Viewer }) {
  const c = viewer.settings
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div className="footer-col">
          <strong className="footer-brand">Продсервис</strong>
          <span>Доставляем лучшее — каждый день!</span>
          {c?.phone && (
            <a className="footer-phone" href={telHref(c.phone)}>
              {c.phone}
            </a>
          )}
          {c?.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
          {c?.address && <span>{c.address}</span>}
          {c?.workHours && <span>{c.workHours}</span>}
        </div>
        <nav aria-label="Клиентам" className="footer-col">
          <strong>Клиентам</strong>
          <Link href="/catalog">Каталог</Link>
          <Link href="/info/dostavka">Доставка</Link>
          <Link href="/info/otsrochka-platezha">Отсрочка платежа</Link>
          <Link href="/login">Личный кабинет</Link>
          <Link href="/register">Регистрация</Link>
        </nav>
        <nav aria-label="Компания" className="footer-col">
          <strong>Компания</strong>
          <Link href="/info/o-kompanii">О компании</Link>
          <Link href="/suppliers">Поставщикам</Link>
          <Link href="/info/kontakty">Контакты</Link>
        </nav>
        <nav aria-label="Документы" className="footer-col">
          <strong>Документы</strong>
          <Link href="/info/oferta">Публичная оферта</Link>
          <Link href="/info/politika-konfidentsialnosti">Политика обработки персональных данных</Link>
        </nav>
      </div>
      <div className="wrap footer-bottom">© {new Date().getFullYear()} Продсервис</div>
    </footer>
  )
}
