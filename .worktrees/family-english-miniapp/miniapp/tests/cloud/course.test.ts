import { describe, expect, it } from 'vitest'
import courseDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/course-domain.js'
import courseObject from '../../uniCloud-aliyun/cloudfunctions/course/index.obj.js'

const { validateCourseInput, validateWeeklyRule } = courseDomain

describe('course validation', () => {
  it('accepts a named course with a nonnegative balance', () => {
    expect(validateCourseInput(' 外教口语 ', 8)).toEqual({
      name: '外教口语',
      remainingLessons: 8,
    })
  })

  it('rejects negative balances', () => {
    expect(() => validateCourseInput('外教口语', -1)).toThrow(
      'INVALID_REMAINING_LESSONS',
    )
  })

  it('accepts a weekly time and rejects out-of-range values', () => {
    expect(validateWeeklyRule({ weekday: 6, hour: 10, minute: 30 })).toEqual({
      weekday: 6,
      hour: 10,
      minute: 30,
    })
    expect(() => validateWeeklyRule({ weekday: 7, hour: 10, minute: 30 })).toThrow(
      'INVALID_WEEKLY_RULE',
    )
  })
})

describe('course cloud object contract', () => {
  it('exposes course CRUD operations', () => {
    expect(Object.keys(courseObject)).toEqual(
      expect.arrayContaining(['create', 'update', 'list', 'detail', 'archive']),
    )
  })
})
