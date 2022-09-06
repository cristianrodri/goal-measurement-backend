const { PERFORMANCE_API_NAME } = require('./api')

const FIELDS = ['id', 'progress', 'date', 'isWorkingDay']

const updatePerformance = (strapi, id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data, fields: FIELDS })
    .then(res => res)

module.exports = { updatePerformance }
