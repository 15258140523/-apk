import { describe, expect, it } from 'vitest'
import familyDomain from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/family-domain.js'
import familyObject from '../../uniCloud-aliyun/cloudfunctions/family/index.obj.js'

const { assertCanAssignRole, inviteExpiresAt } = familyDomain

describe('family rules', () => {
  it('prevents an admin from promoting another member', () => {
    expect(() => assertCanAssignRole('admin', 'admin')).toThrow('ROLE_FORBIDDEN')
  })

  it('allows the owner to assign supported roles only', () => {
    expect(() => assertCanAssignRole('owner', 'admin')).not.toThrow()
    expect(() => assertCanAssignRole('owner', 'owner')).toThrow('INVALID_TARGET_ROLE')
  })

  it('makes an invitation single-use for 24 hours', () => {
    const issuedAt = Date.parse('2026-07-16T10:00:00+08:00')
    expect(inviteExpiresAt(issuedAt)).toBe(Date.parse('2026-07-17T10:00:00+08:00'))
  })
})

describe('family cloud object contract', () => {
  it('exposes the approved family operations', () => {
    expect(Object.keys(familyObject)).toEqual(
      expect.arrayContaining([
        'createFamily',
        'getCurrentFamily',
        'createInvite',
        'acceptInvite',
        'listMembers',
        'changeRole',
        'removeMember',
        'requestDelete',
        'restoreFamily',
      ]),
    )
  })
})
