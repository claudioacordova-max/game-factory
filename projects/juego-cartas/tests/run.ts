import { requireInvoker } from '../src/engine/rules.js'
import { addCopyToActiveDeck, advanceMainPhaseIfNoLegalSummons, baseMana, createGameSession, declareAttackers, declareBlockers, endTurn, finishSessionDuel, hasLegalSummon, removeCopyFromActiveDeck, resolveCombat, RuleViolation, startCombat, summonAvailability, summonCreature, unlockCreatureType } from '../src/engine/index.js'
import { createDuel as createShuffledDuel, startSessionDuel as startShuffledSessionDuel } from '../src/engine/index.js'
import { chooseEnemyBlockers, resolveEnemyBlocks, runEnemyTurn } from '../src/engine/enemy.js'
import type { Creature, CreatureCard, DuelState, PlayerId } from '../src/engine/index.js'
import { MAIN_ENCOUNTERS as DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { h1Tests } from './h1.js'
import { h2Tests } from './h2.js'
import { h3Tests } from './h3.js'
import { worldTests } from './world.js'
import { presentationTests } from './presentation.js'
import { expeditionTests } from './expedition.js'
import './spatial.js'
import { canEnterEncounter, createExplorationProgress, currentEncounterId, isDungeonComplete, recordEncounterDefeat, recordEncounterVictory } from '../src/engine/exploration.js'
import { encounterVictoryMessage } from '../src/ui/explorationMessages.js'
import { assignTargetToFocusedAttacker, cancelPendingSummon, setAttackerTarget, toggleBlockerChoice, togglePlayerAttacker } from '../src/ui/combatSelection.js'
import { createDuel, seededRandom, startSessionDuel } from './duelFixtures.js'

type Test = { name: string; run: () => void }
const tests: Test[] = []
const DISCOVERY_CARD = PLAYER_CARD_TYPES.find((card) => card.id === 'P13')!

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

function creature(id: string, owner: PlayerId, attack: number, health: number): Creature {
  return {
    id,
    owner,
    health,
    summonedTurn: 1,
    card: { id: `card-${id}`, name: id, attack, maxHealth: health, cost: { mana: 0, sacrifices: 0 } },
  }
}

function bringToMain(state: DuelState, player: PlayerId): DuelState {
  let current = state
  while (current.activePlayer !== player) current = closeTurn(current)
  return current
}

test('selección directa conserva un objetivo concreto por atacante y limpia el objetivo al retirar al atacante', () => {
  const empty = { attackerIds: [], targetChoices: {}, focusedAttackerId: null }
  let selection = togglePlayerAttacker(empty, 'player-1')
  selection = assignTargetToFocusedAttacker(selection, 'enemy-1')
  equal(selection.targetChoices, { 'player-1': 'enemy-1' })
  selection = togglePlayerAttacker(selection, 'player-2')
  selection = setAttackerTarget(selection, 'player-2', 'enemy-2')
  equal(selection.targetChoices, { 'player-1': 'enemy-1', 'player-2': 'enemy-2' })
  selection = togglePlayerAttacker(selection, 'player-1')
  equal(selection, { attackerIds: ['player-2'], targetChoices: { 'player-2': 'enemy-2' }, focusedAttackerId: 'player-2' })
  const withoutFocus = { attackerIds: [], targetChoices: {}, focusedAttackerId: null }
  truthy(assignTargetToFocusedAttacker(withoutFocus, 'enemy-1') === withoutFocus, 'No se debe asignar un objetivo si no hay atacante seleccionado.')
})

test('selección directa permite varios bloqueadores ordenados y no reutiliza uno en otro ataque', () => {
  const first = toggleBlockerChoice({}, 'enemy-1', 'player-1')
  const second = toggleBlockerChoice(first, 'enemy-1', 'player-2')
  equal(second, { 'enemy-1': ['player-1', 'player-2'] })
  truthy(toggleBlockerChoice(second, 'enemy-2', 'player-1') === second, 'Una criatura ya asignada debe permanecer en un solo bloqueo.')
  equal(toggleBlockerChoice(second, 'enemy-1', 'player-1'), { 'enemy-1': ['player-2'] })
})

test('cancelar sacrificios limpia solo la selección pendiente', () => {
  const duel = createDuel({ playerDeck: cards('cancel-player', 3), opponentDeck: cards('cancel-enemy', 3) })
  const pending = { cardId: 'P13', sacrificeIds: ['creature-1'] }
  equal(cancelPendingSummon(), { cardId: null, sacrificeIds: [] })
  equal(duel.players.player.mana, 1)
  equal(duel.players.player.creatures, [])
  equal(pending, { cardId: 'P13', sacrificeIds: ['creature-1'] })
})

test('la fase principal avanza solo cuando no quedan invocaciones legales ni elecciones pendientes', () => {
  const tooExpensive = cards('too-expensive', 1, { cost: { mana: 2, sacrifices: 0 } })
  const noLegalSummon = createDuel({ playerDeck: tooExpensive, opponentDeck: [] })
  const advanced = advanceMainPhaseIfNoLegalSummons(noLegalSummon)
  equal([advanced.phase, advanced.activePlayer, advanced.attackers], ['attackers', 'player', []])
  truthy(advanceMainPhaseIfNoLegalSummons(noLegalSummon, true) === noLegalSummon, 'Una elección pendiente debe mantener la fase principal.')
  truthy(advanceMainPhaseIfNoLegalSummons(advanced) === advanced, 'La fase de atacantes debe esperar una decisión táctica explícita.')

  const combinedCost = cards('combined-phase', 1, { cost: { mana: 1, sacrifices: 1 } })
  const combinedDuel = createDuel({ playerDeck: combinedCost, opponentDeck: [] })
  const sacrificeReady = {
    ...combinedDuel,
    players: {
      ...combinedDuel.players,
      player: { ...combinedDuel.players.player, creatures: [creature('phase-sacrifice', 'player', 1, 2)] },
    },
  }
  truthy(hasLegalSummon(sacrificeReady.players.player), 'Maná y sacrificio disponibles deben formar una invocación legal.')
  truthy(advanceMainPhaseIfNoLegalSummons(sacrificeReady) === sacrificeReady, 'Una invocación legal debe conservar la fase principal.')

  const noMana = {
    ...sacrificeReady,
    players: { ...sacrificeReady.players, player: { ...sacrificeReady.players.player, mana: 0 } },
  }
  equal(advanceMainPhaseIfNoLegalSummons(noMana).phase, 'attackers')
  const noSacrifice = { ...combinedDuel, players: { ...combinedDuel.players, player: { ...combinedDuel.players.player, creatures: [] } } }
  equal(advanceMainPhaseIfNoLegalSummons(noSacrifice).phase, 'attackers')

  const opponentMain = createDuel({ playerDeck: tooExpensive, opponentDeck: [], firstPlayer: 'opponent' })
  truthy(advanceMainPhaseIfNoLegalSummons(opponentMain) === opponentMain, 'No se debe avanzar la fase del oponente.')
})

test('la invocación de una carta con maná y sacrificio reevalúa las opciones restantes', () => {
  const resolveCombinedCost = (remainingCost: CreatureCard['cost'], suffix: string) => {
    const playerDeck = [
      ...cards(`phase-fuel-${suffix}`, 1),
      ...cards(`phase-ritual-${suffix}`, 1, { cost: { mana: 1, sacrifices: 1 } }),
      ...cards(`phase-option-${suffix}`, 1, { cost: remainingCost }),
    ]
    const initial = createDuel({ playerDeck, opponentDeck: [] })
    const withSacrifice = summon(initial, `phase-fuel-${suffix}-1`)
    const sacrificeId = withSacrifice.players.player.creatures[0].id
    truthy(hasLegalSummon(withSacrifice.players.player), 'El ritual debe ser legal con maná y una criatura disponibles.')
    const afterRitual = summonCreature(withSacrifice, `phase-ritual-${suffix}-1`, [sacrificeId])
    equal([afterRitual.players.player.mana, afterRitual.players.player.creatures.length], [0, 1])
    return afterRitual
  }

  const noLegalOption = resolveCombinedCost({ mana: 1, sacrifices: 0 }, 'no-legal')
  equal(advanceMainPhaseIfNoLegalSummons(noLegalOption).phase, 'attackers', 'Sin otra invocación legal, el pago y sacrificio deben permitir avanzar.')

  const legalOptionRemains = resolveCombinedCost({ mana: 0, sacrifices: 0 }, 'legal')
  truthy(hasLegalSummon(legalOptionRemains.players.player), 'La invocación gratuita restante debe seguir siendo legal tras el pago.')
  equal(advanceMainPhaseIfNoLegalSummons(legalOptionRemains).phase, 'main', 'Una invocación legal restante debe conservar la fase principal.')
})

test('estado inicial: vida 20, nivel 1, maná 1 y tres cartas en mano', () => {
  const state = createDuel({ playerDeck: cards('p', 5), opponentDeck: cards('o', 3) })
  equal([state.players.player.life, state.players.player.level, state.players.player.mana, state.players.player.hand.length], [20, 1, 1, 3])
  equal([requireInvoker(state.players.opponent).life, requireInvoker(state.players.opponent).hand.length], [20, 3])
  equal(baseMana(state.players.player), 1)
  equal(state.players.player.deck.map((card) => card.id), ['p-4', 'p-5'])
})

test('el barajado inicial del jugador es reproducible, conserva copias heridas/mejoradas y no altera el mazo enemigo', () => {
  const playerDeck = cards('shuffle-player', 8)
  const opponentDeck = cards('shuffle-enemy', 5)
  const createSeeded = () => createShuffledDuel({ playerDeck, opponentDeck, random: seededRandom(8042) })
  const first = createSeeded()
  const repeated = createSeeded()
  const firstPlayerOrder = [...first.players.player.hand, ...first.players.player.deck].map((card) => card.id)
  const repeatedPlayerOrder = [...repeated.players.player.hand, ...repeated.players.player.deck].map((card) => card.id)
  equal(firstPlayerOrder, repeatedPlayerOrder)
  truthy(firstPlayerOrder.join(',') !== playerDeck.map((card) => card.id).join(','), 'La fuente sembrada debe generar un orden distinto del mazo original.')
  const firstOpponent = requireInvoker(first.players.opponent)
  equal([...firstOpponent.hand, ...firstOpponent.deck].map((card) => card.id), opponentDeck.map((card) => card.id))
  equal([...firstPlayerOrder].sort(), playerDeck.map((card) => card.id).sort())

  const improved = PLAYER_CARD_TYPES.find((card) => card.id === 'P18')!
  const wounded = PLAYER_CARD_TYPES.find((card) => card.id === 'P01')!
  const originalSession = createGameSession([improved, wounded])
  const [improvedCopy, woundedCopy] = originalSession.copies
  truthy(improvedCopy && woundedCopy, 'Las copias de prueba deben existir.')
  const session = {
    ...originalSession,
    copies: [
      { ...improvedCopy, health: 3, bonusAttack: 2 },
      { ...woundedCopy, health: 1 },
    ],
  }
  const ownedDuel = startShuffledSessionDuel(session, [improved, wounded], [], { random: seededRandom(19) })
  const dealt = [...ownedDuel.players.player.hand, ...ownedDuel.players.player.deck]
  equal(dealt.map((card) => card.copyId).sort(), session.copies.map((copy) => copy.id).sort())
  equal(dealt.find((card) => card.copyId === improvedCopy.id) && [
    dealt.find((card) => card.copyId === improvedCopy.id)!.attack,
    dealt.find((card) => card.copyId === improvedCopy.id)!.startingHealth,
    dealt.find((card) => card.copyId === improvedCopy.id)!.growthProgress,
  ], [improved.attack + 2, 3, 2])
  equal(dealt.find((card) => card.copyId === woundedCopy.id)?.startingHealth, 1)
  equal(session.copies, [{ ...improvedCopy, health: 3, bonusAttack: 2 }, { ...woundedCopy, health: 1 }])
})

test('la legalidad de invocación combina maná y sacrificios sin modificar la mesa', () => {
  const combined = { ...cards('combined', 1)[0], cost: { mana: 1, sacrifices: 1 } }
  const duel = createDuel({ playerDeck: [combined], opponentDeck: [] })
  const player = duel.players.player
  equal(summonAvailability(player, combined.id), { allowed: false, reason: 'Faltan criaturas para sacrificar.' })
  equal(hasLegalSummon(player), false)
  const withoutMana = { ...player, mana: 0, creatures: [creature('sacrifice-ready', 'player', 1, 2)] }
  equal(summonAvailability(withoutMana, combined.id), { allowed: false, reason: 'No hay maná suficiente.' })
  const ableToPay = { ...player, creatures: [creature('sacrifice-ready', 'player', 1, 2)] }
  equal(summonAvailability(ableToPay, combined.id), { allowed: true, reason: '' })
  equal(hasLegalSummon(ableToPay), true)
  equal([duel.players.player.mana, duel.players.player.hand.map((card) => card.id), duel.players.player.creatures], [1, [combined.id], []])
})

test('mantenimiento alterna jugador, recupera maná y roba una carta disponible', () => {
  let state = createDuel({ playerDeck: cards('p', 5), opponentDeck: cards('o', 4) })
  state = { ...state, players: { ...state.players, opponent: { ...requireInvoker(state.players.opponent), mana: 0 } } }
  state = closeTurn(state)
  equal([state.activePlayer, state.turn, state.phase, requireInvoker(state.players.opponent).mana], ['opponent', 2, 'main', 1])
  equal(requireInvoker(state.players.opponent).hand.map((card) => card.id), ['o-1', 'o-2', 'o-3', 'o-4'])
  equal(requireInvoker(state.players.opponent).deck.length, 0)
})

test('invocación paga maná, retira la carta de mano y permite atacar el mismo turno', () => {
  const expensive = cards('p', 3, { attack: 4, cost: { mana: 1, sacrifices: 0 } })
  let state = createDuel({ playerDeck: expensive, opponentDeck: cards('o', 3) })
  state = summon(state, 'p-1')
  equal([state.players.player.mana, state.players.player.hand.length, state.players.player.creatures.length], [0, 2, 1])
  const unitId = state.players.player.creatures[0].id
  state = declareBlockers(declareAttackers(startCombat(state), [unitId]), {})
  state = resolveCombat(state)
  equal(requireInvoker(state.players.opponent).life, 16)
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
  equal(requireInvoker(state.players.opponent).life, 20, 'Una criatura bloqueada no daña al invocador')
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
  equal([requireInvoker(state.players.opponent).life, state.winner, state.phase], [0, 'player', 'finished'])
  throwsRule(() => endTurn(state))
})

test('mazo vacío no roba ni derrota al invocador', () => {
  let state = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) })
  state = closeTurn(state)
  equal([requireInvoker(state.players.opponent).deck.length, requireInvoker(state.players.opponent).hand.length, requireInvoker(state.players.opponent).life], [0, 3, 20])
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

test('el enemigo juega cartas legales y declara atacantes de forma determinista', () => {
  const enemyDeck = [
    ...cards('enemy-free', 1),
    ...cards('enemy-ritual', 1, { cost: { mana: 0, sacrifices: 1 } }),
    ...cards('enemy-mana', 1, { cost: { mana: 1, sacrifices: 0 } }),
    ...cards('enemy-next', 1),
  ]
  const initial = createDuel({ playerDeck: cards('p', 3), opponentDeck: enemyDeck, firstPlayer: 'opponent' })
  const state = runEnemyTurn(initial)
  equal(state.phase, 'blockers')
  equal(state.activePlayer, 'opponent')
  equal(state.attackers, state.players.opponent.creatures.map((unit) => unit.id))
  equal(state.players.opponent.creatures.map((unit) => unit.card.name), ['Criatura enemy-ritual-1', 'Criatura enemy-mana-1'])
  equal(requireInvoker(state.players.opponent).hand.map((card) => card.id), [])
  equal(requireInvoker(state.players.opponent).deck.map((card) => card.id), ['enemy-next-1'])
})

test('el enemigo asigna bloqueos deterministas y resuelve el combate mediante el motor', () => {
  const initial = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) })
  const attackers = [creature('attacker-fragile', 'player', 5, 1), creature('attacker-tough', 'player', 3, 4)]
  const blockers = [creature('blocker-weak', 'opponent', 1, 3), creature('blocker-lethal', 'opponent', 4, 2)]
  const state: DuelState = {
    ...initial,
    phase: 'blockers',
    attackers: attackers.map((unit) => unit.id),
    players: {
      ...initial.players,
      player: { ...initial.players.player, creatures: attackers },
      opponent: { ...initial.players.opponent, creatures: blockers },
    },
  }
  equal(chooseEnemyBlockers(state), {
    'attacker-fragile': ['blocker-weak'],
    'attacker-tough': ['blocker-lethal'],
  })
  const resolved = resolveEnemyBlocks(state)
  equal(resolved.phase, 'resolved')
  equal(resolved.players.player.creatures, [])
  equal(resolved.players.opponent.creatures, [])
  equal(resolved.players.player.life, 20)
})

test('un ataque sin defensores puede cerrar el duelo con victoria del jugador', () => {
  const initial = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3) })
  const attacker = creature('finisher', 'player', 20, 20)
  const state: DuelState = {
    ...initial,
    phase: 'blockers',
    attackers: [attacker.id],
    players: {
      ...initial.players,
      player: { ...initial.players.player, creatures: [attacker] },
      opponent: { ...initial.players.opponent, creatures: [] },
    },
  }
  const result = resolveEnemyBlocks(state)
  equal([result.phase, result.winner, requireInvoker(result.players.opponent).life], ['finished', 'player', 0])
})

test('el duelo termina en derrota cuando el ataque del enemigo reduce la vida a cero', () => {
  const initial = createDuel({
    playerDeck: cards('p', 3),
    opponentDeck: cards('o', 3, { attack: 7, maxHealth: 3 }),
    firstPlayer: 'opponent',
  })
  const enemyTurn = runEnemyTurn(initial)
  const result = resolveCombat(declareBlockers(enemyTurn, {}))
  equal([result.phase, result.winner, result.players.player.life], ['finished', 'opponent', -1])
})

test('conserva heridas de combate en la misma copia al iniciar el duelo siguiente', () => {
  const card: CreatureCard = { id: 'persistent', name: 'Persistente', attack: 1, maxHealth: 5, cost: { mana: 0, sacrifices: 0 } }
  const session = createGameSession([card])
  let duel = startSessionDuel(session, [card], cards('enemy', 3))
  duel = summonCreature(duel, card.id)
  const unit = duel.players.player.creatures[0]
  const enemyUnit = creature('blocker', 'opponent', 2, 5)
  duel = {
    ...duel,
    activePlayer: 'player',
    phase: 'blockers',
    attackers: [unit.id],
    players: {
      ...duel.players,
      opponent: { ...duel.players.opponent, creatures: [enemyUnit] },
    },
  }
  const combat = resolveCombat(declareBlockers(duel, { [unit.id]: [enemyUnit.id] }))
  equal(combat.players.player.creatures[0].health, 3)
  const completed: DuelState = { ...combat, phase: 'finished', winner: 'opponent' }
  const continued = finishSessionDuel(session, completed)
  const nextDuel = startSessionDuel(continued, [card], cards('enemy-next', 3))
  equal(continued.copies, [{ id: 'copy-1', cardId: 'persistent', health: 3, bonusAttack: 0, bonusHealth: 0 }])
  equal(nextDuel.players.player.hand[0], { ...card, copyId: 'copy-1', startingHealth: 3 })
})

test('una criatura muerta se elimina permanentemente y no vuelve al duelo siguiente', () => {
  const owned = cards('owned', 2)
  const session = createGameSession(owned)
  let duel = startSessionDuel(session, owned, cards('enemy', 3))
  duel = summonCreature(duel, owned[0].id)
  const dead = duel.players.player.creatures[0]
  const completed: DuelState = {
    ...duel,
    phase: 'finished',
    winner: 'opponent',
    players: { ...duel.players, player: { ...duel.players.player, life: 0, creatures: [] } },
  }
  const continued = finishSessionDuel(session, completed)
  const nextDuel = startSessionDuel(continued, owned, cards('enemy-next', 3))
  equal(continued.copies.map((copy) => copy.id), ['copy-2'])
  truthy(!nextDuel.players.player.hand.some((card) => card.copyId === dead.copyId), 'La copia muerta no debe reaparecer')
  equal(continued.unlockedCardIds, ['owned-1', 'owned-2'])
})

test('una criatura sacrificada se pierde permanentemente al cerrar el duelo', () => {
  const owned = [
    ...cards('sacrifice', 1),
    ...cards('ritual', 1, { cost: { mana: 0, sacrifices: 1 } }),
  ]
  const session = createGameSession(owned)
  let duel = startSessionDuel(session, owned, cards('enemy', 3))
  duel = summonCreature(duel, owned[0].id)
  const sacrificed = duel.players.player.creatures[0]
  duel = summonCreature(duel, owned[1].id, [sacrificed.id])
  const completed: DuelState = { ...duel, phase: 'finished', winner: 'player' }
  const continued = finishSessionDuel(session, completed)
  equal(continued.copies.map((copy) => copy.cardId), ['ritual-1'])
  equal(continued.unlockedCardIds, ['sacrifice-1', 'ritual-1'])
})

test('la vida del invocador se recupera a 20 tras victoria o derrota', () => {
  const card = cards('owned', 1)[0]
  const session = createGameSession([card])
  const initial = startSessionDuel(session, [card], cards('enemy', 3))
  for (const winner of ['player', 'opponent'] as const) {
    const completed: DuelState = {
      ...initial,
      phase: 'finished',
      winner,
      players: { ...initial.players, player: { ...initial.players.player, life: winner === 'player' ? 6 : 0 } },
    }
    equal(finishSessionDuel(session, completed).invokerLife, 20)
  }
})

test('derrotas consecutivas aumentan la fatiga una vez por duelo y la conservan en el reintento', () => {
  const owned = cards('fatigue-owned', 1)
  const session = createGameSession(owned)
  const first = startSessionDuel(session, owned, cards('enemy', 3))
  const firstLoss: DuelState = {
    ...first,
    phase: 'finished',
    winner: 'opponent',
    players: { ...first.players, player: { ...first.players.player, life: 0 } },
  }
  const afterFirstLoss = finishSessionDuel(session, firstLoss)
  equal([afterFirstLoss.fatigue, afterFirstLoss.invokerLife], [1, 20])

  const duplicateSettlement = finishSessionDuel(afterFirstLoss, firstLoss)
  equal(duplicateSettlement, afterFirstLoss, 'Finalizar dos veces el mismo duelo no debe volver a aplicar sus consecuencias')

  const retry = startSessionDuel(afterFirstLoss, owned, cards('enemy-retry', 3))
  equal([retry.players.player.fatigue, retry.players.player.mana, requireInvoker(retry.players.opponent).fatigue, requireInvoker(retry.players.opponent).mana], [1, 0, 0, 1])
  equal([baseMana(retry.players.player), baseMana(retry.players.opponent)], [0, 1])

  const afterRetryLoss = finishSessionDuel(afterFirstLoss, { ...retry, phase: 'finished', winner: 'opponent' })
  equal(afterRetryLoss.fatigue, 2, 'Una segunda derrota distinta debe sumar otra fatiga')
  let maintained = closeTurn(retry)
  maintained = closeTurn(maintained)
  equal([maintained.players.player.mana, requireInvoker(maintained.players.opponent).mana], [0, 1], 'El mantenimiento respeta la fatiga del jugador y el maná normal del enemigo')
})

test('las victorias reducen la fatiga hasta cero sin hacerla negativa', () => {
  const owned = cards('victory-owned', 1)
  let session = { ...createGameSession(owned), fatigue: 2 }
  const firstWin = startSessionDuel(session, owned, cards('enemy', 3))
  equal([firstWin.players.player.fatigue, firstWin.players.player.mana], [2, 0])
  session = finishSessionDuel(session, { ...firstWin, phase: 'finished', winner: 'player' })
  equal(session.fatigue, 1)

  const secondWin = startSessionDuel(session, owned, cards('enemy-next', 3))
  session = finishSessionDuel(session, { ...secondWin, phase: 'finished', winner: 'player' })
  equal(session.fatigue, 0)

  const thirdWin = startSessionDuel(session, owned, cards('enemy-last', 3))
  session = finishSessionDuel(session, { ...thirdWin, phase: 'finished', winner: 'player' })
  equal(session.fatigue, 0, 'Una victoria con fatiga cero debe dejarla en cero')
})

test('cada punto de fatiga bloquea maná y el máximo utilizable nunca es negativo', () => {
  const invoker = createDuel({ playerDeck: cards('p', 3), opponentDeck: cards('o', 3), playerFatigue: 1 }).players.player
  equal(baseMana({ ...invoker, level: 3 }), 2)
  equal(baseMana({ ...invoker, level: 1, fatigue: 3 }), 0)
})

test('iniciar otro duelo reutiliza solo las copias supervivientes, sin regenerarlas', () => {
  const owned = cards('owned', 2)
  const session = createGameSession(owned)
  const first = startSessionDuel(session, owned, cards('enemy', 3))
  const completed: DuelState = {
    ...first,
    phase: 'finished',
    winner: 'opponent',
    players: { ...first.players, player: { ...first.players.player, life: 0, hand: first.players.player.hand.slice(1) } },
  }
  const continued = finishSessionDuel(session, completed)
  const second = startSessionDuel(continued, owned, cards('enemy-next', 3))
  equal(continued.copies.map((copy) => copy.id), ['copy-2'])
  equal(second.players.player.hand.map((entry) => entry.copyId), ['copy-2'])
  equal(second.players.player.life, 20)
})

test('el catálogo y la colección respetan una copia por tipo y el desbloqueo es de una sola vez', () => {
  const starters = cards('starter', 1)
  const locked = cards('locked', 1, { maxHealth: 4 })[0]
  let session = createGameSession(starters)
  session = unlockCreatureType(session, locked)
  const firstUnlock = session
  session = unlockCreatureType(session, locked)
  equal(session, firstUnlock, 'Repetir el desbloqueo no debe generar otra copia')
  equal(session.unlockedCardIds, ['starter-1', 'locked-1'])
  equal(session.copies.filter((copy) => copy.cardId === locked.id).length, 1)
  equal(session.activeDeckCopyIds, ['copy-1'], 'Desbloquear no selecciona automáticamente la carta en la baraja')
})

test('la baraja activa usa solo las copias seleccionadas y mantiene el orden; admite estar vacía', () => {
  const owned = cards('owned', 4)
  let session = createGameSession(owned)
  const [first, second, third] = session.copies
  session = removeCopyFromActiveDeck(session, first.id)
  session = removeCopyFromActiveDeck(session, third.id)
  session = removeCopyFromActiveDeck(session, second.id)
  session = removeCopyFromActiveDeck(session, session.copies[3].id)
  session = addCopyToActiveDeck(session, third.id)
  session = addCopyToActiveDeck(session, first.id)
  const duel = startSessionDuel(session, owned, cards('enemy', 3))
  equal(duel.players.player.hand.map((card) => card.copyId), [third.id, first.id])
  equal(session.copies.length, 4, 'Retirar una copia de la baraja no la retira de la colección')

  session = removeCopyFromActiveDeck(session, third.id)
  session = removeCopyFromActiveDeck(session, first.id)
  equal(session.activeDeckCopyIds, [])
  equal(startSessionDuel(session, owned, cards('enemy', 3)).players.player.hand, [])
})

test('las copias no seleccionadas no participan ni pierden salud al cerrar el duelo', () => {
  const owned = cards('owned', 2)
  let session = createGameSession(owned)
  const selectedCopy = session.copies[0]
  const restingCopy = session.copies[1]
  session = removeCopyFromActiveDeck(session, restingCopy.id)
  let duel = startSessionDuel(session, owned, cards('enemy', 3))
  duel = summonCreature(duel, owned[0].id)
  const unit = duel.players.player.creatures[0]
  duel = {
    ...duel,
    phase: 'finished',
    winner: 'player',
    players: { ...duel.players, player: { ...duel.players.player, creatures: [{ ...unit, health: 1 }] } },
  }
  const finished = finishSessionDuel(session, duel)
  equal(finished.copies, [
    { ...selectedCopy, health: 1 },
    restingCopy,
  ])
  const nextDuel = startSessionDuel(finished, owned, cards('enemy-next', 3))
  equal(nextDuel.players.player.hand.map((card) => card.copyId), [selectedCopy.id])
})

test('una baja desaparece de colección y baraja, mantiene el catálogo y no se puede volver a desbloquear', () => {
  const locked = cards('locked', 1)[0]
  let session = unlockCreatureType(createGameSession([]), locked)
  const lostCopyId = session.copies[0].id
  session = addCopyToActiveDeck(session, lostCopyId)
  let duel = startSessionDuel(session, [locked], cards('enemy', 3))
  duel = summonCreature(duel, locked.id)
  const completed: DuelState = {
    ...duel,
    phase: 'finished',
    winner: 'opponent',
    players: { ...duel.players, player: { ...duel.players.player, creatures: [] } },
  }
  session = finishSessionDuel(session, completed)
  equal(session.copies, [])
  equal(session.activeDeckCopyIds, [])
  equal(session.unlockedCardIds, [locked.id])
  const repeatedUnlock = unlockCreatureType(session, locked)
  equal(repeatedUnlock.copies, [], 'La copia perdida no se debe regenerar por repetir el desbloqueo')
  equal(repeatedUnlock.unlockedCardIds, [locked.id])
})

test('la colección inicial no duplica tipos repetidos', () => {
  const repeated = cards('same', 1)
  const session = createGameSession([...repeated, ...repeated])
  equal([session.copies.length, session.unlockedCardIds.length, session.activeDeckCopyIds.length], [1, 1, 1])
})

test('los tres duelos principales sustituyen el contenido antiguo por el baseline aprobado', () => {
  equal(DUNGEON_ENCOUNTERS.map((encounter) => [encounter.id, encounter.enemyName]), [
    ['B1', 'Centinela del umbral'],
    ['B2', 'Custodia de catacumbas'],
    ['B3', 'Guardián de la cripta'],
  ])
  equal(DUNGEON_ENCOUNTERS.map((encounter) => encounter.opponentDeck.map((card) => card.id)), [
    ['E08', 'E07', 'E09'],
    ['E08', 'E09', 'E07', 'E11', 'E10'],
    ['E11', 'E13', 'E08', 'E09', 'E14', 'E12'],
  ])
  equal(DUNGEON_ENCOUNTERS[2].opponentDeck.map((card) => [card.attack, card.maxHealth, card.cost]), [
    [4, 5, { mana: 1, sacrifices: 0 }],
    [4, 6, { mana: 1, sacrifices: 0 }],
    [3, 2, { mana: 1, sacrifices: 0 }],
    [2, 4, { mana: 1, sacrifices: 0 }],
    [5, 5, { mana: 0, sacrifices: 1 }],
    [3, 4, { mana: 0, sacrifices: 1 }],
  ])
})

test('la mazmorra solo abre el siguiente encuentro al ganar y no permite repetir encuentros completados', () => {
  let progress = createExplorationProgress()
  const [first, second, third] = DUNGEON_ENCOUNTERS
  truthy(first && second && third, 'La ruta debe contener tres encuentros.')
  equal(currentEncounterId(progress, DUNGEON_ENCOUNTERS), first.id)
  equal([canEnterEncounter(progress, first.id, DUNGEON_ENCOUNTERS), canEnterEncounter(progress, second.id, DUNGEON_ENCOUNTERS)], [true, false])

  progress = recordEncounterVictory(progress, first.id, 'duel-win-1', DUNGEON_ENCOUNTERS).progress
  equal([currentEncounterId(progress, DUNGEON_ENCOUNTERS), canEnterEncounter(progress, first.id, DUNGEON_ENCOUNTERS), canEnterEncounter(progress, second.id, DUNGEON_ENCOUNTERS)], [second.id, false, true])
  progress = recordEncounterVictory(progress, second.id, 'duel-win-2', DUNGEON_ENCOUNTERS).progress
  equal(currentEncounterId(progress, DUNGEON_ENCOUNTERS), third.id)
  progress = recordEncounterVictory(progress, third.id, 'duel-win-3', DUNGEON_ENCOUNTERS).progress
  equal([currentEncounterId(progress, DUNGEON_ENCOUNTERS), isDungeonComplete(progress, DUNGEON_ENCOUNTERS)], [null, true])
  equal(DUNGEON_ENCOUNTERS.map((entry) => canEnterEncounter(progress, entry.id, DUNGEON_ENCOUNTERS)), [false, false, false])
})

test('una derrota no avanza la mazmorra y permite reintentar el mismo encuentro con las consecuencias persistentes', () => {
  const owned = cards('retry-owned', 2)
  const first = DUNGEON_ENCOUNTERS[0]
  let progress = createExplorationProgress()
  const session = createGameSession(owned)
  const firstDuel = startSessionDuel(session, owned, first.opponentDeck)
  const loss: DuelState = { ...firstDuel, phase: 'finished', winner: 'opponent' }
  const afterLoss = finishSessionDuel(session, loss)

  progress = recordEncounterDefeat(progress, first.id, loss.id, DUNGEON_ENCOUNTERS)
  equal(progress.completedEncounterIds, [])
  equal(recordEncounterDefeat(progress, first.id, loss.id, DUNGEON_ENCOUNTERS), progress)
  equal([currentEncounterId(progress, DUNGEON_ENCOUNTERS), canEnterEncounter(progress, first.id, DUNGEON_ENCOUNTERS)], [first.id, true])
  equal([afterLoss.fatigue, afterLoss.invokerLife], [1, 20])
  const retry = startSessionDuel(afterLoss, owned, first.opponentDeck)
  equal(requireInvoker(retry.players.opponent).deck.map((card) => card.id), first.opponentDeck.slice(3).map((card) => card.id))
  equal(retry.players.player.mana, 0)
})

test('el primer desbloqueo entrega Quimera menor una sola vez sin añadirla a la baraja', () => {
  const owned = cards('discovery-starter', 1)
  const session = createGameSession(owned)
  const first = DUNGEON_ENCOUNTERS[0]
  const duel = startSessionDuel(session, owned, first.opponentDeck)
  const win: DuelState = { ...duel, phase: 'finished', winner: 'player' }
  const firstResult = recordEncounterVictory(createExplorationProgress(), first.id, duel.id, DUNGEON_ENCOUNTERS)
  let nextSession = finishSessionDuel(session, win)
  nextSession = unlockCreatureType(nextSession, DISCOVERY_CARD)
  equal(firstResult.discoveredCardId, DISCOVERY_CARD.id)
  equal(nextSession.unlockedCardIds, [...session.unlockedCardIds, DISCOVERY_CARD.id])
  equal(nextSession.copies.filter((copy) => copy.cardId === DISCOVERY_CARD.id).length, 1)
  equal(nextSession.activeDeckCopyIds, session.activeDeckCopyIds)

  const repeated = recordEncounterVictory(firstResult.progress, first.id, duel.id, DUNGEON_ENCOUNTERS)
  nextSession = unlockCreatureType(finishSessionDuel(nextSession, win), DISCOVERY_CARD)
  equal([repeated.discoveredCardId, repeated.progress, nextSession.copies.filter((copy) => copy.cardId === DISCOVERY_CARD.id).length], [undefined, firstResult.progress, 1])
})

test('el aviso distingue la victoria final de una victoria que habilita el siguiente encuentro', () => {
  equal(encounterVictoryMessage('Centinela del umbral', false), 'Victoria contra Centinela del umbral. El siguiente encuentro ya está disponible.')
  equal(encounterVictoryMessage('Guardián de la cripta', true), 'Victoria contra Guardián de la cripta. La mazmorra ha terminado: has superado los tres encuentros.')
})

tests.push(...h1Tests, ...h2Tests, ...h3Tests, ...worldTests, ...presentationTests, ...expeditionTests)
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
