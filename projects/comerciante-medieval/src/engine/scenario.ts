import { DEFAULT_ECONOMIC_PARAMETERS, emptyInventory, parametersFor, type Business, type EconomicParameters, type EconomicState, type Family, type Profession, type VillageId } from './model.js'
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

function makeFamily(id: string, name: string, villageId: VillageId, businessId: string, parameters: EconomicParameters): Family {
  const household = emptyInventory()
  household.food = parameters.config.householdFood
  household.firewood = parameters.config.householdFirewood
  household.clothing = parameters.config.householdClothing
  return {
    id,
    name,
    villageId,
    members: 2,
    adults: 2,
    moneyTenths: parameters.config.familyMoneyTenths,
    tier: 1,
    household: {
      inventory: household,
      clothingDurabilityDays: Array.from({ length: parameters.config.householdClothing }, () => parameters.config.clothingDurabilityDays),
    },
    businessIds: [businessId],
    needs: { essentials: {}, progression: {}, tierOneUpgradeMoneyMet: false, tierThreeUpgradeMoneyMet: false, prosperityGoalsMet: false },
  }
}

export function createInitialState(parameters: EconomicParameters = DEFAULT_ECONOMIC_PARAMETERS): EconomicState {
  const families: Record<string, Family> = {}
  const businesses: Record<string, Business> = {}
  for (const start of BUSINESS_STARTS) {
    const familyId = `family-${start.id}`
    const commercialInventory = Object.assign(emptyInventory(), start.commercial)
    const productiveInventory = Object.assign(emptyInventory(), start.productive)
    const tools = Array.from({ length: start.tools ?? 0 }, () => ({ remainingWorkDays: parameters.config.toolWorkDays }))
    businesses[start.id] = { id: start.id, familyId, villageId: start.villageId, profession: start.profession, commercialInventory, productiveInventory, tools }
    families[familyId] = makeFamily(familyId, `${PROFESSION_NAMES[start.profession]} ${start.villageId === 'village-a' ? 'A' : 'B'}`, start.villageId, start.id, parameters)
  }
  const state: EconomicState = { day: parameters.config.startingDay, families, businesses, parameters }
  for (const family of Object.values(families)) evaluateNeeds(state, family, parametersFor(state))
  return state
}
