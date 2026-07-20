'use strict'

function validateCourseInput(name, remainingLessons) {
  const normalized = String(name || '').trim()
  if (!normalized) throw new Error('COURSE_NAME_REQUIRED')
  if (!Number.isInteger(remainingLessons) || remainingLessons < 0) {
    throw new Error('INVALID_REMAINING_LESSONS')
  }
  return { name: normalized, remainingLessons }
}

function validateWeeklyRule(rule) {
  const value = rule || {}
  const valid =
    Number.isInteger(value.weekday) &&
    value.weekday >= 0 &&
    value.weekday <= 6 &&
    Number.isInteger(value.hour) &&
    value.hour >= 0 &&
    value.hour <= 23 &&
    Number.isInteger(value.minute) &&
    value.minute >= 0 &&
    value.minute <= 59
  if (!valid) throw new Error('INVALID_WEEKLY_RULE')
  return { weekday: value.weekday, hour: value.hour, minute: value.minute }
}

module.exports = { validateCourseInput, validateWeeklyRule }
