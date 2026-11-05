import { renderToStaticMarkup } from 'react-dom/server'
import { activateN01, beginSessionDuel, cardInstanceId, createCopySlotSession, createDuel, declareAttackers, declareBlockers, effectiveAttack, effectiveMaxHealth, endTurn, finishSessionDuel, hasLegalActivation, healingCandidates, mainHealingSource, n01ActivationAvailability, requireInvoker, resolveCombat, resolveMainHealing, RuleViolation, startCombat, summonCreature, V04B_CARD_TYPES } from '../src/engine/index.js'
import type { DuelState } from '../src/engine/index.js'
import { CombatView, RitualConfirmation } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { CreatureTile, N01ActivationButton } from '../src/ui/CardViews.js'
import { runEnemyTurn } from '../src/engine/enemy.js'
import type { ReactElement, ReactNode } from 'react'
import { applyCombatAction, createCombatControls } from '../src/ui/combatActions.js'
import type { CombatAction, CombatControls } from '../src/ui/combatActions.js'

export const m3Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m3Tests.push({ name: `M3 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function rejects(run: () => unknown) { try { run() } catch (e) { if (e instanceof RuleViolation) return; throw e } throw new Error('Faltó rechazo atómico') }
const card = (id: string) => V04B_CARD_TYPES.find((c) => c.id === id)!
const ordered = () => 1 - Number.EPSILON
function fixture(ids: string[], enemies: string[] = [], skirmish = false, reserve: string[] = []): { session: ReturnType<typeof beginSessionDuel>['session']; duel: DuelState } {
  const prepared = createCopySlotSession([...ids, ...reserve].map(card), V04B_CARD_TYPES)
  const session = { ...prepared, activeDeckCopyIds: prepared.activeDeckCopyIds.slice(0, ids.length) }
  const begun = beginSessionDuel(session, V04B_CARD_TYPES, [], { random: ordered, mode: skirmish ? 'skirmish' : 'duel', opponentInitialField: enemies.map(card) })
  const p = begun.duel.players.player
  return { session: begun.session, duel: { ...begun.duel, players: { ...begun.duel.players, player: { ...p, mana: 20, hand: [...p.hand, ...p.deck], deck: [] } } } }
}
function play(duel: DuelState, id: string, materials: string[] = [], target?: string) {
  const hand = requireInvoker(duel.players[duel.activePlayer]).hand
  return summonCreature(duel, cardInstanceId(hand.find((c) => c.id === id)!), materials, target)
}
const own = (d: DuelState, id: string) => d.players.player.creatures.find((c) => c.card.id === id)!
function wound(d: DuelState, id: string, health: number) {
  return { ...d, players: { ...d.players, player: { ...d.players.player, creatures: d.players.player.creatures.map((c) => c.id === id ? { ...c, health } : c) } } }
}
function act(c: CombatControls, action: object, revision = c.revision) { return applyCombatAction(c, action as CombatAction, revision) }
const cycle = (d: DuelState) => endTurn({ ...d, phase: 'resolved', activePlayer: 'opponent' })
function hit(d: DuelState, ids: string[], target: string) {
  const targets = Object.fromEntries(ids.map((id) => [id, target]))
  return resolveCombat(declareAttackers(startCombat({ ...d, phase: 'main' }), ids, targets))
}

test('escudo agrupa varias fuentes y protege sin impedir represalia; segunda resolución daña', () => {
  let d = fixture(['A01', 'A01', 'N02'], ['R03'], true).duel
  d = play(play(play(d, 'A01'), 'A01'), 'N02')
  const target = d.players.opponent.creatures[0].id
  d = hit(d, d.players.player.creatures.map((c) => c.id), target)
  equal(d.players.opponent.creatures.map((c) => c.health), [3])
  equal(d.players.player.creatures.map((c) => [c.card.id, c.health]), [['N02', 1]])
  d = hit(d, [own(d, 'N02').id], target)
  equal(d.players.opponent.creatures.map((c) => c.health), [1])
})
test('R04 requiere dos resoluciones positivas y cero no consume', () => {
  let d = play(play(fixture(['H01', 'A01'], ['R04'], true).duel, 'H01'), 'A01')
  const target = d.players.opponent.creatures[0].id
  d = hit(d, [own(d, 'H01').id], target)
  // Replace the killed attackers with a fresh legal entry between resolutions.
  const attackCard = d.players.player.hand[0] ?? { ...card('A01'), instanceId: 'probe', entityKind: 'real' as const }
  for (let i = 0; i < 3; i++) {
    const p = d.players.player
    d = { ...d, phase: 'main', players: { ...d.players, player: { ...p, creatures: [], hand: [{ ...attackCard, instanceId: `probe-${i}`, copyId: undefined }] } } }
    d = play(d, 'A01')
    d = hit(d, [d.players.player.creatures[0].id], target)
    equal(d.players.opponent.creatures[0].health, i < 2 ? 5 : 3)
  }
})
test('reparto letal se calcula antes del escudo sin redistribuir', () => {
  let d = play(fixture(['N02'], ['R03', 'H01']).duel, 'N02')
  const a = own(d, 'N02'), [shield, other] = d.players.opponent.creatures
  d = { ...d, players: { ...d.players, player: { ...d.players.player, creatures: [{ ...a, card: { ...a.card, attack: 5 }, health: 10 }] } } }
  d = resolveCombat(declareBlockers(declareAttackers(startCombat(d), [a.id]), { [a.id]: [shield.id, other.id] }))
  equal(d.players.opponent.creatures.map((c) => [c.card.id, c.health]), [['R03', 3], ['H01', 1]])
})
test('escudo propio agrupa represalias de varios bloqueadores', () => {
  let d = play(fixture(['R03'], ['A01', 'N02']).duel, 'R03')
  const a = own(d, 'R03')
  d = resolveCombat(declareBlockers(declareAttackers(startCombat(d), [a.id]), { [a.id]: d.players.opponent.creatures.map((c) => c.id) }))
  equal(own(d, 'R03').health, 3)
})
test('nuevo duelo repone escudos sin curar la copia herida', () => {
  const f = fixture(['R03'])
  let d = wound(play(f.duel, 'R03'), 'creature-1', 1)
  const settled = finishSessionDuel(f.session, { ...d, phase: 'finished', winner: 'player' })
  const begun = beginSessionDuel(settled, V04B_CARD_TYPES, [], { random: ordered, mode: 'skirmish', opponentInitialField: [card('H01')] })
  d = { ...begun.duel, players: { ...begun.duel.players, player: { ...begun.duel.players.player, mana: 2 } } }
  d = play(d, 'R03')
  equal(own(d, 'R03').health, 1)
  d = { ...d, players: { ...d.players, opponent: { ...d.players.opponent, creatures: d.players.opponent.creatures.map((c) => ({ ...c, card: { ...c.card, attack: 1 } })) } } }
  d = hit(d, [own(d, 'R03').id], d.players.opponent.creatures[0].id)
  equal(own(d, 'R03').health, 1)
})
test('A03 termina duelo en principal tras pago sin robar o avanzar y liquida una vez', () => {
  const f = fixture(['A03'])
  const enemy = requireInvoker(f.duel.players.opponent)
  const d = { ...f.duel, players: { ...f.duel.players, opponent: { ...enemy, life: 2, deck: [{ ...card('A01'), instanceId: 'enemy-deck', entityKind: 'real' as const }] } } }
  const result = act(createCombatControls(d), { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) })
  equal([result.state.duel.phase, result.state.duel.winner, result.state.duel.turn, requireInvoker(result.state.duel.players.opponent).deck.length], ['finished', 'player', 1, 1])
  equal(result.state.duel.players.player.creatures.map((c) => c.card.id), ['A03'])
  const settled = finishSessionDuel(f.session, result.state.duel)
  ok(finishSessionDuel(settled, result.state.duel) === settled)
  ok(act(result.state, { type: 'advance' }).state === result.state)
})
test('A03 escaramuza exige objetivo antes de pagar y cancelar conserva todo', () => {
  const d = fixture(['A03'], ['A01', 'N02'], true).duel
  rejects(() => play(d, 'A03'))
  let c = createCombatControls(d)
  c = act(c, { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) }).state
  ok(c.pending)
  equal(c.duel, d)
  ok(act(c, { type: 'begin-attack' }).state === c)
  const cancelled = act(c, { type: 'cancel' }).state
  equal(cancelled.duel, d)
  const target = d.players.opponent.creatures[0].id
  const paid = act(c, { type: 'effect-target', creatureId: target }).state
  equal(paid.duel.players.opponent.creatures.map((u) => [u.card.id, u.health]), [['N02', 2]])
  equal(paid.duel.players.player.mana, 19)
  ok(act(paid, { type: 'effect-target', creatureId: target }, c.revision).state === paid)
})
test('A03 escudo anula entrada y última enemiga sin escudo termina inmediatamente', () => {
  let d = play(fixture(['A03'], ['R03'], true).duel, 'A03', [], 'creature-1')
  equal([d.phase, d.players.opponent.creatures[0].health], ['main', 3])
  d = play(fixture(['A03'], ['A01'], true).duel, 'A03', [], 'creature-1')
  equal([d.phase, d.winner, d.players.player.creatures.length], ['finished', 'player', 1])
})
test('N01 objetivo obligatorio cancelable, destruye escudo y última enemiga gana sin aliados', () => {
  const f = fixture(['N01'], ['R04'], true)
  const d = play(f.duel, 'N01'), source = own(d, 'N01')
  ok(hasLegalActivation(d))
  let c = act(createCombatControls(d), { type: 'activate-n01', creatureId: source.id }).state
  ok(c.pending)
  equal(act(c, { type: 'cancel' }).state.duel, d)
  ok(act(c, { type: 'effect-target', creatureId: source.id }).state === c)
  const result = act(c, { type: 'effect-target', creatureId: d.players.opponent.creatures[0].id })
  c = result.state
  equal([c.duel.phase, c.duel.winner, c.duel.players.player.creatures.length, c.pending], ['finished', 'player', 0, null])
  equal(result.sacrificedCopyIds, [source.copyId])
  equal(finishSessionDuel(f.session, c.duel).copies, [])
})
test('N01 sin enemigas no conserva principal por una activación imposible', () => {
  const d = play(fixture(['N01']).duel, 'N01')
  ok(!hasLegalActivation(d))
  ok(act(createCombatControls(d), { type: 'activate-n01', creatureId: own(d, 'N01').id }).message)
})
test('H03 elige antes de pago con varios, cura uno y roba exactamente instancia existente', () => {
  let d = play(play(fixture(['H01', 'N02', 'H03', 'N05']).duel, 'H01'), 'N02')
  d = wound(wound(d, own(d, 'H01').id, 1), own(d, 'N02').id, 1)
  const p = d.players.player, drawn = p.hand.find((c) => c.id === 'N05')!
  d = { ...d, players: { ...d.players, player: { ...p, hand: p.hand.filter((c) => c !== drawn), deck: [drawn] } } }
  const ref = cardInstanceId(d.players.player.hand[0])
  let c = act(createCombatControls(d), { type: 'summon', cardId: ref }).state
  ok(c.pending)
  equal(c.duel, d)
  equal(act(c, { type: 'cancel' }).state.duel, d)
  c = act(c, { type: 'effect-target', creatureId: own(d, 'N02').id }).state
  equal([own(c.duel, 'N02').health, c.duel.players.player.deck.length], [2, 0])
  ok(c.duel.players.player.hand[0] === drawn)
})
test('H03 autoelige única, no roba sin cura y acepta mazo vacío', () => {
  let d = play(fixture(['H01', 'H03']).duel, 'H01')
  d = wound(d, own(d, 'H01').id, 2)
  d = play(d, 'H03')
  equal([own(d, 'H01').health, d.players.player.hand.length], [3, 0])
  const noWounds = play(fixture(['H03', 'N05']).duel, 'H03')
  equal(noWounds.players.player.hand.map((c) => c.id), ['N05'])
})
test('H02 cola estable bloquea acciones/Esc, reevalúa candidatos y nunca repite mantenimiento', () => {
  let d = play(play(play(play(fixture(['H02', 'H02', 'H01', 'N02', 'N05']).duel, 'H02'), 'H02'), 'H01'), 'N02')
  const healers = d.players.player.creatures.filter((c) => c.card.id === 'H02')
  d = wound(wound(d, own(d, 'H01').id, 1), own(d, 'N02').id, 1)
  const p = d.players.player, draw = p.hand[0]
  d = { ...d, players: { ...d.players, player: { ...p, hand: [], deck: [draw] } } }
  d = cycle(d)
  let c = createCombatControls(d)
  c = act(c, { type: 'advance' }).state
  ok(c.pending)
  equal(c.duel.players.player.hand.length, 1)
  const pending = c.pending as unknown as { sourceId: string }
  equal(pending.sourceId, healers[0].id)
  for (const action of [{ type: 'cancel' }, { type: 'begin-attack' }, { type: 'summon', cardId: cardInstanceId(draw) }, { type: 'advance' }]) ok(act(c, action).state === c)
  ok(act(c, { type: 'effect-target', creatureId: healers[0].id }).state === c)
  c = act(c, { type: 'effect-target', creatureId: own(d, 'H01').id }).state
  equal([own(c.duel, 'H01').health, own(c.duel, 'N02').health, c.pending], [3, 2, null])
  const stable = c
  c = act(c, { type: 'advance' }).state
  equal(c.duel.players.player.hand.length, 1)
  equal(own(c.duel, 'N02').health, 2)
  ok(act(c, { type: 'effect-target', creatureId: own(d, 'H01').id }, stable.revision - 1).state === c)
})
test('H02 recién invocada espera; objetivo único y ausencia no añaden decisiones', () => {
  let d = play(fixture(['H02', 'H01']).duel, 'H01')
  d = wound(d, own(d, 'H01').id, 1)
  d = play(d, 'H02')
  equal(own(d, 'H01').health, 1)
  d = cycle(d)
  equal(own(d, 'H01').health, 3)
  const c = act(createCombatControls(cycle(d)), { type: 'advance' }).state
  equal(c.pending, null)
})
test('H04 usa salud actual 3+3+4 y bono persiste tras dos resoluciones', () => {
  let d = play(play(fixture(['H01', 'N05', 'N07', 'H02', 'H04']).duel, 'H01'), 'N05')
  d = play(play(d, 'N07', [own(d, 'N05').id]), 'H02')
  d = play(d, 'H04', d.players.player.creatures.map((u) => u.id))
  equal([effectiveAttack(own(d, 'H04')), own(d, 'H04').health], [10, 11])
  for (let i = 0; i < 2; i++) {
    d = resolveCombat(declareBlockers(declareAttackers(startCombat({ ...d, phase: 'main' }), []), {}))
    equal([effectiveAttack(own(d, 'H04')), own(d, 'H04').health], [10, 11])
  }
})
test('H04 selección final no paga, se edita/cancela; confirmar revalida salud y revisión', () => {
  let d = play(play(play(fixture(['H01', 'N02', 'H02', 'H04']).duel, 'H01'), 'N02'), 'H02')
  const ref = cardInstanceId(d.players.player.hand[0]), materials = d.players.player.creatures
  let c = act(createCombatControls(d), { type: 'summon', cardId: ref }).state
  for (const u of materials) c = act(c, { type: 'sacrifice', creatureId: u.id }).state
  equal(c.duel, d)
  equal(c.pending?.sacrificeIds.length, 3)
  const previewRevision = c.revision
  const edited = act(c, { type: 'sacrifice', creatureId: materials[1].id }).state
  equal(edited.pending?.sacrificeIds.length, 2)
  ok(act(edited, { type: 'confirm-ritual' }, previewRevision).state === edited)
  equal(act(c, { type: 'cancel' }).state.duel, d)
  const stale = { ...c, duel: wound(d, materials[0].id, 2) }
  ok(act(stale, { type: 'confirm-ritual' }).state === stale)
  const paid = act(c, { type: 'confirm-ritual' })
  equal(paid.state.duel.players.player.creatures.map((u) => [u.card.id, u.health]), [['H04', 10]])
  equal(paid.sacrificedCopyIds, materials.map((u) => u.copyId))
  ok(act(paid.state, { type: 'confirm-ritual' }, c.revision).state === paid.state)
})
for (const winner of ['player', 'opponent'] as const) test(`H04 viva vuelve 0/1 sana al ${winner}; materiales perdidos y reserva protegida`, () => {
  const f = fixture(['H01', 'N02', 'H02', 'H04'], [], false, ['N05'])
  let d = play(play(play(f.duel, 'H01'), 'N02'), 'H02')
  d = play(d, 'H04', d.players.player.creatures.map((u) => u.id))
  d = wound(d, own(d, 'H04').id, 5)
  const settled = finishSessionDuel(f.session, { ...d, phase: 'finished', winner })
  equal(settled.copies.map((u) => [u.cardId, u.health, u.bonusAttack, u.bonusHealth]), [['H04', 1, 0, 0], ['N05', 1, 0, 0]])
})
test('H04 muerta no vuelve al liquidar', () => {
  const f = fixture(['H01', 'N02', 'H02', 'H04'])
  let d = play(play(play(f.duel, 'H01'), 'N02'), 'H02')
  d = play(d, 'H04', d.players.player.creatures.map((u) => u.id))
  d = { ...d, players: { ...d.players, player: { ...d.players.player, creatures: [] } }, phase: 'finished', winner: 'opponent' }
  equal(finishSessionDuel(f.session, d).copies, [])
})
test('perfil legado nunca activa efectos V04B por coincidencia de ID', () => {
  const d = createDuel({ playerDeck: [card('A03')], opponentDeck: [] })
  const next = play(d, 'A03')
  equal(requireInvoker(next.players.opponent).life, 20)
})
function viewProps(c: CombatControls): CombatViewProps {
  const noop = () => {}
  return { duel: c.duel, session: createCopySlotSession([], V04B_CARD_TYPES), enemyName: 'Prueba M3', enemyMaxLife: 20, notice: '', noticeRevision: c.revision,
    selectedCardId: c.pending?.cardId ?? null, sacrificeIds: c.pending?.sacrificeIds ?? [], attackerIds: [], targetChoices: {}, blockerChoices: {},
    onSelectCard: noop, onActivateR01: noop, onAllowFieldDrop: noop, onDropHandCard: noop, onToggleSacrifice: noop, onSelectAttacker: noop,
    onCancelSummon: noop, onBeginCombat: noop, onDeclareAttacks: noop, onConfirmBlocks: noop, onStartBlockDrag: () => false,
    onEndBlockDrag: noop, onDropRelation: noop, onMoveBlocker: noop, onMoveAttacker: noop }
}
test('vista de objetivo real anuncia destino y bloquea mano/paso sin vínculos tácticos por clic', () => {
  const d = fixture(['A03', 'N05'], ['R03', 'N02'], true).duel
  const c = act(createCombatControls(d), { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) }).state
  const markup = renderToStaticMarkup(<CombatView {...viewProps(c)} {...{ pending: c.pending, onChooseEffectTarget: () => {} }} />)
  ok(markup.includes('Elige una criatura enemiga'))
  ok(markup.includes('Cancelar selección') && !markup.includes('Ir al ataque'))
  equal((markup.match(/class="hand-card[^>]+disabled=""/g) ?? []).length, 2)
  ok(markup.includes('Elegir objetivo') && !markup.includes('Sin asignar'))
})
test('vista de curas muestra fuente exacta y progreso obligatorio sin cancelar', () => {
  let d = play(play(play(fixture(['H02', 'H01', 'N02']).duel, 'H02'), 'H01'), 'N02')
  d = cycle(wound(wound(d, own(d, 'H01').id, 1), own(d, 'N02').id, 1))
  const c = createCombatControls(d)
  const markup = renderToStaticMarkup(<CombatView {...viewProps(c)} {...{ pending: c.pending, onChooseEffectTarget: () => {} }} />)
  ok(markup.includes('Sanación obligatoria') && markup.includes('copy-1') && markup.includes('1/1'))
  ok(!markup.includes('Cancelar selección') && !markup.includes('Ir al ataque'))
})
test('vista ritual confirma tres identidades/saludes y resultado; material editable y cancelable', () => {
  const d = play(play(play(fixture(['H01', 'N02', 'H02', 'H04']).duel, 'H01'), 'N02'), 'H02')
  let c = act(createCombatControls(d), { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) }).state
  for (const u of d.players.player.creatures) c = act(c, { type: 'sacrifice', creatureId: u.id }).state
  const markup = renderToStaticMarkup(<CombatView {...viewProps(c)} {...{ pending: c.pending, onConfirmRitual: () => {}, onEditRitual: () => {} }} />)
  ok(markup.includes('aria-label="Confirmar ritual H04"'))
  for (const id of ['copy-1', 'copy-2', 'copy-3']) ok(markup.includes(id))
  ok(markup.includes('X = 9') && markup.includes('9/10') && markup.includes('irreversible'))
  ok(markup.includes('Editar materiales') && markup.includes('Confirmar ritual') && markup.includes('Cancelar ritual'))
})
test('baldosa ritual muestra vida máxima efectiva y escudos muestran cargas restantes', () => {
  let d = play(play(play(fixture(['H01', 'N02', 'H02', 'H04']).duel, 'H01'), 'N02'), 'H02')
  d = play(d, 'H04', d.players.player.creatures.map((u) => u.id))
  const markup = renderToStaticMarkup(<CreatureTile creature={own(d, 'H04')} />)
  ok(markup.includes('/ 10 VID') && !markup.includes('is-wounded'))
  const shield = play(fixture(['R04']).duel, 'R04')
  ok(renderToStaticMarkup(<CreatureTile creature={own(shield, 'R04')} />).includes('Escudo: 2'))
})

test('H03 sin heridos no roba aunque quede mazo; dos entradas sanan/roban por separado', () => {
  let d = fixture(['H03', 'N05']).duel
  const drawn = d.players.player.hand[1]
  d = { ...d, players: { ...d.players, player: { ...d.players.player, hand: [d.players.player.hand[0]], deck: [drawn] } } }
  d = play(d, 'H03')
  equal([d.players.player.hand.length, d.players.player.deck[0]], [0, drawn])
  d = play(fixture(['H02', 'H03', 'H03', 'N05']).duel, 'H02')
  d = wound(d, own(d, 'H02').id, 2)
  const p = d.players.player, last = p.hand.find((c) => c.id === 'N05')!
  d = { ...d, players: { ...d.players, player: { ...p, hand: p.hand.filter((c) => c !== last), deck: [last] } } }
  d = play(d, 'H03')
  equal([own(d, 'H02').health, d.players.player.hand.map((c) => c.id)], [3, ['H03', 'N05']])
  d = play(d, 'H03')
  equal([own(d, 'H02').health, d.players.player.hand.map((c) => c.id)], [4, ['N05']])
})
test('H03 objetivo ahora sano o ausente rechaza sin pagar ni sustituir destino', () => {
  let d = play(play(fixture(['H01', 'N02', 'H03']).duel, 'H01'), 'N02')
  d = wound(wound(d, own(d, 'H01').id, 1), own(d, 'N02').id, 1)
  let c = act(createCombatControls(d), { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) }).state
  const target = own(d, 'N02')
  c = { ...c, duel: wound(d, target.id, 2) }
  const before = JSON.stringify(c)
  ok(act(c, { type: 'effect-target', creatureId: target.id }).state === c)
  equal(JSON.stringify(c), before)
  rejects(() => play(c.duel, 'H03', [], 'missing'))
})
test('H02 y H03 usan máximo ritual efectivo; sanar escudo no recarga', () => {
  let d = play(play(play(fixture(['H01', 'N02', 'H02', 'H04', 'H02', 'H03', 'R03']).duel, 'H01'), 'N02'), 'H02')
  d = play(d, 'H04', d.players.player.creatures.map((u) => u.id))
  const idol = own(d, 'H04')
  equal(effectiveMaxHealth(idol), 10)
  d = play(wound(d, idol.id, 6), 'H02')
  d = cycle(d)
  equal(own(d, 'H04').health, 8)
  d = play(d, 'H03')
  equal(own(d, 'H04').health, 9)
  d = { ...d, players: { ...d.players, player: { ...d.players.player, mana: 2 } } }
  d = play(d, 'R03')
  const shield = own(d, 'R03')
  d = { ...d, players: { ...d.players, player: { ...d.players.player, creatures: d.players.player.creatures.map((u) => u.id === shield.id ? { ...u, health: 1, shieldCharges: 0 } : u) } } }
  d = cycle(d)
  d = resolveMainHealing(d, shield.id)
  equal([own(d, 'R03').health, own(d, 'R03').shieldCharges], [3, 0])
})
test('H02 candidatos incluyen ficha viva herida sin copyId y excluyen fuente, sanas y muertas', () => {
  let d = play(play(fixture(['A02', 'H02']).duel, 'A02'), 'H02')
  const token = d.players.player.creatures.find((u) => u.entityKind === 'token')!, healer = own(d, 'H02')
  // A fractional wound exercises candidate eligibility without inventing token max health.
  d = wound(wound(d, token.id, .5), healer.id, 1)
  equal(healingCandidates(d, healer.id).map((u) => u.id), [token.id])
  d = cycle(d)
  equal(d.players.player.creatures.find((u) => u.id === token.id)?.health, 1)
  equal(own(d, 'H02').health, 1)
})
test('H02 cola no se vuelve a capturar al reconstruir controles y rechaza inicio/pago directo', () => {
  let d = play(play(play(fixture(['H02', 'H01', 'N02', 'N05']).duel, 'H02'), 'H01'), 'N02')
  d = cycle(wound(wound(d, own(d, 'H01').id, 1), own(d, 'N02').id, 1))
  const c = createCombatControls(d)
  equal(createCombatControls(c.duel).duel, d)
  rejects(() => startCombat(d))
  rejects(() => play(d, 'N05'))
  const healed = act(c, { type: 'effect-target', creatureId: own(d, 'H01').id }).state
  ok(!mainHealingSource(healed.duel))
  equal(createCombatControls(healed.duel).pending, null)
})
test('N01 dominio sirve al rival sin heurística y destruye ficha sin tocar otra copia', () => {
  let d = play(play(fixture(['A02', 'A02'], ['N01']).duel, 'A02'), 'A02')
  d = { ...d, activePlayer: 'opponent' }
  const urn = d.players.opponent.creatures[0], tokens = d.players.player.creatures.filter((u) => u.entityKind === 'token')
  ok(n01ActivationAvailability(d, urn.id).allowed)
  rejects(() => activateN01(d, urn.id, urn.id))
  const next = activateN01(d, urn.id, tokens[1].id)
  equal(next.players.player.creatures.map((u) => u.id), d.players.player.creatures.filter((u) => u.id !== tokens[1].id).map((u) => u.id))
  equal(next.players.opponent.creatures.length, 0)
  equal(next.phase, 'main')
})
test('N01 fuente/objetivo desaparecido y fases incorrectas rechazan atómicamente', () => {
  const d = play(fixture(['N01'], ['R03']).duel, 'N01'), source = own(d, 'N01'), target = d.players.opponent.creatures[0]
  let c = act(createCombatControls(d), { type: 'activate-n01', creatureId: source.id }).state
  const removed = { ...d, players: { ...d.players, opponent: { ...d.players.opponent, creatures: [] } } }
  c = { ...c, duel: removed }
  ok(act(c, { type: 'effect-target', creatureId: target.id }).state === c)
  for (const phase of ['attackers', 'blockers', 'resolved', 'finished'] as const) rejects(() => activateN01({ ...d, phase }, source.id, target.id))
  rejects(() => activateN01(wound(d, source.id, 0), source.id, target.id))
  rejects(() => activateN01({ ...d, collectionProfile: 'legacy' }, source.id, target.id))
})
test('A03 rival terminal detiene secuencia enemiga antes del siguiente pago/ataque', () => {
  const d = createDuel({ collectionProfile: 'v04b', playerDeck: [], opponentDeck: [card('A03'), card('N05')], playerLife: 2, firstPlayer: 'opponent' })
  const next = runEnemyTurn(d)
  equal([next.phase, next.winner, next.turn, next.players.opponent.creatures.map((u) => u.card.id)], ['finished', 'opponent', 1, ['A03']])
  equal(requireInvoker(next.players.opponent).hand.map((c) => c.id), ['N05'])
})
test('H02 inicial predesplegada queda registrada una vez sin disparar entradas', () => {
  const d = createDuel({ collectionProfile: 'v04b', playerDeck: [], opponentDeck: [], opponentInitialField: [card('H02'), card('A02')], firstPlayer: 'opponent' })
  equal([d.mainHealing?.sourceIds, d.mainHealing?.index], [[d.players.opponent.creatures[0].id], 1])
  equal(d.players.opponent.creatures.map((u) => u.card.id), ['H02', 'A02'])
})
test('ritual rechaza cantidad, duplicación, fichas, muertos y material enemigo antes del pago', () => {
  let d = play(play(play(fixture(['A02', 'H01', 'H02', 'H04'], ['N05']).duel, 'A02'), 'H01'), 'H02')
  const reals = d.players.player.creatures.filter((u) => u.entityKind === 'real'), token = d.players.player.creatures.find((u) => u.entityKind === 'token')!
  for (const ids of [[], reals.slice(0, 2).map((u) => u.id), [reals[0].id, reals[0].id, reals[1].id], [reals[0].id, reals[1].id, token.id], [reals[0].id, reals[1].id, d.players.opponent.creatures[0].id]]) rejects(() => play(d, 'H04', ids))
  d = wound(d, reals[2].id, 0)
  rejects(() => play(d, 'H04', reals.map((u) => u.id)))
})

type ButtonElement = ReactElement<{ children?: ReactNode; onClick?: (event: never) => void; onKeyDown?: (event: never) => void }>
function buttonNamed(node: ReactNode, name: string): ButtonElement {
  const visit = (value: ReactNode): ButtonElement | undefined => {
    if (Array.isArray(value)) return value.map(visit).find(Boolean)
    if (!value || typeof value !== 'object' || !('props' in value)) return undefined
    const element = value as ButtonElement
    if (element.type === 'button' && element.props.children === name) return element
    return visit(element.props.children)
  }
  const result = visit(node)
  if (!result) throw new Error(`Falta botón ${name}`)
  return result
}
test('botones reales Urna/objetivo rechazan multiclic, repetición y eventos de renders anteriores', () => {
  const d = play(fixture(['N01'], ['N05', 'R03']).duel, 'N01'), source = own(d, 'N01')
  let c = createCombatControls(d)
  const revision = c.revision
  const button = N01ActivationButton({ creature: source, onActivate: (id) => { c = act(c, { type: 'activate-n01', creatureId: id }, revision).state } })
  button.props.onClick({ detail: 2, preventDefault() {} })
  equal(c.pending, null)
  button.props.onClick({ detail: 0, preventDefault() {} })
  ok(c.pending?.kind === 'destroy')
  const targetRevision = c.revision
  const target = CreatureTile({ creature: d.players.opponent.creatures[0], onClick: () => { c = act(c, { type: 'effect-target', creatureId: d.players.opponent.creatures[0].id }, targetRevision).state } }) as ButtonElement
  let prevented = false
  target.props.onKeyDown!({ key: 'Enter', repeat: true, preventDefault() { prevented = true } } as never)
  ok(prevented)
  target.props.onClick!({ detail: 1, preventDefault() {} } as never)
  const paid = c
  target.props.onClick!({ detail: 1, preventDefault() {} } as never)
  ok(c === paid)
  equal([c.duel.players.player.creatures.length, c.duel.players.opponent.creatures.map((u) => u.card.id)], [0, ['R03']])
})
test('confirmación real edita sin pagar y confirma una sola vez con revisión capturada', () => {
  const d = play(play(play(fixture(['H01', 'N02', 'H02', 'H04']).duel, 'H01'), 'N02'), 'H02')
  let c = act(createCombatControls(d), { type: 'summon', cardId: cardInstanceId(d.players.player.hand[0]) }).state
  for (const u of d.players.player.creatures) c = act(c, { type: 'sacrifice', creatureId: u.id }).state
  ok(c.pending?.kind === 'summon')
  const revision = c.revision
  const modal = RitualConfirmation({ duel: d, pending: c.pending, onConfirm: () => { c = act(c, { type: 'confirm-ritual' }, revision).state }, onEdit: () => { c = act(c, { type: 'edit-ritual' }, revision).state }, onCancel: () => { c = act(c, { type: 'cancel' }, revision).state } })
  const edit = buttonNamed(modal, 'Editar materiales'), confirm = buttonNamed(modal, 'Confirmar ritual')
  edit.props.onClick!({ detail: 0, preventDefault() {} } as never)
  equal(c.duel, d)
  equal(c.pending?.kind === 'summon' ? c.pending.stage : '', 'materials')
  confirm.props.onClick!({ detail: 1, preventDefault() {} } as never)
  equal(c.duel, d)
  const id = d.players.player.creatures[0].id
  c = act(c, { type: 'sacrifice', creatureId: id }).state
  c = act(c, { type: 'sacrifice', creatureId: id }).state
  ok(c.pending?.kind === 'summon')
  const currentRevision = c.revision
  const fresh = RitualConfirmation({ duel: d, pending: c.pending, onConfirm: () => { c = act(c, { type: 'confirm-ritual' }, currentRevision).state }, onEdit: () => {}, onCancel: () => {} })
  const commit = buttonNamed(fresh, 'Confirmar ritual')
  commit.props.onClick!({ detail: 1, preventDefault() {} } as never)
  const paid = c
  commit.props.onClick!({ detail: 1, preventDefault() {} } as never)
  ok(c === paid)
  equal(c.duel.players.player.creatures.map((u) => [u.card.id, u.health]), [['H04', 10]])
})
