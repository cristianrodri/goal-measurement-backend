const {
  update
} = require('@strapi/plugin-users-permissions/server/controllers/user')
const {
  validateRegisterBody,
  validateCallbackBody
} = require('@strapi/plugin-users-permissions/server/controllers/validation/auth')
const { getService } = require('@strapi/plugin-users-permissions/server/utils')
const utils = require('@strapi/utils')
const crypto = require('crypto')
const _ = require('lodash')

const { sanitize } = utils
const { ApplicationError, ValidationError } = utils.errors

const sanitizeUser = (user, ctx) => {
  const { auth } = ctx.state
  const userSchema = strapi.getModel('plugin::users-permissions.user')

  return sanitize.contentAPI.output(user, userSchema, { auth })
}

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

// Verify if the email or username is already taken by another user
const verifyExistingAccount = async (email, username, provider = null) => {
  const addProvider = provider ? { provider } : {}

  const conflictingUserEmailCount = await strapi
    .query('plugin::users-permissions.user')
    .count({
      where: {
        $or: [{ email: email.toLowerCase().trim() }, { email: username }],
        ...addProvider
      }
    })

  if (conflictingUserEmailCount > 0) {
    throw new ApplicationError('Email is already taken')
  }

  const conflictingUsernameCount = await strapi
    .query('plugin::users-permissions.user')
    .count({
      where: {
        $or: [{ username: email.toLowerCase().trim() }, { username }],
        ...addProvider
      }
    })

  if (conflictingUsernameCount > 0) {
    throw new ApplicationError('Username is already taken')
  }
}

module.exports = plugin => {
  // Update auth register controller
  plugin.controllers.auth.register = async ctx => {
    const pluginStore = await strapi.store({
      type: 'plugin',
      name: 'users-permissions'
    })

    const settings = await pluginStore.get({ key: 'advanced' })

    if (!settings.allow_register) {
      throw new ApplicationError('Register action is currently disabled')
    }

    const params = {
      ..._.omit(ctx.request.body, [
        'confirmed',
        'blocked',
        'confirmationToken',
        'resetPasswordToken',
        'provider'
      ]),
      provider: 'local'
    }

    await validateRegisterBody(params)

    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: settings.default_role } })

    if (!role) {
      throw new ApplicationError('Impossible to find the default role')
    }

    const { email, username, provider } = params

    await verifyExistingAccount(email, username, provider)

    if (settings.unique_email) {
      await verifyExistingAccount(email, username)
    }

    let newUser = {
      ...params,
      role: role.id,
      email: email.toLowerCase(),
      username,
      confirmed: !settings.email_confirmation
    }

    const user = await getService('user').add(newUser)

    const sanitizedUser = await sanitizeUser(user, ctx)
    sanitize

    if (settings.email_confirmation) {
      try {
        await getService('user').sendConfirmationEmail(sanitizedUser)
      } catch (err) {
        throw new ApplicationError(err.message)
      }

      return ctx.send({ user: sanitizedUser })
    }

    const jwt = getService('jwt').issue(_.pick(user, ['id']))

    return ctx.send({
      jwt,
      user: sanitizedUser
    })
  }

  // Update auth callback controller
  plugin.controllers.auth.callback = async ctx => {
    const provider = ctx.params.provider || 'local'
    const params = ctx.request.body

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' })
    const grantSettings = await store.get({ key: 'grant' })

    const grantProvider = provider === 'local' ? 'email' : provider

    if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
      throw new ApplicationError('This provider is disabled')
    }

    if (provider === 'local') {
      await validateCallbackBody(params)

      const { identifier } = params

      // Check if the user exists.
      const user = await strapi
        .query('plugin::users-permissions.user')
        .findOne({
          where: {
            provider,
            $or: [{ email: identifier.toLowerCase() }, { username: identifier }]
          }
        })

      if (!user) {
        throw new ValidationError('Invalid identifier')
      }

      if (!user.password) {
        throw new ValidationError('Invalid identifier or password')
      }

      const validPassword = await getService('user').validatePassword(
        params.password,
        user.password
      )

      if (!validPassword) {
        throw new ValidationError('Invalid password')
      }

      const advancedSettings = await store.get({ key: 'advanced' })
      const requiresConfirmation = _.get(advancedSettings, 'email_confirmation')

      if (requiresConfirmation && user.confirmed !== true) {
        throw new ApplicationError('Your account email is not confirmed')
      }

      if (user.blocked === true) {
        throw new ApplicationError(
          'Your account has been blocked by an administrator'
        )
      }

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: await sanitizeUser(user, ctx)
      })
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService('providers').connect(provider, ctx.query)

      return ctx.send({
        jwt: getService('jwt').issue({ id: user.id }),
        user: await sanitizeUser(user, ctx)
      })
    } catch (error) {
      throw new ApplicationError(error.message)
    }
  }

  // Update user controller
  plugin.controllers.user.update = async ctx => {
    // Verify if the params id owns to the authenticated user
    if (isNotOwnUser(ctx.state, ctx.params)) return ctx.forbidden()

    // Avoid updating email and password from this controller
    delete ctx.request.body?.email
    delete ctx.request.body?.password

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
