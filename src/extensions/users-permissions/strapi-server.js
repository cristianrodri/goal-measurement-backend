const {
  update
} = require('@strapi/plugin-users-permissions/server/controllers/user')
const crypto = require('crypto')

const isNotOwnUser = (ctxState, ctxParams) => {
  return ctxState.user.id !== +ctxParams.id
}

module.exports = plugin => {
  // Update user controller
  plugin.controllers.user.update = async ctx => {
    // Verify if the params id owns to the authenticated user
    if (isNotOwnUser(ctx.state, ctx.params)) return ctx.forbidden()

    await update(ctx)
  }

  // Update email confirmation controller
  plugin.controllers.user.updateEmailConfirmation = async ctx => {
    // Send email confirmation
    const { email } = ctx.request.body
    const { id: userId } = ctx.state.user

    const tokenEmail = await strapi.entityService.create(
      'api::email-token.email-token',
      {
        data: {
          token: crypto.randomBytes(20).toString('hex'),
          user: +userId
        }
      }
    )

    const settings = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()

    const clientUrl = settings.email_confirmation_redirection

    try {
      await strapi.plugins['email'].services.email.send({
        to: email.trim(),
        from: process.env.SENDGRID_EMAIL,
        subject: 'Email confirmation',
        text: `
        Change your email in goalmeasurement.com
        Confirm your new email by clicking the link below

        ${clientUrl}/${tokenEmail.token}/${userId}
        `
      })

      ctx.send({
        success: true,
        message: 'An email confirmation has been sent to ' + email.trim()
      })
    } catch (error) {
      ctx.badRequest(error.message)
    }
  }

  // Update email confirmation route
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/user/updateEmailConfirmation',
    handler: 'user.updateEmailConfirmation',
    config: {
      prefix: ''
    }
  })

  return plugin
}
