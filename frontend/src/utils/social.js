// Utilidades da rede social (comunidade).

/** "há 5 min" / "5 min ago" no idioma atual, sem dependência (Intl.RelativeTimeFormat). */
export function timeAgo(iso, lang = 'pt-BR') {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Math.round((then - Date.now()) / 1000) // negativo = passado
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 45) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day')
  return new Date(iso).toLocaleDateString(lang)
}

/** "sáb., 12 de out., 21:00" — data e hora curtas do show, no fuso do navegador. */
export function formatWhen(iso, lang = 'pt-BR') {
  return new Date(iso).toLocaleString(lang, { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Valor de <input type="datetime-local"> (fuso local) -> ISO em UTC pro servidor. */
export function localInputToIso(value) {
  return value ? new Date(value).toISOString() : ''
}

/** Mensagem de erro amigável: usa o texto já traduzido pelo api.js (error_code). */
export function errMsg(e, fallback) {
  return e?.response?.data?.error || fallback
}

// escapa texto de campo iCalendar (RFC 5545): barra, ponto e vírgula, vírgula e quebra de linha
const icsEscape = (s) => String(s || '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n')
const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

/** Baixa um .ics (calendário) do show — abre no Google/Apple/Outlook. Duração padrão: 3 h. */
export function downloadEventIcs(ev, bandName) {
  const start = new Date(ev.starts_at)
  const end = new Date(start.getTime() + 3 * 3600 * 1000)
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TumTumPa//Agenda//PT', 'BEGIN:VEVENT',
    `UID:${ev.id}@tumtumpa`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(`${ev.title}${bandName ? ` — ${bandName}` : ''}`)}`,
    `LOCATION:${icsEscape([ev.venue, ev.city].filter(Boolean).join(' — '))}`,
    `DESCRIPTION:${icsEscape(ev.description)}`, 'END:VEVENT', 'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${ev.title.replace(/[^\w-]+/g, '_').slice(0, 40) || 'show'}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Só http(s) vira link clicável (defesa extra; o servidor já valida). */
export function safeHref(url) {
  return /^https?:\/\//i.test(url || '') ? url : undefined
}
