import type { CollectionConfig } from 'payload'

import { adminOnly, hasRole } from '../access'
import { applyBatch } from '../exchange/apply'
import { exportCatalog, exportCustomers, exportOrders } from '../exchange/exportXlsx'
import { parseWorkbook } from '../exchange/xlsx'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const isDay = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)
/** Дата в имени файла: 2026-11-01. */
const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })

function fileResponse(buffer: Buffer, name: string, ascii: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': XLSX,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'no-store',
    },
  })
}

const ENTITY_LABELS: Record<string, string> = {
  groups: 'Категории',
  products: 'Товары',
  priceTypes: 'Прайсы',
  prices: 'Цены (товаров)',
  stock: 'Остатки',
  buyerGroups: 'Сети',
  buyers: 'Покупатели',
  agreements: 'Торги и инд. цены',
  orderStatuses: 'Статусы заказов',
}

/**
 * Импорт из Excel по шаблону. Те же правила, что у обмена с 1С:
 * записи находятся по коду 1С или артикулу и обновляются, а не дублируются.
 */
export const Imports: CollectionConfig = {
  slug: 'imports',
  labels: { singular: 'Загрузка из Excel', plural: 'Загрузка и выгрузка (Excel)' },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'status', 'summary', 'createdAt'],
    group: 'Обмен',
    description:
      'Ручной обмен с 1С, когда автоматический недоступен: выгрузите данные сайта или шаблон, заполните из 1С и загрузите сюда. Данные применяются сразу после загрузки.',
    components: { beforeList: ['@/components/admin/ManualExchange#ManualExchange'] },
  },
  endpoints: [
    {
      // GET /api/imports/export/catalog | template | orders | customers
      path: '/export/:kind',
      method: 'get',
      handler: async (req) => {
        const { user, payload } = req
        const kind = String(req.routeParams?.kind ?? '')
        const sales = hasRole(user, 'admin', 'manager')
        const content = hasRole(user, 'admin', 'content')
        if (!sales && !content) return Response.json({ message: 'Нет доступа' }, { status: 403 })

        if (kind === 'template') return fileResponse(await exportCatalog(payload, { empty: true }), 'Продсервис — шаблон загрузки.xlsx', 'prodservis-template.xlsx')
        if (kind === 'catalog') {
          if (!sales) return Response.json({ message: 'Нет доступа' }, { status: 403 })
          return fileResponse(await exportCatalog(payload), `Продсервис — данные сайта ${today()}.xlsx`, `prodservis-data-${today()}.xlsx`)
        }
        if (kind === 'customers') {
          if (!sales) return Response.json({ message: 'Нет доступа' }, { status: 403 })
          return fileResponse(await exportCustomers(payload), `Продсервис — клиенты ${today()}.xlsx`, `prodservis-customers-${today()}.xlsx`)
        }
        if (kind === 'orders') {
          if (!sales) return Response.json({ message: 'Нет доступа' }, { status: 403 })
          const q = req.searchParams
          const from = isDay(q.get('from'))
          const to = isDay(q.get('to'))
          const onlyNew = q.get('onlyNew') === '1'
          const { buffer, ids } = await exportOrders(payload, { from, to, onlyNew, withCancelled: q.get('cancelled') === '1' })
          // Отмечаем выгруженные, чтобы в следующий раз взять только новые.
          if (q.get('mark') === '1' && ids.length) {
            await payload.update({
              collection: 'orders',
              where: { id: { in: ids } },
              data: { exportedTo1C: true },
              overrideAccess: true,
              depth: 0,
            })
          }
          const period = from || to ? ` ${from ?? '…'}—${to ?? '…'}` : ''
          return fileResponse(buffer, `Продсервис — заказы${period} (${today()}).xlsx`, `prodservis-orders-${today()}.xlsx`)
        }
        return Response.json({ message: 'Неизвестная выгрузка' }, { status: 404 })
      },
    },
  ],
  access: {
    read: ({ req: { user } }) => hasRole(user, 'admin', 'manager', 'content'),
    create: ({ req: { user } }) => hasRole(user, 'admin', 'content'),
    update: adminOnly,
    delete: adminOnly,
  },
  defaultSort: '-createdAt',
  upload: {
    staticDir: 'private-imports',
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    // Только файл с компьютера: загрузка по ссылке не нужна и открывала бы сайту запросы наружу.
    pasteURL: false,
  },
  fields: [
    {
      name: 'status',
      label: 'Результат',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Обрабатывается', value: 'pending' },
        { label: 'Успешно', value: 'done' },
        { label: 'С ошибками', value: 'partial' },
        { label: 'Не удалось', value: 'failed' },
      ],
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'deactivateMissing',
      label: 'Снять с продажи товары, которых нет в файле',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Для полной выгрузки каталога из 1С: товары сайта, которых нет на листе «Товары», станут неактивными. Работает, только если в файле есть лист «Товары».',
      },
    },
    { name: 'summary', label: 'Итог', type: 'textarea', admin: { readOnly: true } },
    { name: 'errorsText', label: 'Ошибки по строкам', type: 'textarea', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create') return data
        const file = req.file
        if (!file?.data) return { ...data, status: 'failed', summary: 'Файл не получен' }
        try {
          const { batch, errors: parseErrors } = await parseWorkbook(file.data)
          // Без req: каждая запись в своей транзакции — ошибка в одной строке не откатывает остальные.
          const result = await applyBatch(req.payload, batch)
          const errors = [...parseErrors, ...result.errors]
          const lines = Object.entries(result.stats).map(
            ([k, s]) => `${ENTITY_LABELS[k] ?? k}: получено ${s!.received}, создано ${s!.created}, обновлено ${s!.updated}`,
          )
          if (data.deactivateMissing && batch.products?.length) {
            const skus = batch.products.map((p) => p.sku)
            const res = await req.payload.update({
              collection: 'products',
              where: { and: [{ sku: { not_in: skus } }, { isActive: { not_equals: false } }] },
              data: { isActive: false },
              overrideAccess: true,
              depth: 0,
            })
            lines.push(`Снято с продажи (нет в файле): ${res.docs.length}`)
          }
          const summary = lines.join('\n')
          return {
            ...data,
            status: errors.length ? 'partial' : 'done',
            summary: summary || 'В файле нет листов шаблона',
            errorsText: errors
              .slice(0, 500)
              .map((e) => `${ENTITY_LABELS[e.entity] ?? e.entity} — ${e.ref}: ${e.message}`)
              .join('\n'),
          }
        } catch (e) {
          return { ...data, status: 'failed', summary: `Файл не прочитан: ${e instanceof Error ? e.message : String(e)}` }
        }
      },
    ],
  },
}
