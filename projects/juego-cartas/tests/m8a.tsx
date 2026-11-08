import { renderToStaticMarkup } from 'react-dom/server'
import {
  activateN01, createDuel as createRawDuel, createV04BEncounterDuel, createV04BInitialSession, declareAttackers, declareBlockers, endTurn,
  finishSessionDuel, healingCandidates, isDeckExhausted, mainHealingSource, nextEchoSize, requireInvoker, resolveCombat, resolveMainHealing,
  RuleViolation, sacrificeCandidates, startCombat, summonAvailability, summonCreature, surrender, surrenderAvailability, validateCombatIdentities,
  V04B_CARD_TYPES, V04B_ENCOUNTERS,
} from '../src/engine/index.js'
import type { CreatureCard, DuelState, GameSession } from '../src/engine/index.js'
import { chooseEnemyBlockers, runEnemyTurn } from '../src/engine/enemy.js'
import { createGameSession } from '../src/engine/session.js'
import { CombatView, SurrenderConfirmation } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { applyCombatAction, createCombatControls } from '../src/ui/combatActions.js'
import { createDuel, seededRandom } from './duelFixtures.js'

export const m8aTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m8aTests.push({ name: `M8a · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function rejects(run: () => unknown) { try { run() } catch (e) { if (e instanceof RuleViolation) return; throw e } throw new Error('Faltó rechazo') }
const card = (id: string) => V04B_CARD_TYPES.find((c) => c.id === id)!
const cards = (list: string[]) => list.map(card)
const echoes = (d: DuelState) => d.players.opponent.creatures.filter((u) => u.echo)
/** Ends the active turn (state forced to `resolved`, as in the earlier suites). */
const pass = (d: DuelState) => endTurn({ ...d, phase: 'resolved' })
const passes = (d: DuelState, n: number) => { for (let i = 0; i < n; i += 1) d = pass(d); return d }
/** V0.4B duel with authored decks. Three-card player decks leave the deck empty from the start. */
function duelOf(playerIds: string[], options: { rival?: string[]; field?: string[]; mode?: 'duel' | 'skirmish'; first?: 'player' | 'opponent'; playerLife?: number } = {}) {
  return createDuel({ collectionProfile: 'v04b', mode: options.mode ?? 'duel', playerDeck: cards(playerIds), opponentDeck: cards(options.rival ?? []),
    opponentInitialField: cards(options.field ?? []), firstPlayer: options.first ?? 'player', opponentLife: 20, playerLife: options.playerLife })
}
const handCard = (d: DuelState, id: string) => requireInvoker(d.players.player).hand.find((c) => c.id === id)!.instanceId!

// ---------- Aparición y tamaño ----------
test('el Eco aparece en cada mantenimiento del jugador con mazo vacío: 1/1, 2/2, 3/3, sin reinicio', () => {
  let d = duelOf(['N05', 'N05', 'H01'])
  ok(isDeckExhausted(d))
  equal([nextEchoSize(d), echoes(d).length], [1, 0])
  d = pass(d) // turno rival: sin eco
  equal(echoes(d).length, 0)
  const sizes: number[][] = []
  for (let i = 0; i < 3; i += 1) {
    d = pass(d) // mantenimiento del jugador
    equal(d.activePlayer, 'player')
    sizes.push(echoes(d).map((e) => e.card.attack * 100 + e.health))
    d = pass(d)
  }
  equal(sizes, [[101], [101, 202], [101, 202, 303]])
  equal([d.echoCount, nextEchoSize(d)], [3, 4])
  validateCombatIdentities(d)
})
test('con mazo no vacío no hay Eco; aparece cuando el mantenimiento debería robar y no puede', () => {
  let d = duelOf(['N05', 'N05', 'H01', 'H01']) // mano 3, mazo 1
  ok(!isDeckExhausted(d))
  d = passes(d, 2) // turno 3: roba la última carta, sin Eco
  equal([requireInvoker(d.players.player).deck.length, echoes(d).length], [0, 0])
  ok(isDeckExhausted(d))
  d = passes(d, 2) // turno 5: debería robar y no puede
  equal(echoes(d).map((e) => e.health), [1])
})
test('con el rival iniciando, el primer mantenimiento del jugador ya cuenta; el jugador iniciando no tiene mantenimiento inicial', () => {
  const rivalFirst = pass(duelOf(['N05', 'N05', 'H01'], { first: 'opponent' }))
  equal([rivalFirst.turn, rivalFirst.activePlayer, echoes(rivalFirst).length], [2, 'player', 1])
  equal(echoes(duelOf(['N05', 'N05', 'H01'], { first: 'player' })).length, 0)
})
test('identidad del Eco: ficha de combate sin copia, colección, cupos ni premios; la sesión no cambia', () => {
  const session = createV04BInitialSession()
  const snapshot = JSON.stringify(session)
  const begun = createV04BEncounterDuel(session, '02', { random: seededRandom(1), firstPlayer: 'player' })
  let d: DuelState = { ...begun.duel, players: { ...begun.duel.players, player: { ...begun.duel.players.player, hand: [], deck: [] } } }
  d = passes(d, 2)
  const echo = echoes(d)[0]
  equal([echo.card.id, echo.card.name, echo.entityKind, echo.copyId, echo.card.copyId, echo.owner, echo.card.attack, echo.health], ['crypt-echo', 'Eco de la cripta', 'token', undefined, undefined, 'opponent', 1, 1])
  validateCombatIdentities(d)
  equal(JSON.stringify(session), snapshot)
})
test('escaramuza: el Eco se une al grupo con su tamaño creciente', () => {
  let d = duelOf(['N05', 'N05', 'H01'], { mode: 'skirmish', field: ['N05', 'N05'] })
  d = passes(d, 4)
  equal(d.players.opponent.creatures.map((u) => [u.card.id, u.health]), [['N05', 1], ['N05', 1], ['crypt-echo', 1], ['crypt-echo', 2]])
})

// ---------- Ataque, bloqueo, sacrificio, A04 ----------
test('ataca desde el siguiente turno del rival y no antes', () => {
  let d = duelOf(['N05', 'N05', 'H01'])
  d = passes(d, 2) // turno 3, aparece
  const echo = echoes(d)[0]
  equal(d.attackers, [])
  d = runEnemyTurn(pass(d)) // turno 4 rival
  ok(d.attackers.includes(echo.id), 'El Eco debe atacar en el siguiente turno rival')
  const before = d.players.player.life
  d = resolveCombat(declareBlockers(d, {}))
  equal(d.players.player.life, before - 1)
})
test('el Eco no puede bloquear: el dominio lo rechaza y la IA no lo asigna', () => {
  let d = duelOf(['N05', 'N05', 'H01'])
  d = passes(d, 2)
  const echo = echoes(d)[0]
  d = summonCreature(d, handCard(d, 'N05'))
  const attacker = d.players.player.creatures[0].id
  d = declareAttackers(startCombat(d), [attacker])
  equal(chooseEnemyBlockers(d), {})
  rejects(() => declareBlockers(d, { [attacker]: [echo.id] }))
  const life = requireInvoker(d.players.opponent).life
  equal(requireInvoker(resolveCombat(declareBlockers(d, {})).players.opponent).life, life - 1)
})
test('el rival no puede sacrificarla: ni como candidata ni en la selección de la IA', () => {
  // N03 cuesta un sacrificio; el rival solo tiene un Eco: no es pagable.
  let d = duelOf(['N05', 'N05', 'H01'], { rival: ['N03', 'N03'] })
  d = passes(d, 2)
  equal(echoes(d).length, 1)
  const rivalInvoker = requireInvoker(d.players.opponent)
  equal(sacrificeCandidates(rivalInvoker, card('N03')).length, 0)
  ok(!summonAvailability(rivalInvoker, rivalInvoker.hand[0].instanceId!).allowed)
  rejects(() => summonCreature({ ...d, activePlayer: 'opponent' }, rivalInvoker.hand[0].instanceId!, [echoes(d)[0].id]))
  d = runEnemyTurn(pass(d))
  equal(d.players.opponent.creatures.map((u) => u.card.id), ['crypt-echo'])
  // Con una real y un Eco, N03 sacrifica la real, nunca el Eco.
  let e = duelOf(['N05', 'N05', 'H01'], { rival: ['N03', 'N05', 'N05'], field: ['N05'] })
  e = passes(e, 2)
  e = runEnemyTurn(pass(e))
  ok(e.players.opponent.creatures.some((u) => u.echo), 'El Eco sigue en el campo')
  ok(e.players.opponent.creatures.some((u) => u.card.id === 'N03'))
})
test('A04 rival no cuenta al Eco en su bonificación (sí a las demás atacantes)', () => {
  let d = duelOf(['N05', 'N05', 'H01'], { field: ['A04', 'N05'] })
  d = passes(d, 2)
  d = runEnemyTurn(pass(d))
  const a04 = d.players.opponent.creatures.find((u) => u.card.id === 'A04')!
  equal([d.attackers.length, a04.attackBonus], [3, 1])
})

// ---------- Efectos del jugador ----------
test('N01 puede destruir un Eco (duelo) y A03 le inflige su daño de entrada en una escaramuza', () => {
  let d = duelOf(['N01', 'N05', 'N05'])
  d = summonCreature(d, handCard(d, 'N01'))
  d = passes(d, 2)
  const n01 = d.players.player.creatures.find((u) => u.card.id === 'N01')!
  d = activateN01(d, n01.id, echoes(d)[0].id)
  equal([echoes(d).length, d.phase], [0, 'main'])
  let s = duelOf(['A03', 'N05', 'N05'], { mode: 'skirmish', field: ['N05', 'N05'] })
  s = passes(s, 2)
  s = summonCreature(s, handCard(s, 'A03'), [], echoes(s)[0].id)
  equal([echoes(s).length, s.phase], [0, 'main'])
})
test('el jugador puede bloquear y dañar al Eco como a cualquier criatura', () => {
  let d = duelOf(['N06', 'N05', 'N05'])
  d = passes(d, 4) // turno 5: Ecos 1/1 y 2/2
  d = summonCreature(d, handCard(d, 'N06'))
  const ghoul = d.players.player.creatures[0].id
  const [small, big] = echoes(d)
  d = runEnemyTurn(pass(d))
  d = resolveCombat(declareBlockers(d, { [big.id]: [ghoul] }))
  // Ghoul 3/1 mata al 2/2 y muere por su daño; el 1/1 impacta al invocador.
  equal(d.players.opponent.creatures.map((u) => u.id), [small.id])
  equal([d.players.player.creatures.length, d.players.player.life], [0, 19])
})
test('los Ecos acumulados vencen al jugador: derrota normal liquidada con +1 de fatiga y sin cambios en copias', () => {
  const session = createV04BInitialSession()
  const begun = createV04BEncounterDuel(session, '02', { random: seededRandom(1), firstPlayer: 'player' })
  let d: DuelState = { ...begun.duel, players: { player: { ...begun.duel.players.player, hand: [...begun.duel.players.player.hand, ...begun.duel.players.player.deck], deck: [], life: 3 }, opponent: { ...requireInvoker(begun.duel.players.opponent), hand: [], deck: [] } } }
  for (let i = 0; i < 20 && d.phase !== 'finished'; i += 1) {
    d = pass(d)
    if (d.activePlayer === 'opponent') { d = resolveCombat(declareBlockers(runEnemyTurn(d), {})); if (d.phase === 'finished') break; d = endTurn(d) }
  }
  equal([d.phase, d.winner], ['finished', 'opponent'])
  const settled = finishSessionDuel(begun.session, d)
  equal([settled.fatigue, settled.activeDuelId, settled.copies.length], [1, null, session.copies.length])
  equal(finishSessionDuel(settled, d), settled)
})


// ---------- El Eco no es curable por el rival ----------
const woundEcho = (d: DuelState, id: string, health: number): DuelState => ({ ...d, players: { ...d.players, opponent: { ...d.players.opponent,
  creatures: d.players.opponent.creatures.map((u) => u.id === id ? { ...u, health } : u) } } })
test('curas rivales: H02 no cura al Eco herido (omisión, sin destino pendiente)', () => {
  let d = duelOf(['N05', 'N05', 'H01'], { field: ['H02'] })
  d = passes(d, 4) // Ecos 1/1 y 2/2
  const big = echoes(d)[1]
  d = woundEcho(d, big.id, 1)
  d = pass(d) // comienzo de principal rival con H02
  equal(healingCandidates(d, d.players.opponent.creatures[0].id).length, 0)
  equal([mainHealingSource(d) === undefined || d.mainHealing?.index === d.mainHealing?.sourceIds.length, echoes(d)[1].health], [true, 1])
  d = runEnemyTurn(d)
  equal(echoes(d).find((e) => e.id === big.id)!.health, 1)
})
test('curas rivales: H03 con solo un Eco herido no cura ni roba; con otra aliada herida cura a esa', () => {
  const base = (field: string[]) => passes(duelOf(['N05', 'N05', 'H01'], { rival: ['H03', 'N05', 'N05', 'N06', 'N06', 'N06'], field }), 4)
  let d = base([])
  d = woundEcho(d, echoes(d)[1].id, 1)
  d = pass(d)
  const deckBefore = requireInvoker(d.players.opponent).deck.length
  const big = echoes(d)[1].id
  d = runEnemyTurn(d)
  ok(d.players.opponent.creatures.some((u) => u.card.id === 'H03'), 'H03 se invoca igualmente')
  equal([echoes(d).find((e) => e.id === big)!.health, requireInvoker(d.players.opponent).deck.length], [1, deckBefore])
  let e = base(['N02'])
  const ally = e.players.opponent.creatures.find((u) => u.card.id === 'N02')!
  e = woundEcho(woundEcho(e, echoes(e)[1].id, 1), ally.id, 1)
  e = pass(e)
  const echoId = echoes(e)[1].id
  e = runEnemyTurn(e)
  equal([e.players.opponent.creatures.find((u) => u.id === ally.id)!.health, echoes(e).find((u) => u.id === echoId)!.health], [2, 1])
})

// ---------- Escaramuza ----------
test('escaramuza: vencer al grupo real gana aunque queden Ecos, que desaparecen; matar solo Ecos no gana', () => {
  let d = duelOf(['N05', 'N05', 'H01'], { mode: 'skirmish', field: ['N05'] })
  d = passes(d, 4) // Ecos 1/1 y 2/2
  d = summonCreature(d, requireInvoker(d.players.player).hand[0].instanceId!)
  d = summonCreature(d, requireInvoker(d.players.player).hand[0].instanceId!)
  const [mine, other] = d.players.player.creatures.map((u) => u.id)
  const [e1] = echoes(d)
  const real = d.players.opponent.creatures.find((u) => !u.echo)!
  const onlyEcho = resolveCombat(declareAttackers(startCombat(d), [mine], { [mine]: e1.id }))
  equal([onlyEcho.phase, onlyEcho.winner, echoes(onlyEcho).length], ['resolved', null, 1])
  const win = resolveCombat(declareAttackers(startCombat(d), [mine, other], { [mine]: real.id, [other]: e1.id }))
  equal([win.phase, win.winner, win.players.opponent.creatures.length], ['finished', 'player', 0])
})
test('escaramuza: A03 que elimina al último real termina con victoria y limpia los Ecos', () => {
  let d = duelOf(['A03', 'N05', 'N05'], { mode: 'skirmish', field: ['N05'] })
  d = passes(d, 2)
  equal(echoes(d).length, 1)
  d = summonCreature(d, handCard(d, 'A03'), [], d.players.opponent.creatures.find((u) => !u.echo)!.id)
  equal([d.phase, d.winner, d.players.opponent.creatures.length], ['finished', 'player', 0])
})

// ---------- Perfil base ----------
const baseCards: CreatureCard[] = [1, 2, 3].map((n) => ({ id: `base-${n}`, name: `Criatura base ${n}`, attack: n, maxHealth: 3, cost: { mana: 0, sacrifices: 0 }, rarity: 'common', seed: true, reinvokeCost: 0, growthCap: 0 }))
test('perfil base: sin Eco, sin rastro en el estado y sin rendición', () => {
  const d = passes(createDuel({ playerDeck: baseCards, opponentDeck: [] }), 6)
  equal([d.players.opponent.creatures.length, d.echoCount, isDeckExhausted(d)], [0, undefined, false])
  ok(!surrenderAvailability(d).allowed)
  rejects(() => surrender(d))
  const controls = createCombatControls(createDuel({ playerDeck: baseCards, opponentDeck: [] }))
  const result = applyCombatAction(controls, { type: 'surrender' }, controls.revision)
  ok(result.state === controls && result.message.length > 0)
})

// ---------- Rendirse ----------
test('rendirse: disponible en tu turno (principal/ataque), no en el rival; liquida derrota normal reintentable', () => {
  const session = createV04BInitialSession()
  const begun = createV04BEncounterDuel(session, '02', { random: seededRandom(2), firstPlayer: 'player' })
  const d = begun.duel
  ok(surrenderAvailability(d).allowed)
  ok(surrenderAvailability(startCombat(d)).allowed)
  ok(!surrenderAvailability({ ...d, activePlayer: 'opponent' }).allowed)
  ok(!surrenderAvailability({ ...d, phase: 'blockers' }).allowed)
  const lost = surrender(d)
  equal([lost.phase, lost.winner, lost.attackers, lost.mainHealing], ['finished', 'opponent', [], undefined])
  const settled = finishSessionDuel(begun.session, lost)
  equal([settled.fatigue, settled.activeDuelId, settled.settledDuelIds.includes(d.id), settled.copies.length], [1, null, true, session.copies.length])
  const again = createV04BEncounterDuel(settled, '02', { random: seededRandom(2), firstPlayer: 'player' })
  equal(finishSessionDuel(again.session, surrender(again.duel)).fatigue, 1)
  rejects(() => surrender(lost))
})
test('rendirse: la acción de combate se rechaza con una selección pendiente, funciona sin ella y ignora revisiones obsoletas', () => {
  const d = duelOf(['N05', 'N05', 'H01'])
  const base = createCombatControls(d)
  const withPending = { ...base, pending: { kind: 'summon' as const, cardId: 'x', sacrificeIds: [], stage: 'materials' as const } }
  const blocked = applyCombatAction(withPending, { type: 'surrender' }, withPending.revision)
  ok(blocked.state === withPending && blocked.message.includes('selección'))
  const done = applyCombatAction(base, { type: 'surrender' }, base.revision)
  equal([done.state.duel.phase, done.state.duel.winner, done.state.pending], ['finished', 'opponent', null])
  ok(applyCombatAction(base, { type: 'surrender' }, base.revision + 1).state === base)
})
test('rendirse: no se ofrece con una sanación obligatoria pendiente (H02)', () => {
  const d = duelOf(['N05', 'N05', 'H01'], { first: 'opponent', rival: ['N05'] })
  const mine = (id: string, health: number) => ({ id, entityKind: 'real' as const, card: { ...card('H02'), instanceId: `i-${id}`, entityKind: 'real' as const }, owner: 'player' as const, health, summonedTurn: 0 })
  const healer = mine('creature-90', 4), hurt = mine('creature-91', 1)
  const pending = { ...d, activePlayer: 'player' as const, phase: 'main' as const, mainHealing: { sourceIds: [healer.id], index: 0 },
    players: { ...d.players, player: { ...d.players.player, creatures: [healer, hurt] } } }
  ok(mainHealingSource(pending) !== undefined && healingCandidates(pending, healer.id).length === 1)
  ok(!surrenderAvailability(pending).allowed)
  ok(surrenderAvailability({ ...pending, mainHealing: undefined }).allowed)
  void resolveMainHealing
})

// ---------- Interfaz ----------
const noop = () => {}
function viewProps(duel: DuelState, session: GameSession = createV04BInitialSession()): CombatViewProps {
  return {
    duel, session, enemyName: 'El Centinela', enemyMaxLife: 12, notice: '', noticeRevision: 0, selectedCardId: null, sacrificeIds: [], attackerIds: [], targetChoices: {}, blockerChoices: {}, presenting: false,
    onSelectCard: noop, onAllowFieldDrop: noop, onDropHandCard: noop, onToggleSacrifice: noop, onSelectAttacker: noop,
    onCancelSummon: noop, onBeginCombat: noop, onDeclareAttacks: noop, onConfirmBlocks: noop,
    onStartBlockDrag: () => true, onEndBlockDrag: noop, onDropRelation: noop, onMoveBlocker: noop, onMoveAttacker: noop, onSurrender: noop,
  }
}
const html = (props: CombatViewProps) => renderToStaticMarkup(<CombatView {...props} />)
test('mesa: indicador de mazo agotado con el tamaño de la próxima invocación y representación del Eco', () => {
  let d = duelOf(['N05', 'N05', 'H01'])
  const first = html(viewProps(d))
  ok(first.includes('Mazo agotado') && first.includes('Eco de la cripta 1/1'), 'Indicador con 1/1')
  ok(!first.includes('Refuerzo de la cripta'))
  d = passes(d, 2)
  const markup = html(viewProps(d))
  ok(markup.includes('Eco de la cripta 2/2'), 'La próxima invocación crece')
  ok(markup.includes('Refuerzo de la cripta') && markup.includes('is-echo') && markup.includes('ECO'), 'Representación del Eco en la mesa')
  const stocked = html(viewProps(duelOf(['N05', 'N05', 'H01', 'H01'])))
  ok(!stocked.includes('Mazo agotado') && stocked.includes('1 en mazo'))
  const base = html(viewProps(createDuel({ playerDeck: baseCards, opponentDeck: [] }), createGameSession([])))
  ok(!base.includes('Mazo agotado') && !base.includes('Rendirse'), 'El perfil base no cambia')
})
test('mesa: «Rendirse» solo en tu turno sin selección pendiente; la confirmación pone «Seguir luchando» primero', () => {
  const d = duelOf(['N05', 'N05', 'H01'])
  ok(html(viewProps(d)).includes('>Rendirse<'))
  ok(html(viewProps(startCombat(d))).includes('>Rendirse<'))
  ok(!html({ ...viewProps(d), selectedCardId: requireInvoker(d.players.player).hand[0].instanceId! }).includes('>Rendirse<'), 'Selección pendiente')
  ok(!html({ ...viewProps(d), presenting: true }).includes('>Rendirse<'))
  ok(!html(viewProps({ ...pass(d), phase: 'blockers' })).includes('>Rendirse<'), 'Turno rival')
  const dialog = renderToStaticMarkup(<SurrenderConfirmation onConfirm={noop} onCancel={noop} />)
  ok(dialog.includes('derrota normal') && dialog.includes('fatiga'))
  ok(dialog.indexOf('>Seguir luchando') < dialog.indexOf('>Confirmar rendición'), 'El foco inicial es la opción segura')
})

// ---------- Simulación de terminación ----------
interface Strategy { name: string; attack: boolean; block: boolean; atkZero?: true }
const STRATEGIES: Strategy[] = [
  { name: 'invoca todo, ataca con todo y nunca bloquea', attack: true, block: false },
  { name: 'solo bloquea (no ataca)', attack: false, block: true },
  { name: 'solo ATQ 0: ataca con todo y bloquea', attack: true, block: true, atkZero: true },
]
function playerTurn(start: DuelState, strategy: Strategy): DuelState {
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
  const attackers = strategy.attack ? d.players.player.creatures.map((c) => c.id) : []
  const foes = d.players.opponent.creatures
  d = declareAttackers(startCombat(d), attackers, d.mode === 'skirmish' ? Object.fromEntries(attackers.map((id, i) => [id, foes[i % foes.length].id])) : {})
  return resolveCombat(d.mode === 'skirmish' ? d : declareBlockers(d, chooseEnemyBlockers(d)))
}
function rivalTurn(start: DuelState, strategy: Strategy): DuelState {
  const d = runEnemyTurn(start)
  if (d.phase === 'finished') return d
  if (d.phase !== 'blockers') throw new Error(`Turno rival bloqueado en fase ${d.phase}`)
  const mine = d.players.player.creatures.map((u) => u.id)
  const blocks = strategy.block ? Object.fromEntries(d.attackers.slice(0, mine.length).map((id, i) => [id, [mine[i]]])) : {}
  return resolveCombat(declareBlockers(d, blocks))
}
const TURN_BOUND = 40
function play(start: DuelState, strategy: Strategy, label: string): DuelState {
  let d = start
  for (let step = 0; step < TURN_BOUND * 2 && d.phase !== 'finished'; step += 1) {
    validateCombatIdentities(d)
    d = d.activePlayer === 'player' ? playerTurn(d, strategy) : rivalTurn(d, strategy)
    if (d.phase === 'finished') break
    d = endTurn(d)
  }
  ok(d.phase === 'finished' && d.winner !== null, `${label}: sin terminar en ${TURN_BOUND} turnos (${d.turn})`)
  ok(d.turn <= TURN_BOUND, `${label}: excede la cota de turnos (${d.turn})`)
  return d
}
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8]
const FIRSTS = ['player', 'opponent'] as const
function encounterDuel(session: GameSession, room: string, seed: number, first: 'player' | 'opponent') {
  return createV04BEncounterDuel(session, room, { random: seededRandom(seed), firstPlayer: first }).duel
}
/** Same encounter data with an authored player deck. */
function customDuel(playerIds: string[], room: string, seed: number, first: 'player' | 'opponent') {
  const data = V04B_ENCOUNTERS.find((e) => e.id === room)!
  return createRawDuel({ collectionProfile: 'v04b', mode: data.mode, playerDeck: cards(playerIds), opponentDeck: cards([...data.deckIds]), opponentInitialField: cards([...data.fieldIds]),
    opponentLife: data.opponentLife, firstPlayer: first, random: seededRandom(seed), encounterId: room })
}
const ATK_ZERO_DECK = ['H01', 'H01', 'N01', 'N01']
test('construcción: existe un jugador solo con criaturas de ATQ 0 (H01 y N01, sin activar la Urna)', () => {
  ok(cards(ATK_ZERO_DECK).every((c) => c.attack === 0))
  equal(customDuel(ATK_ZERO_DECK, '02', 1, 'player').players.player.hand.length, 3)
})
for (const strategy of STRATEGIES) {
  test(`simulación · ${strategy.name}: los diez encuentros terminan acotados (semillas 1-8, ambos jugadores iniciales)`, () => {
    let longest = 0
    for (const data of V04B_ENCOUNTERS) {
      for (const seed of SEEDS) {
        for (const first of FIRSTS) {
          const start = strategy.atkZero ? customDuel(ATK_ZERO_DECK, data.id, seed, first) : encounterDuel(createV04BInitialSession(), data.id, seed, first)
          longest = Math.max(longest, play(start, strategy, `${data.id}/${seed}/${first}`).turn)
        }
      }
    }
    if ((globalThis as { M8A_REPORT?: boolean }).M8A_REPORT) console.log(`M8a ${strategy.name}: turno máximo ${longest}`)
  })
}
test('simulación: los casos antes colgados 18/semilla 5 (rival inicia) y 18/semilla 8 (jugador inicia) terminan con ganador', () => {
  for (const [seed, first] of [[5, 'opponent'], [8, 'player']] as const) {
    ok(play(encounterDuel(createV04BInitialSession(), '18', seed, first), STRATEGIES[0], `18/${seed}`).winner !== null)
  }
})
