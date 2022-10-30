const { deleteMany, findManyByGoal } = require('@utils/api')

const GOAL_ACTIVITY_UID = 'api::goal-activity.goal-activity'
const PERFORMANCE_UID = 'api::performance.performance'
const PERFORMANCE_ACTIVITY_UID =
  'api::performance-activity.performance-activity'

module.exports = {
  async beforeDelete(event) {
    // Get all related ids "goal activities" from the goal
    const goalActivitiesIds = await findManyByGoal(
      GOAL_ACTIVITY_UID,
      event.params.where.id
    )
    // Get all related ids "performances" from the goal
    const performancesIds = await findManyByGoal(
      PERFORMANCE_UID,
      event.params.where.id
    )
    // Get all related ids "performances activities" from the goal
    const performanceActivitiesIds = await findManyByGoal(
      PERFORMANCE_ACTIVITY_UID,
      event.params.where.id
    )

    // Delete all related "goal activities" before the goal is deleted
    await deleteMany(GOAL_ACTIVITY_UID, goalActivitiesIds)
    // Delete all related "performances" before the goal is deleted
    await deleteMany(PERFORMANCE_UID, performancesIds)
    // Delete all related "performance activities" before the goal is deleted
    await deleteMany(PERFORMANCE_ACTIVITY_UID, performanceActivitiesIds)
  }
}
