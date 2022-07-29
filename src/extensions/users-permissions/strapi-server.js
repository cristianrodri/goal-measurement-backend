const {
  update
} = require('@strapi/plugin-users-permissions/server/controllers/user')

const isNotOwnUser = (ctxState, ctxParams) => {
  return ctxState.user.id !== +ctxParams.id
}

module.exports = plugin => {
  // Update user controller
  plugin.controllers.user.update = async ctx => {
    // Verify if the params id owns the authenticated user
    if (isNotOwnUser(ctx.state, ctx.params)) return ctx.forbidden()

    await update(ctx)
  }

  return plugin
}
