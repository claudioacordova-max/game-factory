import { GOODS, RECIPES, INITIAL_CONFIG, type Business, type EconomicState, type Family, type Good, type Inventory, type ToolDurability } from './model.js'
import { reevaluateTier } from './needs.js'

function cloneInventory(inventory: Inventory): Inventory {
  return { ...inventory }
}

function cloneBusiness(business: Business): Business {
  return {
    ...business,
    commercialInventory: cloneInventory(business.commercialInventory),
    productiveInventory: cloneInventory(business.productiveInventory),
    tools: business.tools.map(tool => ({ ...tool })),
  }
}

function cloneFamily(family: Family): Family {
  return {
    ...family,
    household: { inventory: cloneInventory(family.household.inventory), clothingDurabilityDays: [...family.household.clothingDurabilityDays] },
    businessIds: [...family.businessIds],
    needs: { ...family.needs, essentials: { ...family.needs.essentials }, progression: { ...family.needs.progression } },
  }
}

export function assertValidState(state: EconomicState): void {
  if (!Number.isInteger(state.day) || state.day < 1) throw new Error('El día debe ser un entero positivo.')
  for (const family of Object.values(state.families)) {
    if (!Number.isInteger(family.moneyTenths) || family.moneyTenths < 0) throw new Error(`Saldo inválido en ${family.id}.`)
    if (!Number.isInteger(family.members) || family.members < 1 || !Number.isInteger(family.adults) || family.adults < 0 || family.adults > family.members) {
      throw new Error(`Tamaño familiar inválido en ${family.id}.`)
    }
    for (const good of GOODS) {
      const quantity = family.household.inventory[good]
      if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Cantidad doméstica inválida: ${family.id}/${good}.`)
    }
    if (family.household.inventory.clothing !== family.household.clothingDurabilityDays.length) {
      throw new Error(`La ropa utilizable debe coincidir con su durabilidad en ${family.id}.`)
    }
    if (family.household.clothingDurabilityDays.some(days => !Number.isInteger(days) || days < 1 || days > INITIAL_CONFIG.clothingDurabilityDays)) {
      throw new Error(`Durabilidad de ropa inválida en ${family.id}.`)
    }
  }
  for (const business of Object.values(state.businesses)) {
    for (const inventory of [business.commercialInventory, business.productiveInventory]) {
      for (const good of GOODS) if (!Number.isInteger(inventory[good]) || inventory[good] < 0) throw new Error(`Inventario inválido: ${business.id}/${good}.`)
    }
    if (business.tools.some(tool => !Number.isInteger(tool.remainingWorkDays) || tool.remainingWorkDays < 1 || tool.remainingWorkDays > INITIAL_CONFIG.toolWorkDays)) {
      throw new Error(`Durabilidad de herramienta inválida en ${business.id}.`)
    }
  }
}

function consumeHouseholdNeeds(family: Family): void {
  const foodNeeded = family.members * INITIAL_CONFIG.foodPerMemberPerDay
  family.household.inventory.food = Math.max(0, family.household.inventory.food - foodNeeded)
  family.household.inventory.firewood = Math.max(0, family.household.inventory.firewood - INITIAL_CONFIG.firewoodPerFamilyPerDay)
  family.household.clothingDurabilityDays = family.household.clothingDurabilityDays
    .map(days => days - 1)
    .filter(days => days > 0)
  family.household.inventory.clothing = family.household.clothingDurabilityDays.length
}

function hasIngredients(business: Business): boolean {
  const recipe = RECIPES[business.profession]
  return Object.entries(recipe.inputs).every(([good, amount]) => business.productiveInventory[good as Good] >= (amount ?? 0))
}

function produce(business: Business, day: number): void {
  const recipe = RECIPES[business.profession]
  if (day % recipe.periodDays !== 0) return
  if (recipe.requiresTools && business.tools.length === 0) return
  if (!hasIngredients(business)) return

  for (const [good, amount] of Object.entries(recipe.inputs)) {
    business.productiveInventory[good as Good] -= amount ?? 0
  }
  for (const [good, amount] of Object.entries(recipe.outputs)) {
    business.commercialInventory[good as Good] += amount ?? 0
  }
  if (recipe.requiresTools) {
    const activeTool: ToolDurability = business.tools[0]
    activeTool.remainingWorkDays -= 1
    if (activeTool.remainingWorkDays === 0) business.tools.shift()
  }
}

/**
 * Advances exactly one economic day. Production cadence uses the new global day
 * number; a missed recipe does not accrue debt and retries only on its next multiple.
 */
export function stepEconomicDay(previous: EconomicState): EconomicState {
  assertValidState(previous)
  const state: EconomicState = {
    day: previous.day + 1,
    families: Object.fromEntries(Object.entries(previous.families).map(([id, family]) => [id, cloneFamily(family)])),
    businesses: Object.fromEntries(Object.entries(previous.businesses).map(([id, business]) => [id, cloneBusiness(business)])),
  }
  for (const family of Object.values(state.families)) consumeHouseholdNeeds(family)
  for (const business of Object.values(state.businesses)) produce(business, state.day)
  for (const family of Object.values(state.families)) reevaluateTier(state, family)
  assertValidState(state)
  return state
}
