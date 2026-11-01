import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { parseWorkbook } from '@/exchange/xlsx'

async function book(rows: (string | number | null)[][]) {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('Инструкция').addRow(['Любой текст — лист пропускается'])
  const ws = wb.addWorksheet('Статусы заказов')
  ws.addRow(['Номер заказа*', 'Статус', 'Номер в 1С', 'Покупатель (для справки)'])
  for (const r of rows) ws.addRow(r)
  return Buffer.from(await wb.xlsx.writeBuffer())
}

describe('Загрузка статусов заказов из Excel', () => {
  it('понимает статусы словами в любом регистре и номер 1С', async () => {
    const { batch, errors } = await parseWorkbook(
      await book([
        ['ПС-000001', 'Принят', 'ЗК-123', 'ООО Ромашка'],
        ['ПС-000002', 'в пути', null, null],
        ['ПС-000003', 'Отменён', null, null],
        ['ПС-000004', null, 'ЗК-124', null],
      ]),
    )
    expect(errors).toEqual([])
    expect(batch.orderStatuses).toEqual([
      { number: 'ПС-000001', status: 'accepted', guid1C: 'ЗК-123' },
      { number: 'ПС-000002', status: 'shipping', guid1C: null },
      { number: 'ПС-000003', status: 'cancelled', guid1C: null },
      { number: 'ПС-000004', status: null, guid1C: 'ЗК-124' },
    ])
    // Других листов нет — ничего лишнего не применяется.
    expect(batch.products).toBeUndefined()
  })

  it('пропускает пустые строки и сообщает о неизвестном статусе с номером строки', async () => {
    const { batch, errors } = await parseWorkbook(
      await book([
        ['ПС-000005', null, null, 'только справка'],
        ['ПС-000006', 'отгружено', null, null],
        [null, 'Принят', null, null],
      ]),
    )
    expect(batch.orderStatuses).toEqual([])
    expect(errors.map((e) => e.ref)).toEqual(['Статусы заказов: строка 3', 'Статусы заказов: строка 4'])
    expect(errors[0].message).toContain('отгружено')
    expect(errors[1].message).toContain('Номер заказа')
  })
})
