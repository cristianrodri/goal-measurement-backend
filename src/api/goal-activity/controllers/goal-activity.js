'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { deleteRequestBodyProperties, trimmedObj } = require('@utils/utils')
const {
  calculatePerformanceProgress,
  calculateGoalProgress
} = require('@utils/utils')
const { getCurrentDay, isLastPerformanceTheCurrentDay } = require('@utils/date')
const { updatePerformance } = require('@utils/performance')
const { updateGoal } = require('@utils/goal')
const {
  createPerformanceActivity,
  deletePerformanceActivity,
  updatePerformanceActivity
} = require('@utils/performance-activity')

const populate = {
  goal: {
    fields: ['id'],
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

const GOAL_ACTIVITY_API_NAME = 'api::goal-activity.goal-activity'
const notFoundMessage = 'Goal activity not found'

const findUserGoalActivity = async (strapi, ctx) => {
  const entities = await strapi.entityService.findMany(GOAL_ACTIVITY_API_NAME, {
    filters: {
      id: ctx.params?.id ?? null,
      user: ctx.state.user
    },

    populate
  })

  return entities[0]
}

const userGoal = async (strapi, ctx) => {
  const entities = await strapi.entityService.findMany('api::goal.goal', {
    filters: {
      id: ctx.request.body?.goal ?? null,
      user: ctx.state.user
    },
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
  })

  return entities[0]
}

const updatePerformanceProgress = async (
  strapi,
  lastPerformance,
  newProgressPerformance,
  responseData
) => {
  // If the previous performance progress is different thant the new one, update the performance progress
  if (lastPerformance.progress !== newProgressPerformance) {
    const updatedPerformance = await updatePerformance(
      strapi,
      lastPerformance.id,
      {
        progress: newProgressPerformance
      }
    )

    responseData.updatedPerformance = updatedPerformance
  }
}

const updateGoalProgress = async (strapi, goal, performances, responseData) => {
  const newGoalProgress = calculateGoalProgress(
    performances.filter(performance => performance.isWorkingDay)
  )

  const updatedGoal = await updateGoal(strapi, goal.id, {
    progress: newGoalProgress
  })

  responseData.updatedGoal = updatedGoal
}

const findPerformanceActivityDescription = (performance, description) =>
  performance.performance_activities.find(
    perfActivity => perfActivity.description === description
  )

module.exports = createCoreController(GOAL_ACTIVITY_API_NAME, ({ strapi }) => ({
  async create(ctx) {
    const goal = await userGoal(strapi, ctx)
    const clientUTC = +ctx.query?.utc

    if (!goal) {
      return ctx.notFound('Goal id not found')
    }

    const { data } = ctx.request.body

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

        // Add the relation with the authenticated user
        goalActivity.user = ctx.state.user
        goalActivity.goal = goal

        const entity = await strapi.entityService.create(
          GOAL_ACTIVITY_API_NAME,
          {
            data: {
              ...trimmedObj(goalActivity)
            }
          }
        )

        // If the created goal activity has true in current day, create a new performance activity, so long as the last performance is current day
        if (entity[currentDay] === true && isLastPerformanceCurrentDay) {
          // Create a new performance activity with the same description. Add the related goal, performance and user
          const performanceActivity = await createPerformanceActivity(
            strapi,
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

    // If new performance activities have been created, the progress value of the last performance must be updated, so long as the previous progress value was greater than 0
    if (lastPerformance.progress > 0 && isLastPerformanceCurrentDay) {
      const allPerformanceActivities =
        lastPerformance.performance_activities.concat(performanceActivities)

      const newProgressPerformance = calculatePerformanceProgress(
        allPerformanceActivities
      )

      // Update the last performance progress value
      const updatedPerformance = await updatePerformance(
        strapi,
        lastPerformance.id,
        {
          isWorkingDay: true,
          progress: newProgressPerformance
        }
      )

      responseData.updatedPerformance = updatedPerformance

      // If the previous last performance progress is 100, calculate again the performance progress without the current date performance and update the goal progress value.
      if (lastPerformance.progress === 100) {
        const previousPerformances = goal.performances.slice(1)

        await updateGoalProgress(
          strapi,
          goal,
          previousPerformances,
          responseData
        )
      }
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
        },
        populate
      }
    )

    ctx.body = await this.sanitizeOutput(entities, ctx)
  },
  async findOne(ctx) {
    const userGoalActivity = await findUserGoalActivity(strapi, ctx)

    if (!userGoalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    ctx.body = await this.sanitizeOutput(userGoalActivity, ctx)
  },
  async update(ctx) {
    deleteRequestBodyProperties(ctx.request.body)
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }
    const clientUTC = +ctx.query?.utc

    const userGoalActivity = await findUserGoalActivity(strapi, ctx)

    if (!userGoalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.update(ctx)

    const previousPerformances = userGoalActivity.goal.performances
    const lastPerformance = previousPerformances[0]

    const performanceActivityWithSameDescription =
      findPerformanceActivityDescription(
        lastPerformance,
        userGoalActivity.description
      )

    // If the last performance is NOT the current day OR the performance activity with the same description is not found, just return the updated goal activity
    if (!isLastPerformanceTheCurrentDay(lastPerformance, clientUTC)) {
      return { id, ...attributes }
    }

    const currentDay = getCurrentDay(clientUTC)

    const responseData = {}
    const hasChangedFromTrueToFalse =
      userGoalActivity[currentDay] === true && attributes[currentDay] === false
    const hasChangedFromFalseToTrue =
      userGoalActivity[currentDay] === false && attributes[currentDay] === true
    const previousPerformanceActivitiesLength =
      lastPerformance.performance_activities.length

    // If the previous "current day" attribute is the same as the updated one (monday: true === monday: true), just update the performance activity description if it's provided by the body request and check if some of the current day performance activities has the same description update the performance activity
    if (
      userGoalActivity[currentDay] === attributes[currentDay] &&
      ctx.request.body.data?.description
    ) {
      const updatedPerformanceActivity = await updatePerformanceActivity(
        strapi,
        performanceActivityWithSameDescription,
        {
          description: attributes.description
        }
      )

      responseData.updatedPerformanceActivity = updatedPerformanceActivity
    }

    if (hasChangedFromTrueToFalse && performanceActivityWithSameDescription) {
      await deletePerformanceActivity(
        strapi,
        performanceActivityWithSameDescription,
        userGoalActivity.goal,
        responseData
      )
    }

    if (hasChangedFromFalseToTrue) {
      // Create a new performance activity with the same description of the updated goal activity
      const newPerformanceActivity = await createPerformanceActivity(
        strapi,
        ctx,
        attributes.description,
        userGoalActivity.goal,
        lastPerformance
      )

      responseData.newPerformanceActivity = newPerformanceActivity
      // Add the created PerformanceActivity to the arrays of the performance activities related to the last performance
      lastPerformance.performance_activities.push(newPerformanceActivity)

      // New performance progress after a performance activity is created
      const newProgressPerformance = calculatePerformanceProgress(
        lastPerformance.performance_activities
      )

      // If the previous performance_activities is 0, update isWorkingDay to false and progress to 0
      if (previousPerformanceActivitiesLength === 0) {
        const updatedPerformance = await updatePerformance(
          strapi,
          lastPerformance.id,
          {
            isWorkingDay: true,
            progress: 0
          }
        )

        responseData.updatedPerformance = updatedPerformance
      }

      // If the previous performance_activities is greater than 0, update the performance progress (ONLY if it's has been changed)
      await updatePerformanceProgress(
        strapi,
        lastPerformance,
        newProgressPerformance,
        responseData
      )

      // Update the goal progress if the previous performance progress is 100, update the goal progress without counting the udpated performance.
      if (lastPerformance === 100) {
        await updateGoalProgress(
          strapi,
          userGoalActivity.goal,
          previousPerformances.slice(1),
          responseData
        )
      }
    }

    ctx.body = { id, ...attributes, ...responseData }
  },
  async delete(ctx) {
    const clientUTC = +ctx.query?.utc
    const userGoalActivity = await findUserGoalActivity(strapi, ctx)

    if (!userGoalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    const responseData = {}
    const performances = userGoalActivity.goal.performances
    const lastPerformance = performances[0]

    const performanceActivityWithSameDescription =
      findPerformanceActivityDescription(
        lastPerformance,
        userGoalActivity.description
      )

    // If the last performance belongs to the current date AND the description of the deleted goal activity matches with some of the perfomances activities
    if (
      isLastPerformanceTheCurrentDay(lastPerformance, clientUTC) &&
      performanceActivityWithSameDescription
    ) {
      await deletePerformanceActivity(
        strapi,
        performanceActivityWithSameDescription,
        userGoalActivity.goal,
        responseData
      )
    }
    ctx.body = { id, ...attributes, responseData }
  }
}))
