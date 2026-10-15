import ExcelJS from 'exceljs'

import type { AgreementRec, BuyerRec, ImportBatch, ProductRec, RecordError, Storage, Unit } from './types'

/**
 * Читает файл Excel по шаблону «Продсервис — импорт» и приводит его к формату обмена.
 * Листы необязательны: можно загрузить файл только с ценами или только с остатками.
 * Колонки ищутся по названию в первой строке, порядок колонок не важен.
 */

export const SHEETS = {
  groups: 'Категории',
  products: 'Товары',
  prices: 'Цены',
  buyerGroups: 'Сети',
  buyers: 'Покупатели',
  points: 'Точки доставки',
  agreements: 'Торги и инд. цены',
} as const

/** Колонки листа «Цены», которые не являются прайсами. */
const PRICE_SHEET_KEYS = ['артикул', 'код товара', 'название']

const UNITS: Record<string, Unit> = {
  кг: 'kg', kg: 'kg', шт: 'pcs', pcs: 'pcs', упак: 'pack', уп: 'pack', pack: 'pack', кор: 'box', box: 'box', л: 'l', l: 'l',
}
const STORAGE: Record<string, Storage> = {
  заморозка: 'frozen', замороженное: 'frozen', frozen: 'frozen',
  охлаждённое: 'chilled', охлажденное: 'chilled', chilled: 'chilled',
  свежее: 'fresh', fresh: 'fresh',
  сухое: 'dry', 'сухое хранение': 'dry', dry: 'dry',
}

type Row = { n: number; get: (header: string) => unknown }

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ')

function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v
    if ('result' in v) return (v as { result: unknown }).result
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join('')
    if ('text' in v) return (v as { text: string }).text
  }
  return v
}

function rows(ws: ExcelJS.Worksheet | undefined): { headers: string[]; rows: Row[] } {
  if (!ws) return { headers: [], rows: [] }
  const headerRow = ws.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => (headers[col] = norm(cellValue(cell.value)).replace(/\*$/, '').trim()))
  const out: Row[] = []
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return
    const values = (row.values as ExcelJS.CellValue[]).map(cellValue)
    if (values.every((v) => v == null || String(v).trim() === '')) return
    out.push({
      n,
      get: (header: string) => {
        const col = headers.indexOf(norm(header))
        return col > 0 ? values[col] : undefined
      },
    })
  })
  return { headers, rows: out }
}

const str = (v: unknown): string | null => {
  if (v == null) return null
  const s = (typeof v === 'number' ? String(v) : String(v)).trim()
  return s === '' ? null : s
}
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
  if (!Number.isFinite(n)) throw new Error(`«${v}» — не число`)
  return n
}
const bool = (v: unknown): boolean | null => {
  const s = norm(v)
  if (s === '') return null
  if (['да', 'yes', 'true', '1', '+'].includes(s)) return true
  if (['нет', 'no', 'false', '0', '-'].includes(s)) return false
  throw new Error(`«${v}» — ожидалось «да» или «нет»`)
}
/** Дата из ячейки Excel или строки «ДД.ММ.ГГГГ» / «ГГГГ-ММ-ДД» → «ГГГГ-ММ-ДД». */
export const day = (v: unknown): string | null => {
  if (v == null || v === '') return null
  if (v instanceof Date) {
    // Excel хранит «дату без времени» как полночь UTC.
    return v.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  throw new Error(`«${s}» — дата должна быть в виде ДД.ММ.ГГГГ`)
}
const inn = (v: unknown): string | null => {
  const s = str(v)
  return s ? s.replace(/\D/g, '') : null
}

export async function parseWorkbook(buffer: ArrayBuffer | Buffer): Promise<{ batch: ImportBatch; errors: RecordError[] }> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as ArrayBuffer)
  const errors: RecordError[] = []
  const batch: ImportBatch = {}
  const sheet = (name: string) => wb.worksheets.find((w) => norm(w.name) === norm(name))

  const each = <T>(entity: keyof ImportBatch, sheetName: string, fn: (r: Row) => T | null): T[] => {
    const out: T[] = []
    for (const r of rows(sheet(sheetName)).rows) {
      try {
        const v = fn(r)
        if (v) out.push(v)
      } catch (e) {
        errors.push({ entity, ref: `${sheetName}: строка ${r.n}`, message: e instanceof Error ? e.message : String(e) })
      }
    }
    return out
  }
  const need = (v: string | null, what: string) => {
    if (!v) throw new Error(`не заполнено «${what}»`)
    return v
  }

  if (sheet(SHEETS.groups)) {
    batch.groups = each('groups', SHEETS.groups, (r) => ({
      guid: need(str(r.get('Код группы')), 'Код группы'),
      name: need(str(r.get('Название')), 'Название'),
      parentGuid: str(r.get('Код родителя')),
      sort: num(r.get('Порядок')),
      isActive: bool(r.get('Активна')),
    }))
  }

  if (sheet(SHEETS.products)) {
    batch.products = each('products', SHEETS.products, (r): ProductRec => {
      const unitRaw = norm(r.get('Единица'))
      const unit = UNITS[unitRaw]
      if (!unit) throw new Error(`единица «${r.get('Единица') ?? ''}» — допустимо: кг, шт, упак, кор, л`)
      const storageRaw = norm(r.get('Хранение'))
      if (storageRaw && !STORAGE[storageRaw]) throw new Error(`хранение «${r.get('Хранение')}» — допустимо: свежее, охлаждённое, заморозка, сухое`)
      return {
        guid: str(r.get('Код товара')),
        sku: need(str(r.get('Артикул')), 'Артикул'),
        name: need(str(r.get('Название')), 'Название'),
        groupGuid: need(str(r.get('Код группы')), 'Код группы'),
        unit,
        minQty: num(r.get('Мин. заказ')),
        step: num(r.get('Кратность')),
        weight: num(r.get('Вес, кг')),
        packQty: str(r.get('Вложение')),
        country: str(r.get('Страна')),
        brand: str(r.get('Бренд')),
        storage: storageRaw ? STORAGE[storageRaw] : null,
        isHalal: bool(r.get('Халяль')),
        isVet: bool(r.get('Ветеринарный')),
        isActive: bool(r.get('Активен')),
        stock: num(r.get('Остаток')),
        nextDelivery: day(r.get('Ближайшая поставка')),
      }
    })
  }

  const priceSheet = rows(sheet(SHEETS.prices))
  if (priceSheet.rows.length) {
    const typeHeaders = priceSheet.headers.filter((h) => h && !PRICE_SHEET_KEYS.includes(h))
    // Названия прайсов берём как в файле (с заглавной буквы).
    const original = new Map<string, string>()
    sheet(SHEETS.prices)!.getRow(1).eachCell((cell) => {
      const raw = String(cellValue(cell.value) ?? '').trim()
      original.set(norm(raw), raw)
    })
    batch.priceTypes = typeHeaders.map((h) => ({ name: original.get(h) ?? h }))
    batch.prices = []
    for (const r of priceSheet.rows) {
      try {
        const sku = str(r.get('Артикул'))
        const guid = str(r.get('Код товара'))
        if (!sku && !guid) throw new Error('не заполнен «Артикул»')
        for (const h of typeHeaders) {
          const value = num(r.get(h))
          if (value == null) continue
          batch.prices.push({ product: { sku, guid }, priceType: { name: original.get(h) ?? h }, value })
        }
      } catch (e) {
        errors.push({ entity: 'prices', ref: `${SHEETS.prices}: строка ${r.n}`, message: e instanceof Error ? e.message : String(e) })
      }
    }
  }

  if (sheet(SHEETS.buyerGroups)) {
    batch.buyerGroups = each('buyerGroups', SHEETS.buyerGroups, (r) => ({
      guid: need(str(r.get('Код сети')), 'Код сети'),
      name: need(str(r.get('Название')), 'Название'),
    }))
  }

  if (sheet(SHEETS.buyers)) {
    const points = new Map<string, NonNullable<BuyerRec['deliveryPoints']>>()
    each('buyers', SHEETS.points, (r) => {
      const owner = need(str(r.get('Код покупателя')), 'Код покупателя')
      const list = points.get(owner) ?? []
      list.push({ guid: str(r.get('Код точки')), name: str(r.get('Название')), address: need(str(r.get('Адрес')), 'Адрес') })
      points.set(owner, list)
      return null
    })
    batch.buyers = each('buyers', SHEETS.buyers, (r): BuyerRec => {
      const guid = need(str(r.get('Код')), 'Код')
      const kindRaw = norm(r.get('Вид'))
      const kind = kindRaw.startsWith('парт') ? 'partner' : kindRaw.startsWith('контр') || kindRaw === '' ? 'counterparty' : null
      if (!kind) throw new Error(`вид «${r.get('Вид')}» — допустимо: контрагент, партнёр`)
      const parentGuid = str(r.get('Код контрагента'))
      if (kind === 'partner' && !parentGuid) throw new Error('у партнёра не указан «Код контрагента»')
      const price = str(r.get('Прайс'))
      return {
        guid,
        kind,
        parentGuid,
        groupGuid: str(r.get('Код сети')),
        name: need(str(r.get('Наименование')), 'Наименование'),
        inn: inn(r.get('ИНН')),
        kpp: str(r.get('КПП')),
        priceType: price ? { name: price } : null,
        isActive: bool(r.get('Активен')),
        deliveryPoints: points.get(guid) ?? [],
      }
    })
  }

  if (sheet(SHEETS.agreements)) {
    const docs = new Map<string, AgreementRec>()
    each('agreements', SHEETS.agreements, (r) => {
      const guid = need(str(r.get('Код документа')), 'Код документа')
      const kindRaw = norm(r.get('Вид'))
      const kind = kindRaw.startsWith('торг') ? 'tender' : kindRaw.startsWith('инд') ? 'individual' : null
      if (!kind) throw new Error(`вид «${r.get('Вид')}» — допустимо: торги, индивидуальные`)
      const doc =
        docs.get(guid) ??
        ({
          guid,
          kind,
          name: str(r.get('Название')) ?? guid,
          groupGuid: str(r.get('Код сети')),
          buyerGuid: str(r.get('Код покупателя')),
          validFrom: need(day(r.get('Действует с')), 'Действует с'),
          validTo: need(day(r.get('Действует по')), 'Действует по'),
          items: [],
        } satisfies AgreementRec)
      if (kind === 'tender' && !doc.groupGuid) throw new Error('для торгов не указан «Код сети»')
      if (kind === 'individual' && !doc.buyerGuid) throw new Error('для индивидуальных цен не указан «Код покупателя»')
      const price = num(r.get('Цена'))
      if (price == null) throw new Error('не заполнена «Цена»')
      doc.items.push({ product: { sku: need(str(r.get('Артикул')), 'Артикул') }, price })
      docs.set(guid, doc)
      return null
    })
    batch.agreements = [...docs.values()]
  }

  return { batch, errors }
}
