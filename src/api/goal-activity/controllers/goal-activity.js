'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj
} = require('@utils/utils')

const populate = {
  goal: {
    fields: ['id']
  }
}

const notFoundMessage = 'Goal activity not found'

const findUserGoalActivity = async (strapi, ctx) => {
  const entities = await strapi.entityService.findMany(
    'api::goal-activity.goal-activity',
    {
      filters: {
        id: ctx.params?.id ?? null,
        user: ctx.state.user
      },
      populate
    }
  )

  return entities[0]
}

const userGoal = async (strapi, ctx, requestBody) => {
  const entities = await strapi.entityService.findMany('api::goal.goal', {
    filters: {
      id: requestBody?.goal ?? null,
      user: ctx.state.user
    }
  })

  return entities[0]
}

module.exports = createCoreController(
  'api::goal-activity.goal-activity',
  ({ strapi }) => ({
    async create(ctx) {
      avoidUpdatingSchema(ctx)
      const trimmedRequestBody = trimmedObj(ctx.request.body)

      const goal = await userGoal(strapi, ctx, trimmedRequestBody)

      if (!goal) {
        return ctx.notFound('Goal id not found')
      }

      // Add the relation with the authenticated user
      trimmedRequestBody.user = ctx.state.user
      const entity = await strapi.entityService.create(
        'api::goal-activity.goal-activity',
        {
          data: {
            ...trimmedRequestBody
          }
        }
      )

      ctx.body = await this.sanitizeOutput(entity, ctx)
    },
    async find(ctx) {
      const entities = await strapi.entityService.findMany(
        'api::goal-activity.goal-activity',
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

      const entity = await super.update(ctx)

      ctx.body = entity
    },
    async delete(ctx) {
      const userGoalActivity = await findUserGoalActivity(strapi, ctx)

      if (!userGoalActivity) {
        return ctx.notFound(notFoundMessage)
      }

      const entity = await super.delete(ctx)

      ctx.body = entity
    }
  })
)
