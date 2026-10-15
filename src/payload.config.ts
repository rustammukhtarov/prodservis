import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { ru } from '@payloadcms/translations/languages/ru'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Buyers } from './collections/Buyers'
import { Categories } from './collections/Categories'
import { Documents } from './collections/Documents'
import { Imports } from './collections/Imports'
import { SupplierApplications } from './collections/SupplierApplications'
import { CustomerGroups } from './collections/CustomerGroups'
import { Customers } from './collections/Customers'
import { Media } from './collections/Media'
import { Orders } from './collections/Orders'
import { Pages } from './collections/Pages'
import { PriceAgreements } from './collections/PriceAgreements'
import { PriceTypes } from './collections/PriceTypes'
import { ProductCollections } from './collections/ProductCollections'
import { Products } from './collections/Products'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',
  admin: {
    user: Users.slug,
    meta: { titleSuffix: ' — Продсервис' },
    importMap: { baseDir: path.resolve(dirname) },
  },
  i18n: { supportedLanguages: { ru }, fallbackLanguage: 'ru' },
  collections: [
    Products,
    Categories,
    ProductCollections,
    PriceTypes,
    PriceAgreements,
    Customers,
    Buyers,
    CustomerGroups,
    SupplierApplications,
    Orders,
    Pages,
    Media,
    Documents,
    Imports,
    Users,
  ],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
    // На боевом сервере схема базы меняется только миграциями — они применяются при запуске.
    prodMigrations: migrations,
  }),
  sharp,
  plugins: [],
})
