const GOAL_ACTIVITY_UID = 'api::goal-activity.goal-activity'
const PERFORMANCE_UID = 'api::performance.performance'
const PERFORMANCE_ACTIVITY_UID =
  'api::performance-activity.performance-activity'

module.exports = {
  async beforeDelete(event) {
    const findMany = async uid => {
      const entities = await strapi.entityService.findMany(uid, {
        filters: {
          goal: event.params.where.id
        },
        fields: ['id']
      })

      return entities.map(entity => entity.id)
    }

    const deleteMany = async (uid, ids) =>
      await strapi.db.query(uid).deleteMany({
        where: {
          id: ids
        }
      })

    // Get all related ids "goal activities" from the goal
    const goalActivitiesIds = await findMany(GOAL_ACTIVITY_UID)
    // Get all related ids "performances" from the goal
    const performancesIds = await findMany(PERFORMANCE_UID)
    // Get all related ids "performances activities" from the goal
    const performanceActivitiesIds = await findMany(PERFORMANCE_ACTIVITY_UID)

    // Delete all related "goal activities" before the goal is deleted
    await deleteMany(GOAL_ACTIVITY_UID, goalActivitiesIds)
    // Delete all related "performances" before the goal is deleted
    await deleteMany(PERFORMANCE_UID, performancesIds)
    // Delete all related "performance activities" before the goal is deleted
    await deleteMany(PERFORMANCE_ACTIVITY_UID, performanceActivitiesIds)
  }
}
