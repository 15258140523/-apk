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

const MB = 1024 * 1024
const MAX_LIMIT = 30

const FILE_LIMITS = {
  video: { maxBytes: 30 * MB, maxDuration: 60 },
  image: { maxBytes: 10 * MB, maxDuration: 0 },
  pdf: { maxBytes: 10 * MB, maxDuration: 0 },
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

  async list({ familyId, courseId, cursor, limit } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT)
    const dbCmd = this.db.command
    let where = { family_id: familyId, deleted_at: null }
    if (courseId) where.course_id = courseId

    let query = this.db
      .collection('learning-records')
      .where(where)
      .orderBy('created_at', 'desc')
      .limit(safeLimit + 1)

    if (cursor) {
      const cursorDoc = await this.db.collection('learning-records').doc(cursor).get()
      if (cursorDoc.data[0]) {
        query = this.db
          .collection('learning-records')
          .where({
            ...where,
            created_at: dbCmd.lt(cursorDoc.data[0].created_at),
          })
          .orderBy('created_at', 'desc')
          .limit(safeLimit + 1)
      }
    }

    const result = await query.get()
    const hasMore = result.data.length > safeLimit
    const records = result.data.slice(0, safeLimit)

    return {
      records,
      nextCursor: hasMore ? records[records.length - 1]._id : null,
    }
  },

  async detail({ familyId, recordId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)

    const record = docData(
      await this.db.collection('learning-records').doc(recordId).get(),
    )
    if (!record || record.family_id !== familyId || record.deleted_at) {
      throw appError('RECORD_NOT_FOUND', '学习记录不存在')
    }

    const attachmentsResult = await this.db
      .collection('attachments')
      .where({ record_id: recordId, deleted_at: null })
      .get()

    return { record, attachments: attachmentsResult.data }
  },

  async save({ familyId, record, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])

    if (!record || !record.courseId) {
      throw appError('COURSE_REQUIRED', '请选择课程')
    }

    const now = Date.now()
    if (record.id) {
      const existing = docData(
        await this.db.collection('learning-records').doc(record.id).get(),
      )
      if (!existing || existing.family_id !== familyId) {
        throw appError('RECORD_NOT_FOUND', '学习记录不存在')
      }
      await this.db.collection('learning-records').doc(record.id).update({
        title: record.title || '',
        note: record.note || '',
        tags: record.tags || [],
        cloud_links: record.cloudLinks || [],
        updated_at: now,
      })
      const updated = docData(
        await this.db.collection('learning-records').doc(record.id).get(),
      )
      return { record: updated }
    }

    const id = crypto.randomUUID()
    const doc = {
      _id: id,
      family_id: familyId,
      course_id: record.courseId,
      lesson_id: record.lessonId || null,
      title: record.title || '',
      note: record.note || '',
      tags: record.tags || [],
      cloud_links: record.cloudLinks || [],
      deleted_at: null,
      ...nowFields(now),
    }
    await this.db.collection('learning-records').add(doc)
    return { record: doc }
  },

  async prepareUpload({ familyId, kind, bytes, duration } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])

    const limits = FILE_LIMITS[kind]
    if (!limits) throw appError('INVALID_FILE_KIND', '不支持的文件类型')
    if (bytes > limits.maxBytes) throw appError('FILE_TOO_LARGE', '文件大小超过限制')
    if (limits.maxDuration && duration > limits.maxDuration) {
      throw appError('VIDEO_TOO_LONG', '视频时长超过限制')
    }

    return { uploadAllowed: true }
  },

  async confirmUpload({ familyId, recordId, kind, cloudFileId, bytes } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])

    if (!cloudFileId) throw appError('CLOUD_FILE_REQUIRED', '请上传文件')
    const limits = FILE_LIMITS[kind]
    if (!limits) throw appError('INVALID_FILE_KIND', '不支持的文件类型')

    const existing = await this.db
      .collection('attachments')
      .where({ record_id: recordId, cloud_file_id: cloudFileId })
      .limit(1)
      .get()
    if (existing.data[0]) return { attachment: existing.data[0] }

    const now = Date.now()
    const attachment = {
      _id: crypto.randomUUID(),
      family_id: familyId,
      record_id: recordId,
      kind,
      cloud_file_id: cloudFileId,
      bytes: bytes || 0,
      deleted_at: null,
      ...nowFields(now),
    }
    await this.db.collection('attachments').add(attachment)
    return { attachment }
  },

  async signedFileUrl({ familyId, attachmentId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)

    const attachment = docData(
      await this.db.collection('attachments').doc(attachmentId).get(),
    )
    if (!attachment || attachment.family_id !== familyId || attachment.deleted_at) {
      throw appError('ATTACHMENT_NOT_FOUND', '附件不存在')
    }

    const result = await uniCloud.getTempFileURL({
      fileList: [attachment.cloud_file_id],
    })
    const url = result.fileList[0]?.tempFileURL
    if (!url) throw appError('FILE_URL_ERROR', '获取文件地址失败')

    return { url, expiresAt: Date.now() + 10 * 60 * 1000 }
  },

  async moveToRecycleBin({ familyId, recordId, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])

    const record = docData(
      await this.db.collection('learning-records').doc(recordId).get(),
    )
    if (!record || record.family_id !== familyId) {
      throw appError('RECORD_NOT_FOUND', '学习记录不存在')
    }

    const attachmentsResult = await this.db
      .collection('attachments')
      .where({ record_id: recordId, deleted_at: null })
      .get()

    const now = Date.now()
    const purgeAt = now + 30 * 24 * 60 * 60 * 1000

    await this.db.collection('learning-records').doc(recordId).update({
      deleted_at: now,
      updated_at: now,
    })
    for (const att of attachmentsResult.data) {
      await this.db.collection('attachments').doc(att._id).update({
        deleted_at: now,
        updated_at: now,
      })
    }

    await this.db.collection('recycle-bin').add({
      _id: crypto.randomUUID(),
      family_id: familyId,
      entity_type: 'learning-record',
      entity_id: recordId,
      snapshot: { record, attachments: attachmentsResult.data },
      purge_at: purgeAt,
      ...nowFields(now),
    })

    return { purgeAt }
  },
}
