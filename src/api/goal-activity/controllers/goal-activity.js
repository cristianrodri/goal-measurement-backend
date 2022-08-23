'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { deleteRequestBodyProperties, trimmedObj } = require('@utils/utils')

const populate = {
  goal: {
    fields: ['id']
  }
}

const GOAL_ACTIVITY_API_NAME = ''
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

    if (!goal) {
      return ctx.notFound('Goal id not found')
    }

    const { data } = ctx.request.body

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

        return entity
      })
    )

    ctx.body = await this.sanitizeOutput(entities, ctx)
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
