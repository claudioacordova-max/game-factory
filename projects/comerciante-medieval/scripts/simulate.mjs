import { createInitialState, runExperimentScenario, simulateDays, EXPERIMENT_SCENARIOS } from '../.test-dist/src/engine/index.js'

const args = process.argv.slice(2)
if (args.includes('--scenario')) {
  const scenarioIndex = args.indexOf('--scenario')
  const scenarioId = args[scenarioIndex + 1]
  const daysIndex = args.indexOf('--days')
  const seedIndex = args.indexOf('--seed')
  const summary = args.includes('--summary')
  const days = daysIndex >= 0 ? Number(args[daysIndex + 1]) : 9
  const seed = seedIndex >= 0 ? Number(args[seedIndex + 1]) : 0
  const scenarios = scenarioId === 'all' ? EXPERIMENT_SCENARIOS.map(scenario => scenario.id) : [scenarioId]
  for (const scenario of scenarios) {
    const report = runExperimentScenario(scenario, days, {}, seed)
    console.log(JSON.stringify(summary ? {
      scenario: report.scenario, days: report.days, seed: report.seed, startDay: report.startDay, finalDay: report.finalDay,
      assertions: report.assertions, setupActions: report.setupActions, metrics: report.metrics,
      productionCycles: report.productionCycles, caravanCycles: report.caravanCycles,
    } : report))
  }
  process.exit(0)
}

const summary = args.includes('--summary')
const requested = args.filter(value => value !== '--summary').map(Number)
const durations = requested.length ? requested : [9, 36, 90]
for (const days of durations) {
  const report = simulateDays(days, createInitialState())
  const money = Object.values(report.familyMoneyTenths).reduce((sum, amount) => sum + amount, 0)
  const result = {
    days: report.days,
    finalDay: report.finalDay,
    totalFamilyMoneyTenths: money,
    tiers: report.tiers,
    eventCounts: report.eventCounts,
    activityByGood: report.activityByGood,
    ...(summary ? { finalCommercialStockUnits: Object.values(report.businessCommercialGoods).reduce((total, inventory) => total + Object.values(inventory).reduce((sum, amount) => sum + amount, 0), 0), daily: report.daily.at(-1) } : {
      businessCommercialGoods: report.businessCommercialGoods,
      householdGoods: report.householdGoods,
      businessProductiveGoods: report.businessProductiveGoods,
    }),
  }
  console.log(JSON.stringify(result))
}
