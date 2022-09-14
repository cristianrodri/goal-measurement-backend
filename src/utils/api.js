const { PERFORMANCE_API_NAME } = require('./api_names')
const { FIELD_PERFORMANCES } = require('./api_options')

const getPerformances = async (ctx, goalId) => {
  const performances = await strapi.entityService.findMany(
    PERFORMANCE_API_NAME,
    {
      filters: {
        goal: goalId,
        user: ctx.state.user
      },
      fields: ['id', 'date', 'progress', 'isWorkingDay'],
      populate: {
        performance_activities: {
          fields: ['id', 'description', 'done']
        }
      },
      sort: 'date'
    }
  )

  return performances
}

const updatePerformance = (id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data, fields: FIELD_PERFORMANCES })
    .then(res => res)

module.exports = {
  getPerformances,
  updatePerformance
}
