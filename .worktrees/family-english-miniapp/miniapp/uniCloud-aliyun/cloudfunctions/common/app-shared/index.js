'use strict'

module.exports = {
  auth: require('./auth'),
  audit: require('./audit'),
  courseDomain: require('./course-domain'),
  errors: require('./errors'),
  exportDomain: require('./export-domain'),
  familyDomain: require('./family-domain'),
  idempotency: require('./idempotency'),
  lessonDomain: require('./lesson-domain'),
  reminderDomain: require('./reminder-domain'),
  scheduleDomain: require('./schedule-domain'),
}
