'use strict'

/**
 *  goal-activity controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { avoidUpdatingSchema } = require('@utils/utils')

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
    }
  })
)
