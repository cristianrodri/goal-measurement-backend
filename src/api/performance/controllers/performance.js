'use strict'

/**
 *  performance controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const moment = require('moment')
const { createPerformance, getPerformances } = require('@utils/api')

module.exports = createCoreController(
  'api::performance.performance',
  ({ strapi }) => ({
    async find(ctx) {
      // Check if the goal id is provided as a query parameter
      const { goalId, utc } = ctx.query
      const UTC = +utc

      if (!goalId) {
        return ctx.badRequest('goalId must be provided')
      }

      // Get all performances related to the goal id
      const performances = await getPerformances(strapi, ctx, goalId)

      // Get the related goal
      const relatedGoal = await strapi.entityService.findOne(
        'api::goal.goal',
        goalId,
        {
          populate: {
            goal_activities: true
          }
        }
      )

      if (!relatedGoal) {
        return ctx.badRequest('Related goal not found')
      }

      const deadline = moment(relatedGoal.deadline)
        .utcOffset(UTC)
        .startOf('day')
      const currentDay = moment().utcOffset(UTC).startOf('day')

      // If the current day is greater than the related goal's deadline, just return the performances
      if (currentDay.isAfter(deadline)) {
        return performances
      }

      // If the performances length is zero, then create performances from the created date of the related goal until the current day
      if (performances.length === 0) {
        const createdGoalDate = moment(relatedGoal.createdAt)
          .utcOffset(UTC)
          .startOf('day')

        // Create the performance in the same day of the goal creation
        const firstPerformance = await createPerformance(
          strapi,
          ctx,
          relatedGoal,
          createdGoalDate
        )

        // Add the performance to the performances array
        performances.push(firstPerformance)

        // If the days diffence between the current day and the goal's created date is greater than 0, then add the performances related to the remaining days
        const daysDiff = currentDay.diff(createdGoalDate, 'days')

        const entities = await Promise.all(
          Array.from({ length: daysDiff }).map(async () => {
            createdGoalDate.add(1, 'days')
            const performanceEntities = await createPerformance(
              strapi,
              ctx,
              relatedGoal,
              createdGoalDate
            )

            return performanceEntities
          })
        )

        return performances.concat(entities)
      }

      // Check if the last performance date belongs to the current day. If that's not true, then create performances relying on the remaining days between the last performance date and the current day

      ctx.body = {
        performances
      }
    }
  })
)
