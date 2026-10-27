import type { Payload } from 'payload'

/**
 * Письма сайта. Почтовый сервер задаётся переменными SMTP_* на сервере;
 * пока их нет, Payload только пишет письма в журнал, ничего не отправляя.
 */

/** Внешний адрес сайта для ссылок в письмах. */
export const siteURL = () =>
  (process.env.SERVER_URL || process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export { esc as escapeHtml }

/** Простое письмо в фирменных цветах: заголовок, абзацы, кнопка. */
export function emailLayout(opts: {
  title: string
  paragraphs: string[]
  button?: { text: string; url: string }
  /** Готовый HTML (таблица заказа) после абзацев. */
  extraHtml?: string
}): string {
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 12px">${esc(t)}</p>`).join('')
  const btn = opts.button
    ? `<p style="margin:20px 0"><a href="${esc(opts.button.url)}" style="display:inline-block;background:#2F6E0E;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">${esc(opts.button.text)}</a></p>`
    : ''
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#F3F6EE;font-family:Arial,Helvetica,sans-serif;color:#141414">
<div style="max-width:600px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:16px;padding:28px">
<div style="font-size:22px;font-weight:800;color:#1D4508;margin-bottom:4px">Продсервис</div>
<div style="font-size:13px;color:#5B6155;margin-bottom:20px">Доставляем лучшее — каждый день!</div>
<h1 style="font-size:20px;margin:0 0 16px">${esc(opts.title)}</h1>
${p}${opts.extraHtml ?? ''}${btn}
</div>
<p style="font-size:12px;color:#5B6155;margin:16px 4px 0">Письмо отправлено автоматически с сайта ${esc(siteURL())}. Отвечать на него не нужно.</p>
</div></body></html>`
}

/** Отправка, которая никогда не ломает основное действие (заказ, регистрацию). */
export async function sendSafe(payload: Payload, msg: { to: string | string[]; subject: string; html: string }) {
  const to = (Array.isArray(msg.to) ? msg.to : [msg.to]).map((s) => s.trim()).filter(Boolean)
  if (!to.length) return
  try {
    await payload.sendEmail({ to: to.join(', '), subject: msg.subject, html: msg.html })
  } catch (e) {
    payload.logger.error(`Письмо «${msg.subject}» не отправлено: ${e instanceof Error ? e.message : String(e)}`)
  }
}

/** Адреса менеджеров для уведомлений — из настроек сайта. */
export async function staffRecipients(payload: Payload): Promise<string[]> {
  const s = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as {
    notifyEmails?: string | null
  }
  return (s.notifyEmails ?? '')
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter((x) => /.+@.+\..+/.test(x))
}
