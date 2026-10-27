export const ORDER_STATUS: Record<string, { label: string; tone: 'new' | 'work' | 'done' | 'off' }> = {
  new: { label: 'Новый', tone: 'new' },
  accepted: { label: 'Принят', tone: 'work' },
  picking: { label: 'Собирается', tone: 'work' },
  shipping: { label: 'В пути', tone: 'work' },
  delivered: { label: 'Доставлен', tone: 'done' },
  cancelled: { label: 'Отменён', tone: 'off' },
}

export const PAYMENT_LABEL: Record<string, string> = {
  contract: 'По договору',
  cash: 'Наличными курьеру',
  card: 'Картой курьеру',
  online: 'Онлайн',
}
