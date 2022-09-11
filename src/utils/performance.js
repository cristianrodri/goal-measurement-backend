const { PERFORMANCE_API_NAME } = require('./api_names')
const {
  getStartOfDay,
  getClientUTC,
  getCurrentDate,
  getDay
} = require('./date')
const { createPerformanceActivity } = require('./performance-activity')

const FIELDS = ['id', 'progress', 'date', 'isWorkingDay']

const createPerformance = async (ctx, goal, date, previousDeadline) => {
  // Client utc should be provided by ctx.query.utc
  const performanceDate = getStartOfDay(date, getClientUTC(ctx))
  const currentDate = getCurrentDate(getClientUTC(ctx))
  const day = getDay(performanceDate)
  const isGoalActivityDayTrue = goal.goal_activities.some(
    activity => activity[day]
  )
  // If the previousDeadline is provided as parameter, check if the performance date is after of a deadline AND before the current date. Otherwise just check if the current day is true in the goal activity "day attribute"
  const isWorkingDay = previousDeadline
    ? performanceDate.isAfter(previousDeadline) &&
      performanceDate.isBefore(currentDate)
      ? false
      : isGoalActivityDayTrue
    : isGoalActivityDayTrue

  const entity = await strapi.entityService.create(PERFORMANCE_API_NAME, {
    data: {
      date: performanceDate.format(),
      isWorkingDay,
      goal,
      user: ctx.state.user
    },
    fields: FIELDS,
    populate: {
      performance_activities: true
    }
  })

  if (!isWorkingDay) return entity

  const performanceActivities = await Promise.all(
    goal.goal_activities
      .filter(activity => activity[day])
      .map(async goalActivity => {
        // Create a new performance activity

        const perfomanceActivity = await createPerformanceActivity(
          ctx,
          goalActivity.description,
          goal,
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
  goal,
  fromDate,
  previousDateline
) => {
  // If the days diffence between the current day and fromDate is greater than 0, then create the performances related to the remaining days
  const clientUTC = getClientUTC(ctx)
  const currentDate = getCurrentDate(clientUTC)
  const daysDiff = currentDate.diff(fromDate, 'days')

  const entities = await Promise.all(
    Array.from({ length: daysDiff }).map(async () => {
      fromDate.add(1, 'days')
      const performanceEntities = await createPerformance(
        ctx,
        goal,
        fromDate,
        previousDateline
      )

      return performanceEntities
    })
  )

  return entities
}

const findUserPerformances = (ctx, goal) =>
  strapi.entityService
    .findMany(PERFORMANCE_API_NAME, {
      filters: {
        goal: goal.id,
        user: ctx.state.user
      }
    })
    .then(res => res)

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

const updatePerformance = (id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data, fields: FIELDS })
    .then(res => res)

module.exports = {
  createManyPerformances,
  createPerformance,
  findUserPerformances,
  getLastPerformance,
  updatePerformance
}
