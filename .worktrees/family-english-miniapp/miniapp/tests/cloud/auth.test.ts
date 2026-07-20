import { describe, expect, it } from 'vitest'
import errors from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/errors.js'
import auth from '../../uniCloud-aliyun/cloudfunctions/common/app-shared/auth.js'

const { appError } = errors
const { requireMember } = auth

function databaseReturning(data: Array<Record<string, unknown>>) {
  return {
    collection: () => ({
      where: () => ({
        limit: () => ({
          get: async () => ({ data }),
        }),
      }),
    }),
  }
}

describe('cloud authorization', () => {
  it('creates stable public errors', () => {
    const error = appError('ROLE_FORBIDDEN', '当前角色不能执行此操作')
    expect(error.message).toBe('当前角色不能执行此操作')
    expect(error.errCode).toBe('ROLE_FORBIDDEN')
  })

  it('returns an active member with an allowed role', async () => {
    const member = { _id: 'm1', role: 'admin', active: true }
    await expect(
      requireMember(databaseReturning([member]), 'u1', 'f1', ['owner', 'admin']),
    ).resolves.toEqual(member)
  })

  it('rejects missing membership and disallowed roles', async () => {
    await expect(requireMember(databaseReturning([]), 'u1', 'f1')).rejects.toMatchObject({
      errCode: 'FAMILY_FORBIDDEN',
    })
    await expect(
      requireMember(databaseReturning([{ role: 'viewer', active: true }]), 'u1', 'f1', ['owner']),
    ).rejects.toMatchObject({ errCode: 'ROLE_FORBIDDEN' })
  })
})
