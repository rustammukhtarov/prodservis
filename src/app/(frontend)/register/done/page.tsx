import type { Metadata } from 'next'
import Link from 'next/link'

import { IconCheck } from '../../components/Icons'
import { Shell } from '../../components/Shell'
import { getViewer } from '../../lib/viewer'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Регистрация завершена' }

export default async function RegisterDonePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const viewer = await getViewer()
  const b2b = (await searchParams).type === 'b2b'
  const active = viewer.customer?.status === 'active'
  return (
    <Shell viewer={viewer}>
      <div className="empty done">
        <IconCheck size={32} />
        <h1>{b2b && !active ? 'Заявка отправлена' : 'Вы зарегистрированы'}</h1>
        <p>
          {b2b && !active
            ? 'Менеджер проверит организацию и назначит ваши цены — обычно в течение рабочего дня. Мы напишем на email, когда всё будет готово. Пока можно смотреть каталог с ценами для гостей.'
            : 'Аккаунт активен — можно заказывать.'}
        </p>
        <Link href="/catalog" className="btn btn-primary btn-lg">
          Перейти в каталог
        </Link>
      </div>
    </Shell>
  )
}
