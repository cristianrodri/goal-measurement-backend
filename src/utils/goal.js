const { GOAL_API_NAME } = require('./api_names')
const { trimmedObj, calculateGoalProgress } = require('./utils')

const createGoal = ctx =>
  strapi.entityService
    .create(GOAL_API_NAME, {
      data: {
        ...trimmedObj(ctx.request.body),
        user: ctx.state.user
      }
    })
    .then(res => res)

const findManyGoals = async ctx =>
  strapi.entityService
    .findMany(GOAL_API_NAME, {
      filters: {
        user: ctx.state.user
      },
      populate: {
        goal_activities: true
      }
    })
    .then(res => res)

const findOneGoal = async (id, ctx, populate) => {
  const entities = await strapi.entityService.findMany(GOAL_API_NAME, {
    filters: {
      id,
      user: ctx.state.user
    },
    populate
  })

  return entities[0]
}

const updateGoal = async (id, data) => {
  const goal = await strapi.entityService.update(GOAL_API_NAME, id, { data })

  delete goal.updatedAt

  return goal
}

const updateGoalProgress = async (goal, performances, responseData) => {
  const newGoalProgress = calculateGoalProgress(
    performances.filter(performance => performance.isWorkingDay)
  )

  if (goal.progress === newGoalProgress) return

  const updatedGoal = await updateGoal(goal.id, {
    progress: newGoalProgress
  })

  responseData.updatedGoal = updatedGoal
}

module.exports = {
  createGoal,
  findManyGoals,
  findOneGoal,
  updateGoal,
  updateGoalProgress
}
