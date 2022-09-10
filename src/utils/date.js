const moment = require('moment')

const getClientUTC = ctx => +ctx.query?.utc

const getCurrentDay = utc =>
  moment().utcOffset(utc).startOf('day').format('dddd').toLowerCase()

const getCurrentDate = utc => moment().utcOffset(utc).startOf('day')

const getDay = date => date.format('dddd').toLowerCase()

const getStartOfDay = (date, utc) => moment(date).utcOffset(utc).startOf('day')

const isLastPerformanceTheCurrentDay = (lastPerformance, utc) =>
  moment(lastPerformance.date).utcOffset(utc).isSameOrAfter(getCurrentDate(utc))

module.exports = {
  getClientUTC,
  getCurrentDay,
  getCurrentDate,
  getDay,
  getStartOfDay,
  isLastPerformanceTheCurrentDay
}
