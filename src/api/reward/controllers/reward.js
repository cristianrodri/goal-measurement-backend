'use strict'

/**
 *  reward controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { trimmedObj, deleteRequestBodyProperties } = require('@utils/utils')

const API_NAME = 'api::reward.reward'

module.exports = createCoreController(API_NAME, ({ strapi }) => ({
  async create(ctx) {
    const { rewards, type } = trimmedObj(ctx.request.body)

    const rewardEntities = await Promise.all(
      rewards.map(async reward => {
        // Delete unnecessary properties if they are provided
        deleteRequestBodyProperties(reward)

        const entity = await strapi.entityService.create(API_NAME, {
          data: {
            description: reward.trim(),
            type,
            user: ctx.state.user
          }
        })

        return entity
      })
    )

    ctx.body = await this.sanitizeOutput(rewardEntities, ctx)
  }
}))
