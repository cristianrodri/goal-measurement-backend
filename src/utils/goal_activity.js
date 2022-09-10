const { GOAL_ACTIVITY_API_NAME } = require('./api_names')
const { trimmedObj } = require('./utils')

const createGoalActivity = async (ctx, goal, data) => {
  const entity = await strapi.entityService.create(GOAL_ACTIVITY_API_NAME, {
    data: {
      ...trimmedObj(data),
      goal: goal.id,
      user: ctx.state.user
    }
  })

  delete entity.createdAt
  delete entity.updatedAt

  return entity
}

module.exports = { createGoalActivity }
