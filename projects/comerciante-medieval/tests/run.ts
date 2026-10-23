import {
  createInitialState,
  evaluateNeeds,
  GOODS,
  GOODS_CATALOG,
  INITIAL_CONFIG,
  reevaluateTier,
  stepEconomicDay,
  caravanCircuitDay,
  caravanLocation,
  simulateDays,
  stepAutonomousDay,
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

test('circuito de caravana de nueve días y ubicaciones repetidas', () => {
  equal(Array.from({ length: 9 }, (_, index) => caravanLocation(index + 1)).join(','), 'port,port,travel-to-a,village-a,village-a,travel-to-b,village-b,village-b,travel-to-port', 'circuito autorizado')
  equal(caravanCircuitDay(10), 1, 'reinicio del circuito')
})

test('compras locales amarillas esperan un día disponible; dinero va al vendedor', () => {
  const state = createInitialState()
  const buyer = state.families['family-tailor-a']
  const seller = state.families['family-farmer-a']
  buyer.household.inventory.food = 29
  const sellerBefore = seller.moneyTenths
  const day2 = stepAutonomousDay(state)
  equal(day2.state.families[buyer.id].household.inventory.food, 27, 'primer día amarillo no compra')
  const day3 = stepAutonomousDay(day2.state)
  equal(day3.state.families[buyer.id].household.inventory.food, 28, 'compra para cubrir a 14 días')
  const buyerTransactions = day3.events.filter(event => event.type === 'purchase')
  const spent = buyerTransactions.filter(event => event.familyId === buyer.id).reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
  const earned = buyerTransactions.filter(event => event.businessId && day3.state.businesses[event.businessId]?.familyId === buyer.id && event.familyId !== buyer.id).reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
  equal(day3.state.families[buyer.id].moneyTenths, buyer.moneyTenths - spent + earned, 'compras y ventas modifican el fondo compartido')
  const sellerIncome = buyerTransactions.filter(event => event.businessId === 'farmer-a' && event.familyId !== seller.id).reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
  const sellerSpending = buyerTransactions.filter(event => event.familyId === seller.id).reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
  equal(day3.state.families[seller.id].moneyTenths, sellerBefore + sellerIncome - sellerSpending, 'el fondo compartido registra cobros y compras del vendedor')
  ok(day3.events.some(event => event.type === 'purchase' && event.familyId === buyer.id && event.good === 'food'), 'queda evento de compra auditable')
})

test('transferencia interna no crea pago y la compra solo mueve bienes una vez', () => {
  const state = createInitialState()
  const farmer = state.families['family-farmer-a']
  farmer.household.inventory.food = 0
  const balance = farmer.moneyTenths
  const result = stepAutonomousDay(state)
  const internal = result.events.filter(event => event.type === 'internal-transfer' && event.familyId === farmer.id && event.good === 'food')
  equal(internal.length, 1, 'una transferencia interna de comida')
  equal(internal[0].quantity, 28, 'transferencia cubre la necesidad roja hasta el objetivo doméstico')
  equal(internal[0].moneyTenths, 0, 'sin transferencia ficticia de dinero')
  equal(result.state.families[farmer.id].moneyTenths, balance, 'el fondo no cambia por producción propia')
  equal(result.state.families[farmer.id].household.inventory.food, 28, 'el bien se transfiere una sola vez')
})

test('caravana abastece necesidad roja solo durante visita y el stock externo es ilimitado', () => {
  const state = createInitialState()
  const family = state.families['family-miner-b']
  family.household.inventory.firewood = 0
  let current = state
  for (let day = 0; day < 5; day += 1) current = stepAutonomousDay(current).state // día 6: viaje
  equal(current.families[family.id].household.inventory.firewood, 0, 'sin abastecimiento en tránsito')
  const day7 = stepAutonomousDay(current)
  equal(day7.state.day, 7, 'día de llegada al pueblo B')
  equal(day7.state.families[family.id].household.inventory.firewood, 14, 'compra roja el mismo día de visita')
  ok(day7.events.some(event => event.type === 'caravan-supply' && event.familyId === family.id && event.good === 'firewood' && event.quantity === 14), 'abastecimiento de caravana registrado')
})

test('stock local escaso se asigna por orden familiar estable y nunca compra sin fondos', () => {
  const state = createInitialState()
  for (const family of Object.values(state.families).filter(candidate => candidate.villageId === 'village-a')) {
    family.household.inventory.food = 0
    family.moneyTenths = 0
  }
  state.families['family-farmer-a'].household.inventory.food = 28 // evita autoabastecimiento interno en la prueba de saldo
  state.businesses['farmer-a'].commercialInventory.food = 3
  state.businesses['farmer-a'].tools = [] // no production refill on the next tick
  const result = stepAutonomousDay(state)
  equal(result.state.businesses['farmer-a'].commercialInventory.food, 3, 'sin fondos el stock queda en tienda')
  equal(result.events.filter(event => event.good === 'food' && event.type === 'purchase').length, 0, 'no se acepta una compra impagable')
  for (const family of Object.values(result.state.families)) ok(family.moneyTenths >= 0, `${family.id} conserva saldo no negativo`)

  for (const family of Object.values(state.families).filter(candidate => candidate.villageId === 'village-a')) family.moneyTenths = 4500
  const competing = stepAutonomousDay(state)
  const first = competing.state.families['family-blacksmith-a']
  equal(first.household.inventory.food, 3, 'primera familia del orden estable obtiene el stock escaso')
  equal(competing.events.filter(event => event.businessId === 'farmer-a' && event.good === 'food' && event.type === 'purchase').reduce((sum, event) => sum + (event.quantity ?? 0), 0), 3, 'stock se vende una sola vez')
})

test('cada avance genera como máximo un consumo diario por familia y no duplica el día', () => {
  let state = createInitialState()
  const events = [] as ReturnType<typeof stepAutonomousDay>['events']
  for (let i = 0; i < 9; i += 1) {
    const result = stepAutonomousDay(state)
    state = result.state
    events.push(...result.events)
  }
  equal(state.day, 10, 'nueve saltos producen nueve días únicos')
  for (const familyId of ['family-farmer-a', 'family-tailor-a']) {
    const foodConsumptionDays = events.filter(event => event.type === 'consumption' && event.good === 'food' && event.familyId === familyId).map(event => event.day)
    equal(new Set(foodConsumptionDays).size, foodConsumptionDays.length, `${familyId} no tiene consumo de comida duplicado en un día`)
  }
})

test('espera se reinicia sin oferta y una necesidad amarilla que pasa a roja compra de inmediato', () => {
  const state = createInitialState()
  const buyer = state.families['family-tailor-a']
  buyer.household.inventory.food = 29
  state.businesses['farmer-a'].commercialInventory.food = 1
  state.businesses['farmer-a'].tools = []
  const firstAvailableDay = stepAutonomousDay(state)
  equal(firstAvailableDay.state.waitAvailabilityDays?.[`${buyer.id}:food`], 1, 'espera inicia el primer día de oferta')
  firstAvailableDay.state.businesses['farmer-a'].commercialInventory.food = 0
  const unavailableDay = stepAutonomousDay(firstAvailableDay.state)
  equal(unavailableDay.state.waitAvailabilityDays?.[`${buyer.id}:food`], undefined, 'al desaparecer la oferta se borra la espera')
  unavailableDay.state.businesses['farmer-a'].commercialInventory.food = 1
  unavailableDay.state.families[buyer.id].household.inventory.food = 12
  const redNeedDay = stepAutonomousDay(unavailableDay.state)
  ok(redNeedDay.events.some(event => event.type === 'purchase' && event.familyId === buyer.id && event.good === 'food'), 'al pasar a rojo compra en la primera oferta sin esperar otro día')
})

test('la compra autónoma de progreso tiene un máximo global de una unidad por familia y día', () => {
  const state = createInitialState()
  const family = state.families['family-tailor-a']
  family.tier = 2
  family.moneyTenths = 50000
  family.household.inventory.furniture = 0
  family.household.inventory.jewelry = 0
  family.household.inventory.clothing = 2
  family.household.clothingDurabilityDays = [80, 80]
  state.businesses['farmer-a'].commercialInventory.furniture = 1
  state.businesses['woodcutter-a'].commercialInventory.jewelry = 1
  const result = stepAutonomousDay(state)
  const progress = result.events.filter(event => event.familyId === family.id && event.detail === 'Compra de progreso')
  equal(progress.length, 1, 'aunque hay varias metas y ofertas, compra solo un bien')
  equal(progress[0].quantity, 1, 'el contador cubre una unidad total')
})

test('el stock propio de progreso se transfiere gratis aunque el fondo no cubra su precio', () => {
  const state = createInitialState()
  const family = state.families['family-tailor-a']
  const business = state.businesses['tailor-a']
  family.tier = 2
  family.moneyTenths = 5000 // 500 monedas: saldo positivo, bajo el precio local de la ropa (900).
  family.household.inventory.clothing = 2
  family.household.clothingDurabilityDays = [80, 80]
  family.household.inventory.furniture = 1
  family.household.inventory.jewelry = 1
  business.commercialInventory.clothing = 1
  const balance = family.moneyTenths
  const result = stepAutonomousDay(state)
  const transfer = result.events.find(event => event.type === 'internal-transfer' && event.familyId === family.id && event.good === 'clothing' && event.detail === 'Compra de progreso')
  if (!transfer) throw new Error('el producto propio es elegible sin exigir saldo de compra')
  equal(transfer.quantity, 1, 'avanza exactamente una unidad de la meta')
  equal(transfer.moneyTenths, 0, 'la transferencia propia no cobra dinero')
  equal(result.state.families[family.id].household.inventory.clothing, 3, 'la ropa pasa al inventario doméstico')
  equal(result.state.families[family.id].moneyTenths, balance, 'el saldo permanece intacto')
  equal(result.state.businesses[business.id].commercialInventory.clothing, 1, 'solo consume una unidad del stock disponible tras producción')
})

function inventoryTotal(state: EconomicState, good: typeof GOODS[number]): number {
  return Object.values(state.families).reduce((sum, family) => sum + family.household.inventory[good], 0)
    + Object.values(state.businesses).reduce((sum, business) => sum + business.commercialInventory[good] + business.productiveInventory[good], 0)
}

test('conserva dinero y bienes en ventas locales, suministro e importación/exportación de caravana', () => {
  let state = createInitialState()
  for (let day = 0; day < 9; day += 1) {
    const before = state
    const beforeMoney = Object.values(before.families).reduce((sum, family) => sum + family.moneyTenths, 0)
    const beforeGoods = Object.fromEntries(GOODS.map(good => [good, inventoryTotal(before, good)])) as Record<typeof GOODS[number], number>
    const { state: after, events } = stepAutonomousDay(before)
    const externalMoney = events.filter(event => event.type === 'caravan-sale').reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
      - events.filter(event => event.type === 'caravan-supply').reduce((sum, event) => sum + (event.moneyTenths ?? 0), 0)
    equal(Object.values(after.families).reduce((sum, family) => sum + family.moneyTenths, 0), beforeMoney + externalMoney, `dinero familiar conserva flujos locales en día ${after.day}`)
    for (const good of GOODS) {
      const delta = events.filter(event => event.good === good && event.type === 'production').reduce((sum, event) => sum + (event.quantity ?? 0), 0)
        - events.filter(event => event.good === good && event.type === 'production-input').reduce((sum, event) => sum + (event.quantity ?? 0), 0)
        - events.filter(event => event.good === good && event.type === 'consumption').reduce((sum, event) => sum + (event.quantity ?? 0), 0)
        + events.filter(event => event.good === good && event.type === 'caravan-supply').reduce((sum, event) => sum + (event.quantity ?? 0), 0)
        - events.filter(event => event.good === good && event.type === 'caravan-sale').reduce((sum, event) => sum + (event.quantity ?? 0), 0)
      equal(inventoryTotal(after, good), beforeGoods[good] + delta, `${good} conserva unidades tras transferencias y flujos externos en día ${after.day}`)
    }
    state = after
  }
})

test('exportación respeta reserva comercial derivada de dos días de producción', () => {
  const state = createInitialState()
  let result = stepAutonomousDay(state)
  result = stepAutonomousDay(result.state)
  result = stepAutonomousDay(result.state) // día 4, caravana en A
  const farmer = result.state.businesses['farmer-a']
  ok(farmer.commercialInventory.food >= 20, 'agricultor conserva reserva de 20 comidas')
  const exported = result.events.filter(event => event.type === 'caravan-sale')
  ok(exported.every(event => event.quantity !== undefined && event.quantity > 0), 'solo excedentes positivos se exportan')
  const woodcutterSales = exported.filter(event => event.businessId === 'woodcutter-a')
  ok(woodcutterSales.every(event => (event.detail ?? '').includes('reserva 10') || (event.detail ?? '').includes('reserva 4')), 'reserva del leñador conserva 10 leñas y 4 maderas')
})

test('simulaciones de 9, 36 y 90 días reproducen estados, informes y eventos', () => {
  for (const days of [9, 36, 90]) {
    const first = simulateDays(days)
    const second = simulateDays(days)
    equal(JSON.stringify(first), JSON.stringify(second), `${days} días deterministas`)
    equal(first.finalDay, days + 1, `${days} avances completos desde día 1`)
    ok(first.events.every(event => Number.isInteger(event.day) && event.day >= 2 && event.day <= days + 1), `${days} eventos tienen día válido`)
    if (days === 9) {
      ok(Object.keys(first.householdGoods).length === 8, 'informe incluye ocho inventarios domésticos')
      ok(Object.keys(first.businessProductiveGoods).length === 8, 'informe incluye ocho inventarios productivos')
      ok(first.activityByGood.produced.food! > 0 && first.activityByGood.consumed.food! > 0, 'informe presenta producción y consumo por bien')
      ok(first.activityByGood.locallyPurchased.food! > 0 && first.activityByGood.caravanSupplied.firewood! > 0 && first.activityByGood.caravanExported.food! > 0, 'informe presenta comercio local y los dos flujos de caravana')
      equal(JSON.stringify(first.activityByGood), JSON.stringify(second.activityByGood), 'resumen de actividad serializable y reproducible')
    }
  }
})

console.log(`\n${passed} pruebas del motor económico aprobadas.`)
