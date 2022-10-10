const { getService } = require('@strapi/plugin-users-permissions/server/utils')
const utils = require('@strapi/utils')

const { ValidationError } = utils.errors

const getUserWithAvatar = async ctx => {
  return await getService('user').fetch(ctx.state.user.id, {
    populate: {
      avatar: true
    }
  })
}

const hasUserTheAvatarId = (userAvatar, avatarId) => {
  if (userAvatar.id !== +avatarId)
    throw new ValidationError('Query id is not related with the user avatar id')
}

module.exports = plugin => {
  const destroy = plugin.controllers['content-api'].destroy
  const upload = plugin.controllers['content-api'].upload

  // Upload or update the user avatar
  plugin.controllers['content-api'].upload = async ctx => {
    const {
      query: { id },
      request: { files: { files } = {} }
    } = ctx

    const user = await getUserWithAvatar(ctx)

    if (id && user.avatar) {
      hasUserTheAvatarId(user.avatar, id)
    }

    // If the query id is not provided AND the user has already an avatar, return an error message
    if (!id && user.avatar) {
      throw new ValidationError(
        'User has already an avatar. If you want to update an existing avatar, please add the avatar id as query id'
      )
    }

    if (files.size > 1_000_000)
      throw new ValidationError('File size exceeded 1MB')

    // Relate the refId with the authenticated user id
    ctx.request.body.refId = ctx.state.user.id

    await upload(ctx)
  }

  // Delete the user avatar
  plugin.controllers['content-api'].destroy = async ctx => {
    const user = await getUserWithAvatar(ctx)

    // If the user avatar id doesn't exist OR doesn't match with the avatar id provided by ctx.query.id, the avatar with the query id can't be deleted
    if (!user.avatar?.id || user.avatar.id !== +ctx.params.id) {
      return ctx.unauthorized('Cannot delete the avatar with the provided id')
    }

    await destroy(ctx)
  }

  return plugin
}
