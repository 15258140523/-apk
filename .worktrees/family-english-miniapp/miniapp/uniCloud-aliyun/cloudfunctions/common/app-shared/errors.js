'use strict'

function appError(code, message) {
  const error = new Error(message)
  error.errCode = code
  return error
}

module.exports = { appError }
