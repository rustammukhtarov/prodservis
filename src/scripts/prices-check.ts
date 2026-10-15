/**
 * Проверка цен из консоли: какую цену увидит покупатель на дату.
 *   pnpm prices:check <артикул> <дата ГГГГ-ММ-ДД> [код покупателя в 1С]
 * Без кода покупателя — цена гостя.
 */
import { getPayload } from 'payload'

import config from '../payload.config'
import { getPrices } from '../lib/pricing/service'

const [sku, dateArg, buyerGuid] = process.argv.slice(2)
const payload = await getPayload({ config })

const product = (await payload.find({ collection: 'products', where: { sku: { equals: sku } }, limit: 1, overrideAccess: true })).docs[0]
if (!product) throw new Error(`Нет товара с артикулом ${sku}`)

let customer = null
let buyerId: number | null = null
if (buyerGuid) {
  const buyer = (await payload.find({ collection: 'buyers', where: { guid1C: { equals: buyerGuid } }, limit: 1, overrideAccess: true })).docs[0]
  if (!buyer) throw new Error(`Нет покупателя ${buyerGuid}`)
  buyerId = buyer.id
  customer = { id: 0, status: 'active', segment: 'horeca', buyers: [buyer.id] }
}

const prices = await getPrices(payload, {
  customer,
  buyerId,
  productIds: [product.id],
  date: new Date(`${dateArg}T10:00:00+03:00`),
})
console.log(JSON.stringify({ sku, date: dateArg, buyer: buyerGuid ?? 'гость', ...prices.get(product.id) }))
process.exit(0)
