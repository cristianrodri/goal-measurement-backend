'use strict'

/**
 *  email-token controller
 */

const { createCoreController } = require('@strapi/strapi').factories

module.exports = createCoreController(
  'api::email-token.email-token',
  ({ strapi }) => ({
    async findAndDelete(ctx) {
      const entries = await strapi.db
        .query('api::email-token.email-token')
        .findMany({
          filters: {
            token: ctx.query.token
          }
        })

      if (entries.length > 0) {
        // Delete the email token when the entry is found
        await strapi.entityService.delete(
          'api::email-token.email-token',
          entries[0].id
        )

        return ctx.send({
          success: true,
          message: 'Your account has been confirmed successfully'
        })
      }
      ctx.badRequest()
    }
  })
)
