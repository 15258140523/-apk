'use strict'

const crypto = require('crypto')

function shared(name) {
  return require(`app-shared/${name}`)
}

function docData(result) {
  if (!result) return null
  if (Array.isArray(result.data)) return result.data[0] || null
  return result.data || null
}

function nowFields(now = Date.now()) {
  return { created_at: now, updated_at: now }
}

async function withTransaction(db, worker) {
  const transaction = await db.startTransaction()
  try {
    const result = await worker(transaction)
    await transaction.commit()
    return result
  } catch (error) {
    await transaction.rollback()
    throw error
  }
}

async function appendAudit(transaction, entry) {
  const now = Date.now()
  await transaction.collection('operation-logs').add({
    ...entry,
    reversal_of: null,
    created_at: now,
    updated_at: now,
  })
}

module.exports = {
  async _before() {
    const { appError } = shared('errors')
    const uniIdCommon = require('uni-id-common')
    const uniId = uniIdCommon.createInstance({ clientInfo: this.getClientInfo() })
    const tokenResult = await uniId.checkToken(this.getUniIdToken())
    if (tokenResult.errCode) {
      throw appError(tokenResult.errCode, tokenResult.errMsg || '请先登录')
    }
    this.userId = tokenResult.uid
    this.db = uniCloud.database()
  },

  async createFamily({ childName, requestId } = {}) {
    const { appError } = shared('errors')
    const name = String(childName || '').trim()
    if (!name || name.length > 20) {
      throw appError('CHILD_NAME_INVALID', '请输入不超过20个字的孩子昵称')
    }
    if (!requestId) throw appError('REQUEST_ID_REQUIRED', '缺少请求编号')

    const activeMembership = await this.db
      .collection('family-members')
      .where({ user_id: this.userId, active: true })
      .limit(1)
      .get()
    if (activeMembership.data[0]) {
      throw appError('ACTIVE_FAMILY_EXISTS', '你已经加入了一个家庭')
    }

    const previousClaim = await this.db
      .collection('request-claims')
      .where({ request_id: requestId, actor_user_id: this.userId, action: 'family.create' })
      .limit(1)
      .get()
    const previous = previousClaim.data[0]
    if (previous && previous.result && previous.result.familyId) {
      const family = docData(
        await this.db.collection('families').doc(previous.result.familyId).get(),
      )
      const membership = await this.db
        .collection('family-members')
        .where({ family_id: previous.result.familyId, user_id: this.userId })
        .limit(1)
        .get()
      return { family, member: membership.data[0] }
    }

    const familyId = crypto.randomUUID()
    const memberId = crypto.randomUUID()
    return withTransaction(this.db, async (transaction) => {
      const now = Date.now()
      const family = {
        _id: familyId,
        family_id: familyId,
        child_name: name,
        owner_user_id: this.userId,
        status: 'active',
        delete_after: null,
        renewal_due_at: null,
        ...nowFields(now),
      }
      const member = {
        _id: memberId,
        family_id: familyId,
        user_id: this.userId,
        display_name: '家长',
        role: 'owner',
        active: true,
        ...nowFields(now),
      }
      await transaction.collection('families').add(family)
      await transaction.collection('family-members').add(member)
      await transaction.collection('request-claims').add({
        family_id: familyId,
        request_id: requestId,
        action: 'family.create',
        actor_user_id: this.userId,
        status: 'done',
        result: { familyId },
        ...nowFields(now),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'family.create',
        entity_type: 'family',
        entity_id: familyId,
        payload: { child_name: name },
      })
      return { family, member }
    })
  },

  async getCurrentFamily() {
    const membership = await this.db
      .collection('family-members')
      .where({ user_id: this.userId, active: true })
      .limit(1)
      .get()
    const member = membership.data[0]
    if (!member) return null
    const family = docData(await this.db.collection('families').doc(member.family_id).get())
    if (!family || family.status === 'deleted') return null
    return { family, member }
  },

  async createInvite({ familyId } = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])
    const token = crypto.randomBytes(24).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const issuedAt = Date.now()
    const { inviteExpiresAt } = shared('family-domain')
    const expiresAt = inviteExpiresAt(issuedAt)

    await withTransaction(this.db, async (transaction) => {
      await transaction.collection('family-invites').add({
        family_id: familyId,
        token_hash: tokenHash,
        role: 'viewer',
        expires_at: expiresAt,
        used_at: null,
        used_by: null,
        ...nowFields(issuedAt),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'member.invite',
        entity_type: 'family',
        entity_id: familyId,
        payload: { role: 'viewer', expires_at: expiresAt },
      })
    })
    return { token, expiresAt }
  },

  async acceptInvite({ token } = {}) {
    const { appError } = shared('errors')
    if (!token) throw appError('INVITE_TOKEN_REQUIRED', '邀请链接无效')
    const activeMembership = await this.db
      .collection('family-members')
      .where({ user_id: this.userId, active: true })
      .limit(1)
      .get()
    if (activeMembership.data[0]) {
      throw appError('ACTIVE_FAMILY_EXISTS', '你已经加入了一个家庭')
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const inviteResult = await this.db
      .collection('family-invites')
      .where({ token_hash: tokenHash })
      .limit(1)
      .get()
    const invite = inviteResult.data[0]
    if (!invite || invite.used_at || invite.expires_at <= Date.now()) {
      throw appError('INVITE_INVALID', '邀请已使用或已过期')
    }

    const previousMemberResult = await this.db
      .collection('family-members')
      .where({ family_id: invite.family_id, user_id: this.userId })
      .limit(1)
      .get()
    const previousMember = previousMemberResult.data[0]

    return withTransaction(this.db, async (transaction) => {
      const currentInvite = docData(
        await transaction.collection('family-invites').doc(invite._id).get(),
      )
      const now = Date.now()
      if (!currentInvite || currentInvite.used_at || currentInvite.expires_at <= now) {
        throw appError('INVITE_INVALID', '邀请已使用或已过期')
      }
      await transaction.collection('family-invites').doc(invite._id).update({
        used_at: now,
        used_by: this.userId,
        updated_at: now,
      })

      let member
      if (previousMember) {
        member = { ...previousMember, role: 'viewer', active: true, updated_at: now }
        await transaction.collection('family-members').doc(previousMember._id).update({
          role: 'viewer',
          active: true,
          updated_at: now,
        })
      } else {
        member = {
          _id: crypto.randomUUID(),
          family_id: invite.family_id,
          user_id: this.userId,
          display_name: '家庭成员',
          role: 'viewer',
          active: true,
          ...nowFields(now),
        }
        await transaction.collection('family-members').add(member)
      }
      await appendAudit(transaction, {
        family_id: invite.family_id,
        actor_user_id: this.userId,
        action: 'member.acceptInvite',
        entity_type: 'member',
        entity_id: member._id,
        payload: { role: 'viewer' },
      })
      const family = docData(
        await transaction.collection('families').doc(invite.family_id).get(),
      )
      return { family, member }
    })
  },

  async listMembers({ familyId } = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, familyId)
    const result = await this.db
      .collection('family-members')
      .where({ family_id: familyId, active: true })
      .field({ user_id: false })
      .get()
    return { members: result.data }
  },

  async changeRole({ familyId, memberId, role } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const actor = await requireMember(this.db, this.userId, familyId, ['owner'])
    const { assertCanAssignRole } = shared('family-domain')
    assertCanAssignRole(actor.role, role)

    return withTransaction(this.db, async (transaction) => {
      const member = docData(
        await transaction.collection('family-members').doc(memberId).get(),
      )
      if (!member || member.family_id !== familyId || !member.active) {
        throw appError('MEMBER_NOT_FOUND', '成员不存在')
      }
      if (member.role === 'owner') {
        throw appError('OWNER_ROLE_LOCKED', '不能修改家庭所有者')
      }
      const now = Date.now()
      await transaction.collection('family-members').doc(memberId).update({
        role,
        updated_at: now,
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'member.changeRole',
        entity_type: 'member',
        entity_id: memberId,
        payload: { from: member.role, to: role },
      })
      return { member: { ...member, role, updated_at: now } }
    })
  },

  async removeMember({ familyId, memberId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const actor = await requireMember(this.db, this.userId, familyId)
    if (actor.role !== 'owner' && !(actor.role === 'admin' && actor._id === memberId)) {
      throw appError('ROLE_FORBIDDEN', '当前角色不能移除该成员')
    }

    return withTransaction(this.db, async (transaction) => {
      const member = docData(
        await transaction.collection('family-members').doc(memberId).get(),
      )
      if (!member || member.family_id !== familyId || !member.active) {
        throw appError('MEMBER_NOT_FOUND', '成员不存在')
      }
      if (member.role === 'owner') {
        throw appError('OWNER_ROLE_LOCKED', '不能移除家庭所有者')
      }
      const now = Date.now()
      await transaction.collection('family-members').doc(memberId).update({
        active: false,
        updated_at: now,
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'member.remove',
        entity_type: 'member',
        entity_id: memberId,
        payload: {},
      })
      return { removed: true }
    })
  },

  async requestDelete({ familyId, childName } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner'])
    const family = docData(await this.db.collection('families').doc(familyId).get())
    if (!family || family.child_name !== childName) {
      throw appError('CHILD_NAME_MISMATCH', '孩子昵称不匹配')
    }
    const deleteAfter = Date.now() + 30 * 24 * 60 * 60 * 1000
    await withTransaction(this.db, async (transaction) => {
      await transaction.collection('families').doc(familyId).update({
        status: 'deleting',
        delete_after: deleteAfter,
        updated_at: Date.now(),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'family.requestDelete',
        entity_type: 'family',
        entity_id: familyId,
        payload: { delete_after: deleteAfter },
      })
    })
    return { deleteAfter }
  },

  async restoreFamily({ familyId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner'])
    const family = docData(await this.db.collection('families').doc(familyId).get())
    if (!family || family.owner_user_id !== this.userId) {
      throw appError('ROLE_FORBIDDEN', '只有原家庭所有者可以恢复')
    }
    if (family.status !== 'deleting' || !family.delete_after || family.delete_after <= Date.now()) {
      throw appError('FAMILY_NOT_RESTORABLE', '家庭当前无法恢复')
    }
    await withTransaction(this.db, async (transaction) => {
      await transaction.collection('families').doc(familyId).update({
        status: 'active',
        delete_after: null,
        updated_at: Date.now(),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'family.restore',
        entity_type: 'family',
        entity_id: familyId,
        payload: {},
      })
    })
    return { restored: true }
  },
}
