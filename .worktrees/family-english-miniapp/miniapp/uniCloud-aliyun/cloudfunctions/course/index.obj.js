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

function normalizeInput(input) {
  const { appError } = shared('errors')
  const { validateCourseInput, validateWeeklyRule } = shared('course-domain')
  try {
    return {
      ...validateCourseInput(input.name, input.remainingLessons),
      weeklyRule: validateWeeklyRule(input.weeklyRule),
      reminderMemberIds: [...new Set(input.reminderMemberIds || [])],
    }
  } catch (error) {
    const code = error.message || 'COURSE_INPUT_INVALID'
    const messages = {
      COURSE_NAME_REQUIRED: '请输入课程名称',
      INVALID_REMAINING_LESSONS: '剩余课时必须是非负整数',
      INVALID_WEEKLY_RULE: '每周上课时间不正确',
    }
    throw appError(code, messages[code] || '课程信息不正确')
  }
}

async function requireReminderMembers(db, familyId, memberIds) {
  const { appError } = shared('errors')
  if (!memberIds.length) return []
  const result = await db
    .collection('family-members')
    .where({
      family_id: familyId,
      _id: db.command.in(memberIds),
      active: true,
    })
    .get()
  if (result.data.length !== memberIds.length) {
    throw appError('REMINDER_MEMBER_INVALID', '提醒成员不属于当前家庭')
  }
  return result.data
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

  async create(input = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, input.familyId, ['owner', 'admin'])
    const normalized = normalizeInput(input)
    await requireReminderMembers(
      this.db,
      input.familyId,
      normalized.reminderMemberIds,
    )

    return withTransaction(this.db, async (transaction) => {
      const now = Date.now()
      const courseId = crypto.randomUUID()
      const course = {
        _id: courseId,
        family_id: input.familyId,
        name: normalized.name,
        remaining_lessons: normalized.remainingLessons,
        version: 1,
        archived: false,
        ...nowFields(now),
      }
      await transaction.collection('courses').add(course)
      await transaction.collection('schedule-rules').add({
        _id: crypto.randomUUID(),
        family_id: input.familyId,
        course_id: courseId,
        ...normalized.weeklyRule,
        effective_from: now,
        effective_to: null,
        ...nowFields(now),
      })
      for (const memberId of normalized.reminderMemberIds) {
        await transaction.collection('course-reminder-members').add({
          _id: crypto.randomUUID(),
          family_id: input.familyId,
          course_id: courseId,
          member_id: memberId,
          enabled: true,
          ...nowFields(now),
        })
      }
      await appendAudit(transaction, {
        family_id: input.familyId,
        actor_user_id: this.userId,
        action: 'course.create',
        entity_type: 'course',
        entity_id: courseId,
        payload: { name: normalized.name },
      })
      return { course }
    })
  },

  async update(input = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, input.familyId, ['owner', 'admin'])
    const normalized = normalizeInput(input)
    await requireReminderMembers(
      this.db,
      input.familyId,
      normalized.reminderMemberIds,
    )

    const currentRules = await this.db
      .collection('schedule-rules')
      .where({ family_id: input.familyId, course_id: input.courseId, effective_to: null })
      .limit(1)
      .get()
    const reminderLinks = await this.db
      .collection('course-reminder-members')
      .where({ family_id: input.familyId, course_id: input.courseId })
      .get()

    return withTransaction(this.db, async (transaction) => {
      const current = docData(
        await transaction.collection('courses').doc(input.courseId).get(),
      )
      if (!current || current.family_id !== input.familyId || current.archived) {
        throw appError('COURSE_NOT_FOUND', '课程不存在')
      }
      if (current.version !== input.version) {
        const error = appError('COURSE_VERSION_CONFLICT', '课程已被其他家庭成员修改')
        error.latestVersion = current.version
        throw error
      }

      const now = Date.now()
      const version = current.version + 1
      await transaction.collection('courses').doc(input.courseId).update({
        name: normalized.name,
        remaining_lessons: normalized.remainingLessons,
        version,
        updated_at: now,
      })

      const activeRule = currentRules.data[0]
      if (activeRule) {
        await transaction.collection('schedule-rules').doc(activeRule._id).update({
          effective_to: now,
          updated_at: now,
        })
      }
      await transaction.collection('schedule-rules').add({
        _id: crypto.randomUUID(),
        family_id: input.familyId,
        course_id: input.courseId,
        ...normalized.weeklyRule,
        effective_from: now,
        effective_to: null,
        ...nowFields(now),
      })

      const requested = new Set(normalized.reminderMemberIds)
      const existingIds = new Set()
      for (const link of reminderLinks.data) {
        existingIds.add(link.member_id)
        await transaction.collection('course-reminder-members').doc(link._id).update({
          enabled: requested.has(link.member_id),
          updated_at: now,
        })
      }
      for (const memberId of requested) {
        if (!existingIds.has(memberId)) {
          await transaction.collection('course-reminder-members').add({
            _id: crypto.randomUUID(),
            family_id: input.familyId,
            course_id: input.courseId,
            member_id: memberId,
            enabled: true,
            ...nowFields(now),
          })
        }
      }

      const course = {
        ...current,
        name: normalized.name,
        remaining_lessons: normalized.remainingLessons,
        version,
        updated_at: now,
      }
      await appendAudit(transaction, {
        family_id: input.familyId,
        actor_user_id: this.userId,
        action: 'course.update',
        entity_type: 'course',
        entity_id: input.courseId,
        payload: { version },
      })
      return { course }
    })
  },

  async list({ familyId } = {}) {
    const { requireMember } = shared('auth')
    await requireMember(this.db, this.userId, familyId)
    const result = await this.db
      .collection('courses')
      .where({ family_id: familyId, archived: false })
      .orderBy('updated_at', 'desc')
      .get()

    const courses = []
    for (const course of result.data) {
      const lessonResult = await this.db
        .collection('lessons')
        .where({
          family_id: familyId,
          course_id: course._id,
          status: this.db.command.in(['pending', 'rescheduled']),
        })
        .orderBy('actual_at', 'asc')
        .limit(1)
        .get()
      courses.push({ ...course, next_lesson: lessonResult.data[0] || null })
    }
    return { courses }
  },

  async detail({ familyId, courseId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId)
    const course = docData(await this.db.collection('courses').doc(courseId).get())
    if (!course || course.family_id !== familyId) {
      throw appError('COURSE_NOT_FOUND', '课程不存在')
    }
    const [ruleResult, reminderResult, lessonResult] = await Promise.all([
      this.db
        .collection('schedule-rules')
        .where({ family_id: familyId, course_id: courseId, effective_to: null })
        .limit(1)
        .get(),
      this.db
        .collection('course-reminder-members')
        .where({ family_id: familyId, course_id: courseId, enabled: true })
        .get(),
      this.db
        .collection('lessons')
        .where({ family_id: familyId, course_id: courseId })
        .orderBy('actual_at', 'desc')
        .limit(20)
        .get(),
    ])
    return {
      course,
      rule: ruleResult.data[0] || null,
      reminderMembers: reminderResult.data.map((item) => item.member_id),
      lessons: lessonResult.data,
    }
  },

  async archive({ familyId, courseId, requestId } = {}) {
    const { requireMember } = shared('auth')
    const { appError } = shared('errors')
    await requireMember(this.db, this.userId, familyId, ['owner', 'admin'])
    if (!requestId) throw appError('REQUEST_ID_REQUIRED', '缺少请求编号')

    const previous = await this.db
      .collection('request-claims')
      .where({ family_id: familyId, request_id: requestId })
      .limit(1)
      .get()
    if (previous.data[0]) return { archived: true }

    return withTransaction(this.db, async (transaction) => {
      const course = docData(await transaction.collection('courses').doc(courseId).get())
      if (!course || course.family_id !== familyId) {
        throw appError('COURSE_NOT_FOUND', '课程不存在')
      }
      const now = Date.now()
      await transaction.collection('courses').doc(courseId).update({
        archived: true,
        version: course.version + 1,
        updated_at: now,
      })
      await transaction.collection('request-claims').add({
        family_id: familyId,
        request_id: requestId,
        action: 'course.archive',
        actor_user_id: this.userId,
        status: 'done',
        result: { courseId },
        ...nowFields(now),
      })
      await appendAudit(transaction, {
        family_id: familyId,
        actor_user_id: this.userId,
        action: 'course.archive',
        entity_type: 'course',
        entity_id: courseId,
        payload: {},
      })
      return { archived: true }
    })
  },
}
