import type { Access, FieldAccess } from 'payload'

/** Роли сотрудников в админке. */
export type StaffRole = 'admin' | 'manager' | 'content'

type AnyUser = { collection?: string; roles?: StaffRole[] | null } | null | undefined

export const isStaff = (user: AnyUser): boolean => user?.collection === 'users'

export const hasRole = (user: AnyUser, ...roles: StaffRole[]): boolean =>
  isStaff(user) && Boolean(user?.roles?.some((r) => roles.includes(r)))

/** Любой сотрудник. */
export const staffOnly: Access = ({ req: { user } }) => isStaff(user)

/** Только администратор. */
export const adminOnly: Access = ({ req: { user } }) => hasRole(user, 'admin')

/** Администратор или менеджер по продажам (клиенты, цены, заказы). */
export const salesAccess: Access = ({ req: { user } }) => hasRole(user, 'admin', 'manager')

/** Администратор или контент-менеджер (каталог, страницы). */
export const contentAccess: Access = ({ req: { user } }) => hasRole(user, 'admin', 'content')

/** Публичное чтение. */
export const anyone: Access = () => true

/** Сотрудник видит всё, клиент — только свои документы (поле customer). */
export const staffOrOwnCustomer: Access = ({ req: { user } }) => {
  if (isStaff(user)) return true
  if (user?.collection === 'customers') return { customer: { equals: (user as { id: number }).id } }
  return false
}

export const staffFieldOnly: FieldAccess = ({ req: { user } }) => isStaff(user)
