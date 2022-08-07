const cronTasks = require('./cron-tasks')

module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('BACKEND_URL_LOCAL'),
  app: {
    keys: env.array('APP_KEYS')
  },
  cron: {
    enabled: true,
    tasks: cronTasks
  }
})
