module.exports = {
  async beforeDelete(event) {
    // Get all related goal activities from the goal
    const entities = await strapi.entityService.findMany(
      'api::goal-activity.goal-activity',
      {
        filters: {
          goal: event.params.where.id
        },
        fields: ['id']
      }
    )

    const goalActivitiesIds = entities.map(entity => entity.id)

    // Delete all related goal activities before the goal is deleted
    await strapi.db.query('api::goal-activity.goal-activity').deleteMany({
      where: {
        id: goalActivitiesIds
      }
    })
  }
}
