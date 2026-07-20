import { describe, expect, it } from 'vitest'
import reminderDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/reminder-domain.js'

const { reminderKey, enabledMemberIds, assertReminderOffset } = reminderDomain

describe('reminders', () => {
  it('keys one delivery per lesson, member, and reminder time', () => {
    const key = reminderKey('lesson-1', 'member-2', '2026-07-18T09:00:00+08:00')
    expect(key).toBe('lesson-1:member-2:2026-07-18T09:00:00+08:00')
  })

  it('does not include disabled members', () => {
    const members = [{ id: 'm1', enabled: true }, { id: 'm2', enabled: false }]
    expect(enabledMemberIds(members)).toEqual(['m1'])
  })

  it('returns empty when all members disabled', () => {
    expect(enabledMemberIds([{ id: 'm1', enabled: false }])).toEqual([])
  })

  it('accepts valid reminder offsets', () => {
    expect(() => assertReminderOffset(10)).not.toThrow()
    expect(() => assertReminderOffset(60)).not.toThrow()
    expect(() => assertReminderOffset(1440)).not.toThrow()
  })

  it('rejects offsets below 10 minutes', () => {
    expect(() => assertReminderOffset(5)).toThrow('INVALID_REMINDER_OFFSET')
  })

  it('rejects offsets above 7 days', () => {
    expect(() => assertReminderOffset(7 * 24 * 60 + 10)).toThrow('INVALID_REMINDER_OFFSET')
  })

  it('rejects offsets not divisible by 10', () => {
    expect(() => assertReminderOffset(15)).toThrow('INVALID_REMINDER_OFFSET')
  })
})

import reminderCloud from '../../uniCloud-aliyun/cloudfunctions/reminder/index.obj.js'

describe('reminder cloud object exports', () => {
  it('exports all required methods', () => {
    expect(typeof reminderCloud._before).toBe('function')
    expect(typeof reminderCloud.getCoursePreferences).toBe('function')
    expect(typeof reminderCloud.setCoursePreferences).toBe('function')
    expect(typeof reminderCloud.recordSubscriptionResult).toBe('function')
  })
})
