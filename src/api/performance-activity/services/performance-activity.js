'use strict'

/**
 * performance-activity service.
 */

const { createCoreService } = require('@strapi/strapi').factories

module.exports = createCoreService(
  'api::performance-activity.performance-activity'
)
