/**
 * Демо-данные для разработки: `pnpm seed:demo`.
 * Создаёт прайсы 2–5, сеть, клиента, пару категорий и товаров, торги на текущую неделю.
 * Повторный запуск ничего не дублирует.
 */
import { getPayload } from 'payload'

import config from '../payload.config'

const payload = await getPayload({ config })

async function upsert<T extends Record<string, unknown>>(
  collection: Parameters<typeof payload.create>[0]['collection'],
  where: Record<string, unknown>,
  data: T,
) {
  const found = await payload.find({ collection, where: where as never, limit: 1, overrideAccess: true })
  if (found.docs[0]) return found.docs[0] as { id: number }
  return (await payload.create({ collection, data: data as never, overrideAccess: true })) as { id: number }
}

const priceTypes: Record<string, number> = {}
for (const n of [2, 3, 4, 5, 30]) {
  const doc = await upsert('price-types', { title: { equals: `Прайс ${n}` } }, {
    title: `Прайс ${n}`,
    sort: n,
    isGuestDefault: n === 30,
  })
  priceTypes[n] = doc.id
}

await upsert('users', { email: { equals: 'admin@prodservis.local' } }, {
  email: 'admin@prodservis.local',
  password: 'admin12345',
  name: 'Администратор',
  roles: ['admin'],
})

const veg = await upsert('categories', { slug: { equals: 'ovoschi-i-frukty' } }, { title: 'Овощи и фрукты', sort: 10 })
const tomatoes = await upsert('categories', { slug: { equals: 'tomaty' } }, { title: 'Томаты', parent: veg.id, sort: 10 })
const groc = await upsert('categories', { slug: { equals: 'bakaleya' } }, { title: 'Бакалея', sort: 20 })

const retailType = await upsert('price-types', { title: { equals: 'Розничный' } }, { title: 'Розничный', sort: 100 })
const mk = (base: number) => [
  ...[2, 3, 4, 5, 30].map((n) => ({ priceType: priceTypes[n], value: Math.round(base * (1 + (n - 2) / 100) * 100) / 100 })),
  { priceType: retailType.id, value: Math.round(base * 1.45) },
]

const tomato = await upsert('products', { sku: { equals: 'DEMO-001' } }, {
  title: 'Томаты черри красные, 250 г',
  sku: 'DEMO-001',
  category: tomatoes.id,
  country: 'Россия',
  unit: 'pack',
  minQty: 1,
  step: 1,
  storage: 'fresh',
  stock: 120,
  prices: mk(180),
})
await upsert('products', { sku: { equals: 'DEMO-002' } }, {
  title: 'Рис для суши японика, 25 кг',
  sku: 'DEMO-002',
  category: groc.id,
  country: 'Вьетнам',
  unit: 'pcs',
  minQty: 1,
  step: 1,
  storage: 'dry',
  stock: 40,
  prices: mk(3900),
})

const net = await upsert('customer-groups', { title: { equals: 'Сеть «Демо-рестораны»' } }, {
  title: 'Сеть «Демо-рестораны»',
})
const holding = await upsert('buyers', { inn: { equals: '7707083893' } }, {
  title: 'ООО «Демо» (контрагент)',
  inn: '7707083893',
  kind: 'counterparty',
  group: net.id,
  priceType: priceTypes[4],
  deliveryPoints: [{ title: 'Ресторан на Тверской', address: 'Москва, ул. Тверская, 1' }],
})
const branch = await upsert('buyers', { title: { equals: 'ООО «Демо-Арбат» (партнёр)' } }, {
  title: 'ООО «Демо-Арбат» (партнёр)',
  inn: '500100732259',
  kind: 'partner',
  parent: holding.id,
  deliveryPoints: [{ title: 'Кафе на Арбате', address: 'Москва, ул. Арбат, 10' }],
})
await upsert('customers', { email: { equals: 'client@prodservis.local' } }, {
  email: 'client@prodservis.local',
  password: 'client12345',
  name: 'Демо-клиент',
  status: 'active',
  segment: 'horeca',
  consent: { accepted: true },
  buyers: [holding.id, branch.id],
})
await upsert('customers', { email: { equals: 'home@prodservis.local' } }, {
  email: 'home@prodservis.local',
  password: 'home12345',
  name: 'Демо-покупатель (физлицо)',
  status: 'active',
  segment: 'individual',
  consent: { accepted: true },
  addresses: [{ address: 'Москва, ул. Пример, 5' }],
})

const today = new Date()
const monday = new Date(today)
monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
const sunday = new Date(monday)
sunday.setDate(monday.getDate() + 6)
await upsert('price-agreements', { title: { equals: 'Торги «Демо-рестораны», текущая неделя' } }, {
  title: 'Торги «Демо-рестораны», текущая неделя',
  kind: 'tender',
  group: net.id,
  validFrom: monday.toISOString(),
  validTo: sunday.toISOString(),
  items: [{ product: tomato.id, price: 165 }],
})


await payload.updateGlobal({
  slug: 'site-settings',
  data: {
    guestPriceType: priceTypes[30],
    orderCutoff: '17:00',
    segments: { individual: { minOrderSum: 15000, defaultPriceType: retailType.id, autoApprove: true } },
  },
  overrideAccess: true,
})

payload.logger.info('Демо-данные готовы')
process.exit(0)
