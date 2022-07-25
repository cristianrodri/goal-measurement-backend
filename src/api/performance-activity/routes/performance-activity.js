'use strict'

/**
 * performance-activity router.
 */

const { createCoreRouter } = require('@strapi/strapi').factories

module.exports = createCoreRouter(
  'api::performance-activity.performance-activity'
)
