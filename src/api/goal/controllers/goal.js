'use strict'

/**
 *  goal controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj,
  calculateGoalProgress
} = require('@utils/utils')
const {
  createGoal,
  findManyGoals,
  findUserGoal,
  updateGoal
} = require('@utils/goal')
const { GOAL_API_NAME } = require('@utils/api_names')
const { getClientUTC, getCurrentDate, getStartOfDay } = require('@utils/date')
const { findUserPerformances } = require('@utils/performance')
const { createGoalActivity } = require('@utils/goal_activity')
const {
  createManyPerformances,
  createPerformance,
  getLastPerformance
} = require('@utils/performance')

const deadlineErrorMessage =
  'Your deadline should be greater than the current time'

const goalNotFound = ctx => {
  return ctx.notFound('Goal not found')
}

// Verify if the deadline is before than the current time
const hasIncorrectDeadline = deadline =>
  deadline && new Date(deadline).getTime() < new Date().getTime()

module.exports = createCoreController(GOAL_API_NAME, () => ({
  async create(ctx) {
    avoidUpdatingSchema(ctx)
    const { goalActivities: goalActivitiesBody, deadline } = ctx.request.body

    const goalActivities = goalActivitiesBody

    delete ctx.request.body.goalActivities

    if (hasIncorrectDeadline(deadline)) {
      return ctx.badRequest(deadlineErrorMessage)
    }

    const goal = await createGoal(ctx)

    const goalActivitiesEntities = await Promise.all(
      goalActivities.map(async goalActivity => {
        // Clean up unnecessary properties
        deleteRequestBodyProperties(goalActivity)

        const entity = await createGoalActivity(ctx, goal, goalActivity)

        return entity
      })
    )

    goal.goal_activities = goalActivitiesEntities

    // Create one performance after the goal is created
    await createPerformance(ctx, goal, goal.createdAt)

    ctx.body = await this.sanitizeOutput(goal, ctx)
  },
  async find(ctx) {
    const entities = await findManyGoals(ctx)

    const sanitizedEntity = await this.sanitizeOutput(entities, ctx)

    return sanitizedEntity
  },
  async findOne(ctx) {
    const goal = await findUserGoal(ctx, {
      goal_activities: true
    })

    if (!goal) {
      return goalNotFound(ctx)
    }

    const sanitizedEntity = await this.sanitizeOutput(goal, ctx)

    return sanitizedEntity
  },
  async update(ctx) {
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }

    const { deadline } = ctx.request.body.data
    const goal = await findUserGoal(ctx)

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

    const clientUTC = getClientUTC(ctx)
    const previousDateline = getStartOfDay(goal.deadline, clientUTC)
    const currentDate = getCurrentDate(clientUTC)
    const newDeadline = getStartOfDay(attributes.deadline, clientUTC)

    // Create performances if the previous goal deadline was before than current day and check if the deadline has been updated
    if (
      currentDate.isAfter(previousDateline) &&
      currentDate.isSameOrBefore(newDeadline)
    ) {
      const lastPerformance = await getLastPerformance(ctx, id)

      const lastPerformanceDate = getStartOfDay(
        lastPerformance[0].date,
        clientUTC
      )

      // Create performances from the last performance date + 1 until current day. If the created performance date is greater or equal than previous deadline, isWorkingDay is automatically false and none performance activities will be created because those dates was not planned by the user.
      await createManyPerformances(
        ctx,
        goal,
        lastPerformanceDate,
        previousDateline
      )

      const allPerformances = await findUserPerformances(ctx, goal)

      // isWorkingDay AND is before than current day
      // OR
      // is current day AND progress is 100
      const filteredPerformances = allPerformances.filter(
        performance =>
          (performance.isWorkingDay &&
            getStartOfDay(performance.date, clientUTC).isBefore(currentDate)) ||
          (getStartOfDay(performance.date, clientUTC).isSameOrAfter(
            currentDate
          ) &&
            performance.progress === 100)
      )

      const updatedGoal = await updateGoal(id, {
        progress: calculateGoalProgress(filteredPerformances)
      })

      attributes.progress = updatedGoal.progress
    }

    ctx.body = { id, ...attributes }
  },
  async delete(ctx) {
    const goal = await findUserGoal(ctx)

    if (!goal) {
      return goalNotFound(ctx)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    ctx.body = { id, ...attributes }
  }
}))
