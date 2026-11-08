import {
  ACTIVE_CONTENT, createDuel, createGameSession, createV04BCatalogSandbox, createV04BEncounterDuel, createV04BInitialSession,
  declareAttackers, declareBlockers, endTurn, finishSessionDuel, healingCandidates, mainHealingSource, requireInvoker, resolveCombat, resolveMainHealing,
  RuleViolation, sacrificeCandidates, startCombat, summonAvailability, summonCreature, validateCombatIdentities, V04B_CARD_TYPES, V04B_ENCOUNTERS,
} from '../src/engine/index.js'
import type { DuelState, GameSession } from '../src/engine/index.js'
import { chooseEnemyBlockers, runEnemyTurn } from '../src/engine/enemy.js'
import { seededRandom } from './duelFixtures.js'

export const m4Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m4Tests.push({ name: `M4 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function rejects(run: () => unknown) { try { run() } catch (e) { if (e instanceof RuleViolation) return; throw e } throw new Error('Faltó rechazo') }
const card = (id: string) => V04B_CARD_TYPES.find((c) => c.id === id)!
const ids = (list: readonly { card: { id: string } }[]) => list.map((c) => c.card.id)
const enemyOf = (d: DuelState) => requireInvoker(d.players.opponent)
const ordered = () => 1 - Number.EPSILON
const PLAYER_DECK = ['N05', 'N05', 'N02', 'N02', 'N06', 'N06', 'A01', 'A01'].map(card)
const encounter = (id: string) => V04B_ENCOUNTERS.find((e) => e.id === id)!
/** Rival-side fixture: V0.4B duel with an authored rival deck/field and a neutral player deck. */
function rival(deckIds: string[], fieldIds: string[] = [], firstPlayer: 'player' | 'opponent' = 'opponent', opponentLife = 20) {
  return createDuel({ collectionProfile: 'v04b', playerDeck: PLAYER_DECK, opponentDeck: deckIds.map(card), opponentInitialField: fieldIds.map(card), firstPlayer, opponentLife, random: ordered })
}
/** Ends the active player's turn (state forced to `resolved`, as in the M3 suites). */
const pass = (d: DuelState) => endTurn({ ...d, phase: 'resolved' })
function wound(d: DuelState, id: string, health: number): DuelState {
  const side = d.players.opponent
  return { ...d, players: { ...d.players, opponent: { ...side, creatures: side.creatures.map((c) => c.id === id ? { ...c, health } : c) } } }
}

// ---------- Datos de los diez encuentros ----------
test('diez encuentros: composiciones, vidas, orden y nombres oficiales', () => {
  const duels: [string, string, number, string[]][] = [
    ['02', 'El Centinela', 12, ['N05', 'N02', 'H01', 'A01', 'N05', 'N06']],
    ['09', 'Señora de las Ratas', 10, ['A02', 'N03', 'N02', 'A02', 'N03']],
    ['06', 'El Prior', 20, ['H01', 'N05', 'N02', 'H03', 'N03', 'H02', 'H01', 'N07', 'N04']],
    ['18', 'El Devoto', 18, ['N05', 'H01', 'H01', 'H03', 'N07', 'H02', 'H04', 'N03', 'N05']],
    ['19', 'El Rey Esqueleto', 28, ['N05', 'H01', 'N02', 'R02', 'N05', 'N03', 'R01', 'N04', 'R03', 'N08', 'N09', 'H02']],
  ]
  for (const [room, name, life, deck] of duels) {
    const data = encounter(room)
    equal([data.mode, data.name, data.opponentLife, data.deckIds, data.fieldIds, data.tentativeName], ['duel', name, life, deck, [], undefined])
    const { duel } = createV04BEncounterDuel(createV04BInitialSession(), room, { random: ordered })
    const enemy = enemyOf(duel)
    equal([duel.mode, duel.encounterId, enemy.life, enemy.hand.length, enemy.mana], ['duel', room, life, 3, 1])
    equal([...enemy.hand, ...enemy.deck].map((c) => c.id), deck)
    equal([...enemy.hand, ...enemy.deck].map((c) => c.name), deck.map((id) => card(id).name))
    equal(duel.players.opponent.creatures, [])
  }
  const skirmishes: [string, string, string[]][] = [
    ['04', 'Los Caídos', ['H01', 'N02', 'N05']], ['07', 'Ratas de la Madriguera', ['A02', 'A02']], ['08', 'Ratas del Nido', ['A02', 'N03']],
    ['16', 'Carroñeros del Foso', ['N05', 'N06', 'N07']], ['17', 'Los Encadenados', ['H01', 'N04', 'R03']],
  ]
  for (const [room, name, field] of skirmishes) {
    const data = encounter(room)
    equal([data.mode, data.name, data.tentativeName, data.deckIds, data.fieldIds], ['skirmish', name, true, [], field])
    const { duel } = createV04BEncounterDuel(createV04BInitialSession(), room, { random: ordered })
    equal([duel.mode, duel.players.opponent.kind, ids(duel.players.opponent.creatures)], ['skirmish', 'group', field])
    equal(duel.players.opponent.creatures.map((c) => c.card.name), field.map((id) => card(id).name))
    ok(duel.players.opponent.creatures.every((c) => c.health === c.card.maxHealth && c.entityKind === 'real'))
  }
  equal(V04B_ENCOUNTERS.length, 10)
  equal(V04B_ENCOUNTERS.filter((e) => e.tentativeName).map((e) => e.id), ['04', '07', '08', '16', '17'])
  equal(V04B_ENCOUNTERS.map((e) => e.roomName).slice(0, 5), ['Sala del Centinela', 'Corte de las Ratas', 'Salón del Osario', 'Cámara del Sacrificio', 'Salón del Trono'])
})
test('A04 no aparece en ningún rival y el contenido activo sigue siendo el legado', () => {
  ok(V04B_ENCOUNTERS.every((e) => ![...e.deckIds, ...e.fieldIds].includes('A04')))
  equal(ACTIVE_CONTENT.id, 'legacy-v1')
})
test('preparación aislada: rechaza sesión legada e ID desconocido; bloquea la sesión', () => {
  rejects(() => createV04BEncounterDuel(createGameSession([]), '02'))
  rejects(() => createV04BEncounterDuel(createV04BInitialSession(), '99'))
  rejects(() => createV04BEncounterDuel(createV04BInitialSession(), '01'))
  const session = createV04BInitialSession()
  const begun = createV04BEncounterDuel(session, '02', { random: ordered })
  equal([begun.session.activeDuelId, begun.session.activeEncounterId, begun.duel.collectionProfile], [begun.duel.id, '02', 'v04b'])
  rejects(() => createV04BEncounterDuel(begun.session, '09'))
  equal(session.activeDuelId, null)
  equal(finishSessionDuel(begun.session, { ...begun.duel, phase: 'finished', winner: 'opponent' }).activeDuelId, null)
})

// ---------- A02 predesplegada ----------
test('A02 predesplegada (07/08) no crea ficha; A02 invocada por el rival en 09 sí y N03 la sacrifica', () => {
  for (const room of ['07', '08']) {
    const { duel } = createV04BEncounterDuel(createV04BInitialSession(), room, { random: ordered })
    equal(duel.players.opponent.creatures.length, 2)
    ok(duel.players.opponent.creatures.every((c) => c.entityKind === 'real'))
  }
  const { duel } = createV04BEncounterDuel(createV04BInitialSession(), '09', { random: ordered, firstPlayer: 'opponent' })
  equal(enemyOf(duel).hand.map((c) => c.id), ['A02', 'N03', 'N02'])
  // Una A02 invocada crea ficha 1/1 (dominio).
  const manual = summonCreature(duel, enemyOf(duel).hand[0].instanceId!)
  equal(manual.players.opponent.creatures.map((c) => c.entityKind), ['real', 'token'])
  // Nivel 1 (referencia): A02 (+ficha) -> N03 paga con la ficha -> N02 con el maná 1. ATQ 1 + 3 + 2 = 6, todo real y sin fichas.
  const turn = runEnemyTurn(duel, 1)
  equal(turn.players.opponent.creatures.map((c) => [c.card.id, c.entityKind]), [['A02', 'real'], ['N03', 'real'], ['N02', 'real']])
  equal([turn.phase, turn.attackers.length], ['blockers', 3])
  equal(turn.players.opponent.creatures.reduce((sum, c) => sum + c.card.attack, 0), 6)
  // Nivel 2 (M8c): mayor coste primero. N02 (maná) entra; luego N03 (coste 1) antes que A02 y sacrifica a N02 (valor 4 <= 5); A02 crea su ficha después.
  const smart = runEnemyTurn(duel)
  equal(smart.players.opponent.creatures.map((c) => [c.card.id, c.entityKind]), [['N03', 'real'], ['A02', 'real'], ['token-rat', 'token']])
  equal([smart.phase, smart.attackers.length], ['blockers', 3])
})

// ---------- MIG-D02 ----------
test('MIG-D02: mano rival 3; sin robo en su primer turno (jugador primero y rival primero); uno por turno después', () => {
  const six = ['N05', 'N02', 'H01', 'A01', 'N05', 'N06']
  let d = rival(six, [], 'player')
  equal([enemyOf(d).hand.length, enemyOf(d).deck.length], [3, 3])
  d = pass(d)
  equal([d.activePlayer, d.turn, enemyOf(d).hand.length, enemyOf(d).deck.length], ['opponent', 2, 3, 3])
  d = pass(pass(d))
  equal([d.activePlayer, d.turn, enemyOf(d).hand.length, enemyOf(d).deck.length], ['opponent', 4, 4, 2])
  d = pass(pass(d))
  equal([d.turn, enemyOf(d).hand.length], [6, 5])

  let f = rival(six, [], 'opponent')
  equal([f.turn, enemyOf(f).hand.length, enemyOf(f).deck.length], [1, 3, 3])
  f = pass(pass(f))
  equal([f.activePlayer, f.turn, enemyOf(f).hand.length], ['opponent', 3, 4])
})
test('MIG-D02 no cambia el robo del jugador ni el legado', () => {
  let d = rival(['N05', 'N02', 'H01', 'A01'], [], 'player')
  equal([requireInvoker(d.players.player).hand.length, requireInvoker(d.players.player).deck.length], [3, 5])
  d = pass(pass(d))
  equal([d.turn, requireInvoker(d.players.player).hand.length], [3, 4])
  const f = pass(rival(['N05', 'N02', 'H01', 'A01'], [], 'opponent'))
  equal([f.activePlayer, requireInvoker(f.players.player).hand.length], ['player', 4])
  // Legado: el rival sigue robando en su primer turno.
  const legacy = createDuel({ playerDeck: [card('N05')], opponentDeck: ['N05', 'N02', 'H01', 'A01'].map(card), random: ordered })
  const next = pass(legacy)
  equal([next.turn, requireInvoker(next.players.opponent).hand.length], [2, 4])
})

// ---------- Maná y R02/R01 ----------
test('maná rival base 1 en V0.4B; R01 y R02 permiten pagar R03 legalmente y R01 no se activa sin necesidad', () => {
  for (const first of ['player', 'opponent'] as const) {
    const king = createV04BEncounterDuel(createV04BInitialSession(), '19', { random: ordered, firstPlayer: first }).duel
    equal(enemyOf(first === 'player' ? pass(king) : king).mana, 1)
  }
  // R01 y R03 en mano: la R03 no es pagable; se juega lo demás y solo entonces se activa la R01 porque habilita la R03.
  const r01 = runEnemyTurn(rival(['R01', 'R03', 'N05']))
  equal(ids(r01.players.opponent.creatures), ['N05', 'R03'])
  equal(enemyOf(r01).mana, 1)
  // R02 desplegada da maná renovable 2 en el siguiente turno y paga R03 sin activar nada.
  const r02 = runEnemyTurn(pass(rival(['R03', 'N05', 'N05'], ['R02'], 'player')))
  equal(ids(r02.players.opponent.creatures), ['R02', 'R03', 'N05', 'N05'])
  equal(r02.players.opponent.creatures.find((c) => c.card.id === 'R03')!.shieldCharges, 1)
  // R01 en campo sin carta que habilitar: se conserva.
  equal(ids(runEnemyTurn(rival(['N05'], ['R01'])).players.opponent.creatures), ['R01', 'N05'])
  // R01 en campo con R03 en mano: se activa y paga.
  equal(ids(runEnemyTurn(rival(['R03'], ['R01'])).players.opponent.creatures), ['R03'])
})

// ---------- Devoto ----------
test('El Devoto invoca H04 sacrificando tres reales con X correcto y nunca usa fichas', () => {
  const plain = runEnemyTurn(rival(['H04', 'N05', 'N05'], ['H01', 'H01', 'N05'], 'opponent', 18))
  const idol = plain.players.opponent.creatures.find((c) => c.card.id === 'H04')!
  equal([ids(plain.players.opponent.creatures), idol.ritualBonus, idol.health], [['H04', 'N05', 'N05'], 7, 8])
  // Con ficha presente: A02 crea la ficha; H04 consume tres reales (N05, A02, primera H01) y la ficha queda.
  // Nivel 1 (referencia): la mano se juega en orden, así que A02 entra antes y H04 consume a la A02 real.
  const tokened = runEnemyTurn(rival(['A02', 'H04', 'N05'], ['H01', 'H01', 'N05'], 'opponent', 18), 1)
  const h04 = tokened.players.opponent.creatures.find((c) => c.card.id === 'H04')!
  equal([h04.ritualBonus, h04.health], [5, 6])
  equal(tokened.players.opponent.creatures.filter((c) => c.entityKind === 'token').length, 1)
  equal(ids(tokened.players.opponent.creatures.filter((c) => c.entityKind === 'real')), ['H01', 'H04', 'N05'])
  ok(sacrificeCandidates(enemyOf(tokened), card('H04')).every((c) => c.entityKind === 'real'))
  // Con solo dos reales y una ficha, H04 no es pagable y no se invoca.
  ok(!ids(runEnemyTurn(rival(['A02', 'H04'], ['N05'])).players.opponent.creatures).includes('H04'))
  validateCombatIdentities(tokened)
})

// ---------- Prior ----------
test('El Prior: curas H02/H03 a la aliada con más vida perdida (desempate por orden); sin heridos no se bloquea', () => {
  const base = rival(['N05', 'N05', 'N05'], ['H02', 'N02', 'H01'], 'player')
  const [, n02, h01] = base.players.opponent.creatures
  // H02 al comenzar principal: H01 (pierde 2) antes que N02 (pierde 1).
  let d = pass(wound(wound(base, n02.id, 1), h01.id, 1))
  ok(mainHealingSource(d), 'La cura de inicio debía quedar pendiente con dos destinos')
  d = runEnemyTurn(d)
  equal(d.players.opponent.creatures.slice(0, 3).map((c) => c.health), [4, 1, 3])
  // Empate de vida perdida: primera en orden de campo (N02).
  const tie = runEnemyTurn(pass(wound(wound(base, n02.id, 1), h01.id, 2)))
  equal(tie.players.opponent.creatures.slice(0, 3).map((c) => c.health), [4, 2, 2])
  // H03 desde la mano: cura 1 al más herido y roba 1 (la N06 robada se juega después).
  const h03 = rival(['H03', 'N05', 'N05', 'N06'], ['N02', 'H01'], 'player')
  const [n, h] = h03.players.opponent.creatures
  const hurt = runEnemyTurn(pass(wound(wound(h03, n.id, 1), h.id, 1)))
  const after = hurt.players.opponent.creatures
  equal([after.find((c) => c.id === h.id)!.health, after.find((c) => c.id === n.id)!.health], [2, 1])
  ok(ids(after).includes('H03') && ids(after).includes('N06'))
  // Sin heridos: H02 y H03 no bloquean ni lanzan.
  const calm = runEnemyTurn(pass(rival(['N05', 'H03', 'N05'], ['H02', 'N02'], 'player')))
  equal(ids(calm.players.opponent.creatures), ['H02', 'N02', 'N05', 'H03', 'N05'])
  equal(calm.phase, 'blockers')
})

// ---------- Escudo en la escaramuza 17 ----------
test('Escudo 1 de R03 en la escaramuza 17 anula el daño agrupado y consume una carga', () => {
  const { duel } = createV04BEncounterDuel(createV04BInitialSession(), '17', { random: ordered })
  const p = duel.players.player
  let d: DuelState = { ...duel, players: { ...duel.players, player: { ...p, mana: 20, hand: [...p.hand, ...p.deck], deck: [] } } }
  for (const id of ['A01', 'A01', 'N06']) d = summonCreature(d, requireInvoker(d.players.player).hand.find((c) => c.id === id)!.instanceId!)
  const golem = d.players.opponent.creatures.find((c) => c.card.id === 'R03')!
  const attackers = d.players.player.creatures.map((c) => c.id)
  equal([golem.health, golem.shieldCharges], [3, 1])
  const hit = resolveCombat(declareAttackers(startCombat(d), attackers, Object.fromEntries(attackers.map((id) => [id, golem.id]))))
  const after = hit.players.opponent.creatures.find((c) => c.id === golem.id)!
  equal([after.health, after.shieldCharges, hit.players.opponent.creatures.length], [3, 0, 3])
})

// ---------- Rey Esqueleto con la baraja real ----------
test('El Rey Esqueleto, con su baraja real y un jugador pasivo, invoca legalmente R03, N08 y N09 (rival primero y jugador primero)', () => {
  for (const firstPlayer of ['player', 'opponent'] as const) {
    let d = createV04BEncounterDuel(createV04BInitialSession(), '19', { random: ordered, firstPlayer }).duel
    d = { ...d, players: { ...d.players, player: { ...d.players.player, life: 9999 } } }
    const seen = new Set<string>()
    for (let step = 0; step < 40 && d.phase !== 'finished'; step += 1) {
      if (d.activePlayer === 'player') { d = endTurn({ ...d, phase: 'resolved' }); continue }
      // Nivel 1 (referencia): el nivel 2 no sacrifica 9 de valor por N09 (valor 8), por lo que puede no invocarla (ver m8c).
      d = runEnemyTurn(d, 1)
      d.players.opponent.creatures.forEach((c) => seen.add(c.card.id))
      d = endTurn(resolveCombat(declareBlockers(d, {})))
    }
    for (const id of ['R02', 'R01', 'R03', 'N08', 'N09', 'H02']) ok(seen.has(id), `${id} no se invocó (${firstPlayer})`)
  }
})

// ---------- Simulación de los diez encuentros ----------
/** Simple legal player: summons everything payable, attacks with everything, never blocks. */
function playerTurn(start: DuelState): DuelState {
  let d = start
  while (mainHealingSource(d)) d = resolveMainHealing(d, healingCandidates(d, mainHealingSource(d)!.id)[0].id)
  for (;;) {
    const player = requireInvoker(d.players.player)
    const pick = player.hand.find((c) => summonAvailability(player, c.instanceId!).allowed)
    if (!pick) break
    const pool = sacrificeCandidates(player, pick)
    const sacrifices = [...pool.filter((u) => u.entityKind === 'token'), ...pool.filter((u) => u.entityKind !== 'token')].slice(0, pick.cost.sacrifices).map((u) => u.id)
    const target = pick.id === 'H03' ? healingCandidates(d).filter((u) => !sacrifices.includes(u.id))[0]?.id
      : pick.id === 'A03' && d.mode === 'skirmish' ? d.players.opponent.creatures[0].id : undefined
    d = summonCreature(d, pick.instanceId!, sacrifices, target)
    if (d.phase === 'finished') return d
  }
  const attackers = d.players.player.creatures.map((c) => c.id)
  d = declareAttackers(startCombat(d), attackers, d.mode === 'skirmish'
    ? Object.fromEntries(attackers.map((id, i) => [id, d.players.opponent.creatures[i % d.players.opponent.creatures.length].id])) : {})
  return resolveCombat(d.mode === 'skirmish' ? d : declareBlockers(d, chooseEnemyBlockers(d)))
}
function enemyTurn(start: DuelState): DuelState {
  const d = runEnemyTurn(start)
  if (d.phase === 'finished') return d
  if (d.phase !== 'blockers') throw new Error(`Turno rival bloqueado en fase ${d.phase}`)
  return resolveCombat(declareBlockers(d, {}))
}
export interface M4Run { room: string; seed: number; turns: number; winner: string | null; rivalPlayed: Record<string, number> }
export function simulateEncounter(session: GameSession, room: string, seed: number, cap = 400): M4Run {
  const first = seed % 2 === 0 ? 'player' : 'opponent'
  let d = createV04BEncounterDuel(session, room, { random: seededRandom(seed), firstPlayer: first }).duel
  const played: Record<string, number> = {}
  const seen = new Set<string>()
  const note = (state: DuelState) => {
    for (const c of state.players.opponent.creatures) if (!seen.has(c.id) && c.entityKind === 'real') { seen.add(c.id); played[c.card.id] = (played[c.card.id] ?? 0) + 1 }
  }
  for (let step = 0; step < cap && d.phase !== 'finished'; step += 1) {
    validateCombatIdentities(d)
    if (d.activePlayer === 'player') {
      if (d.phase !== 'main') throw new Error(`Jugador en fase ${d.phase}`)
      d = playerTurn(d)
    } else {
      d = d.mode === 'skirmish' || d.phase === 'main' ? enemyTurn(d) : (() => { throw new Error(`Rival en fase ${d.phase}`) })()
      note(d)
    }
    if (d.phase === 'finished') break
    d = endTurn(d)
  }
  if (d.phase !== 'finished') throw new Error(`Encuentro ${room} (semilla ${seed}) sin terminar en ${cap} pasos`)
  return { room, seed, turns: d.turn, winner: d.winner, rivalPlayed: played }
}
const SIM_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]
/** M8a: «Mazo exhausto» removes the old accepted hung cases (18/5, 18/8); every run must now end with a winner. */
for (const [label, make] of [['sesión inicial', createV04BInitialSession], ['sandbox', createV04BCatalogSandbox]] as [string, () => GameSession][]) {
  test(`simulación (${label}): los diez encuentros terminan siempre con ganador, sin acciones ilegales ni turnos bloqueados`, () => {
    for (const data of V04B_ENCOUNTERS) {
      for (const seed of SIM_SEEDS) {
        const run = simulateEncounter(make(), data.id, seed)
        ok(run.winner === 'player' || run.winner === 'opponent', `${data.id}/${seed}: sin ganador`)
        if ((globalThis as { M4_REPORT?: boolean }).M4_REPORT) console.log(`M4 ${label} ${data.id} seed ${seed} turns ${run.turns} winner ${run.winner} played ${JSON.stringify(run.rivalPlayed)}`)
      }
    }
  })
}
