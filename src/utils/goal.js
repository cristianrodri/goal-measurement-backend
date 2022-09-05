const { GOAL_API_NAME } = require('./api')

const updateGoal = (strapi, id, data) =>
  strapi.entityService.update(GOAL_API_NAME, id, { data }).then(res => res)

module.exports = { updateGoal }
