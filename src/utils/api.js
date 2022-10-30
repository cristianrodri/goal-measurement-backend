const { PERFORMANCE_API_NAME } = require('./api_names')
const { FIELD_PERFORMANCES } = require('./api_options')

// Find many data
const findMany = async (apiName, filterApi, id) => {
  const entities = await strapi.entityService.findMany(apiName, {
    filters: {
      [filterApi]: id
    },
    fields: ['id']
  })

  return entities.map(entity => entity.id)
}

// Find many data related to the given user id
const findManyByUser = async (apiName, userId) =>
  await findMany(apiName, 'user', userId)

// Find many data related to the given goal id
const findManyByGoal = async (apiName, goalId) =>
  await findMany(apiName, 'goal', goalId)

const deleteMany = async (apiName, ids) =>
  await strapi.db.query(apiName).deleteMany({
    where: {
      id: ids
    }
  })

const updatePerformance = (id, data) =>
  strapi.entityService
    .update(PERFORMANCE_API_NAME, id, { data, fields: FIELD_PERFORMANCES })
    .then(res => res)

module.exports = {
  deleteMany,
  findMany,
  findManyByGoal,
  findManyByUser,
  updatePerformance
}
