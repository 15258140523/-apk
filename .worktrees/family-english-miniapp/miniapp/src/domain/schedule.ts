export interface WeeklyRule {
  weekday: number
  hour: number
  minute: number
}

function localDate(value: string): Date {
  return new Date(`${value}T12:00:00+08:00`)
}

function format(date: Date, hour: number, minute: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
}

export function weeklyOccurrences(
  rule: WeeklyRule,
  from: string,
  to: string,
): string[] {
  const cursor = localDate(from)
  const end = localDate(to)
  while (cursor.getUTCDay() !== rule.weekday) {
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const result: string[] = []
  while (cursor <= end) {
    result.push(format(cursor, rule.hour, rule.minute))
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }
  return result
}
