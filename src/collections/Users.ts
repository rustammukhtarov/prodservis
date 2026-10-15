import type { CollectionConfig } from 'payload'

import { adminOnly, hasRole, isStaff } from '../access'

/** Сотрудники компании — входят в админку. */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Сотрудник', plural: 'Сотрудники' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'roles'],
    group: 'Настройки',
  },
  auth: true,
  access: {
    admin: ({ req: { user } }) => isStaff(user),
    read: ({ req: { user } }) => isStaff(user),
    create: adminOnly,
    update: ({ req: { user }, id }) => hasRole(user, 'admin') || (isStaff(user) && user?.id === id),
    delete: adminOnly,
  },
  fields: [
    { name: 'name', label: 'Имя', type: 'text', required: true },
    {
      name: 'roles',
      label: 'Роли',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['manager'],
      options: [
        { label: 'Администратор', value: 'admin' },
        { label: 'Менеджер по продажам', value: 'manager' },
        { label: 'Контент-менеджер', value: 'content' },
      ],
      access: { update: ({ req: { user } }) => hasRole(user, 'admin') },
      saveToJWT: true,
    },
    { name: 'phone', label: 'Телефон', type: 'text' },
  ],
}
