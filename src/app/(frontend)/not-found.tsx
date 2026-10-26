import Link from 'next/link'

import { Shell } from './components/Shell'
import { getViewer } from './lib/viewer'

export default async function NotFound() {
  const viewer = await getViewer()
  return (
    <Shell viewer={viewer}>
      <div className="empty">
        <h1>Страница не найдена</h1>
        <p className="muted">Возможно, товар сняли с продажи или адрес изменился.</p>
        <Link href="/catalog" className="btn btn-primary">
          В каталог
        </Link>
      </div>
    </Shell>
  )
}
