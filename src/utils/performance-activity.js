const PERFORMANCE_ACTIVITY_API_NAME =
  'api::performance-activity.performance-activity'

const FIELDS = ['id', 'description', 'done']

const createPerformanceActivity = (
  strapi,
  ctx,
  description,
  goal,
  performance
) =>
  strapi.entityService
    .create(PERFORMANCE_ACTIVITY_API_NAME, {
      data: {
        description,
        goal,
        performance,
        user: ctx.state.user
      },
      fields: FIELDS
    })
    .then(res => res)

const deletePerformanceActivity = (strapi, performanceActivity) =>
  strapi.entityService
    .delete(PERFORMANCE_ACTIVITY_API_NAME, performanceActivity.id, {
      fields: FIELDS
    })
    .then(res => res)

const updatePerformanceActivity = (strapi, performanceActivity, data) =>
  strapi.entityService
    .update(PERFORMANCE_ACTIVITY_API_NAME, performanceActivity.id, {
      data,
      fields: FIELDS
    })
    .then(res => res)

module.exports = {
  createPerformanceActivity,
  deletePerformanceActivity,
  updatePerformanceActivity
}
