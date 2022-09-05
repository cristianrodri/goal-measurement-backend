const moment = require('moment')

const getCurrentDay = utc =>
  moment().utcOffset(utc).startOf('day').format('dddd').toLowerCase()

const getCurrentDate = utc => moment().utcOffset(utc).startOf('day')

const isLastPerformanceTheCurrentDay = (lastPerformance, utc) =>
  moment(lastPerformance.date).utcOffset(utc).isSameOrAfter(getCurrentDate(utc))

module.exports = {
  getCurrentDay,
  getCurrentDate,
  isLastPerformanceTheCurrentDay
}
