'use strict'

/**
 *  goal controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const moment = require('moment')
const {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj
} = require('@utils/utils')
const {
  createPerformance,
  getLastPerformance,
  createManyPerformances
} = require('@utils/api')

const GOAL_API_NAME = 'api::goal.goal'

const deadlineErrorMessage =
  'Your deadline should be greater than the current time'

const goalNotFound = ctx => {
  ctx.notFound('Goal not found')
}

const findUserGoal = async (strapi, ctx, populateGoalActivities = false) => {
  const entities = await strapi.entityService.findMany(GOAL_API_NAME, {
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

// Verify if the deadline is before than the current time
const hasIncorrectDeadline = deadline =>
  deadline && new Date(deadline).getTime() < new Date().getTime()

module.exports = createCoreController(GOAL_API_NAME, ({ strapi }) => ({
  async create(ctx) {
    avoidUpdatingSchema(ctx)
    const { goalActivities: goalActivitiesBody, deadline } = ctx.request.body

    const goalActivities = goalActivitiesBody

    delete ctx.request.body.goalActivities

    if (hasIncorrectDeadline(deadline)) {
      return ctx.badRequest(deadlineErrorMessage)
    }

    const goal = await strapi.entityService.create(GOAL_API_NAME, {
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

    // Create one performance after the goal is created
    await createPerformance(
      strapi,
      ctx,
      goal,
      moment(goal.createdAt)
        .utcOffset(+ctx.query?.utc)
        .startOf('day')
    )

    const sanitizedGoal = await this.sanitizeOutput(goal, ctx)

    ctx.body = { ...sanitizedGoal, goalActivities: goalActivitiesEntities }
  },
  async find(ctx) {
    const entities = await strapi.entityService.findMany(GOAL_API_NAME, {
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
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }

    const { deadline } = ctx.request.body.data
    const goal = await findUserGoal(strapi, ctx)

    if (!goal) {
      return goalNotFound(ctx)
    }

    // Avoid updating the timestamps and related collections data
    avoidUpdatingSchema(ctx)

    if (hasIncorrectDeadline(deadline)) {
      return ctx.badRequest(deadlineErrorMessage)
    }

    const {
      data: { id, attributes }
    } = await super.update(ctx)

    const UTC = +ctx.query?.utc
    const previousDateline = moment(goal.deadline).utcOffset(UTC).startOf('day')
    const currentDay = moment().utcOffset(UTC).startOf('day')
    const newDeadline = moment(attributes.deadline)
      .utcOffset(UTC)
      .startOf('day')

    // Create performances if the previous goal deadline was before than current day and check if the deadline has been updated
    if (
      currentDay.isAfter(previousDateline) &&
      currentDay.isSameOrBefore(newDeadline)
    ) {
      const lastPerformance = await getLastPerformance(strapi)

      const lastPerformanceDate = moment(lastPerformance[0].date)
        .utcOffset(UTC)
        .startOf('day')

      // Create performances from the last performance date + 1 until current day. If the created performance date is greater or equal than previous deadline, isWorkingDay is automatically false and none performance activities will be created because those dates was not planned by the user.
      await createManyPerformances(
        strapi,
        ctx,
        goal,
        currentDay,
        lastPerformanceDate,
        previousDateline
      )

      const allPerformances = await strapi.entityService.findMany(
        'api::performance.performance',
        {
          filters: {
            goal: id,
            user: ctx.state.user
          }
        }
      )

      // isWorkingDay AND is before than current day
      // OR
      // is current day AND progress is 100
      const filteredPerformances = allPerformances.filter(
        performance =>
          (performance.isWorkingDay &&
            moment(performance.date)
              .utcOffset(UTC)
              .startOf('day')
              .isBefore(currentDay)) ||
          (moment(performance.date)
            .utcOffset(UTC)
            .startOf('day')
            .isSameOrAfter(currentDay) &&
            performance.progress === 100)
      )

      const newGoalProgress =
        filteredPerformances.reduce((prev, cur) => prev + cur.progress, 0) /
        filteredPerformances.length

      const updatedGoal = await strapi.entityService.update(GOAL_API_NAME, id, {
        data: {
          progress: Math.round(newGoalProgress)
        }
      })

      attributes.progress = updatedGoal.progress
    }

    ctx.body = { id, ...attributes }
  },
  async delete(ctx) {
    const goal = await findUserGoal(strapi, ctx)

    if (!goal) {
      return goalNotFound(ctx)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    ctx.body = { id, ...attributes }
  }
}))
