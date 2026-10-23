import { emptyInventory, INITIAL_CONFIG, type Business, type EconomicState, type Family, type Profession, type VillageId } from './model.js'
import { evaluateNeeds } from './needs.js'

interface BusinessStart {
  id: string
  villageId: VillageId
  profession: Profession
  commercial: Partial<ReturnType<typeof emptyInventory>>
  productive: Partial<ReturnType<typeof emptyInventory>>
  tools?: number
}

const BUSINESS_STARTS: readonly BusinessStart[] = [
  { id: 'farmer-a', villageId: 'village-a', profession: 'farmer', commercial: { food: 20 }, productive: {}, tools: 2 },
  { id: 'woodcutter-a', villageId: 'village-a', profession: 'woodcutter', commercial: { firewood: 10, wood: 4 }, productive: {}, tools: 2 },
  { id: 'blacksmith-a', villageId: 'village-a', profession: 'blacksmith', commercial: { tool: 2 }, productive: { metal: 6 } },
  { id: 'tailor-a', villageId: 'village-a', profession: 'tailor', commercial: { clothing: 2 }, productive: { cloth: 5 } },
  { id: 'farmer-b', villageId: 'village-b', profession: 'farmer', commercial: { food: 20 }, productive: {}, tools: 2 },
  { id: 'miner-b', villageId: 'village-b', profession: 'miner', commercial: { metal: 4 }, productive: {}, tools: 2 },
  { id: 'carpenter-b', villageId: 'village-b', profession: 'carpenter', commercial: { furniture: 2 }, productive: { wood: 10 } },
  { id: 'jeweler-b', villageId: 'village-b', profession: 'jeweler', commercial: { jewelry: 2 }, productive: { metal: 3 } },
]

const PROFESSION_NAMES: Record<Profession, string> = {
  farmer: 'Agricultor',
  woodcutter: 'Leñador',
  blacksmith: 'Herrero',
  tailor: 'Sastre',
  miner: 'Minero',
  carpenter: 'Carpintero',
  jeweler: 'Joyero',
}

function makeFamily(id: string, name: string, villageId: VillageId, businessId: string): Family {
  const household = emptyInventory()
  household.food = INITIAL_CONFIG.householdFood
  household.firewood = INITIAL_CONFIG.householdFirewood
  household.clothing = INITIAL_CONFIG.householdClothing
  return {
    id,
    name,
    villageId,
    members: 2,
    adults: 2,
    moneyTenths: INITIAL_CONFIG.familyMoneyTenths,
    tier: 1,
    household: {
      inventory: household,
      clothingDurabilityDays: Array.from({ length: INITIAL_CONFIG.householdClothing }, () => INITIAL_CONFIG.clothingDurabilityDays),
    },
    businessIds: [businessId],
    needs: { essentials: {}, progression: {}, tierOneUpgradeMoneyMet: false, tierThreeUpgradeMoneyMet: false, prosperityGoalsMet: false },
  }
}

export function createInitialState(): EconomicState {
  const families: Record<string, Family> = {}
  const businesses: Record<string, Business> = {}
  for (const start of BUSINESS_STARTS) {
    const familyId = `family-${start.id}`
    const commercialInventory = Object.assign(emptyInventory(), start.commercial)
    const productiveInventory = Object.assign(emptyInventory(), start.productive)
    const tools = Array.from({ length: start.tools ?? 0 }, () => ({ remainingWorkDays: INITIAL_CONFIG.toolWorkDays }))
    businesses[start.id] = { id: start.id, familyId, villageId: start.villageId, profession: start.profession, commercialInventory, productiveInventory, tools }
    families[familyId] = makeFamily(familyId, `${PROFESSION_NAMES[start.profession]} ${start.villageId === 'village-a' ? 'A' : 'B'}`, start.villageId, start.id)
  }
  const state: EconomicState = { day: INITIAL_CONFIG.startingDay, families, businesses }
  for (const family of Object.values(families)) evaluateNeeds(state, family)
  return state
}
