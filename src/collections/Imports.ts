import type { CollectionConfig } from 'payload'

import { adminOnly, hasRole } from '../access'
import { applyBatch } from '../exchange/apply'
import { parseWorkbook } from '../exchange/xlsx'

const ENTITY_LABELS: Record<string, string> = {
  groups: 'Категории',
  products: 'Товары',
  priceTypes: 'Прайсы',
  prices: 'Цены (товаров)',
  stock: 'Остатки',
  buyerGroups: 'Сети',
  buyers: 'Покупатели',
  agreements: 'Торги и инд. цены',
}

/**
 * Импорт из Excel по шаблону. Те же правила, что у обмена с 1С:
 * записи находятся по коду 1С или артикулу и обновляются, а не дублируются.
 */
export const Imports: CollectionConfig = {
  slug: 'imports',
  labels: { singular: 'Импорт из Excel', plural: 'Импорт из Excel' },
  admin: {
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'status', 'summary', 'createdAt'],
    group: 'Обмен',
    description: 'Загрузите файл по шаблону «Продсервис — импорт». Данные применяются сразу после загрузки.',
  },
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
          const summary = Object.entries(result.stats)
            .map(([k, s]) => `${ENTITY_LABELS[k] ?? k}: получено ${s!.received}, создано ${s!.created}, обновлено ${s!.updated}`)
            .join('\n')
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
