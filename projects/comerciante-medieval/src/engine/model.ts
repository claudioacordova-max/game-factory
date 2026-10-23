export const GOODS = [
  'food', 'firewood', 'wood', 'metal', 'cloth', 'tool', 'clothing', 'furniture', 'jewelry',
] as const

export type Good = typeof GOODS[number]
export type VillageId = 'village-a' | 'village-b'
export type Profession = 'farmer' | 'woodcutter' | 'blacksmith' | 'tailor' | 'miner' | 'carpenter' | 'jeweler'
export type Status = 'red' | 'yellow' | 'green'
export type Tier = 1 | 2 | 3
export type Inventory = Record<Good, number>

export interface GoodDefinition {
  readonly id: Good
  readonly name: string
  readonly referencePriceTenths: number
  readonly caravanBuyPriceTenths: number
  readonly caravanSellPriceTenths: number
  readonly playerBuyPriceTenths: number
  readonly playerSellPriceTenths: number
  /** Weight in half-unit ticks, so 0.5 has an exact representation. */
  readonly weightHalfUnits: number
}

export interface Recipe {
  readonly outputs: Partial<Record<Good, number>>
  readonly inputs: Partial<Record<Good, number>>
  readonly periodDays: number
  readonly requiresTools: boolean
}

export interface ToolDurability {
  /** Remaining days of actual work, not calendar days. */
  remainingWorkDays: number
}

export interface Business {
  id: string
  familyId: string
  villageId: VillageId
  profession: Profession
  commercialInventory: Inventory
  productiveInventory: Inventory
  tools: ToolDurability[]
}

export interface Household {
  inventory: Inventory
  /** One remaining-use counter per usable garment. */
  clothingDurabilityDays: number[]
}

export interface NeedReport {
  /** Basic needs that support the current tier. */
  essentials: Partial<Record<'food' | 'firewood' | 'clothing' | 'tools' | 'inputs', Status>>
  /** Tier-specific durable-good objectives, populated from tier 2 onward. */
  progression: Partial<Record<'clothing' | 'furniture' | 'jewelry', Status>>
  tierOneUpgradeMoneyMet: boolean
  tierThreeUpgradeMoneyMet: boolean
  prosperityGoalsMet: boolean
}

export interface Family {
  id: string
  name: string
  villageId: VillageId
  members: number
  adults: number
  /** Shared household and business fund, represented in tenths of a coin. */
  moneyTenths: number
  tier: Tier
  household: Household
  businessIds: string[]
  needs: NeedReport
}

export interface EconomicState {
  day: number
  families: Record<string, Family>
  businesses: Record<string, Business>
  /** Consecutive economic days a required good has been available to a family. */
  waitAvailabilityDays?: Record<string, number>
}

export type EconomicEventType = 'consumption' | 'clothing-wear' | 'production' | 'production-input' | 'tool-wear' | 'purchase' | 'internal-transfer' | 'caravan-sale' | 'caravan-supply' | 'tier-change' | 'player-purchase' | 'player-sale' | 'manual-day' | 'player-travel'

export interface EconomicEvent {
  day: number
  type: EconomicEventType
  familyId?: string
  businessId?: string
  good?: Good
  quantity?: number
  moneyTenths?: number
  from?: string
  to?: string
  detail?: string
}

export interface PlayerState {
  villageId: VillageId
  moneyTenths: number
  /** Carried goods use integer quantities; weight is calculated from the catalog. */
  inventory: Inventory
  capacityHalfUnits: number
}

export interface GameState {
  economy: EconomicState
  player: PlayerState
  /** Day marker for the one-unit-per-family daily progress purchase limit. */
  progressBoughtToday: Record<string, number>
  eventLog: EconomicEvent[]
}

export const GOODS_CATALOG: Readonly<Record<Good, GoodDefinition>> = {
  food:       { id: 'food',       name: 'Comida',       referencePriceTenths: 50,   caravanBuyPriceTenths: 40,   caravanSellPriceTenths: 60,   playerBuyPriceTenths: 45,   playerSellPriceTenths: 55,   weightHalfUnits: 2 },
  firewood:   { id: 'firewood',   name: 'Leña',         referencePriceTenths: 80,   caravanBuyPriceTenths: 64,   caravanSellPriceTenths: 96,   playerBuyPriceTenths: 72,   playerSellPriceTenths: 88,   weightHalfUnits: 4 },
  wood:       { id: 'wood',       name: 'Madera',       referencePriceTenths: 100,  caravanBuyPriceTenths: 80,   caravanSellPriceTenths: 120,  playerBuyPriceTenths: 90,   playerSellPriceTenths: 110,  weightHalfUnits: 4 },
  metal:      { id: 'metal',      name: 'Metal',        referencePriceTenths: 220,  caravanBuyPriceTenths: 176,  caravanSellPriceTenths: 264,  playerBuyPriceTenths: 198,  playerSellPriceTenths: 242,  weightHalfUnits: 4 },
  cloth:      { id: 'cloth',      name: 'Tela',         referencePriceTenths: 180,  caravanBuyPriceTenths: 144,  caravanSellPriceTenths: 216,  playerBuyPriceTenths: 162,  playerSellPriceTenths: 198,  weightHalfUnits: 2 },
  tool:       { id: 'tool',       name: 'Herramienta',  referencePriceTenths: 2000, caravanBuyPriceTenths: 1600, caravanSellPriceTenths: 2400, playerBuyPriceTenths: 1800, playerSellPriceTenths: 2200, weightHalfUnits: 8 },
  clothing:   { id: 'clothing',   name: 'Ropa',         referencePriceTenths: 900,  caravanBuyPriceTenths: 720,  caravanSellPriceTenths: 1080, playerBuyPriceTenths: 810,  playerSellPriceTenths: 990,  weightHalfUnits: 2 },
  furniture:  { id: 'furniture',  name: 'Mueble',       referencePriceTenths: 1000, caravanBuyPriceTenths: 800,  caravanSellPriceTenths: 1200, playerBuyPriceTenths: 900,  playerSellPriceTenths: 1100, weightHalfUnits: 10 },
  jewelry:    { id: 'jewelry',    name: 'Joya',         referencePriceTenths: 1800, caravanBuyPriceTenths: 1440, caravanSellPriceTenths: 2160, playerBuyPriceTenths: 1620, playerSellPriceTenths: 1980, weightHalfUnits: 1 },
}

export const RECIPES: Readonly<Record<Profession, Recipe>> = {
  farmer:     { outputs: { food: 10 }, periodDays: 1, inputs: {}, requiresTools: true },
  woodcutter: { outputs: { firewood: 5, wood: 2 }, periodDays: 1, inputs: {}, requiresTools: true },
  blacksmith: { outputs: { tool: 1 }, periodDays: 4, inputs: { metal: 2 }, requiresTools: false },
  tailor:     { outputs: { clothing: 1 }, periodDays: 2, inputs: { cloth: 1 }, requiresTools: false },
  miner:      { outputs: { metal: 2 }, periodDays: 1, inputs: {}, requiresTools: true },
  carpenter:  { outputs: { furniture: 1 }, periodDays: 2, inputs: { wood: 2 }, requiresTools: false },
  jeweler:    { outputs: { jewelry: 1 }, periodDays: 4, inputs: { metal: 1 }, requiresTools: false },
}

export const INITIAL_CONFIG = {
  startingDay: 1,
  familyMoneyTenths: 4500,
  householdFood: 28,
  householdFirewood: 14,
  householdClothing: 2,
  clothingDurabilityDays: 80,
  toolWorkDays: 60,
  foodPerMemberPerDay: 1,
  firewoodPerFamilyPerDay: 1,
  redCoverageDays: 7,
  greenCoverageDays: 14,
  inputReserveLots: { blacksmith: 3, tailor: 5, carpenter: 5, jeweler: 3 } as const,
  toolGreenCount: 2,
  tierTwoMoneyTenths: 10000,
  tierThreeMoneyTenths: 20000,
} as const

export function emptyInventory(): Inventory {
  return { food: 0, firewood: 0, wood: 0, metal: 0, cloth: 0, tool: 0, clothing: 0, furniture: 0, jewelry: 0 }
}
