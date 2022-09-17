const { PERFORMANCE_API_NAME } = require('./api_names')
const { FIELD_PERFORMANCES } = require('./api_options')

const updatePerformance = (id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data, fields: FIELD_PERFORMANCES })
    .then(res => res)

module.exports = {
  updatePerformance
}
