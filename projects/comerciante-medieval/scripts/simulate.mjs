import { createInitialState, simulateDays } from '../.test-dist/src/engine/index.js'

const requested = process.argv.slice(2).map(Number)
const durations = requested.length ? requested : [9, 36, 90]
for (const days of durations) {
  const report = simulateDays(days, createInitialState())
  const money = Object.values(report.familyMoneyTenths).reduce((sum, amount) => sum + amount, 0)
  console.log(JSON.stringify({
    days: report.days,
    finalDay: report.finalDay,
    totalFamilyMoneyTenths: money,
    tiers: report.tiers,
    eventCounts: report.eventCounts,
    businessCommercialGoods: report.businessCommercialGoods,
    householdGoods: report.householdGoods,
    businessProductiveGoods: report.businessProductiveGoods,
    activityByGood: report.activityByGood,
  }))
}
