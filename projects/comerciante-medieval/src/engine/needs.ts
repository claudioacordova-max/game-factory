import { INITIAL_CONFIG, RECIPES, type EconomicState, type Family, type Status, type Tier } from './model.js'

function coverageStatus(days: number): Status {
  if (days < INITIAL_CONFIG.redCoverageDays) return 'red'
  if (days < INITIAL_CONFIG.greenCoverageDays) return 'yellow'
  return 'green'
}

function proportionStatus(current: number, target: number): Status {
  if (target <= 0 || current >= target) return 'green'
  return current * 2 >= target ? 'yellow' : 'red'
}

function businessNeeds(state: EconomicState, family: Family) {
  const businesses = family.businessIds.map(id => state.businesses[id]).filter(Boolean)
  const toolStatuses: Status[] = []
  const inputStatuses: Status[] = []
  for (const business of businesses) {
    const recipe = RECIPES[business.profession]
    if (recipe.requiresTools) {
      toolStatuses.push(business.tools.length === 0 ? 'red' : business.tools.length === 1 ? 'yellow' : 'green')
    }
    const inputEntries = Object.entries(recipe.inputs)
    if (inputEntries.length > 0) {
      const lots = Math.min(...inputEntries.map(([good, count]) => Math.floor(business.productiveInventory[good as keyof typeof business.productiveInventory] / (count ?? 1))))
      const reserve = INITIAL_CONFIG.inputReserveLots[business.profession as keyof typeof INITIAL_CONFIG.inputReserveLots]
      inputStatuses.push(lots === 0 ? 'red' : lots < reserve ? 'yellow' : 'green')
    }
  }
  const worst = (statuses: Status[]): Status | undefined => statuses.includes('red') ? 'red' : statuses.includes('yellow') ? 'yellow' : statuses.length > 0 ? 'green' : undefined
  return { tools: worst(toolStatuses), inputs: worst(inputStatuses) }
}

function currentTierEntryMoney(tier: Tier, family: Family): number {
  return tier === 1 || tier === 2 ? (200 + 100 * family.members) * 10 : INITIAL_CONFIG.tierThreeMoneyTenths
}

export function evaluateNeeds(state: EconomicState, family: Family): void {
  const inv = family.household.inventory
  const business = businessNeeds(state, family)
  const foodDays = family.members === 0 ? 0 : inv.food / family.members
  const firewoodDays = inv.firewood
  const essentials: Family['needs']['essentials'] = {
    food: coverageStatus(foodDays),
    firewood: coverageStatus(firewoodDays),
    clothing: proportionStatus(family.household.clothingDurabilityDays.length, family.members),
  }
  if (business.tools) essentials.tools = business.tools
  if (business.inputs) essentials.inputs = business.inputs

  const progression: Family['needs']['progression'] = {}
  if (family.tier >= 2) {
    progression.clothing = proportionStatus(family.household.clothingDurabilityDays.length, 2 * family.members)
    progression.furniture = proportionStatus(inv.furniture, family.members)
    progression.jewelry = proportionStatus(inv.jewelry, family.adults)
  }
  family.needs = {
    essentials,
    progression,
    tierOneUpgradeMoneyMet: family.moneyTenths >= (200 + 100 * family.members) * 10,
    tierThreeUpgradeMoneyMet: family.moneyTenths >= INITIAL_CONFIG.tierTwoMoneyTenths,
    prosperityGoalsMet: family.tier === 3
      && tierThreeGoals(family).every(status => status === 'green')
      && family.moneyTenths >= INITIAL_CONFIG.tierThreeMoneyTenths,
  }
}

function allGreen(needs: Partial<Record<string, Status>>): boolean {
  return Object.values(needs).every(value => value === 'green')
}

function anyRed(needs: Partial<Record<string, Status>>): boolean {
  return Object.values(needs).some(value => value === 'red')
}

function tierTwoGoals(family: Family): Status[] {
  const inv = family.household.inventory
  const clothes = family.household.clothingDurabilityDays.length
  return [
    proportionStatus(clothes, 2 * family.members),
    proportionStatus(inv.furniture, family.members),
    proportionStatus(inv.jewelry, family.adults),
  ]
}

function tierThreeGoals(family: Family): Status[] {
  const inv = family.household.inventory
  const clothes = family.household.clothingDurabilityDays.length
  return [
    proportionStatus(clothes, 4 * family.members),
    proportionStatus(inv.furniture, 4),
    proportionStatus(inv.jewelry, 4 * family.adults),
  ]
}

/** Re-evaluates down before up and permits at most one upward tier change. */
export function reevaluateTier(state: EconomicState, family: Family): void {
  evaluateNeeds(state, family)
  const essentialStatuses = family.needs.essentials
  if (family.tier === 3) {
    const tierTwoSustained = tierTwoGoals(family).every(status => status !== 'red')
    if (family.moneyTenths < INITIAL_CONFIG.tierTwoMoneyTenths || !tierTwoSustained || anyRed(essentialStatuses)) family.tier = 2
  }
  if (family.tier === 2) {
    if (family.moneyTenths < currentTierEntryMoney(2, family) || anyRed(essentialStatuses)) family.tier = 1
  }
  evaluateNeeds(state, family)
  if (family.tier === 1 && allGreen(family.needs.essentials) && family.needs.tierOneUpgradeMoneyMet) {
    family.tier = 2
  } else if (family.tier === 2 && allGreen(family.needs.essentials) && tierTwoGoals(family).every(status => status === 'green') && family.needs.tierThreeUpgradeMoneyMet) {
    family.tier = 3
  }
  evaluateNeeds(state, family)
}
