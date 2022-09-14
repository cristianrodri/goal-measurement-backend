const {
  calculatePerformanceProgress,
  calculateGoalProgress
} = require('@utils/utils')
const { updateGoal } = require('@utils/goal')
const { updatePerformance } = require('./api')

const PERFORMANCE_ACTIVITY_API_NAME =
  'api::performance-activity.performance-activity'

const FIELDS = ['id', 'description', 'done']

// Create Performance Activity
const createPerformanceActivity = (ctx, description, goal, performance) =>
  strapi.entityService
    .create(PERFORMANCE_ACTIVITY_API_NAME, {
      data: {
        description,
        goal,
        performance,
        user: ctx.state.user
      },
      fields: FIELDS
    })
    .then(res => res)

// Delete Performance Activity
const deletePerformanceActivity = async (
  performanceActivity,
  goal,
  responseData
) => {
  const deletedEntity = await strapi.entityService.delete(
    PERFORMANCE_ACTIVITY_API_NAME,
    performanceActivity.id,
    {
      fields: FIELDS
    }
  )

  responseData.deletedPerformanceActivity = deletedEntity

  const previousPerformances = goal.performances
  const lastPerformance = previousPerformances[0]

  const currentPerformanceActivities =
    lastPerformance.performance_activities.filter(
      perfActivity => perfActivity.id !== deletedEntity.id
    )
  // New performance progress after a performance activity is deleted
  const newProgressPerformance = calculatePerformanceProgress(
    currentPerformanceActivities
  )

  // If the previous performance_activities is 1, update isWorkingDay to false and progress to 0
  if (lastPerformance.performance_activities.length === 1) {
    const updatedPerformance = await updatePerformance(
      strapi,
      lastPerformance.id,
      {
        isWorkingDay: false,
        progress: 0
      }
    )

    responseData.updatedPerformance = updatedPerformance
  }

  // If the previous performance progress is different thant the new one, update the performance progress
  if (lastPerformance.progress !== newProgressPerformance) {
    const updatedPerformance = await updatePerformance(
      strapi,
      lastPerformance.id,
      {
        progress: newProgressPerformance
      }
    )

    responseData.updatedPerformance = updatedPerformance
  }

  // If the previous last performance (current date) progress is 100 and the current one is less than 100, update goal progress OR if the last performance is less than 100 and the current one is greater than 100
  if (
    (lastPerformance.progress === 100 && newProgressPerformance < 100) ||
    (lastPerformance.progress < 100 && newProgressPerformance === 100)
  ) {
    // If the progress comes from 100 to minus, slice from 1. Otherwise slice from 0
    const slicedPerformance = lastPerformance.progress === 100 ? 1 : 0

    // If the new progress is 100, update the current day performance progress to 100
    if (newProgressPerformance === 100)
      previousPerformances[0].progress = newProgressPerformance

    const newGoalProgress = calculateGoalProgress(
      previousPerformances
        .slice(slicedPerformance)
        .filter(performance => performance.isWorkingDay)
    )

    const updatedGoal = await updateGoal(goal.id, {
      progress: newGoalProgress
    })

    responseData.updatedGoal = updatedGoal
  }
}

const updatePerformanceActivity = (performanceActivity, data) =>
  strapi.entityService
    .update(PERFORMANCE_ACTIVITY_API_NAME, performanceActivity.id, {
      data,
      fields: FIELDS
    })
    .then(res => res)

module.exports = {
  createPerformanceActivity,
  deletePerformanceActivity,
  updatePerformanceActivity
}
