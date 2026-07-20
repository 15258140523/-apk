'use strict'

function applySingleAdjustment(lesson, action, actualAt) {
  if (!['reschedule', 'leave', 'cancel'].includes(action)) throw new Error('INVALID_ADJUST_ACTION')
  if (action === 'reschedule' && !actualAt) throw new Error('ACTUAL_TIME_REQUIRED')
  if (action !== 'reschedule' && actualAt) throw new Error('ACTUAL_TIME_NOT_ALLOWED')
  if (action === 'reschedule') return { ...lesson, actual_at: actualAt, status: 'rescheduled' }
  if (action === 'leave') return { ...lesson, status: 'leave' }
  return { ...lesson, status: 'cancelled' }
}

function completionPlan(lesson, remainingLessons) {
  if (lesson.status === 'completed') throw new Error('LESSON_ALREADY_COMPLETED')
  if (!['pending', 'rescheduled'].includes(lesson.status)) throw new Error('INVALID_LESSON_TRANSITION')
  if (remainingLessons <= 0) throw new Error('NO_REMAINING_LESSONS')
  return { lessonStatus: 'completed', remainingLessons: remainingLessons - 1 }
}

module.exports = { applySingleAdjustment, completionPlan }
