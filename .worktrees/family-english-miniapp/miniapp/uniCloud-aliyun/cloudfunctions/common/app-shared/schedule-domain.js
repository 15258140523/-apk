'use strict'

function occurrenceKey(courseId, plannedAt) {
  return `${courseId}:${plannedAt}`
}

function formatDate(date, hour, minute) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00+08:00`
}

function weeklyOccurrences(rule, from, to) {
  const cursor = new Date(from + 'T12:00:00+08:00')
  const end = new Date(to + 'T12:00:00+08:00')
  while (cursor.getDay() !== rule.weekday) cursor.setDate(cursor.getDate() + 1)
  const result = []
  while (cursor <= end) {
    result.push(formatDate(cursor, rule.hour, rule.minute))
    cursor.setDate(cursor.getDate() + 7)
  }
  return result
}

module.exports = { occurrenceKey, weeklyOccurrences }
