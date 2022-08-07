module.exports = {
  '0 */12 * * *': async ({ strapi }) => {
    // Delete email tokens which is longer than 12 hours
    const previousHours = new Date()
    previousHours.setHours(previousHours.getHours() - 12)

    try {
      const response = await strapi.entityService.deleteMany(
        'api::email-token.email-token',
        {
          filters: {
            createdAt: { $lt: previousHours.toISOString() }
          }
        }
      )

      // eslint-disable-next-line
      console.log(`${response.count} email token(s) deleted at ${new Date()}`)
    } catch (error) {
      // eslint-disable-next-line
      console.log(error.message)
    }
  }
}
