import type { CollectionConfig } from 'payload'

import { isStaff, staffOnly } from '../access'

/**
 * Закрытые файлы: коммерческие предложения поставщиков, документы на отсрочку.
 * Видят только сотрудники. Гость загружает файл только вместе с заявкой (через форму сайта).
 */
export const Documents: CollectionConfig = {
  slug: 'documents',
  labels: { singular: 'Документ', plural: 'Документы клиентов' },
  admin: { group: 'Клиенты', useAsTitle: 'filename' },
  access: {
    read: staffOnly,
    // Гость загружает файл только вместе с заявкой — через серверное действие формы.
    create: staffOnly,
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
