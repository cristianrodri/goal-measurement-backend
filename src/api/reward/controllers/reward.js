'use strict'

/**
 *  reward controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { trimmedObj, avoidUpdatingSchema } = require('@utils/utils')

const API_NAME = 'api::reward.reward'
const rewardNotFoundMessage = 'Reward not found'

const findRewardUser = async (strapi, ctx) => {
  const entities = await strapi.entityService.findMany(API_NAME, {
    filters: {
      id: ctx.params.id,
      user: ctx.state.user
    }
  })

  return entities[0]
}

module.exports = createCoreController(API_NAME, ({ strapi }) => ({
  async create(ctx) {
    const { rewards, type } = trimmedObj(ctx.request.body)

    const rewardEntities = await Promise.all(
      rewards.map(async reward => {
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
  },
  async find(ctx) {
    const entities = await strapi.entityService.findMany(API_NAME, {
      filters: {
        user: ctx.state.user,
        ...ctx.query
      }
    })

    ctx.body = await this.sanitizeOutput(entities, ctx)
  },
  async findOne(ctx) {
    const userReward = await findRewardUser(strapi, ctx)

    if (!userReward) {
      return ctx.notFound(rewardNotFoundMessage)
    }

    ctx.body = await this.sanitizeOutput(userReward, ctx)
  },
  async update(ctx) {
    avoidUpdatingSchema(ctx)
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }

    const userReward = await findRewardUser(strapi, ctx)

    if (!userReward) {
      return ctx.notFound(rewardNotFoundMessage)
    }

    const entity = await super.update(ctx)

    const {
      data: { id, attributes }
    } = await this.sanitizeOutput(entity, ctx)

    ctx.body = { id, ...attributes }
  }
}))
