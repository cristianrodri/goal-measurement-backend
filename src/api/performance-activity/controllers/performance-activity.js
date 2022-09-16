'use strict'

/**
 *  performance-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { PERFORMANCE_ACTIVITY_API_NAME } = require('@utils/api_names')
const {
  findOnePerformanceActivity,
  updatePerformanceActivity
} = require('@utils/performance-activity')
const { calculatePerformanceProgress } = require('@utils/utils')
const { updatePerformance } = require('@utils/api')
const { getClientUTC, getCurrentDate, getStartOfDay } = require('@utils/date')
const { updateGoalProgress } = require('@utils/goal')

module.exports = createCoreController(PERFORMANCE_ACTIVITY_API_NAME, () => ({
  async update(ctx) {
    const { id } = ctx.params
    const { performanceId, goalId, done } = ctx.request.body

    const performanceActivity = await findOnePerformanceActivity(
      id,
      performanceId,
      goalId,
      ctx,
      {
        goal: {
          populate: {
            performances: true
          }
        },
        performance: {
          populate: {
            performance_activities: true
          }
        }
      }
    )

    if (!performanceActivity) {
      return ctx.notFound('Performance activity not found')
    }

    // If the "done" req.body property is the same with the found performance activity, just return the performance activity data
    if (performanceActivity.done === done) {
      delete performanceActivity.goal
      delete performanceActivity.performance

      return performanceActivity
    }

    // Update current performance activity
    const updatedPerformanceActivity = await updatePerformanceActivity(
      performanceActivity,
      {
        done
      }
    )

    const responseData = {}

    // Get the done values of the all performance activities of the related performance and update the current performance activity id with the new "done" value
    const performanceActivities =
      performanceActivity.performance.performance_activities.map(
        perfActivity => {
          if (perfActivity.id === +id) {
            perfActivity.done = done

            return perfActivity
          }

          return perfActivity
        }
      )

    const newPerformanceProgress = calculatePerformanceProgress(
      performanceActivities
    )
    const previousPerformanceProgress = performanceActivity.performance.progress

    // Update the related performance progress value
    const updatedPerformance = await updatePerformance(
      performanceActivity.performance.id,
      {
        progress: newPerformanceProgress
      }
    )

    responseData.updatedPerformance = updatedPerformance

    const clientUTC = getClientUTC(ctx)
    const currentDate = getCurrentDate(clientUTC)

    const performanceDate = getStartOfDay(updatedPerformance.date, clientUTC)

    const currentDayPerformanceHasDescFromCompleted =
      performanceDate.isSameOrAfter(currentDate) &&
      previousPerformanceProgress === 100 &&
      updatedPerformance.progress < 100

    // Performance date is before than current day
    // OR
    // If it is current day AND check if performance has changed from 100 to less OR updated progress performance is 100
    if (
      performanceDate.isBefore(currentDate) ||
      (performanceDate.isSameOrAfter(currentDate) &&
        (currentDayPerformanceHasDescFromCompleted ||
          updatedPerformance.progress === 100))
    ) {
      // Get the progress values of the all performances of the related goal and update the current goal progress value with the new average performance values
      const previousPerformances = performanceActivity.goal.performances

      const updatedPerformances = previousPerformances
        .map(performance => {
          if (performance.id === +performanceId) {
            performance.progress = newPerformanceProgress

            return performance
          }

          return performance
        })
        .filter(
          performance =>
            // Filter performances which is before than current date and isWorkingDay as true OR filter performance which is the current date and progress is 100
            (getStartOfDay(performance.date, clientUTC).isBefore(currentDate) &&
              performance.isWorkingDay) ||
            (getStartOfDay(performance.date, clientUTC).isSameOrAfter(
              currentDate
            ) &&
              performance.progress === 100)
        )

      // Update the related goal progress value
      await updateGoalProgress(
        performanceActivity.goal,
        updatedPerformances,
        responseData
      )
    }

    ctx.body = { ...updatedPerformanceActivity, ...responseData }
  }
}))
