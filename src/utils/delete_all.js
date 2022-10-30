const { findManyByUser, deleteMany } = require('./api')
const {
  GOAL_API_NAME,
  PERFORMANCE_API_NAME,
  PERFORMANCE_ACTIVITY_API_NAME,
  REWARD_API_NAME,
  GOAL_ACTIVITY_API_NAME
} = require('./api_names')

const deleteAllUserData = async user => {
  // Find related data ids
  const userGoalIds = await findManyByUser(GOAL_API_NAME, user.id)
  const userGoalActivityIds = await findManyByUser(
    GOAL_ACTIVITY_API_NAME,
    user.id
  )
  const userPerformanceIds = await findManyByUser(PERFORMANCE_API_NAME, user.id)
  const userPerformanceActivityIds = await findManyByUser(
    PERFORMANCE_ACTIVITY_API_NAME,
    user.id
  )
  const userRewardIds = await findManyByUser(REWARD_API_NAME, user.id)

  // Find related data ids
  await deleteMany(GOAL_API_NAME, userGoalIds)
  await deleteMany(GOAL_ACTIVITY_API_NAME, userGoalActivityIds)
  await deleteMany(PERFORMANCE_API_NAME, userPerformanceIds)
  await deleteMany(PERFORMANCE_ACTIVITY_API_NAME, userPerformanceActivityIds)
  await deleteMany(REWARD_API_NAME, userRewardIds)
}

module.exports = { deleteAllUserData }
