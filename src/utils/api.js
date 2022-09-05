const { createPerformanceActivity } = require('./performance-activity')

const GOAL_API_NAME = 'api::goal.goal'
const PERFORMANCE_API_NAME = 'api::performance.performance'

const getPerformances = async (strapi, ctx, goalId) => {
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

const getLastPerformance = async (strapi, ctx, goalId) => {
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
  strapi,
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
          strapi,
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
  strapi,
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
        strapi,
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

const calculatePerformanceProgress = performanceActivities => {
  const donePerformancesActivities = performanceActivities.filter(
    perfActivity => perfActivity.done
  )

  return Math.round(
    (donePerformancesActivities.length / performanceActivities.length) * 100
  )
}

// The performances always receive all performances until the previous days. If the "current day" peformance progress is 100, this will be included. Otherwise, if it is less than 100, it won't be included
const calculateGoalProgress = performances => {
  const sum = performances.reduce((prev, cur) => prev + cur.progress, 0)

  return Math.round(sum / performances.length)
}

module.exports = {
  calculatePerformanceProgress,
  calculateGoalProgress,
  createPerformance,
  getPerformances,
  createManyPerformances,
  getLastPerformance,
  GOAL_API_NAME,
  PERFORMANCE_API_NAME
}
