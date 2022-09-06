const { GOAL_API_NAME } = require('./api')

const updateGoal = async (strapi, id, data) => {
  const goal = await strapi.entityService
    .update(GOAL_API_NAME, id, { data })
    .then(res => res)

  delete goal.updatedAt

  return goal
}

module.exports = { updateGoal }
