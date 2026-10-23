import { GOODS, GOODS_CATALOG, INITIAL_CONFIG, RECIPES, emptyInventory, type EconomicEvent, type EconomicState, type GameState, type Good, type Inventory, type VillageId } from './model.js'
import { processImmediateRedPurchases, stepAutonomousDay } from './autonomous.js'
import { reevaluateTier } from './needs.js'
import { assertValidState } from './simulation.js'
import { createInitialState } from './scenario.js'

export type PlayerActionErrorCode = 'invalid-quantity' | 'unknown-business' | 'unknown-family' | 'wrong-village' | 'insufficient-funds' | 'insufficient-stock' | 'over-capacity' | 'not-carried' | 'not-needed' | 'not-relevant' | 'daily-progress-limit' | 'invalid-destination'

export type PlayerActionResult =
  | { ok: true; state: GameState; events: EconomicEvent[]; quantity: number; moneyTenths: number }
  | { ok: false; state: GameState; events: []; error: { code: PlayerActionErrorCode; message: string } }

function cloneInventory(inventory: Inventory): Inventory { return { ...inventory } }
function cloneEconomicState(state: EconomicState): EconomicState {
  return {
    day: state.day,
    families: Object.fromEntries(Object.entries(state.families).map(([id, family]) => [id, {
      ...family,
      household: { inventory: cloneInventory(family.household.inventory), clothingDurabilityDays: [...family.household.clothingDurabilityDays] },
      businessIds: [...family.businessIds],
      needs: { ...family.needs, essentials: { ...family.needs.essentials }, progression: { ...family.needs.progression } },
    }])),
    businesses: Object.fromEntries(Object.entries(state.businesses).map(([id, business]) => [id, {
      ...business,
      commercialInventory: cloneInventory(business.commercialInventory),
      productiveInventory: cloneInventory(business.productiveInventory),
      tools: business.tools.map(tool => ({ ...tool })),
    }])),
    ...(state.waitAvailabilityDays ? { waitAvailabilityDays: { ...state.waitAvailabilityDays } } : {}),
  }
}

export function createInitialGameState(economy: EconomicState = createInitialState()): GameState {
  return {
    economy,
    player: { villageId: 'village-a', moneyTenths: 3000, inventory: emptyInventory(), capacityHalfUnits: 40 },
    progressBoughtToday: {},
    eventLog: [],
  }
}

export function playerLoadHalfUnits(inventory: Inventory): number {
  return GOODS.reduce((total, good) => total + inventory[good] * GOODS_CATALOG[good].weightHalfUnits, 0)
}

function reject(state: GameState, code: PlayerActionErrorCode, message: string): PlayerActionResult {
  return { ok: false, state, events: [], error: { code, message } }
}

function validQuantity(quantity: number): boolean { return Number.isInteger(quantity) && quantity > 0 }
function commitTrade(state: GameState, economy: EconomicState, playerInventory: Inventory, playerMoneyTenths: number, progressBoughtToday: Record<string, number>, events: EconomicEvent[], quantity: number): PlayerActionResult {
  const next: GameState = {
    economy,
    player: { ...state.player, inventory: playerInventory, moneyTenths: playerMoneyTenths },
    progressBoughtToday,
    eventLog: [...state.eventLog, ...events],
  }
  assertValidState(economy)
  return { ok: true, state: next, events, quantity, moneyTenths: events[0]?.moneyTenths ?? 0 }
}

/** Buy only from a business's commercial inventory. Checks all constraints before applying any transfer. */
export function buyFromBusiness(state: GameState, businessId: string, good: Good, quantity: number): PlayerActionResult {
  const economy = state.economy
  const business = economy.businesses[businessId]
  if (!business) return reject(state, 'unknown-business', `No existe el negocio ${businessId}.`)
  if (business.villageId !== state.player.villageId) return reject(state, 'wrong-village', 'El negocio está en otro pueblo.')
  if (!validQuantity(quantity)) return reject(state, 'invalid-quantity', 'La cantidad debe ser un entero positivo.')
  if (business.commercialInventory[good] < quantity) return reject(state, 'insufficient-stock', 'El negocio no tiene suficiente mercancía comercial.')
  const unitPrice = GOODS_CATALOG[good].playerBuyPriceTenths
  const cost = unitPrice * quantity
  if (state.player.moneyTenths < cost) return reject(state, 'insufficient-funds', 'No tienes dinero suficiente.')
  if (playerLoadHalfUnits(state.player.inventory) + quantity * GOODS_CATALOG[good].weightHalfUnits > state.player.capacityHalfUnits) {
    return reject(state, 'over-capacity', 'La compra supera la capacidad de carga.')
  }

  const nextEconomy = cloneEconomicState(economy)
  const nextBusiness = nextEconomy.businesses[businessId]
  nextBusiness.commercialInventory[good] -= quantity
  const sellerFamily = nextEconomy.families[nextBusiness.familyId]
  sellerFamily.moneyTenths += cost
  reevaluateTier(nextEconomy, sellerFamily)
  const inventory = cloneInventory(state.player.inventory)
  inventory[good] += quantity
  const event: EconomicEvent = { day: economy.day, type: 'player-purchase', familyId: nextBusiness.familyId, businessId, good, quantity, moneyTenths: cost, from: businessId, to: 'player', detail: `Compra del jugador a ${unitPrice / 10} monedas por unidad` }
  return commitTrade(state, nextEconomy, inventory, state.player.moneyTenths - cost, state.progressBoughtToday, [event], quantity)
}

export type PlayerSaleTarget = { type: 'household'; familyId: string } | { type: 'business'; businessId: string }

export interface PlayerTradeQuote {
  good: Good
  unitPriceTenths: number
  maxQuantity: number
  totalTenths: number
  moneyAfterTenths: number
  loadAfterHalfUnits: number
  rejection?: string
}

/** Safe total calculation for the currently entered amount in the trade panel. */
export function tradeTotalTenthsForQuantity(quantity: number, unitPriceTenths: number): number | undefined {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(unitPriceTenths) || unitPriceTenths <= 0) return undefined
  const total = quantity * unitPriceTenths
  return Number.isSafeInteger(total) ? total : undefined
}

export type TradeQuantityStatus = 'invalid' | 'within-maximum' | 'exceeds-maximum'

/** Classifies the entered amount against the latest quote maximum. */
export function tradeQuantityStatus(quantity: number, maximum: number): TradeQuantityStatus {
  if (!Number.isSafeInteger(quantity) || quantity <= 0 || !Number.isSafeInteger(maximum) || maximum < 0) return 'invalid'
  return quantity <= maximum ? 'within-maximum' : 'exceeds-maximum'
}

interface NeedTarget { maxQuantity: number; destination: string; basicQuantity: number; progressUnits: number; familyId: string }

function householdNeed(economy: EconomicState, familyId: string, good: Good): NeedTarget | undefined {
  const family = economy.families[familyId]
  if (!family) return undefined
  const inventory = family.household.inventory
  if (good === 'food') {
    const quantity = Math.max(0, family.members * 14 - inventory.food)
    return { maxQuantity: quantity, basicQuantity: quantity, destination: `family:${family.id}:household`, progressUnits: 0, familyId }
  }
  if (good === 'firewood') {
    const quantity = Math.max(0, 14 - inventory.firewood)
    return { maxQuantity: quantity, basicQuantity: quantity, destination: `family:${family.id}:household`, progressUnits: 0, familyId }
  }
  if (good === 'clothing') {
    const goal = family.tier === 1 ? family.members : family.tier === 2 ? 2 * family.members : 4 * family.members
    const have = family.household.clothingDurabilityDays.length
    const basicQuantity = Math.max(0, family.members - have)
    const progressUnits = family.tier > 1 ? Math.max(0, goal - Math.max(have, family.members)) : 0
    return { maxQuantity: basicQuantity + progressUnits, basicQuantity, destination: `family:${family.id}:household`, progressUnits, familyId }
  }
  if (family.tier < 2) return undefined
  const furnitureGoal = family.tier === 2 ? family.members : 4
  const jewelryGoal = family.tier === 2 ? family.adults : 4 * family.adults
  if (good === 'furniture') {
    const progressUnits = Math.max(0, furnitureGoal - inventory.furniture)
    return { maxQuantity: progressUnits, basicQuantity: 0, destination: `family:${family.id}:household`, progressUnits, familyId }
  }
  if (good === 'jewelry') {
    const progressUnits = Math.max(0, jewelryGoal - inventory.jewelry)
    return { maxQuantity: progressUnits, basicQuantity: 0, destination: `family:${family.id}:household`, progressUnits, familyId }
  }
  return undefined
}

function businessNeed(economy: EconomicState, businessId: string, good: Good): NeedTarget | undefined {
  const business = economy.businesses[businessId]
  if (!business) return undefined
  const family = economy.families[business.familyId]
  if (!family) return undefined
  if (good === 'tool') {
    if (!RECIPES[business.profession].requiresTools) return undefined
    const missing = Math.max(0, 2 - business.tools.length)
    return { maxQuantity: missing, basicQuantity: missing, destination: `business:${business.id}:tools`, progressUnits: 0, familyId: family.id }
  }
  const input = RECIPES[business.profession].inputs[good]
  if (!input) return undefined
  const reserveLots = INITIAL_CONFIG.inputReserveLots[business.profession as keyof typeof INITIAL_CONFIG.inputReserveLots]
  if (reserveLots === undefined) return undefined
  const target = reserveLots * input
  const missing = Math.max(0, target - business.productiveInventory[good])
  return { maxQuantity: missing, basicQuantity: missing, destination: `business:${business.id}:productive`, progressUnits: 0, familyId: family.id }
}

/** Returns only goods currently relevant to the selected recipient. */
export function saleGoodsForTarget(state: GameState, target: PlayerSaleTarget): Good[] {
  if (target.type === 'household') {
    const family = state.economy.families[target.familyId]
    if (!family || family.villageId !== state.player.villageId) return []
    return GOODS.filter(good => (householdNeed(state.economy, target.familyId, good)?.maxQuantity ?? 0) > 0)
  }
  const business = state.economy.businesses[target.businessId]
  if (!business || business.villageId !== state.player.villageId) return []
  return GOODS.filter(good => (businessNeed(state.economy, target.businessId, good)?.maxQuantity ?? 0) > 0)
}

/** Calculates a current purchase maximum for display; buyFromBusiness remains the authority at confirmation. */
export function quoteBuyFromBusiness(state: GameState, businessId: string, good: Good): PlayerTradeQuote {
  const business = state.economy.businesses[businessId]
  const unitPriceTenths = GOODS_CATALOG[good].playerBuyPriceTenths
  const loadNow = playerLoadHalfUnits(state.player.inventory)
  const maxByStock = business?.villageId === state.player.villageId ? business.commercialInventory[good] : 0
  const maxByMoney = Math.floor(state.player.moneyTenths / unitPriceTenths)
  const maxByLoad = Math.floor((state.player.capacityHalfUnits - loadNow) / GOODS_CATALOG[good].weightHalfUnits)
  const maxQuantity = Math.max(0, Math.min(maxByStock, maxByMoney, maxByLoad))
  const totalTenths = maxQuantity * unitPriceTenths
  let rejection: string | undefined
  if (!business) rejection = 'Negocio inexistente.'
  else if (business.villageId !== state.player.villageId) rejection = 'El negocio está en otro pueblo.'
  else if (maxByStock <= 0) rejection = 'No hay existencias comerciales disponibles.'
  else if (maxByMoney <= 0) rejection = 'No tienes dinero suficiente.'
  else if (maxByLoad <= 0) rejection = 'No tienes capacidad de carga disponible.'
  return { good, unitPriceTenths, maxQuantity, totalTenths, moneyAfterTenths: state.player.moneyTenths - totalTenths, loadAfterHalfUnits: loadNow + maxQuantity * GOODS_CATALOG[good].weightHalfUnits, ...(rejection ? { rejection } : {}) }
}

/** Calculates the currently acceptable sale maximum, including carried stock and family funds. */
export function quoteSellToNeed(state: GameState, target: PlayerSaleTarget, good: Good): PlayerTradeQuote {
  const unitPriceTenths = GOODS_CATALOG[good].playerSellPriceTenths
  const loadNow = playerLoadHalfUnits(state.player.inventory)
  let need: NeedTarget | undefined
  let family: EconomicState['families'][string] | undefined
  if (target.type === 'household') {
    family = state.economy.families[target.familyId]
    if (family?.villageId === state.player.villageId) need = householdNeed(state.economy, target.familyId, good)
  } else {
    const business = state.economy.businesses[target.businessId]
    if (business?.villageId === state.player.villageId) {
      family = state.economy.families[business.familyId]
      need = businessNeed(state.economy, target.businessId, good)
    }
  }
  const progressKey = need ? `${state.economy.day}:${need.familyId}` : ''
  const progressRemaining = need ? Math.max(0, 1 - (state.progressBoughtToday[progressKey] ?? 0)) : 0
  const acceptable = need ? Math.min(need.maxQuantity, need.basicQuantity + (need.progressUnits > 0 ? progressRemaining : 0)) : 0
  const maxQuantity = family && need
    ? Math.max(0, Math.min(state.player.inventory[good], acceptable, Math.floor(family.moneyTenths / unitPriceTenths)))
    : 0
  const totalTenths = maxQuantity * unitPriceTenths
  let rejection: string | undefined
  if (!family) rejection = target.type === 'household' ? 'Familia inexistente o en otro pueblo.' : 'Negocio inexistente o en otro pueblo.'
  else if (!need) rejection = 'Este bien no corresponde a una necesidad actual.'
  else if (state.player.inventory[good] <= 0) rejection = 'No llevas este bien.'
  else if (acceptable <= 0) rejection = need.progressUnits > 0 && progressRemaining === 0 ? 'La familia ya recibió su bien de progreso de hoy.' : 'La necesidad ya está cubierta.'
  else if (family.moneyTenths < unitPriceTenths) rejection = 'La familia no tiene dinero suficiente.'
  return { good, unitPriceTenths, maxQuantity, totalTenths, moneyAfterTenths: state.player.moneyTenths + totalTenths, loadAfterHalfUnits: loadNow - maxQuantity * GOODS_CATALOG[good].weightHalfUnits, ...(rejection ? { rejection } : {}) }
}

/** Offer carried goods directly to one household or the relevant business. Legacy callers may accept an affordable partial quantity. */
export function sellToNeed(state: GameState, target: PlayerSaleTarget, good: Good, quantity: number, options: { requireFullAcceptance?: boolean } = {}): PlayerActionResult {
  if (!validQuantity(quantity)) return reject(state, 'invalid-quantity', 'La cantidad debe ser un entero positivo.')
  if (state.player.inventory[good] < quantity) {
    if (options.requireFullAcceptance) {
      const maximum = quoteSellToNeed(state, target, good).maxQuantity
      return reject(state, 'not-carried', `No llevas esa cantidad. Máximo aceptable actual: ${maximum}.`)
    }
    return reject(state, 'not-carried', 'No llevas esa cantidad.')
  }
  let need: NeedTarget | undefined
  if (target.type === 'household') {
    const family = state.economy.families[target.familyId]
    if (!family) return reject(state, 'unknown-family', `No existe la familia ${target.familyId}.`)
    if (family.villageId !== state.player.villageId) return reject(state, 'wrong-village', 'La familia está en otro pueblo.')
    need = householdNeed(state.economy, target.familyId, good)
  } else {
    const business = state.economy.businesses[target.businessId]
    if (!business) return reject(state, 'unknown-business', `No existe el negocio ${target.businessId}.`)
    if (business.villageId !== state.player.villageId) return reject(state, 'wrong-village', 'El negocio está en otro pueblo.')
    need = businessNeed(state.economy, target.businessId, good)
  }
  if (!need) return reject(state, 'not-relevant', 'Ese bien no corresponde a una necesidad del destinatario.')
  if (need.maxQuantity <= 0) return reject(state, 'not-needed', 'El destinatario ya cubrió esa necesidad.')
  const progressKey = `${state.economy.day}:${need.familyId}`
  const progressRemaining = Math.max(0, 1 - (state.progressBoughtToday[progressKey] ?? 0))
  const progressMax = need.progressUnits > 0 ? progressRemaining : 0
  const acceptableQuantity = Math.min(need.maxQuantity, need.basicQuantity + progressMax)
  if (acceptableQuantity === 0) {
    if (need.progressUnits > 0 && progressRemaining === 0) return reject(state, 'daily-progress-limit', 'La familia ya recibió su bien de progreso de hoy.')
    return reject(state, 'not-needed', 'El destinatario no acepta esa cantidad.')
  }
  if (quantity > acceptableQuantity) {
    if (need.progressUnits > 0 && progressRemaining === 0 && quantity > need.basicQuantity) {
      if (options.requireFullAcceptance) {
        const maximum = quoteSellToNeed(state, target, good).maxQuantity
        return reject(state, 'daily-progress-limit', `La familia ya recibió su bien de progreso de hoy. Máximo aceptable actual: ${maximum}.`)
      }
      return reject(state, 'daily-progress-limit', 'La familia ya recibió su bien de progreso de hoy.')
    }
    if (options.requireFullAcceptance) {
      const maximum = quoteSellToNeed(state, target, good).maxQuantity
      return reject(state, 'not-needed', `La cantidad ofrecida supera la necesidad actual. Máximo aceptable actual: ${maximum}.`)
    }
    return reject(state, 'not-needed', 'La cantidad ofrecida supera la necesidad aceptable actual.')
  }
  const unitPrice = GOODS_CATALOG[good].playerSellPriceTenths
  const family = state.economy.families[need.familyId]
  const accepted = Math.min(quantity, Math.floor(family.moneyTenths / unitPrice))
  if (options.requireFullAcceptance && accepted < quantity) {
    const maximum = quoteSellToNeed(state, target, good).maxQuantity
    return reject(state, 'insufficient-funds', `La familia no tiene fondos para esa cantidad. Máximo aceptable actual: ${maximum}.`)
  }
  if (accepted <= 0) {
    if (family.moneyTenths < unitPrice) return reject(state, 'insufficient-funds', 'La familia no tiene dinero suficiente.')
    return reject(state, 'not-needed', 'El destinatario no acepta esa cantidad.')
  }

  const cost = unitPrice * accepted
  const nextEconomy = cloneEconomicState(state.economy)
  const nextFamily = nextEconomy.families[need.familyId]
  nextFamily.moneyTenths -= cost
  if (target.type === 'household') {
    nextFamily.household.inventory[good] += accepted
    if (good === 'clothing') nextFamily.household.clothingDurabilityDays.push(...Array.from({ length: accepted }, () => INITIAL_CONFIG.clothingDurabilityDays))
  } else if (good === 'tool') {
    const nextBusiness = nextEconomy.businesses[target.businessId]
    nextBusiness.tools.push(...Array.from({ length: accepted }, () => ({ remainingWorkDays: INITIAL_CONFIG.toolWorkDays })))
  } else {
    nextEconomy.businesses[target.businessId].productiveInventory[good] += accepted
  }
  reevaluateTier(nextEconomy, nextFamily)
  const nextPlayerInventory = cloneInventory(state.player.inventory)
  nextPlayerInventory[good] -= accepted
  const progress = { ...state.progressBoughtToday }
  const progressAccepted = Math.max(0, accepted - need.basicQuantity)
  if (progressAccepted > 0) progress[progressKey] = (progress[progressKey] ?? 0) + progressAccepted
  const event: EconomicEvent = { day: state.economy.day, type: 'player-sale', familyId: nextFamily.id, ...(target.type === 'business' ? { businessId: target.businessId } : {}), good, quantity: accepted, moneyTenths: cost, from: 'player', to: need.destination, detail: `Venta directa a ${unitPrice / 10} monedas por unidad` }
  let finalEconomy = nextEconomy
  let events = [event]
  if (target.type === 'business') {
    const immediate = processImmediateRedPurchases(nextEconomy, nextFamily.id)
    finalEconomy = immediate.state
    events = [...events, ...immediate.events]
  }
  return commitTrade(state, finalEconomy, nextPlayerInventory, state.player.moneyTenths + cost, progress, events, accepted)
}

function commitDay(state: GameState, economy: EconomicState, location: VillageId, events: EconomicEvent[]): PlayerActionResult {
  const timeEvent: EconomicEvent = { day: economy.day, type: 'manual-day', from: String(state.economy.day), to: String(economy.day), detail: 'Avance manual de un día económico global' }
  const nextEvents = [...events, timeEvent]
  return {
    ok: true,
    state: { ...state, economy, player: { ...state.player, villageId: location }, progressBoughtToday: {}, eventLog: [...state.eventLog, ...nextEvents] },
    events: nextEvents,
    quantity: 0,
    moneyTenths: 0,
  }
}

/** Advances exactly one global autonomous cycle without changing the player's village. */
export function advancePlayerDay(state: GameState): PlayerActionResult {
  const result = stepAutonomousDay(state.economy)
  return commitDay(state, result.state, state.player.villageId, result.events)
}

/** Travel is an instantaneous selector action followed by exactly one global economic day. */
export function travelToVillage(state: GameState, destination: VillageId): PlayerActionResult {
  if (destination !== 'village-a' && destination !== 'village-b') return reject(state, 'invalid-destination', 'Solo se puede viajar a Pueblo A o Pueblo B.')
  if (destination === state.player.villageId) return reject(state, 'invalid-destination', 'El destino debe ser el otro pueblo.')
  const result = stepAutonomousDay(state.economy)
  const timeEvent: EconomicEvent = { day: result.state.day, type: 'player-travel', from: state.player.villageId, to: destination, detail: 'Viaje de un día; economía global procesada una vez' }
  const events = [...result.events, timeEvent]
  return {
    ok: true,
    state: { ...state, economy: result.state, player: { ...state.player, villageId: destination }, progressBoughtToday: {}, eventLog: [...state.eventLog, ...events] },
    events,
    quantity: 0,
    moneyTenths: 0,
  }
}
