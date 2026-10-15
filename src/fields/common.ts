import type { Field } from 'payload'

/** Идентификатор объекта в 1С. Заполняется обменом, вручную не редактируется. */
export const guid1C = (unique = true): Field => ({
  name: 'guid1C',
  label: 'ID в 1С',
  type: 'text',
  index: true,
  unique,
  admin: { position: 'sidebar', readOnly: true, description: 'Заполняется обменом с 1С' },
})

export const guid1CField: Field = guid1C()

const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

/** Человекопонятный адрес из русского названия: «Сыр Брынза 45%» → «syr-brynza-45». */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .split('')
    .map((ch) => translit[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

/** Поле slug, которое заполняется из названия, если пустое. */
export const slugField = (from = 'title'): Field => ({
  name: 'slug',
  label: 'Адрес (slug)',
  type: 'text',
  index: true,
  unique: true,
  admin: { position: 'sidebar', description: 'Заполнится из названия автоматически' },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.length > 0) return slugify(value)
        const source = data?.[from]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})

export const seoFields: Field = {
  name: 'seo',
  label: 'SEO',
  type: 'group',
  fields: [
    { name: 'title', label: 'Title', type: 'text' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ],
}
