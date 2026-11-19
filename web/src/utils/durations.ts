function toLocalDate(value: string | Date) {
  return value instanceof Date ? value : new Date(`${value}T00:00:00`)
}

export function formatJapaneseDuration(startDate: string | Date, endDate: string | Date = new Date()) {
  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth()

  if (end.getDate() < start.getDate()) months -= 1

  months = Math.max(months, 0)
  return `${Math.floor(months / 12)}年${months % 12}ヶ月`
}
