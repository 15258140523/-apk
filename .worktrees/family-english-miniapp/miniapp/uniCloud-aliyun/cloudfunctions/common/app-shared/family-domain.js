'use strict'

function assertCanAssignRole(actorRole, targetRole) {
  if (actorRole !== 'owner') throw new Error('ROLE_FORBIDDEN')
  if (!['admin', 'viewer'].includes(targetRole)) {
    throw new Error('INVALID_TARGET_ROLE')
  }
}

function inviteExpiresAt(issuedAt) {
  return issuedAt + 24 * 60 * 60 * 1000
}

module.exports = { assertCanAssignRole, inviteExpiresAt }
