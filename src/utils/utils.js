const avoidUpdatingSchema = ctx => {
  delete ctx.request.body?.createdAt
  delete ctx.request.body?.updatedAt
  delete ctx.request.body?.createdBy
  delete ctx.request.body?.updatedBy
  delete ctx.request.body?.user
  delete ctx.request.body?.goal_activities
  delete ctx.request.body?.performances
  delete ctx.request.body?.performance_activities
}

module.exports = {
  avoidUpdatingSchema
}
