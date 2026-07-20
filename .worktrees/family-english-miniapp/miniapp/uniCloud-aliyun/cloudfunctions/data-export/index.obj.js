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

const EXPORT_COLLECTIONS = [
  'courses', 'schedule-rules', 'lessons',
  'learning-records', 'attachments',
  'operation-logs',
]

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

  async createExport({ familyId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const { exportExpiresAt } = shared('exportDomain')
    const member = await requireMember(this.db, this.userId, familyId, ['owner'])

    const now = Date.now()
    const exportData = {}

    for (const collectionName of EXPORT_COLLECTIONS) {
      const result = await this.db
        .collection(collectionName)
        .where({ family_id: familyId })
        .get()
      exportData[collectionName] = result.data
    }

    const membersResult = await this.db
      .collection('family-members')
      .where({ family_id: familyId })
      .get()
    exportData['family-members'] = membersResult.data.map((m) => ({
      role: m.role,
      active: m.active,
      display_name: m.display_name,
    }))

    const jobId = crypto.randomUUID()
    const expiresAt = exportExpiresAt(now)

    await this.db.collection('operation-logs').add({
      family_id: familyId,
      actor_user_id: this.userId,
      action: 'data.export',
      entity_type: 'family',
      entity_id: familyId,
      payload: { jobId, expiresAt },
      reversal_of: null,
      ...nowFields(now),
    })

    return { jobId, data: exportData, expiresAt }
  },

  async exportStatus({ familyId, jobId } = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, familyId, ['owner'])

    const logEntry = await this.db
      .collection('operation-logs')
      .where({
        family_id: familyId,
        action: 'data.export',
        'payload.jobId': jobId,
      })
      .limit(1)
      .get()

    if (!logEntry.data[0]) return { status: 'not_found' }

    const payload = logEntry.data[0].payload
    if (payload.expiresAt < Date.now()) return { status: 'expired' }

    return { status: 'ready', expiresAt: payload.expiresAt }
  },
}
