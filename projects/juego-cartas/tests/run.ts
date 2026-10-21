import { addCopyToActiveDeck, baseMana, createDuel, createGameSession, declareAttackers, declareBlockers, endTurn, finishSessionDuel, removeCopyFromActiveDeck, resolveCombat, RuleViolation, startCombat, startSessionDuel, summonCreature, unlockCreatureType } from '../src/engine/index.js'
import { chooseEnemyBlockers, resolveEnemyBlocks, runEnemyTurn } from '../src/engine/enemy.js'
import type { Creature, CreatureCard, DuelState, PlayerId } from '../src/engine/index.js'
import { DISCOVERY_CARD, DUNGEON_ENCOUNTERS } from '../src/engine/content.js'
import { canEnterEncounter, createExplorationProgress, currentEncounterId, isDungeonComplete, recordEncounterDefeat, recordEncounterVictory } from '../src/engine/exploration.js'
import { encounterVictoryMessage } from '../src/ui/explorationMessages.js'

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
  equal(state.players.opponent.hand.map((card) => card.id), [])
  equal(state.players.opponent.deck.map((card) => card.id), ['enemy-next-1'])
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
  equal([result.phase, result.winner, result.players.opponent.life], ['finished', 'player', 0])
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
  equal(continued.copies, [{ id: 'copy-1', cardId: 'persistent', health: 3 }])
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
  equal([retry.players.player.fatigue, retry.players.player.mana, retry.players.opponent.fatigue, retry.players.opponent.mana], [1, 0, 0, 1])
  equal([baseMana(retry.players.player), baseMana(retry.players.opponent)], [0, 1])

  const afterRetryLoss = finishSessionDuel(afterFirstLoss, { ...retry, phase: 'finished', winner: 'opponent' })
  equal(afterRetryLoss.fatigue, 2, 'Una segunda derrota distinta debe sumar otra fatiga')
  let maintained = closeTurn(retry)
  maintained = closeTurn(maintained)
  equal([maintained.players.player.mana, maintained.players.opponent.mana], [0, 1], 'El mantenimiento respeta la fatiga del jugador y el maná normal del enemigo')
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

test('los tres encuentros conservan las composiciones, estadísticas, costes y orden aprobados', () => {
  equal(DUNGEON_ENCOUNTERS.map((encounter) => [encounter.id, encounter.enemyName]), [
    ['threshold-sentinel', 'Centinela del umbral'],
    ['catacomb-keeper', 'Custodia de las catacumbas'],
    ['crypt-guardian', 'Guardián de la cripta'],
  ])
  equal(DUNGEON_ENCOUNTERS.map((encounter) => encounter.opponentDeck.map((card) => card.id)), [
    ['enemy-scout', 'enemy-bat'],
    ['enemy-bat', 'enemy-raider', 'enemy-guard'],
    ['enemy-scout', 'enemy-raider', 'enemy-cultist', 'enemy-boar', 'enemy-bat', 'enemy-guard', 'enemy-ogre'],
  ])
  equal(DUNGEON_ENCOUNTERS[2].opponentDeck.map((card) => [card.attack, card.maxHealth, card.cost]), [
    [2, 3, { mana: 0, sacrifices: 0 }],
    [3, 3, { mana: 1, sacrifices: 0 }],
    [2, 2, { mana: 0, sacrifices: 1 }],
    [4, 5, { mana: 1, sacrifices: 0 }],
    [2, 2, { mana: 0, sacrifices: 0 }],
    [2, 5, { mana: 0, sacrifices: 0 }],
    [4, 4, { mana: 0, sacrifices: 1 }],
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
  equal(retry.players.opponent.deck.map((card) => card.id), first.opponentDeck.slice(3).map((card) => card.id))
  equal(retry.players.player.mana, 0)
})

test('la victoria del primer encuentro descubre Brote de musgo una sola vez sin añadirlo a la baraja', () => {
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
