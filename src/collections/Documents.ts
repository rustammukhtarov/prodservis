import type { CollectionConfig } from 'payload'

import { isStaff, staffOnly } from '../access'

/**
 * Закрытые файлы: коммерческие предложения поставщиков, документы на отсрочку.
 * Видят только сотрудники. Загрузить может и гость — только вместе с заявкой.
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Документ', plural: 'Документы клиентов' },
  admin: { group: 'Клиенты', useAsTitle: 'filename' },
  access: {
    read: staffOnly,
    create: () => true,
    update: staffOnly,
    delete: ({ req: { user } }) => isStaff(user),
  },
  upload: {
    staticDir: 'private-uploads',
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  fields: [{ name: 'note', label: 'Комментарий', type: 'text' }],
}
