'use strict'

/**
 *  reward controller
 */

const { createCoreController } = require('@strapi/strapi').factories
const { trimmedObj, avoidUpdatingSchema } = require('@utils/utils')
const { REWARD_API_NAME } = require('@utils/api_names')
const {
  createManyRewards,
  findManyRewards,
  findOneReward
} = require('@utils/reward')

const rewardNotFoundMessage = 'Reward not found'

module.exports = createCoreController(REWARD_API_NAME, () => ({
  async create(ctx) {
    const { rewards, type } = trimmedObj(ctx.request.body)

    const rewardEntities = await createManyRewards(ctx, rewards, type)

    ctx.body = await this.sanitizeOutput(rewardEntities, ctx)
  },
  async find(ctx) {
    const entities = await findManyRewards(ctx)

    ctx.body = await this.sanitizeOutput(entities, ctx)
  },
  async findOne(ctx) {
    const userReward = await findOneReward(ctx)

    if (!userReward) {
      return ctx.notFound(rewardNotFoundMessage)
    }

    ctx.body = await this.sanitizeOutput(userReward, ctx)
  },
  async update(ctx) {
    avoidUpdatingSchema(ctx)
    ctx.request.body = { data: { ...trimmedObj(ctx.request.body) } }

    const userReward = await findOneReward(ctx)

    if (!userReward) {
      return ctx.notFound(rewardNotFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.update(ctx)

    ctx.body = { id, ...attributes }
  },
  async delete(ctx) {
    const userReward = await findOneReward(ctx)

    if (!userReward) {
      return ctx.notFound(rewardNotFoundMessage)
    }

    const {
      data: { id, attributes }
    } = await super.delete(ctx)

    ctx.body = { id, ...attributes }
  }
}))
