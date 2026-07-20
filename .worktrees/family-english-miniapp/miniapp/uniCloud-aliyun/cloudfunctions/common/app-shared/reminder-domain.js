'use strict'

function reminderKey(lessonId, memberId, remindAt) {
  return `${lessonId}:${memberId}:${remindAt}`
}

function enabledMemberIds(members) {
  return members.filter((member) => member.enabled).map((member) => member.id)
}

function assertReminderOffset(minutes) {
  if (!Number.isInteger(minutes) || minutes < 10 || minutes > 7 * 24 * 60 || minutes % 10 !== 0) {
    throw new Error('INVALID_REMINDER_OFFSET')
  }
}

module.exports = { reminderKey, enabledMemberIds, assertReminderOffset }
