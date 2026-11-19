export function formatDate(value: string | Date | undefined | null) {
  if (!value) return '—'

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value.replaceAll('-', '/')
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

export function formatTime(value: string | Date | undefined | null, locale = 'ja-JP') {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
}

export function formatDateTimeYmd(value: string | Date | undefined | null, locale = 'ja-JP') {
  if (!value) return '—'
  return `${formatDate(value)} ${formatTime(value, locale)}`
}

export function formatDateTime(
  value: string | undefined | null,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
) {
  return value ? new Intl.DateTimeFormat(locale, options).format(new Date(value)) : '—'
}

export function formatCurrency(value: number, locale: string, currency = 'JPY') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}
