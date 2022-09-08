const deleteRequestBodyProperties = obj => {
  delete obj?.createdAt
  delete obj?.updatedAt
  delete obj?.createdBy
  delete obj?.updatedBy
  delete obj?.publishedAt
  delete obj?.user
  delete obj?.goal
  delete obj?.goal_activities
  delete obj?.performances
  delete obj?.performance_activities
  delete obj?.progress

  // User schema
  delete obj?.resetPasswordToken
  delete obj?.confirmationToken
  delete obj?.confirmed
  delete obj?.blocked
  delete obj?.role
  delete obj?.goals
  delete obj?.rewards
  delete obj?.email_tokens
}

const avoidUpdatingSchema = ctx => {
  deleteRequestBodyProperties(ctx.request.body)
}

const trimmedObj = obj =>
  Object.entries(obj).reduce(
    (prev, curr) =>
      typeof curr[1] === 'string'
        ? { ...prev, [curr[0]]: curr[1].trim() }
        : { ...prev, [curr[0]]: curr[1] },
    {}
  )

const calculatePerformanceProgress = performanceActivities => {
  const donePerformancesActivities = performanceActivities.filter(
    perfActivity => perfActivity.done
  )

  return Math.round(
    (donePerformancesActivities.length / performanceActivities.length) * 100
  )
}

// The performances always receive all performances until the previous days. If the "current day" peformance progress is 100, this will be included. Otherwise, if it is less than 100, it won't be included
const calculateGoalProgress = performances => {
  const sum = performances.reduce((prev, cur) => prev + cur.progress, 0)

  return Math.round(sum / performances.length)
}

module.exports = {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj,
  calculatePerformanceProgress,
  calculateGoalProgress
}
