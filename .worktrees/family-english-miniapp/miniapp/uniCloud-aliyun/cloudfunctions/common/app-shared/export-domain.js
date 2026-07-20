'use strict'

function rowsForFamily(rows, familyId) {
  return rows.filter((row) => row.family_id === familyId)
}

function exportExpiresAt(now) {
  return now + 10 * 60 * 1000
}

module.exports = { rowsForFamily, exportExpiresAt }
