const { PERFORMANCE_API_NAME } = require('./api')

const updatePerformance = (strapi, id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data })
    .then(res => res)

module.exports = { updatePerformance }
