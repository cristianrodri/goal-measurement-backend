'use strict'

/**
 *  goal controller
 */

const { createCoreController } = require('@strapi/strapi').factories

module.exports = createCoreController('api::goal.goal', ({ strapi }) => ({
  async create(ctx) {
    ctx.request.body = { ...ctx.request.body, user: ctx.state.user }
    const goalActivities = ctx.request.body.goalActivities

    delete ctx.request.body.goalActivities

    const goal = await strapi.entityService.create('api::goal.goal', {
      data: {
        ...ctx.request.body
      }
    })

    const goalActivitiesEntities = await Promise.all(
      goalActivities.map(async goalActivity => {
        goalActivity.user = ctx.state.user
        goalActivity.goal = goal
        const entity = await strapi.entityService.create(
          'api::goal-activity.goal-activity',
          {
            data: {
              ...goalActivity
            }
          }
        )
        return entity
      })
    )

    ctx.send({ ...goal, goalActivities: goalActivitiesEntities })
  },
  async find(ctx) {
    const entities = await strapi.entityService.findMany('api::goal.goal', {
      filters: {
        user: ctx.state.user
      },
      populate: {
        goal_activities: true
      }
    })

    const sanitizedEntity = await this.sanitizeOutput(entities, ctx)

    return sanitizedEntity
  },
  async findOne(ctx) {
    const { id } = ctx.params

    const entities = await strapi.entityService.findMany('api::goal.goal', {
      filters: {
        id,
        user: ctx.state.user
      },
      populate: {
        goal_activities: true
      }
    })

    if (entities.length === 0) {
      return ctx.notFound('Goal not found with this related user')
    }

    const sanitizedEntity = await this.sanitizeOutput(entities[0], ctx)

    return sanitizedEntity
  }
}))
