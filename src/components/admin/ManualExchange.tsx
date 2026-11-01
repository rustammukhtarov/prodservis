import React from 'react'

/**
 * Панель над списком загрузок: всё для ручного обмена с 1С в одном месте.
 * Обычные ссылки и GET-форма — работают без JavaScript; права проверяет сервер.
 */

const day = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })

const box: React.CSSProperties = {
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '16px 18px',
  background: 'var(--theme-elevation-0)',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  minWidth: 0,
}
const h: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 600 }
const p: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: 1.45, color: 'var(--theme-elevation-650)' }
const btn: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 14px',
  borderRadius: 6,
  background: '#2F6E0E',
  color: '#fff',
  fontWeight: 600,
  fontSize: 13,
  textDecoration: 'none',
  border: 0,
  cursor: 'pointer',
  textAlign: 'center',
}
const btnLight: React.CSSProperties = {
  ...btn,
  background: 'transparent',
  color: 'var(--theme-text)',
  border: '1px solid var(--theme-elevation-250)',
}
const input: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid var(--theme-elevation-250)',
  background: 'var(--theme-input-bg, var(--theme-elevation-0))',
  color: 'var(--theme-text)',
  fontSize: 13,
}
const label: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }
const check: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }

export function ManualExchange() {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)
  return (
    <div style={{ padding: '16px var(--gutter-h, 60px) 0' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        <section style={box}>
          <h3 style={h}>1. Загрузить данные из 1С</h3>
          <p style={p}>
            Каталог, остатки, цены, покупатели, торги и статусы заказов — файлом Excel по шаблону. Нажмите «Создать»
            справа вверху и выберите файл. Можно загружать только нужные листы.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a style={btnLight} href="/api/imports/export/template">
              Скачать пустой шаблон
            </a>
            <a style={btnLight} href="/api/imports/export/catalog">
              Данные сайта в шаблоне
            </a>
          </div>
          <p style={p}>«Данные сайта в шаблоне» — текущий каталог и цены: удобно поправить и загрузить обратно.</p>
        </section>

        <section style={box}>
          <h3 style={h}>2. Выгрузить заказы для 1С</h3>
          <form method="get" action="/api/imports/export/orders" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <label style={label}>
                Доставка с
                <input style={input} type="date" name="from" defaultValue={day(now)} />
              </label>
              <label style={label}>
                по
                <input style={input} type="date" name="to" defaultValue={day(tomorrow)} />
              </label>
            </div>
            <label style={check}>
              <input type="checkbox" name="onlyNew" value="1" defaultChecked /> Только ещё не выгруженные
            </label>
            <label style={check}>
              <input type="checkbox" name="mark" value="1" defaultChecked /> Отметить как выгруженные
            </label>
            <label style={check}>
              <input type="checkbox" name="cancelled" value="1" /> Включить отменённые
            </label>
            <div>
              <button type="submit" style={btn}>
                Скачать заказы
              </button>
            </div>
          </form>
          <p style={p}>
            В файле есть лист «Статусы заказов»: проставьте статусы и номера из 1С и загрузите файл сюда — клиенты
            получат письма.
          </p>
        </section>

        <section style={box}>
          <h3 style={h}>3. Клиенты для 1С</h3>
          <p style={p}>
            Все клиенты сайта и организации, которые клиенты указали по ИНН, но которые ещё не привязаны к юрлицам из
            1С.
          </p>
          <div>
            <a style={btn} href="/api/imports/export/customers">
              Скачать клиентов
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
