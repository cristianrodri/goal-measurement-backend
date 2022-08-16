const avoidUpdatingSchema = ctx => {
  delete ctx.request.body?.createdAt
  delete ctx.request.body?.updatedAt
  delete ctx.request.body?.createdBy
  delete ctx.request.body?.updatedBy
  delete ctx.request.body?.user
  delete ctx.request.body?.goal_activities
  delete ctx.request.body?.performances
  delete ctx.request.body?.performance_activities

  // User schema
  delete ctx.request.body?.resetPasswordToken
  delete ctx.request.body?.confirmationToken
  delete ctx.request.body?.confirmed
  delete ctx.request.body?.blocked
  delete ctx.request.body?.role
  delete ctx.request.body?.goals
  delete ctx.request.body?.rewards
  delete ctx.request.body?.email_tokens
}

module.exports = {
  avoidUpdatingSchema
}
