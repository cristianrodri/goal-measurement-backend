'use strict'

/**
 *  goal controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj
} = require('@utils/utils')

const goalNotFound = ctx => {
  ctx.notFound('Goal not found with this related user')
}

const findUserGoal = async (strapi, ctx, populateGoalActivities = false) => {
  const entities = await strapi.entityService.findMany('api::goal.goal', {
    filters: {
      id: ctx.params.id,
      user: ctx.state.user
    },
    populate: {
      goal_activities: populateGoalActivities
    }
  })

  return entities[0]
}

module.exports = createCoreController('api::goal.goal', ({ strapi }) => ({
  async create(ctx) {
    const goalActivities = ctx.request.body.goalActivities

    delete ctx.request.body.goalActivities

    const goal = await strapi.entityService.create('api::goal.goal', {
      data: {
        ...trimmedObj(ctx.request.body),
        user: ctx.state.user
      }
    })

    const goalActivitiesEntities = await Promise.all(
      goalActivities.map(async goalActivity => {
        // Clean up unnecessary properties
        deleteRequestBodyProperties(goalActivity)

        goalActivity.user = ctx.state.user
        goalActivity.goal = goal
        const entity = await strapi.entityService.create(
          'api::goal-activity.goal-activity',
          {
            data: {
              ...trimmedObj(goalActivity)
            }
          }
        )

        delete entity.createdAt
        delete entity.updatedAt

        return entity
      })
    )

    const sanitizedGoal = await this.sanitizeOutput(goal, ctx)

    ctx.body = { ...sanitizedGoal, goalActivities: goalActivitiesEntities }
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
    const goal = await findUserGoal(strapi, ctx, true)

    if (!goal) {
      return goalNotFound(ctx)
    }

    const sanitizedEntity = await this.sanitizeOutput(goal, ctx)

    return sanitizedEntity
  },
  async update(ctx) {
    const { id } = ctx.params
    const { deadline } = trimmedObj(ctx.request.body)
    const goal = await findUserGoal(strapi, ctx)

    if (!goal) {
      return goalNotFound(ctx)
    }

    // Avoid updating the timestamps and related collections data
    avoidUpdatingSchema(ctx)

    if (deadline && new Date(deadline).getTime() < new Date().getTime()) {
      return ctx.badRequest(
        'Your deadline should be greater than the current date'
      )
    }

    const entity = await strapi.entityService.update('api::goal.goal', id, {
      data: {
        ...trimmedObj(ctx.request.body)
      }
    })

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx)

    return sanitizedEntity
  },
  async delete(ctx) {
    const { id } = ctx.params
    const goal = await findUserGoal(strapi, ctx, true)

    if (!goal) {
      return goalNotFound(ctx)
    }

    const entity = await strapi.entityService.delete('api::goal.goal', id)

    const sanitizedEntity = await this.sanitizeOutput(entity, ctx)

    return sanitizedEntity
  }
}))
