'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const moment = require('moment')
const { deleteRequestBodyProperties, trimmedObj } = require('@utils/utils')
const { getLastPerformance } = require('@utils/api')

const populate = {
  goal: {
    fields: ['id']
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
    }
  })

  return entities[0]
}

module.exports = createCoreController(GOAL_ACTIVITY_API_NAME, ({ strapi }) => ({
  async create(ctx) {
    const goal = await userGoal(strapi, ctx)
    const UTC = +ctx.query?.utc

    if (!goal) {
      return ctx.notFound('Goal id not found')
    }

    const { data } = ctx.request.body

    const lastPerformance = await getLastPerformance(strapi, ctx, goal.id)
    const currentDate = moment().utcOffset(UTC).startOf('day')
    const currentDay = moment(currentDate).format('dddd').toLowerCase()
    const lastPerformanceDate = moment(lastPerformance?.date)
      .utcOffset(UTC)
      .startOf('day')
    const performanceActivities = []

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
        if (
          entity[currentDay] &&
          lastPerformanceDate.isSameOrAfter(currentDate)
        ) {
          // Create a new performance activity with the same description. Add the related goal, performance and user
          const performanceActivity = await strapi.entityService.create(
            'api::performance-activity.performance-activity',
            {
              data: {
                description: entity.description,
                goal: goal.id,
                performance: lastPerformance.id,
                user: ctx.state.user
              },
              fields: ['id', 'description', 'done']
            }
          )

          performanceActivities.push(performanceActivity)
        }

        return entity
      })
    )

    // If new performance activities have been created, the progress value of the last performance must be updated
    if (performanceActivities.length > 0) {
      const allPerformanceActivities =
        lastPerformance.performance_activities.concat(performanceActivities)

      const newProgressPerformance =
        (allPerformanceActivities.filter(performance => performance.done)
          .length /
          allPerformanceActivities.length) *
        100

      // Update the last performance progress value
      const updatedLastPerformance = await strapi.entityService.update(
        'api::performance.performance',
        lastPerformance.id,
        {
          data: {
            progress: Math.round(newProgressPerformance)
          },
          fields: ['id', 'progress']
        }
      )

      // If the previous last performance progress is 100, calculate again the performance progress and update the goal progress value.
      if (lastPerformance.progress === 100) {
        const previousLastPerformances = lastPerformance.goal.performances
          .slice(0, -1)
          .filter(performance => performance.isWorkingDay)

        const newProgressGoal =
          previousLastPerformances.reduce(
            (prev, cur) => prev + cur.progress,
            0
          ) / previousLastPerformances.length

        const updatedGoal = await strapi.entityService.update(
          'api::goal.goal',
          goal.id,
          {
            data: {
              progress: Math.round(newProgressGoal)
            },
            fields: ['id', 'progress']
          }
        )

        return {
          goalActivities: await this.sanitizeOutput(entities, ctx),
          performanceActivities,
          performance: updatedLastPerformance,
          goal: updatedGoal
        }
      }
    }

    ctx.body = { goalActivities: await this.sanitizeOutput(entities, ctx) }
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

    const userGoalActivity = await findUserGoalActivity(strapi, ctx)

    if (!userGoalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.update(ctx)

    ctx.body = { id, ...attributes }
  },
  async delete(ctx) {
    const userGoalActivity = await findUserGoalActivity(strapi, ctx)

    if (!userGoalActivity) {
      return ctx.notFound(notFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    ctx.body = { id, ...attributes }
  }
}))
