import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { isB2B, SEGMENTS } from '@/lib/segments'
import type { User } from '@/payload-types'

import { Shell } from '../components/Shell'
import { getViewer } from '../lib/viewer'
import {
  addAddress,
  changePassword,
  removeAddress,
  removeRequestedOrg,
  requestOrg,
  updateProfile,
} from './actions'
import { AddressForm, OrgForm, PasswordForm, ProfileForm, RemoveButton } from './AccountPanels'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Личный кабинет' }

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'На проверке', tone: 'new' },
  active: { label: 'Активен', tone: 'done' },
  blocked: { label: 'Заблокирован', tone: 'off' },
}

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`

export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const passwordChanged = (await searchParams).password === 'changed'
  const viewer = await getViewer()
  const { customer, buyers, payload } = viewer
  if (!customer) redirect('/login?next=/account')

  const b2b = isB2B(customer.segment)
  const status = STATUS[customer.status ?? 'pending'] ?? STATUS.pending
  const segmentLabel = SEGMENTS.find((s) => s.value === customer.segment)?.label ?? ''

  const [orders, manager] = await Promise.all([
    payload.count({ collection: 'orders', where: { customer: { equals: customer.id } }, overrideAccess: true }),
    customer.manager
      ? (payload
          .findByID({
            collection: 'users',
            id: typeof customer.manager === 'object' ? customer.manager.id : customer.manager,
            depth: 0,
            overrideAccess: true,
          })
          .catch(() => null) as Promise<User | null>)
      : null,
  ])

  const linkedInn = new Set(buyers.map((b) => b.inn).filter(Boolean))
  const pendingOrgs = (customer.requestedOrgs ?? []).filter((o) => !linkedInn.has(o.inn))
  const addresses = customer.addresses ?? []
  const contacts = viewer.settings

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>Личный кабинет</span>
      </nav>
      <div className="page-head acc-head">
        <div>
          <h1>Личный кабинет</h1>
          <p className="muted">
            {customer.name} · {segmentLabel}
          </p>
        </div>
        <span className={`status status-${status.tone}`}>{status.label}</span>
      </div>

      {customer.status === 'pending' && (
        <p className="notice notice-warn notice-big">
          {b2b
            ? 'Заявка на проверке. Менеджер найдёт вашу организацию, привяжет её к кабинету и назначит цены — обычно в течение рабочего дня. Пока в каталоге цены для гостей.'
            : 'Аккаунт на проверке. Как только менеджер его подтвердит, можно будет оформлять заказы.'}
        </p>
      )}
      {customer.status === 'blocked' && (
        <p className="notice notice-warn notice-big">Аккаунт заблокирован. Свяжитесь с менеджером.</p>
      )}

      <div className="acc-stats">
        <Link href="/orders" className="acc-stat">
          <strong>{orders.totalDocs}</strong>
          <span>Мои заказы</span>
        </Link>
        <Link href="/catalog" className="acc-stat">
          <strong>Каталог</strong>
          <span>{b2b && buyers.length ? 'Ваши цены' : 'Цены и наличие'}</span>
        </Link>
        <div className="acc-stat">
          {manager ? (
            <>
              <strong>{manager.name}</strong>
              <span>
                Ваш менеджер
                {manager.phone ? (
                  <>
                    {' · '}
                    <a href={telHref(manager.phone)}>{manager.phone}</a>
                  </>
                ) : null}
              </span>
              {manager.email && <a href={`mailto:${manager.email}`}>{manager.email}</a>}
            </>
          ) : (
            <>
              <strong>Поддержка</strong>
              <span>
                {contacts?.phone ? <a href={telHref(contacts.phone)}>{contacts.phone}</a> : 'Отдел продаж'}
              </span>
              {contacts?.email && <a href={`mailto:${contacts.email}`}>{contacts.email}</a>}
            </>
          )}
        </div>
      </div>

      <div className="acc-grid">
        <section className="acc-card" aria-labelledby="acc-profile">
          <h2 id="acc-profile">Профиль</h2>
          <ProfileForm action={updateProfile} name={customer.name} phone={customer.phone ?? ''} email={customer.email} />
        </section>

        {b2b ? (
          <section className="acc-card" aria-labelledby="acc-orgs">
            <h2 id="acc-orgs">Организации</h2>
            {buyers.length === 0 && pendingOrgs.length === 0 && (
              <p className="muted">Организаций пока нет. Добавьте ИНН — менеджер привяжет её и назначит цены.</p>
            )}
            {buyers.length > 0 && (
              <ul className="acc-list">
                {buyers.map((b) => (
                  <li key={b.id}>
                    <div>
                      <strong>{b.title}</strong>
                      <span className="muted small">
                        {[b.inn && `ИНН ${b.inn}`, b.kpp && `КПП ${b.kpp}`].filter(Boolean).join(' · ') || 'Партнёр'}
                      </span>
                      {(b.deliveryPoints ?? []).length > 0 && (
                        <ul className="acc-points">
                          {(b.deliveryPoints ?? []).map((p) => (
                            <li key={p.id ?? p.address}>{p.title ? `${p.title}: ${p.address}` : p.address}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <span className="status status-done">Подключена</span>
                  </li>
                ))}
              </ul>
            )}
            {pendingOrgs.length > 0 && (
              <ul className="acc-list">
                {pendingOrgs.map((o) => (
                  <li key={o.id ?? o.inn}>
                    <div>
                      <strong>{o.title || 'Организация'}</strong>
                      <span className="muted small">
                        ИНН {o.inn}
                        {o.kpp ? ` · КПП ${o.kpp}` : ''}
                      </span>
                    </div>
                    <div className="acc-row-end">
                      <span className="status status-new">На проверке</span>
                      <form action={removeRequestedOrg}>
                        <input type="hidden" name="id" value={o.id ?? ''} />
                        <RemoveButton label={`Удалить заявку на ИНН ${o.inn}`} />
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Точки доставки организаций ведёт менеджер. Чтобы добавить или изменить точку — напишите ему.
            </p>
            <details className="acc-more">
              <summary>Добавить организацию</summary>
              <OrgForm action={requestOrg} />
            </details>
          </section>
        ) : null}

        {!b2b && (
        <section className="acc-card" aria-labelledby="acc-addr">
          <h2 id="acc-addr">Адреса доставки</h2>
          {addresses.length === 0 ? (
            <p className="muted">Сохранённых адресов нет.</p>
          ) : (
            <ul className="acc-list">
              {addresses.map((a) => (
                <li key={a.id ?? a.address}>
                  <div>
                    <strong>{a.address}</strong>
                    {a.comment && <span className="muted small">{a.comment}</span>}
                  </div>
                  <form action={removeAddress}>
                    <input type="hidden" name="id" value={a.id ?? ''} />
                    <RemoveButton label={`Удалить адрес ${a.address}`} />
                  </form>
                </li>
              ))}
            </ul>
          )}
          <details className="acc-more" open={addresses.length === 0}>
            <summary>Добавить адрес</summary>
            <AddressForm action={addAddress} />
          </details>
        </section>
        )}

        <section className="acc-card" aria-labelledby="acc-pass">
          <h2 id="acc-pass">Пароль</h2>
          {passwordChanged && (
            <p className="form-ok" role="status">
              Пароль изменён.
            </p>
          )}
          <PasswordForm action={changePassword} />
        </section>
      </div>
    </Shell>
  )
}
