import { describe, expect, it } from 'vitest'
import { can } from './permissions'

describe('permissions', () => {
  it('lets admins complete lessons but not assign admins', () => {
    expect(can('admin', 'lesson.complete')).toBe(true)
    expect(can('admin', 'member.assignAdmin')).toBe(false)
  })

  it('keeps viewers read-only', () => {
    expect(can('viewer', 'family.read')).toBe(true)
    expect(can('viewer', 'course.write')).toBe(false)
  })
})
