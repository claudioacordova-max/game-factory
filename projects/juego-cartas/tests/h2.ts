import {
  addCopyToActiveDeck, beginAdventureEncounter, createDuel, createExplorationProgress,
  createGameSession, currentEncounterId, declareAttackers, declareBlockers, DUNGEON_ENCOUNTERS,
  endTurn, enterRatWing, isDungeonComplete, leaveRatWing, PLAYER_CARD_TYPES, reinvokeCreatureType,
  removeCopyFromActiveDeck, resolveCombat, settleAdventureEncounter, startCombat, summonCreature,
} from '../src/engine/index.js'
import type { AdventureState, CreatureCard, DuelState } from '../src/engine/index.js'
import { runEnemyTurn, resolveEnemyBlocks } from '../src/engine/enemy.js'

type Test = { name: string; run: () => void }
export const h2Tests: Test[] = []
function test(name: string, run: () => void) { h2Tests.push({ name: `H2 - ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(expected)}; got ${JSON.stringify(actual)}`)
}
function ok(value: unknown): asserts value { if (!value) throw new Error('Expected truthy') }
function rejected(run: () => unknown) { let caught = false; try { run() } catch { caught = true }; ok(caught) }
const card = (id: string) => PLAYER_CARD_TYPES.find((c) => c.id === id)!
function adventure(ids = ['P01', 'P02', 'P03', 'P04'], fatigue = 4): AdventureState {
  const initial = createGameSession(ids.map(card))
  return { session: { ...initial, copies: [], activeDeckCopyIds: [], fatigue, invokerLife: 1, invokerMaxLife: 1 }, progress: createExplorationProgress() }
}
function recover(state: AdventureState): AdventureState {
  let session = state.session
  for (const id of session.unlockedCardIds) if (!session.copies.some((copy) => copy.cardId === id)) session = reinvokeCreatureType(session, id, PLAYER_CARD_TYPES)
  for (const id of [...session.activeDeckCopyIds]) session = removeCopyFromActiveDeck(session, id)
  for (const id of session.unlockedCardIds) {
    const copy = session.copies.find((c) => c.cardId === id)!
    session = addCopyToActiveDeck(session, copy.id)
  }
  return { ...state, session }
}
function begin(state: AdventureState, id: string) { return beginAdventureEncounter(state, id, DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES) }
function settle(state: AdventureState, duel: DuelState) { return settleAdventureEncounter(state, duel, DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES) }
function summonHand(duel: DuelState) { for (const c of [...duel.players.player.hand]) duel = summonCreature(duel, c.id); return duel }
function directed(duel: DuelState, pairs: [string, string][]) {
  const targets: Record<string, string> = {}
  for (const [own, enemy] of pairs) {
    const a = duel.players.player.creatures.find((u) => u.card.id === own)!
    const b = duel.players.opponent.creatures.find((u) => u.card.id === enemy)!
    targets[a.id] = b.id
  }
  return resolveCombat(declareAttackers(startCombat(duel), Object.keys(targets), targets))
}

test('rescue at max 1 and fatigue 1/4 uses free reinvocation, real R1, wounds, losses and one settlement', () => {
  for (const fatigue of [1, 4]) {
    let state = enterRatWing(recover(adventure(undefined, fatigue)))
    const originalMax = state.session.invokerMaxLife
    const first = begin(state, 'R1')
    equal([first.duel.mode, first.duel.players.player.mana], ['skirmish', 0])
    let duel = summonHand(first.duel)
    duel = directed(duel, [['P01', 'E01']])
    equal([duel.phase, duel.winner, duel.players.player.creatures[0].health], ['finished', 'player', 1])
    state = settle(first.state, duel)
    equal([state.session.invokerMaxLife, state.session.fatigue], [originalMax + 1, fatigue])
    ok(settle(state, duel) === state)
    // Leaving/re-entering is the explicit farming action and keeps that wound.
    const firstVisit = state.progress.ratVisit!.id
    state = enterRatWing(leaveRatWing(state))
    equal(state.progress.ratVisit!.id, firstVisit + 1)
    equal(state.session.copies.find((c) => c.cardId === 'P01')!.health, 1)
    const repeat = begin(state, 'R1')
    duel = directed(summonHand(repeat.duel), [['P02', 'E01']])
    equal([duel.winner, duel.players.player.creatures.some((c) => c.card.id === 'P02')], ['player', false])
    state = settle(repeat.state, duel)
    equal([state.session.invokerMaxLife, state.session.fatigue], [3, fatigue])
    equal(state.session.copies.some((c) => c.cardId === 'P02'), false)
    equal(state.session.unlockedCardIds.includes('P02'), true)
    ok(settle(state, duel) === state)
  }
})

test('groups have no invoker resources and R2/R3 deploy their complete simultaneous fields', () => {
  const state = enterRatWing(recover(adventure()))
  for (const [id, previous, expected] of [
    ['R1', [], ['E01']], ['R2', ['R1'], ['E01', 'E03']], ['R3', ['R1', 'R2'], ['E01', 'E02', 'E04']],
  ] as const) {
    // Isolated route fixture, not a played expedition claim.
    const local = { ...state, progress: { ...state.progress, ratVisit: { id: 1, completedEncounterIds: [...previous] } } }
    const group = begin(local, id).duel.players.opponent
    equal(Object.keys(group).sort(), ['creatures', 'kind'])
    equal(group.creatures.map((unit) => unit.card.id), expected)
  }
})

test('incomplete, foreign, extra and duplicate directed selections reject atomically', () => {
  const started = begin(enterRatWing(recover(adventure())), 'R1')
  const duel = startCombat(summonHand(started.duel))
  const own = duel.players.player.creatures[0].id
  const enemy = duel.players.opponent.creatures[0].id
  const snapshot = JSON.stringify(duel)
  for (const run of [
    () => declareAttackers(duel, [own]), () => declareAttackers(duel, [own], { [own]: own }),
    () => declareAttackers(duel, [own], { [own]: 'absent' }),
    () => declareAttackers(duel, [own], { [own]: enemy, extra: enemy }),
    () => declareAttackers(duel, [own, own], { [own]: enemy }),
  ]) rejected(run)
  equal(JSON.stringify(duel), snapshot)
  // Passing is legal; no creature attacks an absent invoker.
  equal(resolveCombat(declareAttackers(duel, [], {})).players.opponent.creatures.length, 1)
})

test('combined attacks sum damage and share one retaliation in visible order', () => {
  const weak: CreatureCard = { id: 'fixture-a', name: 'A', attack: 2, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } }
  const second = { ...weak, id: 'fixture-b', name: 'B', maxHealth: 4 }
  const enemy = { ...weak, id: 'fixture-target', attack: 3, maxHealth: 4 }
  let duel = createDuel({ mode: 'skirmish', playerDeck: [weak, second], opponentDeck: [], opponentInitialField: [enemy] })
  duel = summonHand(duel)
  const [a, b] = duel.players.player.creatures.map((c) => c.id)
  const target = duel.players.opponent.creatures[0].id
  const declared = declareAttackers(startCombat(duel), [b, a], { [a]: target, [b]: target })
  equal(declared.attackers, [a, b])
  const result = resolveCombat(declared)
  equal([result.winner, result.players.opponent.creatures.length], ['player', 0])
  equal(result.players.player.creatures.map((c) => [c.card.id, c.health]), [['fixture-b', 3]])
})

test('last creatures mutual kill is victory with persistent casualty; zero hero overrides group elimination', () => {
  const first = begin(enterRatWing(recover(adventure(['P02']))), 'R1')
  const result = directed(summonHand(first.duel), [['P02', 'E01']])
  equal([result.winner, result.players.player.creatures.length], ['player', 0])
  const next = settle(first.state, result)
  equal([next.session.copies.length, next.session.invokerMaxLife], [0, 2])
  // Isolated terminal resolution fixture checks loss precedence explicitly.
  const attack = declareAttackers(startCombat(summonHand(first.duel)), ['creature-2'], { 'creature-2': 'creature-1' })
  const zero = { ...attack, players: { ...attack.players, player: { ...attack.players.player, life: 0 } } }
  equal(resolveCombat(zero).winner, 'opponent')
})

test('loss keeps previous visit encounters; retry restores only enemies; transitions forbidden during combat', () => {
  const first = begin(enterRatWing(recover(adventure())), 'R1')
  const won = directed(summonHand(first.duel), [['P01', 'E01']])
  let state = settle(first.state, won)
  const second = begin(state, 'R2')
  rejected(() => enterRatWing(second.state)); rejected(() => leaveRatWing(second.state))
  let duel = resolveCombat(declareAttackers(startCombat(second.duel), [], {}))
  duel = resolveCombat(declareBlockers(runEnemyTurn(endTurn(duel)), {}))
  equal(duel.winner, 'opponent')
  state = settle(second.state, duel)
  equal(state.progress.ratVisit!.completedEncounterIds, ['R1'])
  equal(currentEncounterId(state.progress, DUNGEON_ENCOUNTERS), 'R2')
  equal([state.session.invokerMaxLife, state.session.fatigue], [2, 5])
  const retry = begin(state, 'R2')
  equal(retry.duel.players.opponent.creatures.map((c) => [c.card.id, c.health]), [['E01', 1], ['E03', 3]])
  equal(retry.duel.players.player.mana, 0)
  const out = leaveRatWing(state)
  ok(out.session === state.session)
  equal(currentEncounterId(out.progress, DUNGEON_ENCOUNTERS), 'B1')
})

test('main completion requires B1-B3, never the optional wing', () => {
  const progress = createExplorationProgress()
  equal(currentEncounterId(progress, DUNGEON_ENCOUNTERS), 'B1')
  equal(isDungeonComplete({ ...progress, completedEncounterIds: ['B1', 'B2', 'B3'] }, DUNGEON_ENCOUNTERS), true)
  equal(isDungeonComplete({ ...progress, ratVisit: { id: 1, completedEncounterIds: ['R1', 'R2', 'R3', 'R4'] } }, DUNGEON_ENCOUNTERS), false)
})

test('played seed-only recovery R1-R4 restores max 20 and reduces fatigue exactly once, without auto chest cards', () => {
  let state = enterRatWing(recover(adventure()))
  const plans: [string, [string, string][]][] = [
    ['R1', [['P01', 'E01']]],
    ['R2', [['P01', 'E03'], ['P02', 'E03'], ['P03', 'E01']]],
    ['R3', [['P01', 'E01'], ['P02', 'E02'], ['P03', 'E04']]],
  ]
  for (const [id, plan] of plans) {
    state = recover(state)
    const started = begin(state, id)
    const result = directed(summonHand(started.duel), plan)
    equal(result.winner, 'player')
    state = settle(started.state, result)
  }
  equal([state.session.invokerMaxLife, state.session.fatigue], [4, 4])
  state = recover(state)
  const started = begin(state, 'R4')
  equal(started.duel.players.opponent.kind, 'invoker')
  let duel = started.duel
  for (let turns = 0; turns < 30 && duel.phase !== 'finished'; turns++) {
    duel = summonHand(duel)
    duel = resolveEnemyBlocks(declareAttackers(startCombat(duel), duel.players.player.creatures.map((c) => c.id)))
    if (duel.phase === 'finished') break
    duel = runEnemyTurn(endTurn(duel))
    const blocks: Record<string, string[]> = {}
    for (const enemy of duel.players.opponent.creatures) {
      const blocker = duel.players.player.creatures.find((c) => c.card.id === (enemy.card.id === 'E05' ? 'P02' : 'P03'))
      if (blocker) blocks[enemy.id] = [blocker.id]
    }
    duel = resolveCombat(declareBlockers(duel, blocks))
    if (duel.phase !== 'finished') duel = endTurn(duel)
  }
  equal([duel.phase, duel.winner], ['finished', 'player'])
  state = settle(started.state, duel)
  equal([state.session.invokerMaxLife, state.session.invokerLife, state.session.fatigue, state.progress.ratChestUnlocked], [20, 20, 3, true])
  equal(state.session.unlockedCardIds, ['P01', 'P02', 'P03', 'P04'])
  ok(settle(state, duel) === state)
  const session = state.session
  state = enterRatWing(leaveRatWing(state))
  ok(state.session === session)
  equal([state.progress.ratChestUnlocked, state.progress.ratVisit!.completedEncounterIds], [true, []])
})

test('enemy groups skip maintenance and summoning; simultaneous last-block kill wins with hero alive', () => {
  const rat = DUNGEON_ENCOUNTERS.find((e) => e.id === 'R1')!.opponentInitialField
  let duel = createDuel({ mode: 'skirmish', playerDeck: [card('P02')], opponentDeck: [], opponentInitialField: rat, playerLife: 1 })
  duel = summonHand(duel)
  duel = resolveCombat(declareAttackers(startCombat(duel), [], {}))
  duel = endTurn(duel)
  equal([duel.phase, duel.activePlayer, Object.keys(duel.players.opponent).sort()], ['attackers', 'opponent', ['creatures', 'kind']])
  rejected(() => summonCreature(duel, 'E01'))
  duel = runEnemyTurn(duel)
  const result = resolveCombat(declareBlockers(duel, { [duel.attackers[0]]: [duel.players.player.creatures[0].id] }))
  equal([result.winner, result.players.player.life, result.players.player.creatures.length, result.players.opponent.creatures.length], ['player', 1, 0, 0])
  const enemyFirst = createDuel({ mode: 'skirmish', firstPlayer: 'opponent', playerDeck: [], opponentDeck: [], opponentInitialField: rat, playerLife: 1 })
  equal(enemyFirst.phase, 'attackers')
  equal(resolveCombat(declareBlockers(runEnemyTurn(enemyFirst), {})).winner, 'opponent')
})

test('entry boundary returns complete validated UI metadata for R1/R4 and retry before any state is applied', () => {
  for (const id of ['R1', 'R4']) {
    let state = enterRatWing(recover(adventure()))
    // Isolated route fixture for R4 entry; played seed-only R4 is covered above.
    if (id === 'R4') state = { ...state, progress: { ...state.progress, ratVisit: { ...state.progress.ratVisit!, completedEncounterIds: ['R1', 'R2', 'R3'] } } }
    const snapshot = JSON.stringify(state)
    const started = begin(state, id)
    equal([started.encounter.id, started.encounter.mode, started.encounter.enemyName], [id, started.duel.mode, DUNGEON_ENCOUNTERS.find((e) => e.id === id)!.enemyName])
    equal([started.state.session.activeEncounterId, started.state.session.activeDuelId], [started.encounter.id, started.duel.id])
    equal(JSON.stringify(state), snapshot)
    // A real unblocked enemy turn produces the defeat and unlocks return/retry management.
    let duel = summonHand(started.duel)
    duel = duel.mode === 'skirmish'
      ? resolveCombat(declareAttackers(startCombat(duel), [], {}))
      : resolveEnemyBlocks(declareAttackers(startCombat(duel), []))
    duel = resolveCombat(declareBlockers(runEnemyTurn(endTurn(duel)), {}))
    equal(duel.winner, 'opponent')
    const returned = settle(started.state, duel)
    equal([returned.session.activeDuelId, currentEncounterId(returned.progress, DUNGEON_ENCOUNTERS)], [null, id])
    const retry = begin(returned, id)
    equal([retry.encounter.id, retry.duel.phase, retry.state.session.activeEncounterId], [id, 'main', id])
    ok(retry.duel.id !== started.duel.id)
    const exited = leaveRatWing(returned)
    equal(exited.progress.ratVisit, null)
    equal(currentEncounterId(enterRatWing(exited).progress, DUNGEON_ENCOUNTERS), 'R1')
  }
  const state = enterRatWing(recover(adventure()))
  const snapshot = JSON.stringify(state)
  rejected(() => begin(state, 'unknown'))
  rejected(() => begin(state, 'R4'))
  equal(JSON.stringify(state), snapshot)
})
