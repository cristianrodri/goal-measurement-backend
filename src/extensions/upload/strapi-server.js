const _ = require('lodash')
const utils = require('@strapi/utils')

const { ValidationError } = utils.errors

module.exports = plugin => {
  plugin.controllers['content-api'].upload = async ctx => {
    const {
      query: { id },
      request: { files: { files } = {} }
    } = ctx

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
