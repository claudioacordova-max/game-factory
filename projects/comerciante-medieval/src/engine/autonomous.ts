import { GOODS, GOODS_CATALOG, INITIAL_CONFIG, RECIPES, type EconomicEvent, type EconomicState, type Family, type Good, type Inventory, type Status } from './model.js'
import { reevaluateTier } from './needs.js'
import { assertValidState, stepEconomicDay } from './simulation.js'

const FUNDAMENTAL_ORDER: readonly Good[] = ['food', 'firewood', 'clothing', 'tool', 'cloth', 'metal', 'wood']
const PROGRESSION_ORDER: readonly Good[] = ['clothing', 'furniture', 'jewelry']
const PROGRESSION_GOAL: Readonly<Record<Good, (family: Family) => number>> = {
  food: () => 0, firewood: () => 0, wood: () => 0, metal: () => 0, cloth: () => 0, tool: () => 0,
  clothing: family => 2 * family.members,
  furniture: family => family.members,
  jewelry: family => family.adults,
}

export interface DailyEconomyResult {
  state: EconomicState
  events: EconomicEvent[]
}

export function caravanCircuitDay(day: number): number {
  return ((day - 1) % 9) + 1
}

export function caravanLocation(day: number): 'port' | 'travel-to-a' | 'village-a' | 'travel-to-b' | 'village-b' | 'travel-to-port' {
  const circuit = caravanCircuitDay(day)
  if (circuit <= 2) return 'port'
  if (circuit === 3) return 'travel-to-a'
  if (circuit <= 5) return 'village-a'
  if (circuit === 6) return 'travel-to-b'
  if (circuit <= 8) return 'village-b'
  return 'travel-to-port'
}

function waitKey(familyId: string, good: Good): string { return `${familyId}:${good}` }
function familyBusinesses(state: EconomicState, family: Family) {
  return family.businessIds.map(id => state.businesses[id]).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id))
}
function statusRank(status: Status | undefined): number { return status === 'red' ? 0 : status === 'yellow' ? 1 : 2 }
function essentialStatusKey(good: Good): keyof Family['needs']['essentials'] {
  if (good === 'tool') return 'tools'
  if (good === 'cloth' || good === 'metal' || good === 'wood') return 'inputs'
  if (good === 'food' || good === 'firewood' || good === 'clothing') return good
  return 'inputs'
}
function price(good: Good, caravan = false): number {
  return caravan ? GOODS_CATALOG[good].caravanSellPriceTenths : GOODS_CATALOG[good].referencePriceTenths
}

function desiredEssential(family: Family, good: Good): number {
  switch (good) {
    case 'food': return family.members * 14
    case 'firewood': return 14
    case 'clothing': return family.members
    case 'tool': return 2
    case 'cloth': return 5
    case 'metal': return 6
    case 'wood': return 10
    default: return 0
  }
}

function businessNeedStock(state: EconomicState, family: Family, good: Good): number {
  let quantity = 0
  for (const business of familyBusinesses(state, family)) {
    if (good === 'tool' && RECIPES[business.profession].requiresTools) quantity += Math.max(0, 2 - business.tools.length)
    if (good !== 'tool') {
      const recipe = RECIPES[business.profession]
      const input = recipe.inputs[good]
      if (input) {
        const lots = INITIAL_CONFIG.inputReserveLots[business.profession as keyof typeof INITIAL_CONFIG.inputReserveLots] ?? 0
        quantity += Math.max(0, lots * input - business.productiveInventory[good])
      }
    }
  }
  return quantity
}

function remainingNeed(state: EconomicState, family: Family, good: Good): number {
  if (good === 'food' || good === 'firewood' || good === 'clothing') {
    return Math.max(0, desiredEssential(family, good) - family.household.inventory[good])
  }
  if (good === 'tool' || good === 'cloth' || good === 'metal' || good === 'wood') return businessNeedStock(state, family, good)
  return 0
}

function allLocalStock(state: EconomicState, family: Family, good: Good): number {
  return Object.values(state.businesses)
    .filter(b => b.villageId === family.villageId)
    .reduce((total, business) => total + business.commercialInventory[good], 0)
}

function available(state: EconomicState, family: Family, good: Good, includeCaravan: boolean): boolean {
  return allLocalStock(state, family, good) > 0 || (includeCaravan && caravanLocation(state.day) === family.villageId && remainingNeed(state, family, good) > 0)
}

function orderedFundamentals(state: EconomicState, family: Family): Good[] {
  return FUNDAMENTAL_ORDER.filter(good => remainingNeed(state, family, good) > 0)
    .sort((a, b) => statusRank(family.needs.essentials[essentialStatusKey(a)]) - statusRank(family.needs.essentials[essentialStatusKey(b)]) || FUNDAMENTAL_ORDER.indexOf(a) - FUNDAMENTAL_ORDER.indexOf(b))
}

function takeFromLocal(state: EconomicState, family: Family, good: Good, maxQuantity: number, events: EconomicEvent[], progression = false): number {
  let remaining = Math.min(maxQuantity, progression ? Math.max(0, progressionTarget(family, good) - (good === 'clothing' ? family.household.clothingDurabilityDays.length : family.household.inventory[good])) : remainingNeed(state, family, good))
  let purchased = 0
  const candidates = Object.values(state.businesses).filter(b => b.villageId === family.villageId && b.commercialInventory[good] > 0).sort((a, b) => a.id.localeCompare(b.id))
  for (const business of candidates) {
    if (remaining <= 0) break
    const internalSupply = business.familyId === family.id
    const affordable = internalSupply ? remaining : Math.floor(family.moneyTenths / price(good))
    const amount = Math.min(remaining, business.commercialInventory[good], affordable)
    if (amount <= 0) continue
    business.commercialInventory[good] -= amount
    const internal = internalSupply
    if (good === 'tool' && internal) {
      for (let i = 0; i < amount; i += 1) business.tools.push({ remainingWorkDays: INITIAL_CONFIG.toolWorkDays })
    } else if (good === 'tool') {
      for (let i = 0; i < amount; i += 1) businessNeedTargetTool(state, family)
    } else if (good === 'cloth' || good === 'metal' || good === 'wood') {
      const receivers = familyBusinesses(state, family).filter(receiver => RECIPES[receiver.profession].inputs[good] && remainingNeed(state, family, good) > 0)
      let unassigned = amount
      for (const receiver of receivers) {
        const input = RECIPES[receiver.profession].inputs[good] ?? 0
        const reserve = (INITIAL_CONFIG.inputReserveLots[receiver.profession as keyof typeof INITIAL_CONFIG.inputReserveLots] ?? 0) * input
        const add = Math.min(unassigned, Math.max(0, reserve - receiver.productiveInventory[good]))
        receiver.productiveInventory[good] += add
        unassigned -= add
      }
    } else {
      family.household.inventory[good] += amount
      if (good === 'clothing') for (let i = 0; i < amount; i += 1) family.household.clothingDurabilityDays.push(INITIAL_CONFIG.clothingDurabilityDays)
    }
    const cost = internal ? 0 : amount * price(good)
    if (!internal) {
      family.moneyTenths -= cost
      state.families[business.familyId].moneyTenths += cost
    }
    events.push({ day: state.day, type: internal ? 'internal-transfer' : 'purchase', familyId: family.id, businessId: business.id, good, quantity: amount, moneyTenths: cost, from: business.id, to: inventoryDestination(state, family, good), detail: progression ? 'Compra de progreso' : internal ? 'Producción propia transferida sin pago' : 'Compra local al precio de referencia' })
    reevaluateTier(state, family)
    remaining -= amount
    purchased += amount
  }
  return purchased
}

function businessNeedTargetTool(state: EconomicState, family: Family): void {
  const receiver = familyBusinesses(state, family).find(b => RECIPES[b.profession].requiresTools && b.tools.length < 2)
  if (receiver) receiver.tools.push({ remainingWorkDays: INITIAL_CONFIG.toolWorkDays })
}

function inventoryDestination(state: EconomicState, family: Family, good: Good): string {
  if (good === 'tool') return `family:${family.id}:tools`
  if (good === 'cloth' || good === 'metal' || good === 'wood') {
    const receiver = familyBusinesses(state, family).find(business => RECIPES[business.profession].inputs[good])
    return receiver ? `business:${receiver.id}:productive` : `family:${family.id}:household`
  }
  return `family:${family.id}:household`
}

function buyFromCaravan(state: EconomicState, family: Family, good: Good, maxQuantity: number, events: EconomicEvent[]): number {
  const amount = Math.min(maxQuantity, remainingNeed(state, family, good))
  if (amount <= 0) return 0
  const affordable = Math.min(amount, Math.floor(family.moneyTenths / price(good, true)))
  if (affordable <= 0) return 0
  const actualCost = affordable * price(good, true)
  if (good === 'tool') {
    for (let i = 0; i < affordable; i += 1) businessNeedTargetTool(state, family)
  } else if (good === 'cloth' || good === 'metal' || good === 'wood') {
    let unassigned = affordable
    for (const receiver of familyBusinesses(state, family)) {
      const input = RECIPES[receiver.profession].inputs[good] ?? 0
      if (!input) continue
      const reserve = (INITIAL_CONFIG.inputReserveLots[receiver.profession as keyof typeof INITIAL_CONFIG.inputReserveLots] ?? 0) * input
      const add = Math.min(unassigned, Math.max(0, reserve - receiver.productiveInventory[good]))
      receiver.productiveInventory[good] += add
      unassigned -= add
    }
  } else {
    family.household.inventory[good] += affordable
    if (good === 'clothing') for (let i = 0; i < affordable; i += 1) family.household.clothingDurabilityDays.push(INITIAL_CONFIG.clothingDurabilityDays)
  }
  family.moneyTenths -= actualCost
  events.push({ day: state.day, type: 'caravan-supply', familyId: family.id, good, quantity: affordable, moneyTenths: actualCost, from: 'caravan', to: inventoryDestination(state, family, good), detail: 'Compra de abastecimiento durante visita al pueblo' })
  reevaluateTier(state, family)
  return affordable
}

function processFundamentals(state: EconomicState, caravanPresent: boolean, events: EconomicEvent[]): void {
  const families = Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id))
  for (const family of families) {
    reevaluateTier(state, family)
    for (const good of orderedFundamentals(state, family)) {
      let needed = remainingNeed(state, family, good)
      if (!needed) continue
      const marketAvailable = available(state, family, good, caravanPresent)
      const key = waitKey(family.id, good)
      if (!marketAvailable) { delete state.waitAvailabilityDays![key]; continue }
      state.waitAvailabilityDays![key] = (state.waitAvailabilityDays![key] ?? 0) + 1
      const status = family.needs.essentials[essentialStatusKey(good)]
      if (status === 'yellow' && state.waitAvailabilityDays![key] < 2) continue
      const local = takeFromLocal(state, family, good, needed, events)
      needed -= local
      if (needed > 0 && caravanPresent && caravanLocation(state.day) === family.villageId) buyFromCaravan(state, family, good, needed, events)
    }
  }
}

function progressionTarget(family: Family, good: Good): number {
  if (family.tier < 3) return PROGRESSION_GOAL[good](family)
  if (good === 'clothing') return 4 * family.members
  if (good === 'furniture') return 4
  if (good === 'jewelry') return 4 * family.adults
  return 0
}
function progressionCoverage(family: Family, good: Good): number {
  const target = progressionTarget(family, good)
  if (target <= 0) return 1
  return (good === 'clothing' ? family.household.clothingDurabilityDays.length : family.household.inventory[good]) / target
}

function canAffordProgress(state: EconomicState, family: Family, good: Good, caravanPresent: boolean): boolean {
  const localBusinesses = Object.values(state.businesses).filter(business => business.villageId === family.villageId && business.commercialInventory[good] > 0)
  if (localBusinesses.some(business => business.familyId === family.id)) return true
  if (localBusinesses.length > 0) return family.moneyTenths >= price(good)
  return caravanPresent && caravanLocation(state.day) === family.villageId && family.moneyTenths >= price(good, true)
}

function processProgress(state: EconomicState, caravanPresent: boolean, events: EconomicEvent[]): void {
  for (const family of Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id))) {
    if (family.tier < 2) continue
    const candidates = PROGRESSION_ORDER.filter(good => progressionCoverage(family, good) < 1)
      .filter(good => canAffordProgress(state, family, good, caravanPresent))
      .sort((a, b) => progressionCoverage(family, a) - progressionCoverage(family, b) || PROGRESSION_ORDER.indexOf(a) - PROGRESSION_ORDER.indexOf(b))
    const good = candidates[0]
    if (!good) continue
    if (takeFromLocal(state, family, good, 1, events, true) === 0 && caravanPresent && caravanLocation(state.day) === family.villageId) buyProgressFromCaravan(state, family, good, events)
  }
}

function exportReserve(profession: keyof typeof RECIPES, good: Good): number {
  const recipe = RECIPES[profession]
  const dailyOutput = (recipe.outputs[good] ?? 0) / recipe.periodDays
  return Math.ceil(dailyOutput * 2)
}

function buyProgressFromCaravan(state: EconomicState, family: Family, good: Good, events: EconomicEvent[]): void {
  const cost = price(good, true)
  if (family.moneyTenths < cost) return
  family.moneyTenths -= cost
  family.household.inventory[good] += 1
  if (good === 'clothing') family.household.clothingDurabilityDays.push(INITIAL_CONFIG.clothingDurabilityDays)
  events.push({ day: state.day, type: 'caravan-supply', familyId: family.id, good, quantity: 1, moneyTenths: cost, from: 'caravan', to: inventoryDestination(state, family, good), detail: 'Compra de progreso durante visita al pueblo' })
  reevaluateTier(state, family)
}

function exportSurplus(state: EconomicState, villageId: 'village-a' | 'village-b', events: EconomicEvent[]): void {
  for (const business of Object.values(state.businesses).filter(b => b.villageId === villageId).sort((a, b) => a.id.localeCompare(b.id))) {
    for (const good of GOODS) {
      const reserve = exportReserve(business.profession, good)
      const quantity = Math.max(0, business.commercialInventory[good] - reserve)
      if (!quantity) continue
      const revenue = quantity * GOODS_CATALOG[good].caravanBuyPriceTenths
      business.commercialInventory[good] -= quantity
      state.families[business.familyId].moneyTenths += revenue
      events.push({ day: state.day, type: 'caravan-sale', familyId: business.familyId, businessId: business.id, good, quantity, moneyTenths: revenue, from: business.id, to: 'caravan', detail: `Excedente exportado; reserva ${reserve}` })
    }
  }
}

function recordCoreEvents(previous: EconomicState, state: EconomicState, events: EconomicEvent[]): void {
  for (const oldFamily of Object.values(previous.families).sort((a, b) => a.id.localeCompare(b.id))) {
    const family = state.families[oldFamily.id]
    for (const good of ['food', 'firewood'] as const) {
      const used = oldFamily.household.inventory[good] - family.household.inventory[good]
      if (used > 0) events.push({ day: state.day, type: 'consumption', familyId: family.id, good, quantity: used, from: `family:${family.id}:household`, to: 'consumption' })
    }
    const clothingWorn = oldFamily.household.clothingDurabilityDays.length - family.household.clothingDurabilityDays.length
    if (clothingWorn > 0) events.push({ day: state.day, type: 'consumption', familyId: family.id, good: 'clothing', quantity: clothingWorn, from: `family:${family.id}:household`, to: 'wear' })
    const durabilityUsed = oldFamily.household.clothingDurabilityDays.reduce((sum, days) => sum + days, 0)
      - family.household.clothingDurabilityDays.reduce((sum, days) => sum + days, 0)
    if (durabilityUsed > 0) events.push({ day: state.day, type: 'clothing-wear', familyId: family.id, good: 'clothing', quantity: durabilityUsed, detail: 'días de uso consumidos' })
  }
  for (const oldBusiness of Object.values(previous.businesses).sort((a, b) => a.id.localeCompare(b.id))) {
    const business = state.businesses[oldBusiness.id]
    const recipe = RECIPES[business.profession]
    for (const goodKey of Object.keys(recipe.inputs)) {
      const good = goodKey as Good
      if (oldBusiness.productiveInventory[good] > business.productiveInventory[good]) events.push({ day: state.day, type: 'production-input', businessId: business.id, familyId: business.familyId, good, quantity: oldBusiness.productiveInventory[good] - business.productiveInventory[good], from: 'productive-inventory', to: 'production' })
    }
    for (const good of GOODS) {
      const produced = business.commercialInventory[good] - oldBusiness.commercialInventory[good]
      if (produced > 0) events.push({ day: state.day, type: 'production', businessId: business.id, familyId: business.familyId, good, quantity: produced, from: 'production', to: 'commercial-inventory' })
    }
    const worn = oldBusiness.tools.reduce((sum, tool) => sum + tool.remainingWorkDays, 0) - business.tools.reduce((sum, tool) => sum + tool.remainingWorkDays, 0)
    if (worn > 0) events.push({ day: state.day, type: 'tool-wear', businessId: business.id, familyId: business.familyId, quantity: worn, detail: 'días de trabajo de herramienta consumidos' })
  }
}

/** One complete autonomous economic tick, in the order approved in §9.3. */
export function stepAutonomousDay(previous: EconomicState): DailyEconomyResult {
  const state = stepEconomicDay(previous)
  state.waitAvailabilityDays = { ...(previous.waitAvailabilityDays ?? {}) }
  const startingTiers = Object.fromEntries(Object.values(previous.families).map(family => [family.id, family.tier]))
  const events: EconomicEvent[] = []
  recordCoreEvents(previous, state, events)
  const location = caravanLocation(state.day)
  const caravanPresent = location === 'village-a' || location === 'village-b'
  processFundamentals(state, caravanPresent, events)
  processProgress(state, caravanPresent, events)
  if (location === 'village-a' || location === 'village-b') exportSurplus(state, location, events)
  for (const family of Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id))) {
    reevaluateTier(state, family)
    if (startingTiers[family.id] !== family.tier) events.push({ day: state.day, type: 'tier-change', familyId: family.id, detail: `${startingTiers[family.id]}->${family.tier}` })
  }
  for (const key of Object.keys(state.waitAvailabilityDays!)) {
    const [familyId, good] = key.split(':') as [string, Good]
    const family = state.families[familyId]
    if (!family || remainingNeed(state, family, good) <= 0 || !available(state, family, good, caravanPresent)) delete state.waitAvailabilityDays![key]
  }
  assertValidState(state)
  return { state, events }
}

export interface SimulationReport {
  days: number
  finalDay: number
  familyMoneyTenths: Record<string, number>
  householdGoods: Record<string, Inventory>
  businessCommercialGoods: Record<string, Inventory>
  businessProductiveGoods: Record<string, Inventory>
  tiers: Record<string, number>
  eventCounts: Record<string, number>
  activityByGood: {
    produced: Partial<Record<Good, number>>
    productionInputs: Partial<Record<Good, number>>
    consumed: Partial<Record<Good, number>>
    locallyPurchased: Partial<Record<Good, number>>
    caravanSupplied: Partial<Record<Good, number>>
    caravanExported: Partial<Record<Good, number>>
  }
  events: EconomicEvent[]
}

export function simulateDays(days: number, initial: EconomicState = createSimulationInitialState()): SimulationReport {
  if (!Number.isInteger(days) || days < 0) throw new Error('La duración debe ser un número entero no negativo.')
  let state = initial
  const events: EconomicEvent[] = []
  for (let i = 0; i < days; i += 1) {
    const result = stepAutonomousDay(state)
    state = result.state
    events.push(...result.events)
  }
  const eventCounts: Record<string, number> = {}
  const activityByGood: SimulationReport['activityByGood'] = {
    produced: {}, productionInputs: {}, consumed: {}, locallyPurchased: {}, caravanSupplied: {}, caravanExported: {},
  }
  for (const event of events) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1
  const activityTypeByEvent = {
    production: 'produced',
    'production-input': 'productionInputs',
    consumption: 'consumed',
    purchase: 'locallyPurchased',
    'caravan-supply': 'caravanSupplied',
    'caravan-sale': 'caravanExported',
  } as const
  for (const event of events) {
    const bucket = activityTypeByEvent[event.type as keyof typeof activityTypeByEvent]
    if (!bucket || !event.good || event.quantity === undefined) continue
    activityByGood[bucket][event.good] = (activityByGood[bucket][event.good] ?? 0) + event.quantity
  }
  return {
    days,
    finalDay: state.day,
    familyMoneyTenths: Object.fromEntries(Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id)).map(f => [f.id, f.moneyTenths])),
    householdGoods: Object.fromEntries(Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id)).map(f => [f.id, { ...f.household.inventory }])),
    businessCommercialGoods: Object.fromEntries(Object.values(state.businesses).sort((a, b) => a.id.localeCompare(b.id)).map(b => [b.id, { ...b.commercialInventory }])),
    businessProductiveGoods: Object.fromEntries(Object.values(state.businesses).sort((a, b) => a.id.localeCompare(b.id)).map(b => [b.id, { ...b.productiveInventory }])),
    tiers: Object.fromEntries(Object.values(state.families).sort((a, b) => a.id.localeCompare(b.id)).map(f => [f.id, f.tier])),
    eventCounts,
    activityByGood,
    events,
  }
}

function createSimulationInitialState(): EconomicState {
  // Lazy import is unnecessary at runtime; this wrapper keeps the runner API compact.
  return initialStateFactory()
}

import { createInitialState as initialStateFactory } from './scenario.js'
