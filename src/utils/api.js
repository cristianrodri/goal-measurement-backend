const { createPerformance } = require('./performance')

const GOAL_API_NAME = 'api::goal.goal'
const PERFORMANCE_API_NAME = 'api::performance.performance'

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

const getLastPerformance = async (ctx, goalId) => {
  const performances = await strapi.entityService.findMany(
    PERFORMANCE_API_NAME,
    {
      filters: {
        goal: +goalId,
        user: ctx.state.user
      },
      sort: {
        date: 'desc'
      },
      limit: 1,
      populate: {
        performance_activities: true,
        goal: {
          populate: {
            performances: true
          }
        }
      }
    }
  )

  return performances[0]
}

const createManyPerformances = async (
  ctx,
  relatedGoal,
  currentDay,
  fromDate,
  previousDateline
) => {
  // If the days diffence between the current day and fromDate is greater than 0, then create the performances related to the remaining days
  const daysDiff = currentDay.diff(fromDate, 'days')

  const entities = await Promise.all(
    Array.from({ length: daysDiff }).map(async () => {
      fromDate.add(1, 'days')
      const performanceEntities = await createPerformance(
        ctx,
        relatedGoal,
        fromDate,
        previousDateline
      )

      return performanceEntities
    })
  )

  return entities
}

module.exports = {
  getPerformances,
  createManyPerformances,
  getLastPerformance,
  GOAL_API_NAME,
  PERFORMANCE_API_NAME
}
