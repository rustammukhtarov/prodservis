import ExcelJS from 'exceljs'
import type { CollectionSlug, Payload, Where } from 'payload'

import type {
  Buyer,
  Category,
  Customer,
  CustomerGroup,
  Order,
  PriceAgreement,
  PriceType,
  Product,
} from '@/payload-types'

import { SHEETS } from './xlsx'

/**
 * Выгрузка в Excel для ручного обмена с 1С.
 *
 * 1. Справочники — в точности в формате шаблона загрузки: файл можно поправить и загрузить обратно.
 * 2. Заказы — для ввода в 1С: шапки заказов и строки, плюс лист для обратной загрузки статусов.
 * 3. Клиенты — кого создать или проверить в 1С.
 */

const GREEN = 'FF2F6E0E'
const LIGHT = 'FFE6F6CF'

const UNIT_RU: Record<string, string> = { kg: 'кг', pcs: 'шт', pack: 'упак', box: 'кор', l: 'л' }
const STORAGE_RU: Record<string, string> = {
  frozen: 'заморозка',
  chilled: 'охлаждённое',
  fresh: 'свежее',
  dry: 'сухое',
}
export const ORDER_STATUS_RU: Record<string, string> = {
  new: 'Новый',
  accepted: 'Принят',
  picking: 'Собирается',
  shipping: 'В пути',
  delivered: 'Доставлен',
  cancelled: 'Отменён',
}
const PAYMENT_RU: Record<string, string> = {
  contract: 'По договору (безнал)',
  cash: 'Наличными курьеру',
  card: 'Картой курьеру',
  online: 'Онлайн',
}
const SEGMENT_RU: Record<string, string> = {
  horeca: 'HoReCa',
  retail: 'Магазин',
  wholesale: 'Опт',
  individual: 'Физлицо',
}
const CUSTOMER_STATUS_RU: Record<string, string> = {
  pending: 'На проверке',
  active: 'Активен',
  blocked: 'Заблокирован',
}

export const SHEET_ORDER_STATUSES = 'Статусы заказов'

type Col = { header: string; width?: number; required?: boolean; date?: boolean; money?: boolean }
type Cell = string | number | boolean | Date | null | undefined

const yesNo = (v: boolean | null | undefined) => (v == null ? '' : v ? 'да' : 'нет')
const idOf = (v: unknown): number | null =>
  v == null ? null : typeof v === 'object' ? ((v as { id: number }).id ?? null) : Number(v)
/** Календарный день из ISO-даты (поля дат хранятся как полдень UTC). */
const asDay = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const d = iso.slice(0, 10)
  return new Date(`${d}T00:00:00.000Z`)
}

function sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Cell[][]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] })
  ws.columns = cols.map((c) => ({
    header: c.required ? `${c.header}*` : c.header,
    width: c.width ?? Math.max(12, c.header.length + 4),
    style: c.date ? { numFmt: 'dd.mm.yyyy' } : c.money ? { numFmt: '#,##0.00' } : {},
  }))
  const head = ws.getRow(1)
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }
  head.alignment = { vertical: 'middle', wrapText: true }
  head.height = 30
  for (const r of rows) ws.addRow(r.map((v) => (v === undefined ? null : v)))
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
  return ws
}

function instructions(wb: ExcelJS.Workbook, title: string, lines: string[]) {
  const ws = wb.addWorksheet('Инструкция')
  ws.getColumn(1).width = 110
  const t = ws.addRow([title])
  t.font = { bold: true, size: 14, color: { argb: GREEN } }
  ws.addRow([`Сформировано: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} (МСК)`]).font = {
    italic: true,
    color: { argb: 'FF5B6155' },
  }
  ws.addRow([])
  for (const l of lines) {
    const row = ws.addRow([l])
    row.alignment = { wrapText: true, vertical: 'top' }
    if (l.endsWith(':')) {
      row.font = { bold: true }
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT } }
    }
  }
}

async function all<T>(payload: Payload, collection: CollectionSlug, where?: Where, sort?: string): Promise<T[]> {
  const res = await payload.find({ collection, where, sort, depth: 0, pagination: false, overrideAccess: true })
  return res.docs as unknown as T[]
}

const toBuffer = async (wb: ExcelJS.Workbook) => Buffer.from(await wb.xlsx.writeBuffer())

/* ---------------------------------- Справочники ---------------------------------- */

/** Каталог, цены, покупатели и торги — в формате шаблона загрузки. */
export async function exportCatalog(payload: Payload, opts: { empty?: boolean } = {}): Promise<Buffer> {
  const empty = Boolean(opts.empty)
  const [cats, products, types, groups, buyers, agreements] = empty
    ? [[], [], [], [], [], []]
    : await Promise.all([
        all<Category>(payload, 'categories', undefined, 'sort'),
        all<Product>(payload, 'products', undefined, 'title'),
        all<PriceType>(payload, 'price-types', undefined, 'sort'),
        all<CustomerGroup>(payload, 'customer-groups', undefined, 'title'),
        all<Buyer>(payload, 'buyers', undefined, 'title'),
        all<PriceAgreement>(payload, 'price-agreements', undefined, '-validFrom'),
      ])

  const catGuid = new Map(cats.map((c) => [c.id, c.guid1C ?? '']))
  const typeTitle = new Map(types.map((t) => [t.id, t.title]))
  const groupGuid = new Map(groups.map((g) => [g.id, g.guid1C ?? '']))
  const buyerGuid = new Map(buyers.map((b) => [b.id, b.guid1C ?? '']))
  const productById = new Map(products.map((p) => [p.id, p]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Продсервис'
  instructions(wb, empty ? 'Шаблон загрузки данных на сайт Продсервис' : 'Данные сайта Продсервис в формате шаблона загрузки', [
    'Как загрузить:',
    'Админка → «Обмен» → «Загрузка и выгрузка (Excel)» → «Создать» → выбрать этот файл → «Сохранить». Данные применяются сразу, итог и ошибки по строкам видны в записи загрузки.',
    'Можно загружать не все листы: например, только «Цены» или только «Товары» с колонкой «Остаток». Лишние листы (эту инструкцию) сайт пропускает. Порядок колонок не важен, важны названия в первой строке.',
    'Записи находятся по коду 1С (категории, сети, покупатели, торги) или по артикулу (товары) и обновляются, а не дублируются. Ничего не удаляется: чтобы снять товар с продажи, поставьте «Активен» = нет или включите при загрузке «Снять с продажи товары, которых нет в файле».',
    'Колонки со звёздочкой (*) обязательны. Записи, заведённые на сайте вручную без кода 1С, при обратной загрузке дадут ошибку «не заполнено Код» — впишите код из 1С или удалите строку.',
    '',
    'Листы:',
    `«${SHEETS.groups}» — дерево категорий. «Код группы» — код из 1С, «Код родителя» — код вышестоящей группы (пусто — верхний уровень).`,
    `«${SHEETS.products}» — карточки товаров. Единица: кг, шт, упак, кор, л. Хранение: свежее, охлаждённое, заморозка, сухое. Да/нет — словами «да»/«нет». Даты — ДД.ММ.ГГГГ.`,
    `«${SHEETS.prices}» — по колонке на каждый прайс (Прайс 2, Прайс 3, …, Розничный). Название колонки = название прайса на сайте; новый прайс создаётся сам. Пустая ячейка — цена не меняется.`,
    `«${SHEETS.buyerGroups}» — сети (папки покупателей в 1С), для торгов.`,
    `«${SHEETS.buyers}» — контрагенты и партнёры. Вид: контрагент или партнёр; у партнёра обязателен «Код контрагента». «Прайс» — название прайса, закреплённого за покупателем.`,
    `«${SHEETS.points}» — точки доставки покупателей (заменяют список точек у покупателя из файла).`,
    `«${SHEETS.agreements}» — торги сети и индивидуальные цены: одна строка — один товар документа. Вид: торги (нужен «Код сети») или индивидуальные (нужен «Код покупателя»).`,
    `«${SHEET_ORDER_STATUSES}» — обратная загрузка статусов заказов из 1С (номер заказа сайта, статус словами, номер в 1С).`,
  ])

  sheet(
    wb,
    SHEETS.groups,
    [
      { header: 'Код группы', required: true, width: 22 },
      { header: 'Название', required: true, width: 36 },
      { header: 'Код родителя', width: 22 },
      { header: 'Порядок', width: 10 },
      { header: 'Активна', width: 10 },
    ],
    cats.map((c) => [c.guid1C, c.title, c.parent ? catGuid.get(idOf(c.parent)!) : '', c.sort, yesNo(c.isVisible ?? true)]),
  )

  sheet(
    wb,
    SHEETS.products,
    [
      { header: 'Код товара', width: 22 },
      { header: 'Артикул', required: true, width: 14 },
      { header: 'Название', required: true, width: 44 },
      { header: 'Код группы', required: true, width: 22 },
      { header: 'Единица', required: true, width: 10 },
      { header: 'Мин. заказ', width: 11 },
      { header: 'Кратность', width: 11 },
      { header: 'Вес, кг', width: 9 },
      { header: 'Вложение', width: 12 },
      { header: 'Страна', width: 14 },
      { header: 'Бренд', width: 16 },
      { header: 'Хранение', width: 14 },
      { header: 'Халяль', width: 9 },
      { header: 'Ветеринарный', width: 13 },
      { header: 'Активен', width: 9 },
      { header: 'Остаток', width: 10 },
      { header: 'Ближайшая поставка', width: 14, date: true },
    ],
    products.map((p) => {
      const x = p as Product & { isActive?: boolean | null; nextDelivery?: string | null; guid1C?: string | null }
      return [
        x.guid1C,
        p.sku,
        p.title,
        catGuid.get(idOf(p.category)!),
        UNIT_RU[p.unit] ?? p.unit,
        p.minQty,
        p.step,
        p.weight,
        p.packQty,
        p.country,
        p.brand,
        p.storage ? STORAGE_RU[p.storage] : '',
        yesNo(p.isHalal),
        yesNo(p.isVet),
        yesNo(x.isActive ?? true),
        p.stock,
        asDay(x.nextDelivery),
      ]
    }),
  )

  const typeCols = (empty ? ['Прайс 2', 'Прайс 3', 'Розничный'] : types.map((t) => t.title)).map((t) => ({
    header: t,
    width: Math.max(11, t.length + 3),
    money: true,
  }))
  sheet(
    wb,
    SHEETS.prices,
    [{ header: 'Артикул', width: 14 }, { header: 'Код товара', width: 22 }, { header: 'Название', width: 44 }, ...typeCols],
    products.map((p) => {
      const byType = new Map((p.prices ?? []).map((x) => [idOf(x.priceType)!, x.value]))
      const x = p as Product & { guid1C?: string | null }
      return [p.sku, x.guid1C, p.title, ...types.map((t) => byType.get(t.id) ?? null)]
    }),
  )

  sheet(
    wb,
    SHEETS.buyerGroups,
    [
      { header: 'Код сети', required: true, width: 22 },
      { header: 'Название', required: true, width: 36 },
    ],
    groups.map((g) => [g.guid1C, g.title]),
  )

  sheet(
    wb,
    SHEETS.buyers,
    [
      { header: 'Код', required: true, width: 22 },
      { header: 'Вид', width: 13 },
      { header: 'Код контрагента', width: 22 },
      { header: 'Код сети', width: 22 },
      { header: 'Наименование', required: true, width: 40 },
      { header: 'ИНН', width: 14 },
      { header: 'КПП', width: 12 },
      { header: 'Прайс', width: 14 },
      { header: 'Активен', width: 9 },
    ],
    buyers.map((b) => [
      b.guid1C,
      b.kind === 'partner' ? 'партнёр' : 'контрагент',
      b.parent ? buyerGuid.get(idOf(b.parent)!) : '',
      b.group ? groupGuid.get(idOf(b.group)!) : '',
      b.title,
      b.inn,
      b.kpp,
      b.priceType ? typeTitle.get(idOf(b.priceType)!) : '',
      yesNo(b.isActive ?? true),
    ]),
  )

  sheet(
    wb,
    SHEETS.points,
    [
      { header: 'Код покупателя', required: true, width: 22 },
      { header: 'Код точки', width: 22 },
      { header: 'Название', width: 30 },
      { header: 'Адрес', required: true, width: 50 },
    ],
    buyers.flatMap((b) => (b.deliveryPoints ?? []).map((d) => [b.guid1C, d.guid1C, d.title, d.address])),
  )

  sheet(
    wb,
    SHEETS.agreements,
    [
      { header: 'Код документа', required: true, width: 22 },
      { header: 'Вид', required: true, width: 15 },
      { header: 'Название', width: 30 },
      { header: 'Код сети', width: 22 },
      { header: 'Код покупателя', width: 22 },
      { header: 'Действует с', required: true, width: 12, date: true },
      { header: 'Действует по', required: true, width: 12, date: true },
      { header: 'Артикул', required: true, width: 14 },
      { header: 'Товар (для справки)', width: 40 },
      { header: 'Цена', required: true, width: 11, money: true },
    ],
    agreements.flatMap((a) =>
      a.items.map((it) => {
        const p = productById.get(idOf(it.product)!)
        return [
          a.guid1C,
          a.kind === 'tender' ? 'торги' : 'индивидуальные',
          a.title,
          a.group ? groupGuid.get(idOf(a.group)!) : '',
          a.buyer ? buyerGuid.get(idOf(a.buyer)!) : '',
          asDay(a.validFrom),
          asDay(a.validTo),
          p?.sku,
          p?.title,
          it.price,
        ]
      }),
    ),
  )

  orderStatusSheet(wb, [])
  return toBuffer(wb)
}

function orderStatusSheet(wb: ExcelJS.Workbook, orders: Order[]) {
  const ws = sheet(
    wb,
    SHEET_ORDER_STATUSES,
    [
      { header: 'Номер заказа', required: true, width: 16 },
      { header: 'Статус', width: 14 },
      { header: 'Номер в 1С', width: 18 },
      { header: 'Покупатель (для справки)', width: 36 },
      { header: 'Сумма (для справки)', width: 14, money: true },
    ],
    orders.map((o) => [
      o.number,
      ORDER_STATUS_RU[o.status ?? 'new'],
      o.guid1C,
      typeof o.buyer === 'object' && o.buyer ? o.buyer.title : '',
      o.total,
    ]),
  )
  // Выпадающий список статусов в колонке «Статус».
  const last = Math.max(orders.length + 50, 300)
  for (let r = 2; r <= last; r++) {
    ws.getCell(r, 2).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${Object.values(ORDER_STATUS_RU).join(',')}"`],
    }
  }
}

/* ------------------------------------ Заказы ------------------------------------ */

export interface OrdersExportOptions {
  /** Дата доставки с (ГГГГ-ММ-ДД, включительно). */
  from?: string | null
  /** Дата доставки по (ГГГГ-ММ-ДД, включительно). */
  to?: string | null
  /** Только ещё не выгруженные. */
  onlyNew?: boolean
  /** Включать отменённые. */
  withCancelled?: boolean
}

export async function exportOrders(
  payload: Payload,
  opts: OrdersExportOptions,
): Promise<{ buffer: Buffer; count: number; ids: number[] }> {
  const and: Where[] = []
  if (opts.from) and.push({ deliveryDate: { greater_than_equal: `${opts.from}T00:00:00.000Z` } })
  if (opts.to) and.push({ deliveryDate: { less_than_equal: `${opts.to}T23:59:59.999Z` } })
  if (opts.onlyNew) and.push({ exportedTo1C: { not_equals: true } })
  if (!opts.withCancelled) and.push({ status: { not_equals: 'cancelled' } })

  const res = await payload.find({
    collection: 'orders',
    where: and.length ? { and } : undefined,
    sort: ['deliveryDate', 'number'],
    depth: 1,
    pagination: false,
    overrideAccess: true,
  })
  const orders = res.docs as Order[]

  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => idOf(i.product)!)))]
  const products = productIds.length
    ? await all<Product & { guid1C?: string | null }>(payload, 'products', { id: { in: productIds } })
    : []
  const productById = new Map(products.map((p) => [p.id, p]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Продсервис'
  const period = [opts.from && `с ${opts.from.split('-').reverse().join('.')}`, opts.to && `по ${opts.to.split('-').reverse().join('.')}`]
    .filter(Boolean)
    .join(' ')
  instructions(wb, `Заказы сайта для ввода в 1С${period ? ` (доставка ${period})` : ''}`, [
    'Что в файле:',
    `«Заказы» — по строке на заказ: покупатель с кодом 1С и ИНН, точка доставки, дата и рейс, оплата, сумма. Всего заказов: ${orders.length}.`,
    '«Строки заказов» — по строке на товар: артикул и код товара 1С, количество, цена по прайсу клиента на дату доставки, сумма.',
    `«${SHEET_ORDER_STATUSES}» — заполните «Статус» и «Номер в 1С» и загрузите этот лист на сайт: клиент увидит новый статус и получит письмо.`,
    '',
    'Как вернуть статусы:',
    'Админка → «Обмен» → «Загрузка и выгрузка (Excel)» → «Создать» → выбрать файл с листом «Статусы заказов» → «Сохранить». Остальные листы этого файла сайт пропустит.',
    `Статусы словами: ${Object.values(ORDER_STATUS_RU).join(', ')}.`,
  ])

  sheet(
    wb,
    'Заказы',
    [
      { header: 'Номер заказа', width: 14 },
      { header: 'Создан', width: 17 },
      { header: 'Дата доставки', width: 13, date: true },
      { header: 'Рейс', width: 14 },
      { header: 'Статус', width: 12 },
      { header: 'Покупатель', width: 34 },
      { header: 'Код покупателя 1С', width: 22 },
      { header: 'ИНН', width: 13 },
      { header: 'КПП', width: 11 },
      { header: 'Код точки 1С', width: 20 },
      { header: 'Адрес доставки', width: 44 },
      { header: 'Клиент сайта', width: 24 },
      { header: 'Email', width: 24 },
      { header: 'Контакт', width: 22 },
      { header: 'Телефон', width: 17 },
      { header: 'Оплата', width: 20 },
      { header: 'Позиций', width: 9 },
      { header: 'Сумма', width: 13, money: true },
      { header: 'Комментарий', width: 40 },
      { header: 'Номер в 1С', width: 16 },
      { header: 'Выгружался ранее', width: 12 },
    ],
    orders.map((o) => {
      const b = typeof o.buyer === 'object' ? o.buyer : null
      const c = typeof o.customer === 'object' ? (o.customer as Customer) : null
      return [
        o.number,
        new Date(o.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        asDay(o.deliveryDate),
        o.deliverySlotTitle,
        ORDER_STATUS_RU[o.status ?? 'new'],
        b?.title ?? (c ? `${c.name} (физлицо)` : ''),
        b?.guid1C,
        b?.inn,
        b?.kpp,
        o.deliveryPointGuid1C,
        o.address,
        c?.name,
        c?.email,
        o.contactName,
        o.contactPhone ?? c?.phone,
        o.paymentMethod ? PAYMENT_RU[o.paymentMethod] : '',
        o.items.length,
        o.total,
        o.comment,
        o.guid1C,
        yesNo(o.exportedTo1C ?? false),
      ]
    }),
  )

  sheet(
    wb,
    'Строки заказов',
    [
      { header: 'Номер заказа', width: 14 },
      { header: 'Дата доставки', width: 13, date: true },
      { header: 'Код покупателя 1С', width: 22 },
      { header: 'Артикул', width: 12 },
      { header: 'Код товара 1С', width: 22 },
      { header: 'Товар', width: 44 },
      { header: 'Ед.', width: 7 },
      { header: 'Количество', width: 11 },
      { header: 'Цена', width: 11, money: true },
      { header: 'Сумма', width: 12, money: true },
      { header: 'Источник цены', width: 16 },
    ],
    orders.flatMap((o) => {
      const b = typeof o.buyer === 'object' ? o.buyer : null
      return o.items.map((it) => {
        const p = productById.get(idOf(it.product)!)
        return [
          o.number,
          asDay(o.deliveryDate),
          b?.guid1C,
          it.sku ?? p?.sku,
          p?.guid1C,
          it.title ?? p?.title,
          p ? UNIT_RU[p.unit] : '',
          it.qty,
          it.price,
          it.sum,
          { individual: 'Индивидуальная', tender: 'Торги', 'price-type': 'Прайс клиента', guest: 'Гостевой' }[
            it.priceSource ?? 'price-type'
          ],
        ]
      })
    }),
  )

  orderStatusSheet(wb, orders)
  return { buffer: await toBuffer(wb), count: orders.length, ids: orders.map((o) => o.id) }
}

/* ------------------------------------ Клиенты ------------------------------------ */

export async function exportCustomers(payload: Payload): Promise<Buffer> {
  const [customers, buyers] = await Promise.all([
    all<Customer>(payload, 'customers', undefined, '-createdAt'),
    all<Buyer>(payload, 'buyers'),
  ])
  const buyerById = new Map(buyers.map((b) => [b.id, b]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Продсервис'
  instructions(wb, 'Клиенты сайта', [
    'Что в файле:',
    '«Клиенты» — все зарегистрированные клиенты сайта: статус, тип, привязанные юрлица 1С и организации, которые клиент указал сам.',
    '«Ждут привязки» — организации, которые клиенты указали по ИНН, но которые ещё не привязаны. Найдите их в 1С (или заведите), выгрузите в лист «Покупатели» шаблона и привяжите к клиенту в админке.',
    'Файл только для просмотра — обратно на сайт он не загружается.',
  ])

  sheet(
    wb,
    'Клиенты',
    [
      { header: 'Зарегистрирован', width: 17 },
      { header: 'Статус', width: 13 },
      { header: 'Тип', width: 10 },
      { header: 'Имя', width: 24 },
      { header: 'Email', width: 26 },
      { header: 'Телефон', width: 17 },
      { header: 'Привязанные юрлица', width: 40 },
      { header: 'Коды 1С юрлиц', width: 30 },
      { header: 'Указал сам (ИНН)', width: 30 },
      { header: 'Адреса доставки', width: 44 },
    ],
    customers.map((c) => {
      const linked = (c.buyers ?? []).map((b) => buyerById.get(idOf(b)!)).filter(Boolean) as Buyer[]
      return [
        new Date(c.createdAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
        CUSTOMER_STATUS_RU[c.status ?? 'pending'],
        SEGMENT_RU[c.segment] ?? c.segment,
        c.name,
        c.email,
        c.phone,
        linked.map((b) => b.title).join('; '),
        linked.map((b) => b.guid1C).filter(Boolean).join('; '),
        (c.requestedOrgs ?? []).map((o) => `${o.inn}${o.title ? ` ${o.title}` : ''}`).join('; '),
        (c.addresses ?? []).map((a) => a.address).join('; '),
      ]
    }),
  )

  const linkedInn = (c: Customer) =>
    new Set((c.buyers ?? []).map((b) => buyerById.get(idOf(b)!)?.inn).filter(Boolean) as string[])
  sheet(
    wb,
    'Ждут привязки',
    [
      { header: 'ИНН', width: 14 },
      { header: 'КПП', width: 11 },
      { header: 'Название (со слов клиента)', width: 36 },
      { header: 'Клиент', width: 24 },
      { header: 'Email', width: 26 },
      { header: 'Телефон', width: 17 },
      { header: 'Статус клиента', width: 13 },
    ],
    customers.flatMap((c) => {
      const has = linkedInn(c)
      return (c.requestedOrgs ?? [])
        .filter((o) => !has.has(o.inn))
        .map((o) => [o.inn, o.kpp, o.title, c.name, c.email, c.phone, CUSTOMER_STATUS_RU[c.status ?? 'pending']])
    }),
  )

  return toBuffer(wb)
}
