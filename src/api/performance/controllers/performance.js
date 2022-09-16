'use strict'

/**
 *  performance controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { PERFORMANCE_API_NAME } = require('@utils/api_names')
const {
  getClientUTC,
  getCurrentDate,
  getStartOfDay,
  isLastPerformanceTheCurrentDay
} = require('@utils/date')
const { findOneGoal, updateGoalProgress } = require('@utils/goal')
const { createManyPerformances } = require('@utils/performance')
const {
  FIELD_PERFORMANCES,
  FIELD_PERFORMANCE_ACTIVITIES
} = require('@utils/api_options')

module.exports = createCoreController(PERFORMANCE_API_NAME, () => ({
  async find(ctx) {
    // Check if the goal id is provided as a query parameter
    const { goalId } = ctx.query
    const clientUTC = getClientUTC(ctx)

    if (!goalId) {
      return ctx.badRequest('Goal id must be provided')
    }

    // Get the related goal
    const goal = await findOneGoal(goalId, ctx, {
      goal_activities: true,
      performances: {
        fields: FIELD_PERFORMANCES,
        populate: {
          performance_activities: {
            fields: FIELD_PERFORMANCE_ACTIVITIES
          }
        }
      }
    })

    if (!goal) {
      return ctx.badRequest('Related goal not found')
    }

    const deadline = getStartOfDay(goal.deadline, clientUTC)
    const currentDate = getCurrentDate(clientUTC)
    const performances = goal.performances

    // If the current day is greater than the related goal's deadline, just return the performances
    if (currentDate.isAfter(deadline)) {
      return goal.performances
    }

    const lastPerformance = performances[performances.length - 1]

    // Check if the last performance date belongs to the current day. If that's not true, then create performances relying on the remaining days between the last performance date and the current day
    if (isLastPerformanceTheCurrentDay(lastPerformance, clientUTC)) {
      return { performances }
    }

    const previousPerformances = await createManyPerformances(
      ctx,
      goal,
      lastPerformance.date
    )

    const allPerformances = performances.concat(previousPerformances)

    // Get all working day performances expect if the current day performance is not working
    const allWorkingDaysPreviousPerformances = allPerformances.filter(
      performance =>
        (getStartOfDay(performance.date, clientUTC).isBefore(currentDate) &&
          performance.isWorkingDay) ||
        (getStartOfDay(performance.date, clientUTC).isSameOrAfter(
          currentDate
        ) &&
          performance.isWorkingDay)
    )

    const responseData = {}

    // Update goal progress value. It adds the progress value into the responseData object
    await updateGoalProgress(
      goal,
      allWorkingDaysPreviousPerformances,
      responseData
    )

    ctx.body = {
      performances: allPerformances,
      goal: { progress: responseData.updatedGoal.progress }
    }
  }
}))
