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

const findUserGoalActivities = async (strapi, ctx) => {
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

  return entities
}

module.exports = createCoreController(
  'api::goal-activity.goal-activity',
  ({ strapi }) => ({
    async create(ctx) {
      avoidUpdatingSchema(ctx)
      const trimmedRequestBody = trimmedObj(ctx.request.body)

      const userGoal = await strapi.entityService.findMany('api::goal.goal', {
        filters: {
          id: trimmedRequestBody?.goal ?? null,
          user: ctx.state.user
        }
      })

      if (userGoal.length === 0) {
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
    async update(ctx) {
      deleteRequestBodyProperties(ctx.request.body)
      ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }

      const userGoalActivities = await findUserGoalActivities(strapi, ctx)

      if (!userGoalActivities[0]) {
        return ctx.badRequest('Goal activity id not found')
      }

      const entity = await super.update(ctx)

      ctx.body = entity
    },
    async findOne(ctx) {
      const userGoalActivities = await findUserGoalActivities(strapi, ctx)

      if (!userGoalActivities[0]) {
        return ctx.badRequest('Goal activity id not found')
      }

      ctx.body = await this.sanitizeOutput(userGoalActivities[0], ctx)
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
    }
  })
)
