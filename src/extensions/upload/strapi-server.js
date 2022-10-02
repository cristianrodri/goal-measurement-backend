const _ = require('lodash')
const { getService } = require('@strapi/plugin-users-permissions/server/utils')
const utils = require('@strapi/utils')

const { ValidationError } = utils.errors

const hasUserTheAvatarId = async (ctx, avatarId) => {
  const user = await getService('user').fetch(ctx.state.user.id, {
    populate: {
      avatar: true
    }
  })

  if (user.avatar.id !== +avatarId)
    throw new ValidationError('Query id is not related with the user avatar id')
}

module.exports = plugin => {
  plugin.controllers['content-api'].upload = async ctx => {
    const {
      query: { id },
      request: { files: { files } = {} }
    } = ctx

    if (id) {
      await hasUserTheAvatarId(ctx, id)
    }

    if (files.size > 1_000_000)
      throw new ValidationError('File size exceeded 1MB')

    // Relate the refId with the authenticated user id
    ctx.request.body.refId = ctx.state.user.id

    if (id && (_.isEmpty(files) || files.size === 0)) {
      return plugin.controllers['content-api'].updateFileInfo(ctx)
    }

    if (_.isEmpty(files) || files.size === 0) {
      throw new ValidationError('Files are empty')
    }

    await (id
      ? plugin.controllers['content-api'].replaceFile
      : plugin.controllers['content-api'].uploadFiles)(ctx)
  }

  return plugin
}
