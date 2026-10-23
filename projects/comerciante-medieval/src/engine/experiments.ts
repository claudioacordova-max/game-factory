import { advancePlayerDay, buyFromBusiness, createInitialGameState, saleGoodsForTarget, sellToNeed, travelToVillage } from './player.js'
import { caravanCircuitDay, caravanLocation, simulateDays, type SimulationReport } from './autonomous.js'
import { createInitialState } from './scenario.js'
import { createEconomicParameters, DEFAULT_EXPERIMENT_PARAMETERS, type EconomicState, type ExperimentParameterOverrides } from './model.js'
import { reevaluateTier } from './needs.js'
import type { EconomicEvent, GameState } from './model.js'

export const EXPERIMENT_SCENARIOS = [
  { id: 'normal', name: 'Ciclo normal', description: 'Escenario inicial autorizado, sin cambios.' },
  { id: 'no-tools', name: 'Sin herramienta', description: 'Se retiran las herramientas de la familia minera B.' },
  { id: 'no-inputs', name: 'Sin insumos', description: 'Se vacía el metal productivo del herrero A.' },
  { id: 'firewood-shortage-b', name: 'Escasez de leña en B', description: 'Los hogares de B empiezan con dos unidades de leña.' },
  { id: 'trade-opportunity', name: 'Oportunidad comercial', description: 'Compra metal en B, viaja a A y lo ofrece al herrero.' },
  { id: 'tier-regression', name: 'Regresión de tramo', description: 'Familia en tramo 3 justo bajo su umbral de mantenimiento.' },
  { id: 'no-buyer', name: 'Mercado sin comprador', description: 'Se ofrece comida a un hogar que ya cubrió su reserva.' },
  { id: 'caravan-absent', name: 'Caravana ausente', description: 'Día 3: caravana en tránsito y sin abastecimiento en A.' },
] as const

export type ExperimentScenarioId = typeof EXPERIMENT_SCENARIOS[number]['id']

export interface ScenarioAssertion { label: string; passed: boolean; observation: string }
export interface ExperimentCycleSummary {
  cycle: number
  firstDay: number
  lastDay: number
  productionUnits: number
  consumedUnits: number
  tradeEvents: number
  caravanEvents: number
  localMoneyTenths: number
  caravanSupplyMoneyTenths: number
  caravanExportMoneyTenths: number
  familyMoneyStartTenths: number
  familyMoneyEndTenths: number
  tierCountsEnd: Record<string, number>
}
export interface ExperimentRunReport {
  scenario: ExperimentScenarioId
  scenarioName: string
  days: number
  seed: number
  startDay: number
  finalDay: number
  parameterOverrides: ExperimentParameterOverrides
  assertions: ScenarioAssertion[]
  setupActions: { label: string; accepted: boolean; detail: string }[]
  playerAfterSetup?: { villageId: string; moneyTenths: number; inventory: GameState['player']['inventory']; capacityHalfUnits: number }
  metrics: {
    familyMoneyStartTenths: number
    familyMoneyEndTenths: number
    familyMoneyChangeTenths: number
    totalCommercialStockUnits: number
    familiesWithRedNeeds: number
    activeCommercialOfferCount: number
    tradeEventCount: number
    caravanSupplyCount: number
    caravanExportCount: number
    tierCounts: Record<string, number>
  }
  finalInventories: {
    households: SimulationReport['householdGoods']
    commercial: SimulationReport['businessCommercialGoods']
    productive: SimulationReport['businessProductiveGoods']
  }
  daily: SimulationReport['daily']
  productionCycles: ExperimentCycleSummary[]
  caravanCycles: ExperimentCycleSummary[]
  events: EconomicEvent[]
}

function assertion(label: string, passed: boolean, observation: string): ScenarioAssertion { return { label, passed, observation } }
function cloneState(state: EconomicState): EconomicState {
  return {
    ...state,
    families: Object.fromEntries(Object.entries(state.families).map(([id, family]) => [id, {
      ...family,
      household: { inventory: { ...family.household.inventory }, clothingDurabilityDays: [...family.household.clothingDurabilityDays] },
      businessIds: [...family.businessIds],
      needs: { ...family.needs, essentials: { ...family.needs.essentials }, progression: { ...family.needs.progression } },
    }])),
    businesses: Object.fromEntries(Object.entries(state.businesses).map(([id, business]) => [id, {
      ...business, commercialInventory: { ...business.commercialInventory }, productiveInventory: { ...business.productiveInventory }, tools: business.tools.map(tool => ({ ...tool })),
    }])),
    waitAvailabilityDays: { ...(state.waitAvailabilityDays ?? {}) },
  }
}
function tally(events: EconomicEvent[], types: readonly string[]): number {
  return events.filter(event => types.includes(event.type)).length
}
function units(daily: SimulationReport['daily'], key: 'produced' | 'consumed'): number {
  return daily.reduce((sum, day) => sum + Object.values(day.activityByGood[key]).reduce((subtotal, quantity) => subtotal + (quantity ?? 0), 0), 0)
}
function cycleSummaries(daily: SimulationReport['daily'], period: 4 | 9, initialMoneyTenths: number): ExperimentCycleSummary[] {
  const groups = new Map<number, SimulationReport['daily']>()
  for (const day of daily) {
    const cycle = Math.floor((day.day - 1) / period) + 1
    groups.set(cycle, [...(groups.get(cycle) ?? []), day])
  }
  return [...groups.entries()].map(([cycle, days]) => {
    const start = days[0]
    const end = days[days.length - 1]
    return {
      cycle, firstDay: start.day, lastDay: end.day,
      productionUnits: units(days, 'produced'), consumedUnits: units(days, 'consumed'),
      tradeEvents: days.reduce((sum, day) => sum + (day.eventCounts.purchase ?? 0) + (day.eventCounts['internal-transfer'] ?? 0), 0),
      caravanEvents: days.reduce((sum, day) => sum + (day.eventCounts['caravan-supply'] ?? 0) + (day.eventCounts['caravan-sale'] ?? 0), 0),
      localMoneyTenths: days.reduce((sum, day) => sum + day.moneyFlowsTenths.localTrade, 0),
      caravanSupplyMoneyTenths: days.reduce((sum, day) => sum + day.moneyFlowsTenths.caravanSupply, 0),
      caravanExportMoneyTenths: days.reduce((sum, day) => sum + day.moneyFlowsTenths.caravanExport, 0),
      familyMoneyStartTenths: daily.find(day => day.day === start.day - 1)?.familyMoneyTenths ?? initialMoneyTenths,
      familyMoneyEndTenths: end.familyMoneyTenths,
      tierCountsEnd: end.tierCounts,
    }
  })
}

/** Runs a fresh deterministic scenario from the same approved factory state each time. */
export function runExperimentScenario(
  scenarioId: ExperimentScenarioId,
  days: number,
  overrides: Partial<ExperimentParameterOverrides> = {},
  seed = 0,
): ExperimentRunReport {
  if (!Number.isInteger(days) || days < 1) throw new Error('La duración debe ser un entero positivo.')
  if (!Number.isSafeInteger(seed) || seed < 0) throw new Error('La semilla debe ser un entero no negativo.')
  const scenario = EXPERIMENT_SCENARIOS.find(entry => entry.id === scenarioId)
  if (!scenario) throw new Error(`Escenario desconocido: ${scenarioId}`)
  const experiment = { ...DEFAULT_EXPERIMENT_PARAMETERS, ...overrides }
  const boundedIntegers: [keyof ExperimentParameterOverrides, number, number][] = [
    ['playerBuyTariffPermille', 500, 1500], ['playerSellTariffPermille', 500, 1500], ['productionOutputPermille', 500, 2000], ['productionFrequencyPermille', 500, 2000],
    ['clothingDurabilityDays', 1, 365], ['toolWorkDays', 1, 365], ['redCoverageDays', 1, 30], ['greenCoverageDays', 2, 60],
    ['yellowPurchaseWaitDays', 1, 14], ['tierThreeEntryMoneyTenths', 1, 1000000], ['tierThreeProsperityMoneyTenths', 0, 1000000],
  ]
  for (const [key, minimum, maximum] of boundedIntegers) {
    const value = experiment[key]
    if (!Number.isSafeInteger(value) || value < minimum || value > maximum) throw new Error(`Parámetro experimental fuera de rango: ${key}.`)
  }
  if (experiment.greenCoverageDays <= experiment.redCoverageDays) throw new Error('La cobertura verde debe superar la cobertura roja.')
  const parameters = createEconomicParameters(experiment)
  let economy = createInitialState(parameters)
  const checks: ScenarioAssertion[] = []
  const setupActions: ExperimentRunReport['setupActions'] = []
  let player: GameState | undefined

  switch (scenarioId) {
    case 'normal':
      checks.push(assertion('Ocho familias y negocios iniciales', Object.keys(economy.families).length === 8 && Object.keys(economy.businesses).length === 8, 'Comprueba la población y oficios iniciales.'))
      break
    case 'no-tools': {
      economy.businesses['miner-b'].tools = []
      const report = simulateDays(1, economy)
      checks.push(assertion('Minero sin herramientas no produce', !report.events.some(event => event.type === 'production' && event.businessId === 'miner-b'), `Producción de metal del minero: ${report.events.filter(event => event.type === 'production' && event.businessId === 'miner-b').reduce((sum, event) => sum + (event.quantity ?? 0), 0)}.`))
      break
    }
    case 'no-inputs': {
      economy.businesses['blacksmith-a'].productiveInventory.metal = 0
      economy.day = 3
      const report = simulateDays(1, economy)
      checks.push(assertion('Herrero sin insumos no produce herramienta', !report.events.some(event => event.type === 'production' && event.businessId === 'blacksmith-a'), 'El día 4 no se fabrica sin el metal requerido.'))
      break
    }
    case 'firewood-shortage-b':
      for (const family of Object.values(economy.families).filter(entry => entry.villageId === 'village-b')) {
        family.household.inventory.firewood = 2
        reevaluateTier(economy, family)
      }
      checks.push(assertion('La escasez inicial está en rojo en B', Object.values(economy.families).filter(entry => entry.villageId === 'village-b').every(family => family.needs.essentials.firewood === 'red'), 'Los cuatro hogares de B empiezan con dos unidades y necesidad roja de leña.'))
      break
    case 'trade-opportunity': {
      economy.businesses['blacksmith-a'].productiveInventory.metal = 2
      player = createInitialGameState(economy)
      const toB = travelToVillage(player, 'village-b')
      if (toB.ok) player = toB.state
      const purchase = buyFromBusiness(player, 'miner-b', 'metal', 2)
      setupActions.push({ label: 'Compra de 2 metal al minero B', accepted: purchase.ok, detail: purchase.ok ? `${purchase.moneyTenths} décimas pagadas.` : purchase.error.message })
      if (purchase.ok) player = purchase.state
      const toA = travelToVillage(player, 'village-a')
      if (toA.ok) player = toA.state
      const sale = sellToNeed(player, { type: 'business', businessId: 'blacksmith-a' }, 'metal', 2, { requireFullAcceptance: true })
      setupActions.push({ label: 'Venta de 2 metal al herrero A', accepted: sale.ok, detail: sale.ok ? `${sale.moneyTenths} décimas recibidas.` : sale.error.message })
      if (sale.ok) player = sale.state
      economy = cloneState(player.economy)
      checks.push(assertion('Ruta de oportunidad B→A completada', setupActions.length === 2 && setupActions.every(action => action.accepted), setupActions.map(action => `${action.label}: ${action.accepted ? 'aceptada' : 'rechazada'}`).join('; ')))
      break
    }
    case 'tier-regression': {
      const family = economy.families['family-farmer-a']
      family.tier = 3
      const threshold = parameters.config.tierTwoMoneyTenths
      const furnitureSalePrice = parameters.catalog.furniture.playerSellPriceTenths
      family.moneyTenths = threshold + furnitureSalePrice - 1
      // Scenario preconditions: these existing goods keep the family above the
      // tier-2 material floor until the player's furniture purchase is processed.
      family.household.inventory.furniture = 1
      family.household.inventory.jewelry = 1
      // Align the trip with the caravan's transit/port days so the selected
      // family is not supplied by the caravan during these player operations.
      economy.day = 8
      reevaluateTier(economy, family)
      const furnitureBeforePurchase = family.household.inventory.furniture
      player = createInitialGameState(economy)
      player.player.villageId = 'village-b'

      const furnitureBuy = buyFromBusiness(player, 'carpenter-b', 'furniture', 1)
      setupActions.push({ label: 'Compra de un mueble en la carpintería B', accepted: furnitureBuy.ok, detail: furnitureBuy.ok ? `${furnitureBuy.moneyTenths} décimas pagadas.` : furnitureBuy.error.message })
      if (furnitureBuy.ok) player = furnitureBuy.state
      const jewelryBuy = buyFromBusiness(player, 'jeweler-b', 'jewelry', 1)
      setupActions.push({ label: 'Compra de una joya en la joyería B', accepted: jewelryBuy.ok, detail: jewelryBuy.ok ? `${jewelryBuy.moneyTenths} décimas pagadas.` : jewelryBuy.error.message })
      if (jewelryBuy.ok) player = jewelryBuy.state
      const travelA = travelToVillage(player, 'village-a')
      setupActions.push({ label: 'Viaje B→A', accepted: travelA.ok, detail: travelA.ok ? 'Llegada a Pueblo A.' : travelA.error.message })
      if (travelA.ok) player = travelA.state

      const buyerBeforeSale = player.economy.families[family.id]
      const playerMoneyBeforeSale = player.player.moneyTenths
      const playerFurnitureBeforeSale = player.player.inventory.furniture
      const tierAtSale = buyerBeforeSale.tier
      const moneyAtSale = buyerBeforeSale.moneyTenths
      const householdFurnitureAtSale = buyerBeforeSale.household.inventory.furniture
      const firstSale = sellToNeed(player, { type: 'household', familyId: family.id }, 'furniture', 1, { requireFullAcceptance: true })
      setupActions.push({ label: 'Venta del mueble a la familia en tramo 3', accepted: firstSale.ok, detail: firstSale.ok ? `${firstSale.moneyTenths} décimas recibidas.` : firstSale.error.message })
      if (firstSale.ok) player = firstSale.state
      const afterFurniture = player.economy.families[family.id]
      const playerAfterFurniture = player.player
      const exactTransfer = firstSale.ok
        && firstSale.quantity === 1
        && firstSale.moneyTenths === furnitureSalePrice
        && firstSale.events.some(event => event.type === 'player-sale' && event.familyId === family.id && event.good === 'furniture' && event.quantity === 1 && event.moneyTenths === furnitureSalePrice)
        && afterFurniture.moneyTenths === moneyAtSale - furnitureSalePrice
        && playerAfterFurniture.moneyTenths === playerMoneyBeforeSale + furnitureSalePrice
        && afterFurniture.household.inventory.furniture === householdFurnitureAtSale + 1
        && playerAfterFurniture.inventory.furniture === playerFurnitureBeforeSale - 1
      const descendedAfterPayment = firstSale.ok
        && tierAtSale === 3
        && moneyAtSale >= threshold
        && afterFurniture.moneyTenths < threshold
        && afterFurniture.tier === 2
      const retainedFurniture = afterFurniture.household.inventory.furniture === furnitureBeforePurchase + 1

      const requestedAfterDescent = saleGoodsForTarget(player, { type: 'household', familyId: family.id })
      const tierTwoOffer = !requestedAfterDescent.includes('furniture') && requestedAfterDescent.includes('jewelry')
      checks.push(assertion('Venta exacta en tramo 3 debita y acredita ambos lados, transfiere el mueble y causa descenso conservándolo', exactTransfer && descendedAfterPayment && retainedFurniture, `Antes de vender: tramo ${tierAtSale}, hogar ${moneyAtSale} décimas, jugador ${playerMoneyBeforeSale} décimas y ${playerFurnitureBeforeSale} muebles; precio ${firstSale.ok ? firstSale.moneyTenths : 0}; después: tramo ${afterFurniture.tier}, hogar ${afterFurniture.moneyTenths} décimas y ${afterFurniture.household.inventory.furniture} muebles; jugador ${playerAfterFurniture.moneyTenths} décimas y ${playerAfterFurniture.inventory.furniture} muebles.`))
      checks.push(assertion('Las ofertas posteriores siguen las metas del tramo 2', tierTwoOffer, `Bienes que el hogar aún solicita tras el descenso: ${requestedAfterDescent.join(', ') || 'ninguno'}.`))

      const nextDay = advancePlayerDay(player)
      setupActions.push({ label: 'Avance manual para renovar el límite diario de progreso', accepted: nextDay.ok, detail: nextDay.ok ? 'El mundo procesó un día global.' : nextDay.error.message })
      if (nextDay.ok) player = nextDay.state
      const buyerBeforeJewelry = player.economy.families[family.id]
      const playerMoneyBeforeJewelry = player.player.moneyTenths
      const playerJewelryBefore = player.player.inventory.jewelry
      const jewelrySale = sellToNeed(player, { type: 'household', familyId: family.id }, 'jewelry', 1, { requireFullAcceptance: true })
      setupActions.push({ label: 'Venta posterior de joya según la necesidad del tramo 2', accepted: jewelrySale.ok, detail: jewelrySale.ok ? `${jewelrySale.moneyTenths} décimas recibidas.` : jewelrySale.error.message })
      if (jewelrySale.ok) player = jewelrySale.state
      const afterJewelry = player.economy.families[family.id]
      const afterJewelryPlayer = player.player
      const jewelryPrice = parameters.catalog.jewelry.playerSellPriceTenths
      const jewelryTransferExact = jewelrySale.ok
        && jewelrySale.moneyTenths === jewelryPrice
        && afterJewelry.moneyTenths === buyerBeforeJewelry.moneyTenths - jewelryPrice
        && afterJewelryPlayer.moneyTenths === playerMoneyBeforeJewelry + jewelryPrice
        && afterJewelry.household.inventory.jewelry === buyerBeforeJewelry.household.inventory.jewelry + 1
        && afterJewelryPlayer.inventory.jewelry === playerJewelryBefore - 1
      checks.push(assertion('Compra posterior aceptada con necesidad y tramo actuales', jewelryTransferExact && afterJewelry.tier === 2, `Venta aceptada: ${jewelrySale.ok}; tramo final de la familia: ${afterJewelry.tier}; joyas: ${afterJewelry.household.inventory.jewelry}.`))
      economy = cloneState(player.economy)
      break
    }
    case 'no-buyer': {
      player = createInitialGameState(economy)
      player.player.inventory.food = 1
      const before = JSON.stringify(player)
      const result = sellToNeed(player, { type: 'household', familyId: 'family-farmer-a' }, 'food', 1, { requireFullAcceptance: true })
      setupActions.push({ label: 'Oferta de comida al hogar con reserva completa', accepted: result.ok, detail: result.ok ? 'Inesperadamente aceptada.' : result.error.message })
      checks.push(assertion('El hogar sin necesidad rechaza y no altera el estado', !result.ok && JSON.stringify(player) === before, setupActions[0].detail))
      economy = cloneState(player.economy)
      break
    }
    case 'caravan-absent': {
      economy.day = 2
      economy.families['family-farmer-a'].household.inventory.firewood = 0
      economy.businesses['woodcutter-a'].commercialInventory.firewood = 0
      reevaluateTier(economy, economy.families['family-farmer-a'])
      const report = simulateDays(1, economy)
      const supplied = report.events.filter(event => event.type === 'caravan-supply' && event.familyId === 'family-farmer-a' && event.good === 'firewood')
      checks.push(assertion('La caravana no abastece mientras está en tránsito', caravanLocation(3) === 'travel-to-a' && supplied.length === 0, `Día de circuito ${caravanCircuitDay(3)}, ubicación ${caravanLocation(3)}, suministros de leña ${supplied.length}.`))
      break
    }
  }

  const startDay = economy.day
  const startMoney = Object.values(economy.families).reduce((sum, family) => sum + family.moneyTenths, 0)
  const simulation = simulateDays(days, economy)
  const finalMoney = Object.values(simulation.familyMoneyTenths).reduce((sum, value) => sum + value, 0)
  const finalFamilies = simulation.tiers
  const tiers = Object.values(finalFamilies).reduce<Record<string, number>>((counts, tier) => { const key = String(tier); counts[key] = (counts[key] ?? 0) + 1; return counts }, {})
  const finalState = simulation.finalState
  const finalStock = Object.values(finalState.businesses).reduce((total, business) => total + Object.values(business.commercialInventory).reduce((sum, amount) => sum + amount, 0), 0)
  const activeCommercialOfferCount = Object.values(finalState.businesses).reduce((total, business) => total + Object.values(business.commercialInventory).filter(amount => amount > 0).length, 0)
  const endDay = simulation.finalDay
  return {
    scenario: scenarioId, scenarioName: scenario.name, days, seed, startDay, finalDay: endDay, parameterOverrides: experiment,
    assertions: checks,
    setupActions,
    ...(player ? { playerAfterSetup: { villageId: player.player.villageId, moneyTenths: player.player.moneyTenths, inventory: { ...player.player.inventory }, capacityHalfUnits: player.player.capacityHalfUnits } } : {}),
    metrics: {
      familyMoneyStartTenths: startMoney, familyMoneyEndTenths: finalMoney, familyMoneyChangeTenths: finalMoney - startMoney,
      totalCommercialStockUnits: finalStock,
      familiesWithRedNeeds: simulation.daily.at(-1)?.familiesWithRedNeeds ?? Object.values(finalState.families).filter(family => Object.values(family.needs.essentials).includes('red')).length,
      activeCommercialOfferCount,
      tradeEventCount: tally(simulation.events, ['purchase', 'internal-transfer']),
      caravanSupplyCount: tally(simulation.events, ['caravan-supply']), caravanExportCount: tally(simulation.events, ['caravan-sale']), tierCounts: tiers,
    },
    finalInventories: { households: simulation.householdGoods, commercial: simulation.businessCommercialGoods, productive: simulation.businessProductiveGoods },
    daily: simulation.daily,
    productionCycles: cycleSummaries(simulation.daily, 4, startMoney),
    caravanCycles: cycleSummaries(simulation.daily, 9, startMoney),
    events: simulation.events,
  }
}
