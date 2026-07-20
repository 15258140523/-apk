'use strict'

function requestClaimKey(familyId, requestId) {
  if (!familyId || !requestId) throw new Error('REQUEST_ID_REQUIRED')
  return `${familyId}:${requestId}`
}

module.exports = { requestClaimKey }
