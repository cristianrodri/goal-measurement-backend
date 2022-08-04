const {
  update
} = require('@strapi/plugin-users-permissions/server/controllers/user')
const { getService } = require('@strapi/plugin-users-permissions/server/utils')
const utils = require('@strapi/utils')
const crypto = require('crypto')

const { ApplicationError, ValidationError } = utils.errors

const isNotOwnUser = (ctxState, ctxParams) => {
  return ctxState.user.id !== +ctxParams.id
}

const deleteEmailToken = async userId => {
  // Delete previous email token related to this userId
  await strapi.entityService.deleteMany('api::email-token.email-token', {
    where: {
      user: +userId
    }
  })
}

module.exports = plugin => {
  // Update user controller
  plugin.controllers.user.update = async ctx => {
    // Verify if the params id owns to the authenticated user
    if (isNotOwnUser(ctx.state, ctx.params)) return ctx.forbidden()

    // Avoid updating email from this controller
    delete ctx.request.body?.email

    await update(ctx)
  }

  // Update email confirmation controller
  plugin.controllers.user.updateEmailConfirmation = async ctx => {
    const advancedConfigs = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()

    if (!ctx.request.body?.email) {
      throw new ApplicationError('Email should be provided')
    }

    ctx.request.body.email = ctx.request.body.email.toLowerCase().trim()

    const { email } = ctx.request.body
    const { id: userId } = ctx.state.user

    try {
      if (advancedConfigs.unique_email) {
        const userWithSameEmail = await strapi
          .query('plugin::users-permissions.user')
          .findOne({ where: { email } })

        if (userWithSameEmail) {
          throw new ApplicationError('Email already taken')
        }
      }

      await deleteEmailToken(userId)

      const tokenEmail = await strapi.entityService.create(
        'api::email-token.email-token',
        {
          data: {
            token: crypto.randomBytes(20).toString('hex'),
            newEmail: email,
            user: +userId
          }
        }
      )

      const settings = await strapi
        .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
        .get()

      const clientUrl = settings.email_confirmation_redirection

      await strapi.plugins['email'].services.email.send({
        to: email,
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
        message: 'An email confirmation has been sent to ' + email
      })
    } catch (error) {
      ctx.badRequest(error.message)
    }
  }

  // Update email controller
  plugin.controllers.user.updateEmail = async ctx => {
    const { token, userId } = ctx.request.body

    try {
      const tokenEmails = await strapi.entityService.findMany(
        'api::email-token.email-token',
        {
          filters: {
            token,
            user: +userId
          },
          populate: { user: true }
        }
      )

      if (tokenEmails.length > 0) {
        const { user, newEmail } = tokenEmails[0]
        await getService('user').edit(user.id, { email: newEmail })

        // Delete email token related to this user after a successfully updated
        await deleteEmailToken(user.id)

        ctx.send({
          success: true,
          message: 'You email was updated successfully'
        })

        return
      }

      ctx.notFound('Email token was not found')
    } catch (error) {
      ctx.badRequest(error.message)
    }
  }

  // Update password controller
  plugin.controllers.user.updatePassword = async ctx => {
    const { currentPassword, newPassword, newPasswordConfirmation } =
      ctx.request.body
    const { user } = ctx.state

    if (newPassword !== newPasswordConfirmation) {
      throw new ValidationError('Passwords do not match')
    }

    // Verify the current password
    const validPassword = await getService('user').validatePassword(
      currentPassword,
      user.password
    )

    if (!validPassword) {
      throw new ValidationError('Invalid password')
    }

    await getService('user').edit(user.id, { password: newPassword })

    ctx.send({ success: true, message: 'Password updated successfully' })
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

  // Update email route
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/user/updateEmail',
    handler: 'user.updateEmail',
    config: {
      prefix: ''
    }
  })

  // Update password route
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/user/updatePassword',
    handler: 'user.updatePassword',
    config: {
      prefix: ''
    }
  })

  return plugin
}
