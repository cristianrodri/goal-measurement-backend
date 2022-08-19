'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { avoidUpdatingSchema } = require('@utils/utils')

const findUserGoal = async (strapi, ctx) => {
  const entities = await strapi.entityService.findMany(
    'api::goal-activity.goal-activity',
    {
      filters: {
        id: ctx.params.id,
        user: ctx.state.user
      }
    }
  )

  return entities[0]
}

module.exports = createCoreController(
  'api::goal-activity.goal-activity',
  ({ strapi }) => ({
    async create(ctx) {
      avoidUpdatingSchema(ctx)

      const userGoal = await strapi.entityService.findMany('api::goal.goal', {
        filters: {
          id: ctx.request.body?.goal ?? null,
          user: ctx.state.user
        }
      })

      if (userGoal.length === 0) {
        return ctx.notFound('Goal id not found')
      }

      // Add the relation with the authenticated user
      ctx.request.body.user = ctx.state.user
      const entity = await strapi.entityService.create(
        'api::goal-activity.goal-activity',
        {
          data: {
            ...ctx.request.body
          }
        }
      )

      ctx.body = await this.sanitizeOutput(entity, ctx)
    },
    async update(ctx) {
      avoidUpdatingSchema(ctx)
      delete ctx.request.body.data.goal

      const userGoal = await findUserGoal(strapi, ctx)

      if (!userGoal) {
        return ctx.badRequest('Goal id not found')
      }

      const entity = await super.update(ctx)

      ctx.body = entity
    }
  })
)
