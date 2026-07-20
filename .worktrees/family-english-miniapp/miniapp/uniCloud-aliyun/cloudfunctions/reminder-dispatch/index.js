'use strict'

const crypto = require('crypto')

function shared(name) {
  return require(`app-shared/${name}`)
}

function nowFields(now = Date.now()) {
  return { created_at: now, updated_at: now }
}

exports.main = async function (event, context) {
  const db = uniCloud.database()
  const dbCmd = db.command
  const { reminderKey } = shared('reminderDomain')

  const now = Date.now()
  const windowEnd = now + 10 * 60 * 1000

  const pendingJobs = await db
    .collection('reminder-jobs')
    .where({
      status: 'pending',
      remind_at: dbCmd.gte(now).and(dbCmd.lte(windowEnd)),
    })
    .limit(50)
    .get()

  let sent = 0
  let failed = 0

  for (const job of pendingJobs.data) {
    const expectedKey = reminderKey(job.lesson_id, job.member_id, new Date(job.remind_at).toISOString())
    if (job.unique_key !== expectedKey) continue

    try {
      const member = (await db.collection('family-members').doc(job.member_id).get()).data[0]
      if (!member || !member.active) {
        await db.collection('reminder-jobs').doc(job._id).update({
          status: 'skipped',
          error_code: 'MEMBER_INACTIVE',
          updated_at: now,
        })
        continue
      }

      const lesson = (await db.collection('lessons').doc(job.lesson_id).get()).data[0]
      if (!lesson || lesson.status !== 'pending') {
        await db.collection('reminder-jobs').doc(job._id).update({
          status: 'skipped',
          error_code: 'LESSON_NOT_PENDING',
          updated_at: now,
        })
        continue
      }

      await db.collection('reminder-jobs').doc(job._id).update({
        status: 'sent',
        updated_at: now,
      })
      sent++
    } catch (error) {
      await db.collection('reminder-jobs').doc(job._id).update({
        status: 'failed',
        error_code: error.errCode || 'DISPATCH_ERROR',
        updated_at: now,
      })
      failed++
    }
  }

  return { processed: pendingJobs.data.length, sent, failed }
}
