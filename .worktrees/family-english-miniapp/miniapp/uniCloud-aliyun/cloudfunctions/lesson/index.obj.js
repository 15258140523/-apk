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

const MAX_WINDOW_DAYS = 62

function parseDate(dateStr) {
  return new Date(dateStr + 'T12:00:00+08:00')
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

  async listWindow({ familyId, from, to } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const { occurrenceKey, weeklyOccurrences } = shared('scheduleDomain')
    await requireMember(this.db, this.userId, familyId)

    if (!from || !to) throw appError('INVALID_WINDOW', '请指定查询时间范围')

    const fromDate = parseDate(from)
    const toDate = parseDate(to)
    const diffDays = Math.ceil((toDate - fromDate) / (24 * 60 * 60 * 1000))
    if (diffDays > MAX_WINDOW_DAYS || diffDays < 0) {
      throw appError('INVALID_WINDOW', '查询范围不能超过62天')
    }

    const rulesResult = await this.db
      .collection('schedule-rules')
      .where({
        family_id: familyId,
        effective_to: null,
      })
      .get()

    const dbCmd = this.db.command
    for (const rule of rulesResult.data) {
      const occurrences = weeklyOccurrences(
        { weekday: rule.weekday, hour: rule.hour, minute: rule.minute },
        from,
        to,
      )
      for (const plannedAt of occurrences) {
        const key = occurrenceKey(rule.course_id, plannedAt)
        const existing = await this.db
          .collection('lessons')
          .where({ family_id: familyId, occurrence_key: key })
          .limit(1)
          .get()
        if (existing.data.length === 0) {
          const now = Date.now()
          await this.db.collection('lessons').add({
            _id: crypto.randomUUID(),
            family_id: familyId,
            course_id: rule.course_id,
            occurrence_key: key,
            planned_at: plannedAt,
            actual_at: plannedAt,
            status: 'pending',
            version: 1,
            ...nowFields(now),
          })
        }
      }
    }

    const lessonsResult = await this.db
      .collection('lessons')
      .where({
        family_id: familyId,
        actual_at: dbCmd.gte(from + 'T00:00:00+08:00').and(dbCmd.lte(to + 'T23:59:59+08:00')),
      })
      .orderBy('actual_at', 'asc')
      .get()

    return { lessons: lessonsResult.data }
  },

  async detail({ familyId, lessonId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)

    const lesson = docData(
      await this.db.collection('lessons').doc(lessonId).get(),
    )
    if (!lesson || lesson.family_id !== familyId) {
      throw appError('LESSON_NOT_FOUND', '课程记录不存在')
    }

    const [courseResult, reminderResult, recordResult] = await Promise.all([
      this.db.collection('courses').doc(lesson.course_id).get(),
      this.db
        .collection('course-reminder-members')
        .where({ family_id: familyId, course_id: lesson.course_id, enabled: true })
        .get(),
      this.db
        .collection('learning-records')
        .where({ family_id: familyId, lesson_id: lessonId, deleted_at: null })
        .limit(1)
        .get(),
    ])

    return {
      lesson,
      course: courseResult.data[0] || null,
      reminderMembers: reminderResult.data.map((item) => item.member_id),
      learningRecord: recordResult.data[0] || null,
    }
  },

  async adjust({ familyId, lessonId, action, actualAt, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const { applySingleAdjustment } = shared('lessonDomain')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])
    if (!requestId) throw appError('REQUEST_ID_REQUIRED', '缺少请求编号')

    const previous = await this.db
      .collection('request-claims')
      .where({ family_id: familyId, request_id: requestId })
      .limit(1)
      .get()
    if (previous.data[0]) {
      const lesson = docData(
        await this.db.collection('lessons').doc(lessonId).get(),
      )
      return { lesson }
    }

    return withTransaction(this.db, async (transaction) => {
      const lesson = docData(
        await transaction.collection('lessons').doc(lessonId).get(),
      )
      if (!lesson || lesson.family_id !== familyId) {
        throw appError('LESSON_NOT_FOUND', '课程记录不存在')
      }
      if (lesson.status === 'completed') {
        throw appError('LESSON_ALREADY_COMPLETED', '课程已完成，不能调整')
      }

      const adjusted = applySingleAdjustment(lesson, action, actualAt)
      const now = Date.now()
      const update = {
        status: adjusted.status,
        actual_at: adjusted.actual_at,
        version: lesson.version + 1,
        updated_at: now,
      }
      await transaction.collection('lessons').doc(lessonId).update(update)
      await transaction.collection('request-claims').add({
        family_id: familyId,
        request_id: requestId,
        action: `lesson.${action}`,
        actor_user_id: this.userId,
        status: 'done',
        result: { lessonId },
        ...nowFields(now),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: `lesson.${action}`,
        entity_type: 'lesson',
        entity_id: lessonId,
        payload: { action, actualAt },
      })
      return { lesson: { ...lesson, ...update } }
    })
  },

  async complete({ familyId, lessonId, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    const { completionPlan } = shared('lessonDomain')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])
    if (!requestId) throw appError('REQUEST_ID_REQUIRED', '缺少请求编号')

    const previous = await this.db
      .collection('request-claims')
      .where({ family_id: familyId, request_id: requestId })
      .limit(1)
      .get()
    if (previous.data[0]) {
      const lesson = docData(
        await this.db.collection('lessons').doc(lessonId).get(),
      )
      const course = docData(
        await this.db.collection('courses').doc(lesson.course_id).get(),
      )
      return {
        lesson,
        remainingLessons: course.remaining_lessons,
        operationId: previous.data[0]._id,
      }
    }

    return withTransaction(this.db, async (transaction) => {
      const lesson = docData(
        await transaction.collection('lessons').doc(lessonId).get(),
      )
      if (!lesson || lesson.family_id !== familyId) {
        throw appError('LESSON_NOT_FOUND', '课程记录不存在')
      }
      const course = docData(
        await transaction.collection('courses').doc(lesson.course_id).get(),
      )
      if (!course || course.family_id !== familyId) {
        throw appError('COURSE_NOT_FOUND', '课程不存在')
      }

      const plan = completionPlan(lesson, course.remaining_lessons)
      const now = Date.now()
      const lessonVersion = lesson.version + 1

      await transaction.collection('lessons').doc(lessonId).update({
        status: plan.lessonStatus,
        version: lessonVersion,
        updated_at: now,
      })
      await transaction.collection('courses').doc(lesson.course_id).update({
        remaining_lessons: plan.remainingLessons,
        version: course.version + 1,
        updated_at: now,
      })
      await transaction.collection('request-claims').add({
        family_id: familyId,
        request_id: requestId,
        action: 'lesson.complete',
        actor_user_id: this.userId,
        status: 'done',
        result: { lessonId, remainingLessons: plan.remainingLessons },
        ...nowFields(now),
      })
      const auditResult = await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'lesson.complete',
        entity_type: 'lesson',
        entity_id: lessonId,
        payload: { courseId: lesson.course_id, remainingLessons: plan.remainingLessons },
      })
      return {
        lesson: { ...lesson, status: plan.lessonStatus, version: lessonVersion, updated_at: now },
        remainingLessons: plan.remainingLessons,
        operationId: auditResult.id,
      }
    })
  },

  async undoCompletion({ familyId, lessonId, operationId, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])
    if (!requestId) throw appError('REQUEST_ID_REQUIRED', '缺少请求编号')
    if (!operationId) throw appError('OPERATION_ID_REQUIRED', '缺少原操作编号')

    const previous = await this.db
      .collection('request-claims')
      .where({ family_id: familyId, request_id: requestId })
      .limit(1)
      .get()
    if (previous.data[0]) {
      const lesson = docData(
        await this.db.collection('lessons').doc(lessonId).get(),
      )
      const course = docData(
        await this.db.collection('courses').doc(lesson.course_id).get(),
      )
      return {
        lesson,
        remainingLessons: course.remaining_lessons,
        operationId: previous.data[0]._id,
      }
    }

    return withTransaction(this.db, async (transaction) => {
      const originalOp = docData(
        await transaction.collection('operation-logs').doc(operationId).get(),
      )
      if (!originalOp || originalOp.action !== 'lesson.complete') {
        throw appError('INVALID_OPERATION', '原操作不存在或不可撤销')
      }
      if (originalOp.reversal_of !== null) {
        throw appError('ALREADY_REVERSED', '该操作已被撤销')
      }

      const existingReversal = await this.db
        .collection('operation-logs')
        .where({ family_id: familyId, reversal_of: operationId })
        .limit(1)
        .get()
      if (existingReversal.data[0]) {
        throw appError('ALREADY_REVERSED', '该操作已被撤销')
      }

      const lesson = docData(
        await transaction.collection('lessons').doc(lessonId).get(),
      )
      if (!lesson || lesson.family_id !== familyId) {
        throw appError('LESSON_NOT_FOUND', '课程记录不存在')
      }
      if (lesson.status !== 'completed') {
        throw appError('LESSON_NOT_COMPLETED', '课程尚未完成，无需撤销')
      }

      const course = docData(
        await transaction.collection('courses').doc(lesson.course_id).get(),
      )
      if (!course || course.family_id !== familyId) {
        throw appError('COURSE_NOT_FOUND', '课程不存在')
      }

      const now = Date.now()
      const newRemaining = course.remaining_lessons + 1

      await transaction.collection('lessons').doc(lessonId).update({
        status: 'pending',
        version: lesson.version + 1,
        updated_at: now,
      })
      await transaction.collection('courses').doc(lesson.course_id).update({
        remaining_lessons: newRemaining,
        version: course.version + 1,
        updated_at: now,
      })
      await transaction.collection('request-claims').add({
        family_id: familyId,
        request_id: requestId,
        action: 'lesson.undo',
        actor_user_id: this.userId,
        status: 'done',
        result: { lessonId, remainingLessons: newRemaining },
        ...nowFields(now),
      })
      const undoResult = await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'lesson.undo',
        entity_type: 'lesson',
        entity_id: lessonId,
        reversal_of: operationId,
        payload: { originalOperationId: operationId, remainingLessons: newRemaining },
      })
      return {
        lesson: { ...lesson, status: 'pending', version: lesson.version + 1, updated_at: now },
        remainingLessons: newRemaining,
        operationId: undoResult.id,
      }
    })
  },
}
