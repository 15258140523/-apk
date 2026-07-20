'use strict'

exports.main = async function (event, context) {
  const db = uniCloud.database()
  const dbCmd = db.command
  const now = Date.now()
  const results = { recycledBinPurged: 0, familiesDeleted: 0 }

  const expiredBin = await db
    .collection('recycle-bin')
    .where({ purge_at: dbCmd.lte(now) })
    .limit(100)
    .get()

  for (const entry of expiredBin.data) {
    if (entry.entity_type === 'learning-record') {
      const snapshot = entry.snapshot
      if (snapshot.attachments) {
        for (const att of snapshot.attachments) {
          try {
            await uniCloud.deleteFile({ fileList: [att.cloud_file_id] })
          } catch (e) { /* ignore */ }
        }
      }
    }
    await db.collection('recycle-bin').doc(entry._id).remove()
    results.recycledBinPurged++
  }

  const expiredFamilies = await db
    .collection('families')
    .where({
      status: 'deleting',
      delete_after: dbCmd.lte(now),
    })
    .limit(10)
    .get()

  for (const family of expiredFamilies.data) {
    await db.collection('families').doc(family._id).update({
      status: 'deleted',
      updated_at: now,
    })
    await db.collection('family-members')
      .where({ family_id: family._id })
      .update({ active: false, updated_at: now })
    results.familiesDeleted++
  }

  return results
}
