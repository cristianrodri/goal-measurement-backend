const { createPerformanceActivity } = require('@utils/performance-activity')

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

const createPerformance = async (
  ctx,
  relatedGoal,
  date,
  previousDateline,
  currentDay
) => {
  const day = date.format('dddd').toLowerCase()
  const checkWorkingDay = relatedGoal.goal_activities.some(
    activity => activity[day]
  )
  const isWorkingDay = previousDateline
    ? date.isAfter(previousDateline) && date.isBefore(currentDay)
      ? false
      : checkWorkingDay
    : checkWorkingDay

  const entity = await strapi.entityService.create(PERFORMANCE_API_NAME, {
    data: {
      date: date.format(),
      isWorkingDay,
      goal: relatedGoal,
      user: ctx.state.user
    },
    fields: ['id', 'date', 'progress', 'isWorkingDay'],
    populate: {
      performance_activities: true
    }
  })

  if (!isWorkingDay) return entity

  const performanceActivities = await Promise.all(
    relatedGoal.goal_activities
      .filter(activity => activity[day])
      .map(async goalActivity => {
        // Create a new performance activity

        const perfomanceActivity = await createPerformanceActivity(
          ctx,
          goalActivity.description,
          relatedGoal,
          entity
        )

        return perfomanceActivity
      })
  )

  entity.performance_activities = performanceActivities

  return entity
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
        previousDateline,
        currentDay
      )

      return performanceEntities
    })
  )

  return entities
}

module.exports = {
  createPerformance,
  getPerformances,
  createManyPerformances,
  getLastPerformance,
  GOAL_API_NAME,
  PERFORMANCE_API_NAME
}
