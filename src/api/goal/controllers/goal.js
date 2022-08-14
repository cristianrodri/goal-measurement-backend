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
  }
}))
