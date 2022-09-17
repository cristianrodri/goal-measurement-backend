const { REWARD_API_NAME } = require('./api_names')

const createReward = (ctx, reward, type) =>
  strapi.entityService
    .create(REWARD_API_NAME, {
      data: {
        description: reward.trim(),
        type,
        user: ctx.state.user
      }
    })
    .then(res => res)

const createManyRewards = async (ctx, rewards, type) => {
  const rewardEntities = await Promise.all(
    rewards.map(async reward => {
      const entity = await createReward(ctx, reward, type)

      return entity
    })
  )

  return rewardEntities
}

const findOneReward = ctx =>
  strapi.entityService
    .findMany(REWARD_API_NAME, {
      filters: {
        id: ctx.params.id,
        user: ctx.state.user
      }
    })
    .then(res => res[0])

const findManyRewards = ctx =>
  strapi.entityService
    .findMany(REWARD_API_NAME, {
      filters: {
        user: ctx.state.user,
        ...ctx.query
      }
    })
    .then(res => res)

module.exports = { createManyRewards, findManyRewards, findOneReward }
