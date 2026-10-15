/**
 * Единый формат данных обмена. В него приводятся и JSON от 1С (см. ТЗ), и файлы Excel.
 *
 * Ссылки на товары и прайсы — «ref»: сначала ищем по ID 1С (guid1C),
 * затем по артикулу (товар) или названию (прайс). Так тестовые данные из Excel
 * без GUID потом склеиваются с настоящими данными 1С, а не дублируются.
 */

export type Unit = 'kg' | 'pcs' | 'pack' | 'box' | 'l'
export type Storage = 'frozen' | 'chilled' | 'fresh' | 'dry'

export interface GroupRec {
  guid: string
  name: string
  parentGuid?: string | null
  sort?: number | null
  isActive?: boolean | null
}

export interface ProductRec {
  guid?: string | null
  sku: string
  name: string
  groupGuid: string
  unit: Unit
  minQty?: number | null
  step?: number | null
  weight?: number | null
  packQty?: string | null
  country?: string | null
  brand?: string | null
  storage?: Storage | null
  isHalal?: boolean | null
  isVet?: boolean | null
  isMarked?: boolean | null
  isActive?: boolean | null
  stock?: number | null
  nextDelivery?: string | null
}

export interface PriceTypeRec {
  guid?: string | null
  name: string
}

/** Ссылка на товар: guid1C и/или артикул. */
export interface ProductRef {
  guid?: string | null
  sku?: string | null
}

/** Ссылка на прайс: guid1C и/или название. */
export interface PriceTypeRef {
  guid?: string | null
  name?: string | null
}

export interface PriceRec {
  product: ProductRef
  priceType: PriceTypeRef
  value: number
}

export interface StockRec {
  product: ProductRef
  qty: number
  nextDelivery?: string | null
}

export interface BuyerGroupRec {
  guid: string
  name: string
}

export interface DeliveryPointRec {
  guid?: string | null
  name?: string | null
  address: string
}

export interface BuyerRec {
  guid: string
  kind: 'counterparty' | 'partner'
  parentGuid?: string | null
  groupGuid?: string | null
  name: string
  inn?: string | null
  kpp?: string | null
  priceType?: PriceTypeRef | null
  isActive?: boolean | null
  deliveryPoints?: DeliveryPointRec[] | null
}

export interface AgreementRec {
  guid: string
  kind: 'tender' | 'individual'
  groupGuid?: string | null
  buyerGuid?: string | null
  name: string
  /** YYYY-MM-DD */
  validFrom: string
  /** YYYY-MM-DD, включительно */
  validTo: string
  isActive?: boolean | null
  items: { product: ProductRef; price: number }[]
}

export interface ImportBatch {
  groups?: GroupRec[]
  products?: ProductRec[]
  priceTypes?: PriceTypeRec[]
  prices?: PriceRec[]
  stock?: StockRec[]
  buyerGroups?: BuyerGroupRec[]
  buyers?: BuyerRec[]
  agreements?: AgreementRec[]
}

export interface RecordError {
  entity: keyof ImportBatch
  /** Где ошибка: guid, артикул или «лист: строка». */
  ref: string
  message: string
}

export interface EntityStats {
  received: number
  created: number
  updated: number
}

export interface ImportResult {
  stats: Partial<Record<keyof ImportBatch, EntityStats>>
  errors: RecordError[]
}
