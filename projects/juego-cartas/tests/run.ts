import { baseMana, createDuel, declareAttackers, declareBlockers, endTurn, resolveCombat, RuleViolation, startCombat, summonCreature } from '../src/engine/index.js'
import type { CreatureCard, DuelState, PlayerId } from '../src/engine/index.js'

type Test = { name: string; run: () => void }
const tests: Test[] = []

function test(name: string, run: () => void): void {
  tests.push({ name, run })
}

function equal<T>(actual: T, expected: T, message = 'Los valores no coinciden'): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}. Esperado: ${JSON.stringify(expected)}; recibido: ${JSON.stringify(actual)}`)
  }
}

function truthy(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

function throwsRule(run: () => unknown): void {
  try {
    run()
  } catch (error) {
    if (error instanceof RuleViolation) return
    throw error
  }
  throw new Error('Se esperaba una RuleViolation.')
}

function cards(prefix: string, count: number, overrides: Partial<CreatureCard> = {}): CreatureCard[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    name: `Criatura ${prefix}-${index + 1}`,
    attack: 1,
    maxHealth: 3,
    cost: { mana: 0, sacrifices: 0 },
    ...overrides,
  }))
}

function summon(state: DuelState, cardId: string): DuelState {
  return summonCreature(state, cardId)
}

function closeTurn(state: DuelState): DuelState {
  return endTurn(resolveCombat(declareBlockers(declareAttackers(startCombat(state), []), {})))
}

function bringToMain(state: DuelState, player: PlayerId): DuelState {
  let current = state
  while (current.activePlayer !== player) current = closeTurn(current)
  return current
}

test('estado inicial: vida 20, nivel 1, maná 1 y tres cartas en mano', () => {
  const state = createDuel({ playerDeck: cards('p', 5), opponentDeck: cards('o', 3) })
  equal([state.players.player.life, state.players.player.level, state.players.player.mana, state.players.player.hand.length], [20, 1, 1, 3])
  equal([state.players.opponent.life, state.players.opponent.hand.length], [20, 3])
  equal(baseMana(state.players.player), 1)
  equal(state.players.player.deck.map((card) => card.id), ['p-4', 'p-5'])
})

test('mantenimiento alterna jugador, recupera maná y roba una carta disponible', () => {
  let state = createDuel({ playerDeck: cards('p', 5), opponentDeck: cards('o', 4) })
  state = { ...state, players: { ...state.players, opponent: { ...state.players.opponent, mana: 0 } } }
  state = closeTurn(state)
  equal([state.activePlayer, state.turn, state.phase, state.players.opponent.mana], ['opponent', 2, 'main', 1])
  equal(state.players.opponent.hand.map((card) => card.id), ['o-1', 'o-2', 'o-3', 'o-4'])
  equal(state.players.opponent.deck.length, 0)
})

test('invocación paga maná, retira la carta de mano y permite atacar el mismo turno', () => {
  const expensive = cards('p', 3, { attack: 4, cost: { mana: 1, sacrifices: 0 } })
  let state = createDuel({ playerDeck: expensive, opponentDeck: cards('o', 3) })
  state = summon(state, 'p-1')
  equal([state.players.player.mana, state.players.player.hand.length, state.players.player.creatures.length], [0, 2, 1])
  const unitId = state.players.player.creatures[0].id
  state = declareBlockers(declareAttackers(startCombat(state), [unitId]), {})
  state = resolveCombat(state)
  equal(state.players.opponent.life, 16)
})

test('invocación rechaza maná insuficiente y sacrificios ausentes o inválidos', () => {
  const deck = [
    ...cards('p', 1),
    ...cards('sac', 1, { cost: { mana: 0, sacrifices: 0 } }),
    ...cards('ritual', 1, { cost: { mana: 0, sacrifices: 1 } }),
    ...cards('costly', 1, { cost: { mana: 2, sacrifices: 0 } }),
  ]
  let state = createDuel({ playerDeck: deck, opponentDeck: cards('o', 3) })
  throwsRule(() => summon(state, 'costly-1'))
  state = summon(state, 'sac-1')
  throwsRule(() => summon(state, 'ritual-1'))
  throwsRule(() => summonCreature(state, 'ritual-1', ['not-a-creature']))
  const sacrificedId = state.players.player.creatures[0].id
  const ritual = summonCreature(state, 'ritual-1', [sacrificedId])
  const ritualUnitId = ritual.players.player.creatures[0].id
  equal(ritual.players.player.creatures.map((unit) => unit.id), [ritualUnitId])
  truthy(!ritual.players.player.creatures.some((unit) => unit.id === sacrificedId), 'La criatura sacrificada debe desaparecer del campo')
  truthy(ritual.players.player.creatures.some((unit) => unit.id === ritualUnitId), 'La criatura invocada debe permanecer en el campo')
  equal(ritual.players.player.hand.length, 1)
})

test('fases de combate impiden saltarse declaraciones y validan los bloqueadores', () => {
  const state = summon(createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) }), 'p-1')
  const unitId = state.players.player.creatures[0].id
  throwsRule(() => declareAttackers(state, [unitId]))
  const attacking = declareAttackers(startCombat(state), [unitId])
  throwsRule(() => declareBlockers(attacking, { 'missing-attacker': [] }))
  throwsRule(() => declareBlockers(attacking, { [unitId]: ['missing-blocker'] }))
})

test('bloqueo múltiple respeta orden letal y resuelve daño de criaturas simultáneamente', () => {
  const playerCards = cards('pa', 3, { attack: 3, maxHealth: 2 })
  const opponentCards = cards('op', 3, { attack: 1, maxHealth: 2 })
  let state = createDuel({ playerDeck: playerCards, opponentDeck: opponentCards })
  state = summon(state, 'pa-1')
  state = closeTurn(state)
  state = bringToMain(state, 'opponent')
  state = summon(state, 'op-1')
  state = summon(state, 'op-2')
  state = closeTurn(state)
  state = bringToMain(state, 'player')
  const attackerId = state.players.player.creatures[0].id
  const [firstBlocker, secondBlocker] = state.players.opponent.creatures
  state = declareAttackers(startCombat(state), [attackerId])
  state = declareBlockers(state, { [attackerId]: [firstBlocker.id, secondBlocker.id] })
  state = resolveCombat(state)
  equal(state.players.opponent.life, 20, 'Una criatura bloqueada no daña al invocador')
  equal(state.players.opponent.creatures.map((unit) => [unit.id, unit.health]), [[secondBlocker.id, 1]])
  equal(state.players.player.creatures.length, 0, 'Los dos bloqueadores infligen daño simultáneo suficiente para matar al atacante')
})

test('el daño no letal permanece en la criatura después de avanzar los turnos', () => {
  const playerCards = cards('pa', 3, { attack: 1, maxHealth: 5 })
  const opponentCards = cards('op', 3, { attack: 2, maxHealth: 5 })
  let state = createDuel({ playerDeck: playerCards, opponentDeck: opponentCards })
  state = summon(state, 'pa-1')
  const attackerId = state.players.player.creatures[0].id
  state = closeTurn(state)
  state = bringToMain(state, 'opponent')
  state = summon(state, 'op-1')
  state = closeTurn(state)
  state = bringToMain(state, 'player')

  state = resolveCombat(declareBlockers(
    declareAttackers(startCombat(state), [attackerId]),
    { [attackerId]: [state.players.opponent.creatures[0].id] },
  ))
  equal(state.players.player.creatures.find((unit) => unit.id === attackerId)?.health, 3)

  state = endTurn(state)
  state = closeTurn(state)
  equal(state.players.player.creatures.find((unit) => unit.id === attackerId)?.health, 3)
})

test('ataque sin bloquear reduce vida y llegar a cero termina el duelo', () => {
  const playerDeck = cards('p', 3, { attack: 20 })
  let state = createDuel({ playerDeck, opponentDeck: cards('o', 3) })
  state = summon(state, 'p-1')
  const attackerId = state.players.player.creatures[0].id
  state = resolveCombat(declareBlockers(declareAttackers(startCombat(state), [attackerId]), {}))
  equal([state.players.opponent.life, state.winner, state.phase], [0, 'player', 'finished'])
  throwsRule(() => endTurn(state))
})

test('mazo vacío no roba ni derrota al invocador', () => {
  let state = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) })
  state = closeTurn(state)
  equal([state.players.opponent.deck.length, state.players.opponent.hand.length, state.players.opponent.life], [0, 3, 20])
})

test('un bloqueador no puede asignarse a dos atacantes', () => {
  let state = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) })
  state = summon(state, 'p-1')
  state = summon(state, 'p-2')
  state = closeTurn(state)
  state = bringToMain(state, 'opponent')
  state = summon(state, 'o-1')
  state = closeTurn(state)
  state = bringToMain(state, 'player')
  const attackerIds = state.players.player.creatures.map((unit) => unit.id)
  const blockerId = state.players.opponent.creatures[0].id
  state = declareAttackers(startCombat(state), attackerIds)
  throwsRule(() => declareBlockers(state, { [attackerIds[0]]: [blockerId], [attackerIds[1]]: [blockerId] }))
})

let failed = 0
for (const entry of tests) {
  try {
    entry.run()
    console.log(`✓ ${entry.name}`)
  } catch (error) {
    failed += 1
    console.error(`✗ ${entry.name}`)
    console.error(error)
  }
}
console.log(`\n${tests.length - failed}/${tests.length} pruebas aprobadas.`)
truthy(failed === 0, `${failed} prueba(s) fallaron.`)
