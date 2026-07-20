'use strict'

async function appendAudit(transaction, entry) {
  const now = Date.now()
  return transaction.collection('operation-logs').add({
    ...entry,
    reversal_of: entry.reversal_of || null,
    created_at: now,
    updated_at: now,
  })
}

module.exports = { appendAudit }
