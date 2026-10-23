import {
  createInitialState,
  evaluateNeeds,
  GOODS,
  GOODS_CATALOG,
  INITIAL_CONFIG,
  reevaluateTier,
  stepEconomicDay,
  type EconomicState,
  type Family,
} from '../src/engine/index.js'

let passed = 0
function equal<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) throw new Error(`${label}: esperado ${String(expected)}, recibido ${String(actual)}`)
}
function ok(condition: boolean, label: string): void {
  if (!condition) throw new Error(label)
}
function test(label: string, fn: () => void): void {
  fn()
  passed += 1
  console.log(`✓ ${label}`)
}
function familyFor(state: EconomicState, businessId: string): Family {
  const business = state.businesses[businessId]
  return state.families[business.familyId]
}

test('catálogo completo, precios exactos en décimas y pesos de media unidad', () => {
  equal(GOODS.length, 9, 'número de bienes')
  equal(GOODS_CATALOG.metal.playerBuyPriceTenths, 198, 'precio jugador compra metal')
  equal(GOODS_CATALOG.metal.playerSellPriceTenths, 242, 'precio jugador vende metal')
  equal(GOODS_CATALOG.firewood.caravanBuyPriceTenths, 64, 'precio decimal de leña')
  equal(GOODS_CATALOG.jewelry.weightHalfUnits, 1, 'peso 0,5 de joya en medias unidades')
  equal(GOODS_CATALOG.tool.referencePriceTenths, 2000, 'precio de herramienta')
})

test('escenario inicial tiene ocho familias/negocios, fondos compartidos e inventarios separados', () => {
  const state = createInitialState()
  equal(state.day, 1, 'día inicial')
  equal(Object.keys(state.families).length, 8, 'familias iniciales')
  equal(Object.keys(state.businesses).length, 8, 'negocios iniciales')
  for (const family of Object.values(state.families)) {
    equal(family.members, 2, `${family.id} integrantes`)
    equal(family.adults, 2, `${family.id} adultos`)
    equal(family.moneyTenths, 4500, `${family.id} saldo compartido`)
    equal(family.household.inventory.food, 28, `${family.id} comida doméstica`)
    equal(family.household.inventory.firewood, 14, `${family.id} leña doméstica`)
    equal(family.household.inventory.clothing, 2, `${family.id} ropa doméstica`)
  }
  equal(state.businesses['farmer-a'].commercialInventory.food, 20, 'comida comercial inicial separada')
  equal(state.businesses['farmer-a'].productiveInventory.food, 0, 'no hay comida en reserva productiva')
  equal(state.businesses['blacksmith-a'].productiveInventory.metal, 6, 'metal reservado para producción')
  equal(state.businesses['farmer-a'].tools.length, 2, 'herramientas profesionales no duplicadas en hogar')
  equal(state.families['family-farmer-a'].household.inventory.tool, 0, 'herramientas fuera del inventario doméstico')
})

test('extractores producen con una o más herramientas, no con cero; desgaste cuenta días trabajados', () => {
  const extractors = [
    { id: 'farmer-a', products: { food: 10 } },
    { id: 'woodcutter-a', products: { firewood: 5, wood: 2 } },
    { id: 'miner-b', products: { metal: 2 } },
  ] as const
  for (const extractor of extractors) for (const count of [0, 1, 2]) {
    const state = createInitialState()
    const business = state.businesses[extractor.id]
    business.tools = Array.from({ length: count }, () => ({ remainingWorkDays: 60 }))
    const next = stepEconomicDay(state)
    for (const [good, amount] of Object.entries(extractor.products)) {
      equal(next.businesses[extractor.id].commercialInventory[good as keyof typeof business.commercialInventory], business.commercialInventory[good as keyof typeof business.commercialInventory] + (count === 0 ? 0 : amount), `${extractor.id} produce ${good} con ${count} herramientas`)
    }
    const status = familyFor(next, extractor.id).needs.essentials.tools
    equal(status, count === 0 ? 'red' : count === 1 ? 'yellow' : 'green', `${extractor.id} estado de herramientas ${count}`)
    if (count > 0) equal(next.businesses[extractor.id].tools[0].remainingWorkDays, 59, `desgaste de herramienta ${extractor.id}`)
  }
  const state = createInitialState()
  const business = state.businesses['farmer-a']
  business.tools = [{ remainingWorkDays: 60 }]
  let current = state
  for (let day = 0; day < 60; day += 1) current = stepEconomicDay(current)
  equal(current.day, 61, '60 días trabajados desde el día inicial')
  equal(current.businesses['farmer-a'].tools.length, 0, 'herramienta retirada al agotarse')
  equal(current.businesses['farmer-a'].commercialInventory.food, 620, 'produce el día que la herramienta se agota')
})

test('recetas manufactureras consumen materiales íntegros solo en múltiplos globales', () => {
  const state = createInitialState()
  let current = state
  current = stepEconomicDay(current) // day 2: tailor recipe
  equal(current.businesses['tailor-a'].productiveInventory.cloth, 4, 'tela consumida')
  equal(current.businesses['tailor-a'].commercialInventory.clothing, 3, 'ropa producida en día 2')
  current = stepEconomicDay(current) // day 3: no recipe
  equal(current.businesses['tailor-a'].commercialInventory.clothing, 3, 'sin receta en día 3')
  current = stepEconomicDay(current) // day 4: tailor and blacksmith
  equal(current.businesses['tailor-a'].commercialInventory.clothing, 4, 'segunda receta de sastre en día 4')
  equal(current.businesses['blacksmith-a'].productiveInventory.metal, 4, 'dos metales consumidos por receta')
  equal(current.businesses['blacksmith-a'].commercialInventory.tool, 3, 'herramienta producida en día 4')

  const blocked = createInitialState()
  blocked.businesses['blacksmith-a'].productiveInventory.metal = 1
  const atDay2 = stepEconomicDay(blocked)
  const atDay3 = stepEconomicDay(atDay2)
  const atDay4 = stepEconomicDay(atDay3)
  equal(atDay4.businesses['blacksmith-a'].commercialInventory.tool, 2, 'sin producto cuando falta un ingrediente')
  equal(atDay4.businesses['blacksmith-a'].productiveInventory.metal, 1, 'ingrediente incompleto permanece reservado')
  atDay4.businesses['blacksmith-a'].productiveInventory.metal = 2
  const atDay5 = stepEconomicDay(atDay4)
  equal(atDay5.businesses['blacksmith-a'].commercialInventory.tool, 2, 'no acumula producción debida fuera de múltiplos')
  const atDay8 = stepEconomicDay(stepEconomicDay(stepEconomicDay(atDay5)))
  equal(atDay8.businesses['blacksmith-a'].commercialInventory.tool, 3, 'reintenta en siguiente múltiplo de cuatro')

  const carpenter = createInitialState()
  const carpenterNext = stepEconomicDay(carpenter)
  equal(carpenterNext.businesses['carpenter-b'].productiveInventory.wood, 8, 'carpintero consume dos maderas')
  equal(carpenterNext.businesses['carpenter-b'].commercialInventory.furniture, 3, 'carpintero produce mueble en día par')
  const jeweler = createInitialState()
  const jewelerAtDay4 = stepEconomicDay(stepEconomicDay(stepEconomicDay(jeweler)))
  equal(jewelerAtDay4.businesses['jeweler-b'].productiveInventory.metal, 2, 'joyero consume un metal en múltiplo de cuatro')
  equal(jewelerAtDay4.businesses['jeweler-b'].commercialInventory.jewelry, 3, 'joyero produce joya en día cuatro')
})

test('necesidades clasifican comida y leña en las fronteras 7 y 14 días', () => {
  const state = createInitialState()
  const family = familyFor(state, 'farmer-a')
  for (const [food, status] of [[28, 'green'], [14, 'yellow'], [13, 'red']] as const) {
    family.household.inventory.food = food
    evaluateNeeds(state, family)
    equal(family.needs.essentials.food, status, `${food} raciones`)
  }
  for (const [firewood, status] of [[14, 'green'], [7, 'yellow'], [6, 'red']] as const) {
    family.household.inventory.firewood = firewood
    evaluateNeeds(state, family)
    equal(family.needs.essentials.firewood, status, `${firewood} leñas`)
  }
})

test('ropa se desgasta por 80 días de uso y deja de contar al agotarse', () => {
  const state = createInitialState()
  const family = familyFor(state, 'farmer-a')
  family.household.inventory.clothing = 1
  family.household.clothingDurabilityDays = [80]
  let current = state
  for (let day = 0; day < 79; day += 1) current = stepEconomicDay(current)
  equal(familyFor(current, 'farmer-a').household.inventory.clothing, 1, 'prenda tras 79 usos')
  current = stepEconomicDay(current)
  equal(familyFor(current, 'farmer-a').household.inventory.clothing, 0, 'prenda desaparece tras el uso 80')
})

test('ascenso y descenso usan umbrales autorizados, conservan bienes y escalan por integrantes', () => {
  const state = createInitialState()
  const family = familyFor(state, 'farmer-a')
  reevaluateTier(state, family)
  equal(family.tier, 2, 'ascenso básico con 450 monedas y necesidades verdes')
  family.household.inventory.furniture = 1
  family.household.inventory.jewelry = 1
  family.moneyTenths = 3999
  reevaluateTier(state, family)
  equal(family.tier, 1, 'descenso por debajo de 400 monedas')
  equal(family.household.inventory.furniture, 1, 'mueble conservado al descender')
  equal(family.household.inventory.jewelry, 1, 'joya conservada al descender')

  const singleState = createInitialState()
  const single = familyFor(singleState, 'farmer-a')
  single.members = 1
  single.adults = 1
  single.moneyTenths = 3000
  single.household.inventory.food = 14
  single.household.inventory.clothing = 1
  single.household.clothingDurabilityDays = [80]
  reevaluateTier(singleState, single)
  equal(single.needs.tierOneUpgradeMoneyMet, true, 'umbral de ascenso para una persona es 300 monedas')
  equal(single.tier, 2, 'familia de una persona asciende con requisitos escalados')
})

test('ascenso a tramo 3 usa 1.000 y prosperidad conserva la meta de 2.000 monedas', () => {
  const ascentState = createInitialState()
  const ascending = familyFor(ascentState, 'farmer-a')
  ascending.tier = 2
  ascending.moneyTenths = 10000
  ascending.household.clothingDurabilityDays = Array.from({ length: 4 }, () => 80)
  ascending.household.inventory.clothing = 4
  ascending.household.inventory.furniture = 2
  ascending.household.inventory.jewelry = 2
  reevaluateTier(ascentState, ascending)
  equal(ascending.tier, 3, '1.000 monedas y todos los requisitos del tramo 2 permiten ascender')

  const state = createInitialState()
  const family = familyFor(state, 'farmer-a')
  family.tier = 3
  family.moneyTenths = 15000
  family.household.clothingDurabilityDays = Array.from({ length: 8 }, () => 80)
  family.household.inventory.clothing = 8
  family.household.inventory.furniture = 4
  family.household.inventory.jewelry = 8
  reevaluateTier(state, family)
  equal(family.tier, 3, '1.500 monedas mantienen tramo 3')
  equal(family.needs.tierThreeUpgradeMoneyMet, true, '1.500 supera el umbral de mantenimiento y ascenso de 1.000')
  equal(family.needs.prosperityGoalsMet, false, '1.500 no satisface la meta de prosperidad de 2.000')

  family.moneyTenths = 9999
  reevaluateTier(state, family)
  equal(family.tier, 2, '999,9 monedas hacen descender al tramo 2')

  family.tier = 3
  family.moneyTenths = 20000
  family.household.clothingDurabilityDays = Array.from({ length: 8 }, () => 80)
  family.household.inventory.clothing = 8
  family.household.inventory.furniture = 4
  family.household.inventory.jewelry = 8
  reevaluateTier(state, family)
  equal(family.tier, 3, 'la familia conserva tramo 3 al cumplir objetivos')
  equal(family.needs.prosperityGoalsMet, true, 'meta de prosperidad usa cuatro mudas, cuatro muebles, ocho joyas y 2.000 monedas')
})

test('estado inicial y avances no contienen cantidades ni saldos negativos', () => {
  let state = createInitialState()
  for (let day = 0; day < 90; day += 1) state = stepEconomicDay(state)
  for (const family of Object.values(state.families)) {
    ok(family.moneyTenths >= 0, `${family.id} mantiene saldo no negativo`)
    for (const good of GOODS) ok(family.household.inventory[good] >= 0, `${family.id}/${good} no negativo`)
  }
  for (const business of Object.values(state.businesses)) {
    for (const good of GOODS) {
      ok(business.commercialInventory[good] >= 0, `${business.id}/${good} comercial no negativo`)
      ok(business.productiveInventory[good] >= 0, `${business.id}/${good} productivo no negativo`)
    }
  }
  equal(INITIAL_CONFIG.familyMoneyTenths, 4500, 'saldo inicial expresado en décimas')
})

console.log(`\n${passed} pruebas del motor económico aprobadas.`)
