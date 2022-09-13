'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { deleteRequestBodyProperties, trimmedObj } = require('@utils/utils')
const { getCurrentDay, isLastPerformanceTheCurrentDay } = require('@utils/date')
const { updatePerformanceProgress } = require('@utils/performance')
const { findOneGoal } = require('@utils/goal')
const {
  createPerformanceActivity,
  deletePerformanceActivity,
  updatePerformanceActivity
} = require('@utils/performance-activity')
const { createGoalActivity, findGoalActivity } = require('@utils/goal_activity')
const { GOAL_ACTIVITY_API_NAME } = require('@utils/api_names')
const { getClientUTC } = require('../../../utils/date')

const populateFindGoalActivity = {
  goal: {
    populate: {
      performances: {
        sort: {
          date: 'desc'
        },
        populate: {
          performance_activities: true
        }
      }
    }
  }
}

const notFoundMessage = 'Goal activity not found'

const findPerformanceActivityDescription = (performance, description) =>
  performance.performance_activities.find(
    perfActivity => perfActivity.description === description
  )

module.exports = createCoreController(GOAL_ACTIVITY_API_NAME, ({ strapi }) => ({
  async create(ctx) {
    const goal = await findOneGoal(ctx.request.body?.goal ?? null, ctx, {
      performances: {
        sort: {
          date: 'desc'
        },
        populate: {
          performance_activities: true
        }
      }
    })

    if (!goal) {
      return ctx.notFound('Goal id not found')
    }

    const { data } = ctx.request.body
    const clientUTC = getClientUTC(ctx)

    const lastPerformance = goal.performances[0]
    const currentDay = getCurrentDay(clientUTC)
    const isLastPerformanceCurrentDay = isLastPerformanceTheCurrentDay(
      lastPerformance,
      clientUTC
    )
    const performanceActivities = []
    const responseData = {}

    const entities = await Promise.all(
      data.map(async goalActivity => {
        deleteRequestBodyProperties(goalActivity)

        const entity = await createGoalActivity(ctx, goal, goalActivity)

        // If the created goal activity has true in current day, create a new performance activity, so long as the last performance is current day
        if (entity[currentDay] === true && isLastPerformanceCurrentDay) {
          // Create a new performance activity with the same description. Add the related goal, performance and user
          const performanceActivity = await createPerformanceActivity(
            ctx,
            entity.description,
            goal,
            lastPerformance
          )

          performanceActivities.push(performanceActivity)
        }

        return entity
      })
    )

    responseData.performanceActivities = performanceActivities

    // If new performance activities have been created, the progress value of the last performance should be updated
    if (performanceActivities.length > 0) {
      await updatePerformanceProgress(
        lastPerformance,
        performanceActivities,
        goal,
        responseData
      )
    }

    ctx.body = {
      goalActivities: await this.sanitizeOutput(entities, ctx),
      ...responseData
    }
  },
  async find(ctx) {
    const entities = await strapi.entityService.findMany(
      GOAL_ACTIVITY_API_NAME,
      {
        filters: {
          user: ctx.state.user
        }
      }
    )

    ctx.body = await this.sanitizeOutput(entities, ctx)
  },
  async findOne(ctx) {
    const goalActivity = await findGoalActivity(ctx)

    if (!goalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    ctx.body = await this.sanitizeOutput(goalActivity, ctx)
  },
  async update(ctx) {
    deleteRequestBodyProperties(ctx.request.body)
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }
    const clientUTC = +ctx.query?.utc

    const goalActivity = await findGoalActivity(ctx, populateFindGoalActivity)

    if (!goalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.update(ctx)

    const previousPerformances = goalActivity.goal.performances
    const lastPerformance = previousPerformances[0]

    const performanceActivityWithSameDescription =
      findPerformanceActivityDescription(
        lastPerformance,
        goalActivity.description
      )

    // If the last performance is NOT the current day OR the performance activity with the same description is not found, just return the updated goal activity
    if (!isLastPerformanceTheCurrentDay(lastPerformance, clientUTC)) {
      return { id, ...attributes }
    }

    const currentDay = getCurrentDay(clientUTC)

    const responseData = {}
    const hasChangedFromTrueToFalse =
      goalActivity[currentDay] === true && attributes[currentDay] === false
    const hasChangedFromFalseToTrue =
      goalActivity[currentDay] === false && attributes[currentDay] === true

    // If the previous "current day" attribute is the same as the updated one (monday: true === monday: true), just update the performance activity description if it's provided by the body request and check if some of the current day performance activities has the same description update the performance activity
    if (
      goalActivity[currentDay] === attributes[currentDay] &&
      ctx.request.body.data?.description
    ) {
      const updatedPerformanceActivity = await updatePerformanceActivity(
        performanceActivityWithSameDescription,
        {
          description: attributes.description
        }
      )

      responseData.updatedPerformanceActivity = updatedPerformanceActivity
    }

    if (hasChangedFromTrueToFalse && performanceActivityWithSameDescription) {
      await deletePerformanceActivity(
        performanceActivityWithSameDescription,
        goalActivity.goal,
        responseData
      )
    }

    if (hasChangedFromFalseToTrue) {
      // Create a new performance activity with the same description of the updated goal activity
      const newPerformanceActivity = await createPerformanceActivity(
        ctx,
        attributes.description,
        goalActivity.goal,
        lastPerformance
      )

      responseData.newPerformanceActivity = newPerformanceActivity
      await updatePerformanceProgress(
        lastPerformance,
        newPerformanceActivity,
        goalActivity.goal,
        responseData
      )
    }

    ctx.body = { id, ...attributes, ...responseData }
  },
  async delete(ctx) {
    const clientUTC = +ctx.query?.utc
    const goalActivity = await findGoalActivity(ctx, populateFindGoalActivity)

    if (!goalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    const responseData = {}
    const performances = goalActivity.goal.performances
    const lastPerformance = performances[0]

    const performanceActivityWithSameDescription =
      findPerformanceActivityDescription(
        lastPerformance,
        goalActivity.description
      )

    // If the last performance belongs to the current date AND the description of the deleted goal activity matches with some of the perfomances activities
    if (
      isLastPerformanceTheCurrentDay(lastPerformance, clientUTC) &&
      performanceActivityWithSameDescription
    ) {
      await deletePerformanceActivity(
        performanceActivityWithSameDescription,
        goalActivity.goal,
        responseData
      )
    }
    ctx.body = { id, ...attributes, responseData }
  }
}))
