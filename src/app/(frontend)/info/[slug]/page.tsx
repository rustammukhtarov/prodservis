import { RichText } from '@payloadcms/richtext-lexical/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { cache } from 'react'

import type { Page } from '@/payload-types'

import { Shell } from '../../components/Shell'
import { getPayloadClient, getViewer } from '../../lib/viewer'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

/** Названия разделов, пока страницу не заполнили в админке. */
const DEFAULT_TITLES: Record<string, string> = {
  dostavka: 'Доставка',
  'otsrochka-platezha': 'Отсрочка платежа',
  postavschikam: 'Поставщикам',
  'o-kompanii': 'О компании',
  kontakty: 'Контакты',
  oferta: 'Публичная оферта',
  'politika-konfidentsialnosti': 'Политика обработки персональных данных',
}

const findPage = cache(async (slug: string): Promise<Page | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({ collection: 'pages', where: { slug: { equals: slug } }, limit: 1, depth: 1 })
  return (res.docs[0] as Page) ?? null
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug
  const page = await findPage(slug)
  return { title: page?.seo?.title || page?.title || DEFAULT_TITLES[slug] || 'Страница' }
}

export default async function InfoPage({ params }: Props) {
  const slug = (await params).slug
  const [viewer, page] = await Promise.all([getViewer(), findPage(slug)])
  const s = viewer.settings
  const title = page?.title || DEFAULT_TITLES[slug] || 'Страница'

  return (
    <Shell viewer={viewer}>
      <nav aria-label="Хлебные крошки" className="crumbs">
        <Link href="/">Главная</Link>
        <span aria-hidden="true">/</span>
        <span>{title}</span>
      </nav>
      <article className="info">
        <h1>{title}</h1>
        {page?.lead && <p className="lead">{page.lead}</p>}
        {page?.content ? (
          <div className="rich">
            <RichText data={page.content} />
          </div>
        ) : slug === 'kontakty' ? null : (
          <p className="muted">Раздел готовится. Текст добавляется в админке: «Страницы», адрес (slug) — {slug}.</p>
        )}
        {slug === 'kontakty' && (
          <dl className="specs">
            {(
              [
                ['Телефон', s.phone],
                ['E-mail', s.email],
                ['WhatsApp', s.whatsapp],
                ['Telegram', s.telegram],
                ['Адрес', s.address],
                ['Часы работы', s.workHours],
                ['Реквизиты', s.requisites],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
        )}
        {page?.faq && page.faq.length > 0 && (
          <section className="faq">
            <h2>Вопросы и ответы</h2>
            {page.faq.map((f) => (
              <details key={f.id ?? f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </section>
        )}
      </article>
    </Shell>
  )
}
