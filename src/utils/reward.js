const utils = require('@strapi/utils')
const { REWARD_API_NAME } = require('./api_names')

const { ApplicationError } = utils.errors

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
  // Find all user rewards belong to the given type
  const typeRewards = await findRewards(ctx.state.user, type)

  // Verify if some given reward with the given type already exists in the database
  const repeatedReward = rewards.find(reward =>
    typeRewards.some(r => r.description === reward)
  )

  // If some repetead reward is found, throw an error
  if (repeatedReward)
    throw new ApplicationError(
      `${repeatedReward} already exists in the ${type} type`
    )

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

const findRewards = async (user, type) =>
  strapi.entityService
    .findMany(REWARD_API_NAME, {
      filters: {
        user,
        type
      }
    })
    .then(res => res)

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
