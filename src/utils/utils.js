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

module.exports = {
  avoidUpdatingSchema,
  deleteRequestBodyProperties,
  trimmedObj
}
