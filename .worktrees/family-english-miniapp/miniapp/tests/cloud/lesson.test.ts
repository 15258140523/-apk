import { describe, expect, it } from 'vitest'
import lessonDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/lesson-domain.js'

const { applySingleAdjustment, completionPlan } = lessonDomain

describe('single occurrence adjustment', () => {
  it('changes one actual time without changing the weekly rule', () => {
    const rule = { weekday: 0, hour: 15, minute: 30 }
    const lesson = applySingleAdjustment(
      { planned_at: '2026-07-19T15:30:00+08:00', actual_at: '2026-07-19T15:30:00+08:00', status: 'pending' },
      'reschedule',
      '2026-07-19T16:30:00+08:00',
    )
    expect(rule).toEqual({ weekday: 0, hour: 15, minute: 30 })
    expect(lesson.actual_at).not.toBe(lesson.planned_at)
    expect(lesson.status).toBe('rescheduled')
  })

  it('sets leave status without actualAt', () => {
    const lesson = applySingleAdjustment(
      { planned_at: '2026-07-19T15:30:00+08:00', actual_at: '2026-07-19T15:30:00+08:00', status: 'pending' },
      'leave',
      undefined,
    )
    expect(lesson.status).toBe('leave')
  })

  it('sets cancelled status without actualAt', () => {
    const lesson = applySingleAdjustment(
      { planned_at: '2026-07-19T15:30:00+08:00', actual_at: '2026-07-19T15:30:00+08:00', status: 'pending' },
      'cancel',
      undefined,
    )
    expect(lesson.status).toBe('cancelled')
  })

  it('rejects reschedule without actualAt', () => {
    expect(() => applySingleAdjustment(
      { planned_at: 'x', actual_at: 'x', status: 'pending' },
      'reschedule',
      undefined,
    )).toThrow('ACTUAL_TIME_REQUIRED')
  })

  it('rejects leave/cancel with actualAt', () => {
    expect(() => applySingleAdjustment(
      { planned_at: 'x', actual_at: 'x', status: 'pending' },
      'leave',
      '2026-07-19T16:30:00+08:00',
    )).toThrow('ACTUAL_TIME_NOT_ALLOWED')
  })

  it('rejects invalid action', () => {
    expect(() => applySingleAdjustment(
      { planned_at: 'x', actual_at: 'x', status: 'pending' },
      'delete',
      undefined,
    )).toThrow('INVALID_ADJUST_ACTION')
  })
})

describe('completion plan', () => {
  it('plans one balance decrement for a pending lesson', () => {
    expect(completionPlan({ status: 'pending' }, 8)).toEqual({
      lessonStatus: 'completed',
      remainingLessons: 7,
    })
  })

  it('allows completing a rescheduled lesson', () => {
    expect(completionPlan({ status: 'rescheduled' }, 3)).toEqual({
      lessonStatus: 'completed',
      remainingLessons: 2,
    })
  })

  it('rejects completing an already completed lesson', () => {
    expect(() => completionPlan({ status: 'completed' }, 8)).toThrow('LESSON_ALREADY_COMPLETED')
  })

  it('rejects completing a leave or cancelled lesson', () => {
    expect(() => completionPlan({ status: 'leave' }, 8)).toThrow('INVALID_LESSON_TRANSITION')
    expect(() => completionPlan({ status: 'cancelled' }, 8)).toThrow('INVALID_LESSON_TRANSITION')
  })

  it('rejects when no remaining lessons', () => {
    expect(() => completionPlan({ status: 'pending' }, 0)).toThrow('NO_REMAINING_LESSONS')
  })
})

import idempotency from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/idempotency.js'

describe('idempotency', () => {
  it('creates one stable claim key per family and request', () => {
    expect(idempotency.requestClaimKey('f1', 'r1')).toBe('f1:r1')
  })

  it('requires both familyId and requestId', () => {
    expect(() => idempotency.requestClaimKey('', 'r1')).toThrow('REQUEST_ID_REQUIRED')
    expect(() => idempotency.requestClaimKey('f1', '')).toThrow('REQUEST_ID_REQUIRED')
  })
})

describe('lesson cloud object exports', () => {
  it('exports all required methods', () => {
    const lesson = require('../../uniCloud-aliyun/cloudfunctions/lesson/index.obj.js')
    expect(typeof lesson._before).toBe('function')
    expect(typeof lesson.listWindow).toBe('function')
    expect(typeof lesson.detail).toBe('function')
    expect(typeof lesson.adjust).toBe('function')
    expect(typeof lesson.complete).toBe('function')
    expect(typeof lesson.undoCompletion).toBe('function')
  })
})
