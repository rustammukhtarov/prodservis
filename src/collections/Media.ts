import type { CollectionConfig } from 'payload'

import { anyone, contentAccess } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Файл', plural: 'Медиатека' },
  admin: { group: 'Контент' },
  access: {
    read: anyone,
    create: contentAccess,
    update: contentAccess,
    delete: contentAccess,
  },
  fields: [{ name: 'alt', label: 'Описание изображения', type: 'text', required: true }],
  upload: {
    mimeTypes: ['image/*', 'application/pdf'],
    imageSizes: [
      { name: 'thumb', width: 240, height: 240, fit: 'cover' },
      { name: 'card', width: 480, height: 480, fit: 'cover' },
      { name: 'large', width: 1200 },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
  },
}
