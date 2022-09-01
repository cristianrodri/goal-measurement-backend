'use strict'

/**
 *  performance-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const moment = require('moment')

const PERFORMANCE_ACTIVITY_API_NAME =
  'api::performance-activity.performance-activity'

module.exports = createCoreController(
  PERFORMANCE_ACTIVITY_API_NAME,
  ({ strapi }) => ({
    async update(ctx) {
      const { id } = ctx.params
      const { performanceId, goalId, done } = ctx.request.body

      const userPerformanceActivity = await strapi.entityService.findMany(
        PERFORMANCE_ACTIVITY_API_NAME,
        {
          filters: {
            id,
            user: ctx.state.user,
            performance: +performanceId,
            goal: +goalId
          },
          populate: {
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
        }
      )

      if (!userPerformanceActivity[0]) {
        return ctx.notFound('Performance activity not found')
      }

      // Update current performance activity
      const updatedPerformanceActivity = await strapi.entityService.update(
        PERFORMANCE_ACTIVITY_API_NAME,
        id,
        {
          data: {
            done
          }
        }
      )

      // Get the done values of the all performance activities of the related performance and update the current performance activity id with the new "done" value
      const performanceActivities =
        userPerformanceActivity[0].performance.performance_activities.map(
          perfActivity => {
            if (perfActivity.id === +id) {
              perfActivity.done = done

              return perfActivity.done
            }

            return perfActivity.done
          }
        )

      const donePerformancesActivities = performanceActivities.filter(Boolean)
      const newPerformanceProgress = Math.round(
        (donePerformancesActivities.length / performanceActivities.length) * 100
      )

      // Update the related performance progress value
      const updatedPerformance = await strapi.entityService.update(
        'api::performance.performance',
        performanceId,
        {
          data: {
            progress: newPerformanceProgress
          }
        }
      )

      const UTC = +ctx.query?.utc
      const currentDay = moment().utcOffset(UTC).startOf('day')

      const previousPerformanceProgress =
        userPerformanceActivity[0].performance.progress
      const updatedPerformanceDate = moment(updatedPerformance.date)
        .utcOffset(UTC)
        .startOf('day')

      const performanceProgressHasChanged =
        previousPerformanceProgress !== updatedPerformance.progress

      const currentDayPerformanceHasDescFromCompleted =
        updatedPerformanceDate.isSameOrAfter(currentDay) &&
        previousPerformanceProgress === 100 &&
        updatedPerformance.progress < 100

      // Performance is before than current day AND Performance progress has changed
      // OR
      // If it is current day AND check if performance has changed from 100 to less OR update progress performance is 100
      if (
        (moment(performance.date)
          .utcOffset(UTC)
          .startOf('day')
          .isBefore(currentDay) &&
          performanceProgressHasChanged) ||
        (moment(performance.date)
          .utcOffset(UTC)
          .startOf('day')
          .isSameOrAfter(currentDay) &&
          (currentDayPerformanceHasDescFromCompleted ||
            updatedPerformance.progress === 100))
      ) {
        // Get the progress values of the all performances of the related goal and update the current goal progress value with the new average performance values
        const previousPerformances =
          userPerformanceActivity[0].goal.performances

        const performancesProgress = previousPerformances
          .filter(
            performance =>
              /* AVOID UPDATING GOAL PROGRESS IF THE PERFORMANCE IS THE CURRENT DAY, IS NOT WORKING DAY OR PROGRESS IS LESS THAN 100 */
              // Also, if previous progress performance was 100, is current day, and the updating is less than 100, then the updated progress goal must not count the current day performance
              (moment(performance.date)
                .utcOffset(UTC)
                .startOf('day')
                .isBefore(currentDay) &&
                performance.isWorkingDay) ||
              updatedPerformance.progress === 100 ||
              !currentDayPerformanceHasDescFromCompleted
          )
          .map(performance => {
            if (performance.id === +performanceId) {
              performance.progress = newPerformanceProgress

              return performance.progress
            }

            return performance.progress
          })

        const isWorkingDayPerformances =
          userPerformanceActivity[0].goal.performances.filter(
            performance => performance.isWorkingDay
          )

        // Sum all performances progress and divide it by all performance which has isWorkingDay as true
        const newGoalProgress = Math.round(
          performancesProgress.reduce((prev, curr) => prev + curr, 0) /
            isWorkingDayPerformances.length
        )

        // Update the related goal progress value
        await strapi.entityService.update('api::goal.goal', goalId, {
          data: {
            progress: newGoalProgress
          }
        })
      }

      ctx.body = updatedPerformanceActivity
    }
  })
)
