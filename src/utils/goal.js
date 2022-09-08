const GOAL_API_NAME = 'api::goal.goal'

const updateGoal = async (strapi, id, data) => {
  const goal = await strapi.entityService
    .update(GOAL_API_NAME, id, { data })
    .then(res => res)

  delete goal.updatedAt

  return goal
}

module.exports = { updateGoal }
