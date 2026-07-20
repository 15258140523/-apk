'use strict'

const { appError } = require('./errors')

async function requireMember(db, userId, familyId, roles) {
  if (!userId) throw appError('AUTH_REQUIRED', '请先登录')

  const result = await db
    .collection('family-members')
    .where({ family_id: familyId, user_id: userId, active: true })
    .limit(1)
    .get()
  const member = result.data[0]

  if (!member) throw appError('FAMILY_FORBIDDEN', '你已不是该家庭成员')
  if (roles && !roles.includes(member.role)) {
    throw appError('ROLE_FORBIDDEN', '当前角色不能执行此操作')
  }
  return member
}

module.exports = { requireMember }
