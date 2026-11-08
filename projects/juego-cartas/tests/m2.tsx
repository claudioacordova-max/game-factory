import { renderToStaticMarkup } from 'react-dom/server'
import {
  activateR01, baseMana, beginSessionDuel, cardInstanceId, createCopySlotSession, createDuel,
  createGameSession, declareAttackers, declareBlockers, effectiveAttack, endTurn,
  finishSessionDuel, reinvokeCreatureType, requireInvoker, resolveCombat, RuleViolation,
  hasLegalActivation, hasLegalMainPhaseAction, r01ActivationAvailability,
  sacrificeCandidates, startCombat, startSessionDuel, summonAvailability, summonCreature,
  validateCombatIdentities, V04B_CARD_TYPES,
} from '../src/engine/index.js'
import type { CreatureCard, DuelState } from '../src/engine/index.js'
import { CreatureTile, PendingAbilities, R01ActivationButton } from '../src/ui/CardViews.js'
import { CombatView } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { applyCombatAction, continueToPlayerDecision, createCombatControls } from '../src/ui/combatActions.js'
import type { CombatControls } from '../src/ui/combatActions.js'

export const m2Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m2Tests.push({ name: `M2 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}
const card = (id: string): CreatureCard => V04B_CARD_TYPES.find((entry) => entry.id === id)!
const ordered = () => 1 - Number.EPSILON
const sessionOf = (...ids: string[]) => createCopySlotSession(ids.map(card), V04B_CARD_TYPES)
const duelOf = (...ids: string[]) => startSessionDuel(sessionOf(...ids), V04B_CARD_TYPES, [], { random: ordered })
function play(state: DuelState, id: string): DuelState {
  const c = requireInvoker(state.players[state.activePlayer]).hand.find((entry) => entry.id === id)!
  return summonCreature(state, cardInstanceId(c))
}
const tokenOf = (state: DuelState) => state.players.player.creatures.find((unit) => unit.entityKind === 'token')!
const unitOf = (state: DuelState, id: string) => state.players.player.creatures.find((unit) => unit.card.id === id)!
const playerMaintenance = (state: DuelState) => endTurn({ ...state, phase: 'resolved', activePlayer: 'opponent' })
function terminal(state: DuelState, winner: 'player' | 'opponent' = 'opponent'): DuelState {
  return { ...state, phase: 'finished', winner }
}

test('entrada de fatiga V0.4B rechaza fracciones y no finitos sin mutación; mantiene clamp entero y legado', () => {
  for (const fatigue of [0.5, NaN, Infinity]) {
    const setup = { collectionProfile: 'v04b' as const, playerDeck: [card('N05')], opponentDeck: [], playerFatigue: fatigue }
    const before = JSON.stringify(setup), deck = setup.playerDeck
    rejects(() => createDuel(setup))
    equal(JSON.stringify(setup), before)
    ok(Object.is(setup.playerFatigue, fatigue) && setup.playerDeck === deck)
  }
  for (const fatigue of [-3, 0, 1, 7]) {
    const duel = createDuel({ collectionProfile: 'v04b', playerDeck: [], opponentDeck: [], playerFatigue: fatigue })
    equal(duel.players.player.fatigue, Math.min(1, Math.max(0, fatigue)))
  }
  const legacy = createDuel({ playerDeck: [], opponentDeck: [], playerFatigue: 0.5 })
  equal([legacy.players.player.fatigue, legacy.players.player.mana], [0.5, 0.5])
})

test('fatiga V0.4B solo llega a uno por derrotas repetidas, idempotencia y victoria ordinaria no la borra; legado acumula', () => {
  let session = sessionOf('N05')
  for (let attempt = 0; attempt < 3; attempt++) {
    const begun = beginSessionDuel(session, V04B_CARD_TYPES, [])
    const finished = terminal(begun.duel)
    session = finishSessionDuel(begun.session, finished)
    equal(session.fatigue, 1)
    ok(finishSessionDuel(session, finished) === session)
  }
  const win = beginSessionDuel(session, V04B_CARD_TYPES, [])
  equal(finishSessionDuel(win.session, terminal(win.duel, 'player')).fatigue, 1)
  equal(finishSessionDuel(win.session, terminal(win.duel, 'player'), { rewardMaxLife: 0, reducesFatigue: true }).fatigue, 0)
  let legacy = createGameSession([card('N05')])
  for (let attempt = 0; attempt < 3; attempt++) {
    const begun = beginSessionDuel(legacy, V04B_CARD_TYPES, [])
    legacy = finishSessionDuel(begun.session, terminal(begun.duel))
  }
  equal(legacy.fatigue, 3)
})

for (const fatigue of [0, 1]) for (const count of [0, 1, 2]) {
  test(`renovación con ${count} R02 vivas y fatiga ${fatigue}, sin ingreso instantáneo ni acumulación`, () => {
    const session = { ...sessionOf(...Array<string>(count).fill('R02')), fatigue }
    let duel = startSessionDuel(session, V04B_CARD_TYPES, [], { random: ordered })
    for (let index = 0; index < count; index++) duel = play(duel, 'R02')
    equal(duel.players.player.mana, 1 - fatigue)
    const expected = Math.max(0, 1 + count - fatigue)
    equal(baseMana(duel.players.player, 'v04b'), expected)
    duel = playerMaintenance(duel)
    equal([duel.players.player.mana, duel.players.player.temporaryMana, duel.players.player.level], [expected, 0, 1])
    duel = playerMaintenance(duel)
    equal(duel.players.player.mana, expected)
  })
}

test('perder R02 después de renovar no retira recursos ya recibidos; deja de contribuir al siguiente mantenimiento', () => {
  let duel = play(play(duelOf('R02', 'R02'), 'R02'), 'R02')
  duel = playerMaintenance(duel)
  equal(duel.players.player.mana, 3)
  duel = { ...duel, players: { ...duel.players, player: { ...duel.players.player, creatures: duel.players.player.creatures.slice(1) } } }
  equal([duel.players.player.mana, baseMana(duel.players.player, 'v04b')], [3, 2])
  equal(playerMaintenance(duel).players.player.mana, 2)
  equal(baseMana({ ...duel.players.player, level: 9 }, 'v04b'), 2)
  equal(baseMana({ ...duel.players.player, level: 9 }), 9)
})

test('sacrificar R02 para otra carta elimina su aporte futuro sin retirar el maná renovado', () => {
  let duel = play(duelOf('R02', 'N03'), 'R02')
  duel = playerMaintenance(duel)
  equal(duel.players.player.mana, 2)
  const source = unitOf(duel, 'R02'), ref = cardInstanceId(duel.players.player.hand[0])
  duel = summonCreature(duel, ref, [source.id])
  equal(duel.players.player.mana, 2)
  equal(playerMaintenance(duel).players.player.mana, 1)
})

test('R01 entrega +2 temporal voluntario con fatiga 0/1; dos activaciones suman +4 y la misma identidad no se reutiliza', () => {
  for (const fatigue of [0, 1]) {
    let duel = startSessionDuel({ ...sessionOf('R01', 'R01'), fatigue }, V04B_CARD_TYPES, [], { random: ordered })
    duel = play(play(duel, 'R01'), 'R01')
    const [first, second] = duel.players.player.creatures
    const before = JSON.stringify(duel)
    const activated = activateR01(duel, second.id)
    equal(JSON.stringify(duel), before)
    equal([activated.players.player.mana, activated.players.player.temporaryMana, activated.players.player.creatures.map((unit) => unit.copyId)], [3 - fatigue, 2, [first.copyId]])
    rejects(() => activateR01(activated, second.id))
    duel = activateR01(activated, first.id)
    equal([duel.players.player.mana, duel.players.player.temporaryMana, duel.players.player.creatures.length], [5 - fatigue, 4, 0])
    const attack = startCombat(duel)
    equal([attack.players.player.mana, attack.players.player.temporaryMana], [1 - fatigue, 0])
    equal(playerMaintenance(attack).players.player.mana, 1 - fatigue)
  }
})

test('R01 rechaza otras fases, fuente enemiga, muerta, tipo equivocado y perfil legado, sin mutación', () => {
  let duel = play(play(duelOf('R01', 'N05'), 'R01'), 'N05')
  const source = unitOf(duel, 'R01'), before = JSON.stringify(duel)
  for (const phase of ['attackers', 'blockers', 'resolve', 'resolved', 'finished'] as const) rejects(() => activateR01({ ...duel, phase }, source.id))
  rejects(() => activateR01({ ...duel, activePlayer: 'opponent' }, source.id))
  rejects(() => activateR01(duel, unitOf(duel, 'N05').id))
  rejects(() => activateR01({ ...duel, players: { ...duel.players, player: { ...duel.players.player, creatures: [{ ...source, health: 0 }] } } }, source.id))
  const legacy = createDuel({ playerDeck: [card('R01')], opponentDeck: [] })
  const legacyField = play(legacy, 'R01')
  rejects(() => activateR01(legacyField, legacyField.players.player.creatures[0].id))
  equal(JSON.stringify(duel), before)
})

test('el gasto usa temporal primero; coste combinado y expiración conservan renovable no gastado', () => {
  let duel = play(play(duelOf('R01', 'N05', 'N04'), 'R01'), 'N05')
  duel = activateR01(duel, unitOf(duel, 'R01').id)
  const ref = cardInstanceId(duel.players.player.hand[0]), material = unitOf(duel, 'N05')
  const before = JSON.stringify(duel)
  rejects(() => summonCreature(duel, ref, []))
  equal(JSON.stringify(duel), before)
  duel = summonCreature(duel, ref, [material.id])
  equal([duel.players.player.mana, duel.players.player.temporaryMana], [2, 1])
  duel = startCombat(duel)
  equal([duel.players.player.mana, duel.players.player.temporaryMana], [1, 0])
})

test('sacrificio general o muerte de R01 no entrega maná y su copia real se pierde al liquidar', () => {
  const session = sessionOf('R01', 'N03')
  const begun = beginSessionDuel(session, V04B_CARD_TYPES, [], { random: ordered })
  let duel = play(begun.duel, 'R01')
  const source = unitOf(duel, 'R01')
  duel = summonCreature(duel, cardInstanceId(duel.players.player.hand[0]), [source.id])
  equal([duel.players.player.mana, duel.players.player.temporaryMana], [1, 0])
  const settled = finishSessionDuel(begun.session, terminal(duel))
  equal(settled.copies.map((copy) => copy.cardId), ['N03'])
  equal(settled.unlockedCopySlots.R01, 1)
  let combat = createDuel({ collectionProfile: 'v04b', playerDeck: [card('R01')], opponentDeck: [], opponentInitialField: [card('N05')], mode: 'skirmish' })
  combat = play(combat, 'R01')
  combat = resolveCombat(declareAttackers(startCombat(combat), [unitOf(combat, 'R01').id], { [unitOf(combat, 'R01').id]: combat.players.opponent.creatures[0].id }))
  equal([combat.players.player.mana, combat.players.player.temporaryMana, combat.players.player.creatures.length], [1, 0, 0])
})

test('activar una R01 pierde solo esa copia individual al liquidar y conserva duplicado, reserva y cupos', () => {
  const session = sessionOf('R01', 'R01', 'H01')
  const begun = beginSessionDuel({ ...session, activeDeckCopyIds: session.activeDeckCopyIds.slice(0, 2) }, V04B_CARD_TYPES, [], { random: ordered })
  let duel = play(play(begun.duel, 'R01'), 'R01')
  const [survivor, activated] = duel.players.player.creatures
  duel = activateR01(duel, activated.id)
  const result = finishSessionDuel(begun.session, terminal(duel))
  equal(result.copies.map((copy) => copy.id), [survivor.copyId, session.copies[2].id])
  equal(result.activeDeckCopyIds, [survivor.copyId])
  equal(result.unlockedCopySlots.R01, 2)
  ok(result.copies[1] === session.copies[2])
  ok(finishSessionDuel(result, terminal(duel)) === result)
})

test('A02/A04 crean una ficha 1/1 después del pago, con identidades distintas y sin copia persistente', () => {
  let duel = play(play(duelOf('A02', 'A04'), 'A02'), 'A04')
  equal(duel.players.player.creatures.map((unit) => [unit.card.id, unit.entityKind]), [['A02', 'real'], ['token-rat', 'token'], ['A04', 'real'], ['token-rat', 'token']])
  const tokens = duel.players.player.creatures.filter((unit) => unit.entityKind === 'token')
  ok(tokens.every((unit) => unit.health === 1 && unit.card.attack === 1 && unit.card.maxHealth === 1 && !unit.copyId && !unit.card.copyId))
  equal(new Set(duel.players.player.creatures.map((unit) => unit.id)).size, 4)
  equal(new Set(duel.players.player.creatures.map((unit) => unit.card.instanceId)).size, 4)
  validateCombatIdentities(duel)
  equal([duel.players.player.hand.length, duel.players.player.deck.length, duel.participantCopyIds.length], [0, 0, 2])
  duel = playEnemyA02(duel)
  ok(duel.players.opponent.creatures.some((unit) => unit.entityKind === 'real' && !unit.copyId))
  ok(duel.players.opponent.creatures.some((unit) => unit.entityKind === 'token' && !unit.copyId))
})

function playEnemyA02(state: DuelState): DuelState {
  const fresh = createDuel({ collectionProfile: 'v04b', playerDeck: [], opponentDeck: [card('A02')], firstPlayer: 'opponent' })
  const enemy = requireInvoker(fresh.players.opponent)
  return play({ ...state, activePlayer: 'opponent', players: { ...state.players, opponent: enemy } }, 'A02')
}

test('invocación A04 sin maná falla antes de crear criatura o ficha; campo predesplegado no dispara entrada', () => {
  const duel = startSessionDuel({ ...sessionOf('A04'), fatigue: 1 }, V04B_CARD_TYPES, [], { random: ordered })
  const before = JSON.stringify(duel)
  rejects(() => play(duel, 'A04'))
  equal(JSON.stringify(duel), before)
  const prepared = createDuel({ collectionProfile: 'v04b', playerDeck: [], opponentDeck: [], mode: 'skirmish', opponentInitialField: [card('A02'), card('A02')] })
  equal(prepared.players.opponent.creatures.map((unit) => unit.entityKind), ['real', 'real'])
})

test('fichas invocadas atacan y bloquean inmediatamente sin daño sobrante al invocador', () => {
  let duel = play(duelOf('A02'), 'A02')
  const token = tokenOf(duel)
  duel = resolveCombat(declareBlockers(declareAttackers(startCombat(duel), [token.id]), {}))
  equal(requireInvoker(duel.players.opponent).life, 19)
  let defense = createDuel({ collectionProfile: 'v04b', playerDeck: [card('A02')], opponentDeck: [], opponentInitialField: [card('N06')] })
  defense = play(defense, 'A02')
  const blocker = tokenOf(defense), attacker = defense.players.opponent.creatures[0]
  defense = declareAttackers({ ...defense, activePlayer: 'opponent', phase: 'attackers' }, [attacker.id])
  defense = resolveCombat(declareBlockers(defense, { [attacker.id]: [blocker.id] }))
  equal([defense.players.player.life, defense.players.player.creatures.length, defense.players.opponent.creatures.length], [20, 1, 0])
})

test('fichas pagan sacrificios generales 1/2 y pagos inválidos no consumen recursos, materiales ni disparadores', () => {
  for (const target of ['N03', 'N04', 'N08', 'N09']) {
    let duel = play(duelOf('A02', 'A02', target), 'A02')
    const count = card(target).cost.sacrifices
    if (count === 2) duel = play(duel, 'A02')
    const materials = duel.players.player.creatures.filter((unit) => unit.entityKind === 'token').slice(0, count)
    const ref = cardInstanceId(duel.players.player.hand.find((c) => c.id === target)!), before = JSON.stringify(duel)
    for (const invalid of [[], ['missing'], [materials[0].id, materials[0].id]]) rejects(() => summonCreature(duel, ref, invalid))
    equal(JSON.stringify(duel), before)
    duel = summonCreature(duel, ref, materials.map((unit) => unit.id))
    ok(materials.every((material) => !duel.players.player.creatures.some((unit) => unit.id === material.id)))
    equal(duel.players.player.mana, 1 - card(target).cost.mana)
    ok(duel.players.player.creatures.some((unit) => unit.card.id === target))
  }
})

test('coste de tres materiales conserva selección/cancelación atómica; H04 solo admite reales', () => {
  let duel = play(play(duelOf('A02', 'A02', 'H04'), 'A02'), 'A02')
  const ritual = duel.players.player.hand[0], before = JSON.stringify(duel)
  equal([sacrificeCandidates(duel.players.player, ritual).length, summonAvailability(duel.players.player, cardInstanceId(ritual)).allowed], [2, false])
  rejects(() => summonCreature(duel, cardInstanceId(ritual), duel.players.player.creatures.slice(0, 3).map((unit) => unit.id)))
  equal(JSON.stringify(duel), before)
  // Generic 3S fixture exercises exact payments without implementing the H04 ritual.
  const generic = { ...ritual, id: 'test-cost-3', abilities: [], cost: { mana: 1, sacrifices: 3 } }
  duel = { ...duel, players: { ...duel.players, player: { ...duel.players.player, hand: [generic] } } }
  let controls = createCombatControls(duel)
  controls = applyCombatAction(controls, { type: 'summon', cardId: cardInstanceId(generic) }, 0).state
  for (const material of duel.players.player.creatures.slice(0, 2)) controls = applyCombatAction(controls, { type: 'sacrifice', creatureId: material.id }, controls.revision).state
  equal(controls.duel.players.player.mana, 1)
  const cancelled = applyCombatAction(controls, { type: 'cancel' }, controls.revision).state
  equal([cancelled.duel.players.player.creatures.length, cancelled.duel.players.player.mana], [4, 1])
  const paid = summonCreature(duel, cardInstanceId(generic), duel.players.player.creatures.slice(0, 3).map((unit) => unit.id))
  equal([paid.players.player.creatures.length, paid.players.player.mana], [2, 0])
})

for (const tokenOutcome of ['sobrevive', 'muere', 'se sacrifica'] as const) {
  test(`ficha que ${tokenOutcome} no se convierte en copia ni causa pérdidas falsas, tampoco aparece en el siguiente duelo`, () => {
    const session = sessionOf('A02', 'N03', 'H01')
    const begun = beginSessionDuel({ ...session, activeDeckCopyIds: session.activeDeckCopyIds.slice(0, 2) }, V04B_CARD_TYPES, [], { random: ordered })
    let duel = play(begun.duel, 'A02')
    const token = tokenOf(duel)
    if (tokenOutcome === 'muere') duel = { ...duel, players: { ...duel.players, player: { ...duel.players.player, creatures: duel.players.player.creatures.filter((unit) => unit.id !== token.id) } } }
    if (tokenOutcome === 'se sacrifica') duel = summonCreature(duel, cardInstanceId(duel.players.player.hand[0]), [token.id])
    const settled = finishSessionDuel(begun.session, terminal(duel, 'player'))
    equal(settled.copies.map((copy) => copy.cardId), ['A02', 'N03', 'H01'])
    equal(settled.unlockedCopySlots, session.unlockedCopySlots)
    ok(settled.copies[2] === session.copies[2])
    rejects(() => reinvokeCreatureType(settled, 'token-rat', V04B_CARD_TYPES))
    const next = startSessionDuel(settled, V04B_CARD_TYPES, [])
    ok([...next.players.player.hand, ...next.players.player.deck].every((c) => c.entityKind === 'real'))
    equal(next.players.player.creatures.length, 0)
  })
}

test('la victoria natural elimina fichas de ambos bandos; colección/mano/mazos rechazan entidades temporales con o sin copyId', () => {
  let duel = play(duelOf('A02'), 'A02')
  const token = tokenOf(duel), all = duel.players.player.creatures.map((unit) => unit.id)
  duel = playEnemyA02(duel)
  duel = { ...duel, activePlayer: 'player', players: { ...duel.players, opponent: { ...requireInvoker(duel.players.opponent), life: 1 } } }
  const finished = resolveCombat(declareBlockers(declareAttackers(startCombat(duel), all), {}))
  equal([finished.phase, finished.players.player.creatures.some((unit) => unit.entityKind === 'token')], ['finished', false])
  ok(finished.players.opponent.creatures.every((unit) => unit.entityKind !== 'token'))
  rejects(() => createGameSession([token.card]))
  rejects(() => createDuel({ playerDeck: [token.card], opponentDeck: [] }))
  const bad = { ...duel, players: { ...duel.players, player: { ...duel.players.player, hand: [token.card] } } }
  rejects(() => validateCombatIdentities(bad))
  const falseCopy = { ...token, copyId: 'fake', card: { ...token.card, copyId: 'fake' } }
  rejects(() => validateCombatIdentities({ ...duel, players: { ...duel.players, player: { ...duel.players.player, creatures: [falseCopy] } } }))
})

for (const others of [0, 1, 3]) {
  test(`A04 cuenta exactamente ${others} otras atacantes, incluidas fichas, y vuelve al ataque base al resolver`, () => {
    let duel = play(play(play(duelOf('A04', 'A01', 'N05'), 'A04'), 'A01'), 'N05')
    const source = unitOf(duel, 'A04')
    const allies = duel.players.player.creatures.filter((unit) => unit.id !== source.id).slice(0, others)
    const declared = declareAttackers(startCombat(duel), [source.id, ...allies.map((unit) => unit.id)])
    equal(effectiveAttack(unitOf(declared, 'A04')), 1 + others)
    equal(unitOf(declared, 'A04').card.attack, 1)
    const resolved = resolveCombat(declareBlockers(declared, {}))
    equal(requireInvoker(resolved.players.opponent).life, 20 - (1 + others + allies.reduce((sum, unit) => sum + effectiveAttack(unit), 0)))
    equal([effectiveAttack(unitOf(resolved, 'A04')), unitOf(resolved, 'A04').attackBonus], [1, undefined])
  })
}

test('A04 conserva el bono fijado aunque una aliada muera simultáneamente y no lo usa para bloquear', () => {
  let duel = createDuel({ collectionProfile: 'v04b', playerDeck: [card('A04')], opponentDeck: [], opponentInitialField: [card('H01'), card('N05')] })
  duel = play(duel, 'A04')
  const source = unitOf(duel, 'A04'), token = tokenOf(duel), [wall, foe] = duel.players.opponent.creatures
  duel = resolveCombat(declareBlockers(declareAttackers(startCombat(duel), [source.id, token.id]), { [source.id]: [wall.id], [token.id]: [foe.id] }))
  equal(duel.players.opponent.creatures.map((unit) => [unit.card.id, unit.health]), [['H01', 1]])
  equal([tokenOf(duel), effectiveAttack(unitOf(duel, 'A04'))], [undefined, 1])
  const defense = declareAttackers({ ...duel, activePlayer: 'opponent', phase: 'attackers' }, [wall.id])
  const result = resolveCombat(declareBlockers(defense, { [wall.id]: [source.id] }))
  equal(result.players.opponent.creatures.length, 0)
  equal(effectiveAttack(unitOf(result, 'A04')), 1)
})

test('A04 aplica el bono en escaramuza entre objetivos distintos y daño simultáneo incluso si muere', () => {
  let duel = createDuel({ collectionProfile: 'v04b', playerDeck: [card('A04'), card('A01')], opponentDeck: [], opponentInitialField: [card('H02'), card('N02')], mode: 'skirmish' })
  duel = play(play(duel, 'A04'), 'A01')
  const source = unitOf(duel, 'A04'), token = tokenOf(duel), ally = unitOf(duel, 'A01'), [first, second] = duel.players.opponent.creatures
  duel = resolveCombat(declareAttackers(startCombat(duel), [source.id, token.id, ally.id], { [source.id]: first.id, [token.id]: first.id, [ally.id]: second.id }))
  equal([duel.phase, duel.winner, unitOf(duel, 'A04').health], ['finished', 'player', 1])
  let mutual = createDuel({ collectionProfile: 'v04b', playerDeck: [card('A04')], opponentDeck: [], opponentInitialField: [card('N02')] })
  mutual = play(mutual, 'A04')
  const a04 = unitOf(mutual, 'A04'), rat = tokenOf(mutual), blocker = mutual.players.opponent.creatures[0]
  mutual = resolveCombat(declareBlockers(declareAttackers(startCombat(mutual), [a04.id, rat.id]), { [a04.id]: [blocker.id] }))
  equal([unitOf(mutual, 'A04'), mutual.players.opponent.creatures.length, requireInvoker(mutual.players.opponent).life], [undefined, 0, 19])
})

test('A04 no escribe mejoras persistentes ni cambia sus estadísticas entre combates', () => {
  const session = sessionOf('A04', 'A01'), begun = beginSessionDuel(session, V04B_CARD_TYPES, [], { random: ordered })
  let duel = play(play(begun.duel, 'A04'), 'A01')
  duel = resolveCombat(declareBlockers(declareAttackers(startCombat(duel), duel.players.player.creatures.map((unit) => unit.id)), {}))
  const settled = finishSessionDuel(begun.session, terminal(duel, 'player'))
  equal(settled.copies[0], session.copies[0])
  const next = startSessionDuel(settled, V04B_CARD_TYPES, [], { random: ordered })
  equal([next.players.player.hand[0].attack, next.players.player.hand[0].maxHealth], [1, 2])
})

test('presentación distingue ficha temporal, ATQ de esa ofensiva y metadatos de motor frente a pendientes', () => {
  const duel = play(duelOf('A04'), 'A04')
  const token = tokenOf(duel), source = unitOf(duel, 'A04')
  const tokenMarkup = renderToStaticMarkup(<CreatureTile creature={token} />)
  ok(tokenMarkup.includes('Ficha de rata') && tokenMarkup.includes('Ficha temporal') && !tokenMarkup.includes('copy-'))
  const declared = declareAttackers(startCombat(duel), [source.id, token.id])
  const bonusMarkup = renderToStaticMarkup(<CreatureTile creature={unitOf(declared, 'A04')} />)
  ok(bonusMarkup.includes('title="Ataque"') && bonusMarkup.includes('>2<small>ATQ'))
  equal(card('A04').attack, 1)
  const pending = renderToStaticMarkup(<PendingAbilities card={card('N01')} />)
  const available = renderToStaticMarkup(<PendingAbilities card={card('A02')} />)
  const activation = renderToStaticMarkup(<PendingAbilities card={card('R01')} />)
  ok(pending.includes('Habilidades') && available.includes('Habilidades') && activation.includes('Habilidades') && !activation.includes('pendiente P5'))
})

test('P5 conserva principal por una R01 legal sin cartas, permite pasar sin activarla y no activa automáticamente', () => {
  const prepared = play(duelOf('R01'), 'R01'), source = unitOf(prepared, 'R01')
  ok(hasLegalActivation(prepared) && hasLegalMainPhaseAction(prepared) && r01ActivationAvailability(prepared, source.id).allowed)
  const controls = createCombatControls(prepared)
  const continued = applyCombatAction(controls, { type: 'advance' }, controls.revision)
  ok(continued.state === controls)
  equal([prepared.phase, prepared.players.player.mana, prepared.players.player.temporaryMana, prepared.players.player.creatures.length], ['main', 1, 0, 1])
  const passed = applyCombatAction(controls, { type: 'begin-attack' }, controls.revision)
  equal([passed.state.duel.phase, passed.state.duel.players.player.creatures[0].copyId, passed.sacrificedCopyIds], ['attackers', source.copyId, []])
  equal([passed.state.duel.players.player.mana, passed.state.duel.players.player.temporaryMana], [1, 0])
})

test('P5 última R01 con mano vacía se activa legalmente aunque el recálculo avance y expire el temporal', () => {
  const prepared = play(duelOf('R01'), 'R01'), source = unitOf(prepared, 'R01')
  const controls = createCombatControls(prepared)
  const activated = applyCombatAction(controls, { type: 'activate-r01', creatureId: source.id }, controls.revision)
  equal([activated.state.duel.phase, activated.state.duel.players.player.mana, activated.state.duel.players.player.temporaryMana], ['attackers', 1, 0])
  equal([activated.state.pending, activated.sacrificedCopyIds, activated.state.duel.players.player.creatures.length], [null, [source.copyId], 0])
  ok(activated.message.includes('expiró al pasar al ataque'))
  const repeated = applyCombatAction(activated.state, { type: 'activate-r01', creatureId: source.id }, activated.state.revision)
  ok(repeated.state === activated.state)
})

test('P5 dos R01 se activan sucesivamente, habilitan invocación por maná y recálculo no salta una acción legal', () => {
  const begun = beginSessionDuel(sessionOf('R01', 'R01', 'R04'), V04B_CARD_TYPES, [], { random: ordered })
  let controls = createCombatControls(begun.duel)
  for (let index = 0; index < 2; index++) {
    const ref = cardInstanceId(controls.duel.players.player.hand.find((c) => c.id === 'R01')!)
    controls = applyCombatAction(controls, { type: 'summon', cardId: ref }, controls.revision).state
  }
  equal(controls.duel.phase, 'main')
  const sources = [...controls.duel.players.player.creatures]
  const first = applyCombatAction(controls, { type: 'activate-r01', creatureId: sources[0].id }, controls.revision)
  controls = first.state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['main', 3, 2])
  ok(!summonAvailability(controls.duel.players.player, cardInstanceId(controls.duel.players.player.hand[0])).allowed)
  const second = applyCombatAction(controls, { type: 'activate-r01', creatureId: sources[1].id }, controls.revision)
  controls = second.state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['main', 5, 4])
  equal([...first.sacrificedCopyIds, ...second.sacrificedCopyIds], sources.map((unit) => unit.copyId))
  controls = applyCombatAction(controls, { type: 'summon', cardId: cardInstanceId(controls.duel.players.player.hand[0]) }, controls.revision).state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['attackers', 1, 0])
  equal(controls.duel.players.player.creatures.map((unit) => unit.card.id), ['R04'])
  const settled = finishSessionDuel(begun.session, terminal(controls.duel))
  equal(settled.copies.map((copy) => copy.cardId), ['R04'])
  equal(settled.unlockedCopySlots.R01, 2)
})

test('P5 con fatiga uno R01 habilita carta antes imposible, y pasar voluntariamente elimina sobrante', () => {
  let duel = startSessionDuel({ ...sessionOf('R01', 'N02'), fatigue: 1 }, V04B_CARD_TYPES, [], { random: ordered })
  duel = play(duel, 'R01')
  let controls = createCombatControls(duel)
  const source = unitOf(duel, 'R01'), ref = cardInstanceId(duel.players.player.hand[0])
  ok(!summonAvailability(duel.players.player, ref).allowed)
  controls = applyCombatAction(controls, { type: 'activate-r01', creatureId: source.id }, controls.revision).state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['main', 2, 2])
  ok(summonAvailability(controls.duel.players.player, ref).allowed)
  const passed = applyCombatAction(controls, { type: 'begin-attack' }, controls.revision).state
  equal([passed.duel.players.player.mana, passed.duel.players.player.temporaryMana, passed.duel.players.player.hand[0].instanceId], [0, 0, ref])
  controls = applyCombatAction(controls, { type: 'summon', cardId: ref }, controls.revision).state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['attackers', 0, 0])
})

test('P5 selección pendiente bloquea activar y pasar; cancelar no consume maná ni materiales y reevalúa', () => {
  const prepared = play(play(duelOf('R01', 'A02', 'N08'), 'R01'), 'A02')
  let controls = createCombatControls(prepared)
  const rune = unitOf(prepared, 'R01'), token = tokenOf(prepared), ref = cardInstanceId(prepared.players.player.hand[0])
  controls = applyCombatAction(controls, { type: 'summon', cardId: ref }, controls.revision).state
  controls = applyCombatAction(controls, { type: 'sacrifice', creatureId: token.id }, controls.revision).state
  equal(controls.pending?.sacrificeIds, [token.id])
  const before = JSON.stringify(controls)
  for (const action of [{ type: 'activate-r01' as const, creatureId: rune.id }, { type: 'begin-attack' as const }]) {
    const rejected = applyCombatAction(controls, action, controls.revision)
    ok(rejected.state === controls && rejected.message)
  }
  equal(JSON.stringify(controls), before)
  const cancelled = applyCombatAction(controls, { type: 'cancel' }, controls.revision).state
  equal([cancelled.pending, cancelled.duel.phase, cancelled.duel.players.player.mana, cancelled.duel.players.player.temporaryMana], [null, 'main', 1, 0])
  equal(cancelled.duel.players.player.creatures, prepared.players.player.creatures)
  ok(hasLegalActivation(cancelled.duel))
  // Completing the ordinary payment with R01 must never activate its ability.
  controls = applyCombatAction(cancelled, { type: 'summon', cardId: ref }, cancelled.revision).state
  for (const material of [rune.id, token.id]) controls = applyCombatAction(controls, { type: 'sacrifice', creatureId: material }, controls.revision).state
  equal([controls.duel.phase, controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], ['attackers', 1, 0])
})

test('P5 botón real protege copia exacta ante clic doble, Enter repetido, revisión obsoleta y selección pendiente', () => {
  const duel = play(play(duelOf('R01', 'R01', 'R04'), 'R01'), 'R01')
  let controls = createCombatControls(duel)
  const [first, second] = duel.players.player.creatures
  const buttonFor = (source: typeof first, disabled = false) => {
    const revision = controls.revision
    return R01ActivationButton({ creature: source, disabled, onActivate: (creatureId) => {
      controls = applyCombatAction(controls, { type: 'activate-r01', creatureId }, revision).state
    } })
  }
  const secondButton = buttonFor(second)
  secondButton.props.onClick({ detail: 1, preventDefault() {} })
  equal(controls.duel.players.player.creatures.map((unit) => unit.copyId), [first.copyId])
  equal([controls.duel.players.player.mana, controls.duel.players.player.temporaryMana], [3, 2])
  const stable = controls
  secondButton.props.onClick({ detail: 1, preventDefault() {} })
  ok(controls === stable, 'El handler del render anterior conserva la revisión capturada')
  const firstButton = buttonFor(first)
  firstButton.props.onClick({ detail: 2, preventDefault() {} })
  ok(controls === stable, 'El segundo clic nativo no activa la carta que ocupa después esa posición')
  let prevented = false
  firstButton.props.onKeyDown({ key: 'Enter', repeat: true, preventDefault() { prevented = true } })
  ok(prevented)
  const disabledButton = buttonFor(first, true)
  disabledButton.props.onClick({ detail: 0, preventDefault() {} })
  ok(controls === stable)
  firstButton.props.onKeyDown({ key: 'Enter', repeat: false, preventDefault() { throw new Error('No debe impedir Enter inicial') } })
  firstButton.props.onClick({ detail: 0, preventDefault() {} })
  equal([controls.duel.players.player.mana, controls.duel.players.player.temporaryMana, controls.duel.players.player.creatures.length], [5, 4, 0])
})

function combatProps(controls: CombatControls, session = sessionOf('R01', 'R01', 'N08')): CombatViewProps {
  const noop = () => {}
  return {
    duel: controls.duel, session, enemyName: 'Prueba P5', enemyMaxLife: 20, notice: '', noticeRevision: controls.revision,
    selectedCardId: controls.pending?.cardId ?? null, sacrificeIds: controls.pending?.sacrificeIds ?? [],
    attackerIds: [], targetChoices: {}, blockerChoices: {}, onSelectCard: noop, onActivateR01: noop,
    onDropHandCard: noop, onToggleSacrifice: noop, onSelectAttacker: noop,
    onCancelSummon: noop, onBeginCombat: noop, onDeclareAttacks: noop, onConfirmBlocks: noop,
    onStartRelationDrag: () => false, onCancelRelationDrag: noop, onDropRelation: noop, onMoveBlocker: noop, onMoveAttacker: noop,
  }
}

test('P5 vista real muestra dos controles identificados y coste explícito; los deshabilita al sacrificar y desaparecen fuera de principal', () => {
  const duel = play(play(duelOf('R01', 'R01', 'N08'), 'R01'), 'R01')
  let controls = createCombatControls(duel)
  const markup = renderToStaticMarkup(<CombatView {...combatProps(controls)} />)
  equal((markup.match(/class="combat-r01-activation"/g) ?? []).length, 2)
  ok(markup.includes('aria-label="Activar Runa inestable copy-1"') && markup.includes('aria-label="Activar Runa inestable copy-2"'))
  ok(markup.includes('Sacrifica copy-1') && markup.includes('+2 maná temporal') && markup.includes('Ir al ataque'))
  const ref = cardInstanceId(duel.players.player.hand[0])
  controls = applyCombatAction(controls, { type: 'summon', cardId: ref }, controls.revision).state
  const pending = renderToStaticMarkup(<CombatView {...combatProps(controls)} />)
  equal((pending.match(/class="combat-r01-activation" disabled=""/g) ?? []).length, 2)
  ok(!pending.includes('Ir al ataque') && pending.includes('Cancelar sacrificio'))
  const attack = createCombatControls(startCombat(duel))
  const attacking = renderToStaticMarkup(<CombatView {...combatProps(attack)} />)
  ok(!attacking.includes('combat-r01-activation'))
})

test('P5 solo conserva activaciones realmente legales; N01 sin objetivos y perfil legado no cambian su automatización', () => {
  const legacy = play(createDuel({ playerDeck: [card('R01')], opponentDeck: [] }), 'R01')
  equal([hasLegalActivation(legacy), continueToPlayerDecision(legacy).phase], [false, 'attackers'])
  const pendingEffect = play(duelOf('N01'), 'N01')
  equal([hasLegalActivation(pendingEffect), continueToPlayerDecision(pendingEffect).phase], [false, 'attackers'])
  let controls = createCombatControls(pendingEffect)
  const rejected = applyCombatAction(controls, { type: 'activate-r01', creatureId: unitOf(pendingEffect, 'N01').id }, controls.revision)
  ok(rejected.state === controls && rejected.message)
  const enemyTurn = { ...play(duelOf('R01'), 'R01'), activePlayer: 'opponent' as const }
  controls = createCombatControls(enemyTurn)
  ok(applyCombatAction(controls, { type: 'activate-r01', creatureId: unitOf(enemyTurn, 'R01').id }, controls.revision).state === controls)
})
