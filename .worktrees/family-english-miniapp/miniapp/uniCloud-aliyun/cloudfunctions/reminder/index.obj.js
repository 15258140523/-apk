'use strict'

const crypto = require('crypto')

function shared(name) {
  return require(`app-shared/${name}`)
}

function nowFields(now = Date.now()) {
  return { created_at: now, updated_at: now }
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

  async getCoursePreferences({ familyId, courseId } = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, familyId)

    const membersResult = await this.db
      .collection('course-reminder-members')
      .where({ family_id: familyId, course_id: courseId })
      .get()

    return {
      members: membersResult.data.map((item) => ({
        memberId: item.member_id,
        enabled: item.enabled,
      })),
    }
  },

  async setCoursePreferences({ familyId, courseId, memberIds, reminderOffset } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const { assertReminderOffset } = shared('reminderDomain')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])

    if (reminderOffset !== undefined) {
      assertReminderOffset(reminderOffset)
    }

    const existingLinks = await this.db
      .collection('course-reminder-members')
      .where({ family_id: familyId, course_id: courseId })
      .get()

    const now = Date.now()
    const requested = new Set(memberIds || [])
    const existingIds = new Set()

    for (const link of existingLinks.data) {
      existingIds.add(link.member_id)
      await this.db.collection('course-reminder-members').doc(link._id).update({
        enabled: requested.has(link.member_id),
        updated_at: now,
      })
    }

    for (const memberId of requested) {
      if (!existingIds.has(memberId)) {
        await this.db.collection('course-reminder-members').add({
          _id: crypto.randomUUID(),
          family_id: familyId,
          course_id: courseId,
          member_id: memberId,
          enabled: true,
          ...nowFields(now),
        })
      }
    }

    return { success: true }
  },

  async recordSubscriptionResult({ familyId, courseId, memberId, result } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)

    if (!['accept', 'reject', 'ban'].includes(result)) {
      throw appError('INVALID_SUBSCRIPTION_RESULT', '订阅结果不正确')
    }

    const now = Date.now()
    await this.db.collection('operation-logs').add({
      family_id: familyId,
      actor_user_id: this.userId,
      action: `reminder.subscription.${result}`,
      entity_type: 'course',
      entity_id: courseId,
      payload: { memberId, result },
      reversal_of: null,
      ...nowFields(now),
    })

    return { success: true }
  },
}
