import { renderToStaticMarkup } from 'react-dom/server'
import { RuleViolation, startCombat, summonCreature } from '../src/engine/rules.js'
import { cardInstanceId } from '../src/engine/index.js'
import { createGameSession } from '../src/engine/session.js'
import type { CreatureCard, DuelState } from '../src/engine/types.js'
import { applyRelationGesture, createCombatDrag } from '../src/ui/blockDrag.js'
import type { CombatDragContext, RelationSelection } from '../src/ui/blockDrag.js'
import { applyCombatAction, createCombatControls } from '../src/ui/combatActions.js'
import {
  gestureFrame, gestureFrameChanged, gestureKindFor, gestureTarget, GESTURE_THRESHOLD, isGestureCancel, moveGesture, nearestCandidate, regionAt, resolveGesture, startGesture,
} from '../src/ui/combatGesture.js'
import type { GestureCandidate, GestureKind } from '../src/ui/combatGesture.js'
import { CombatView } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { blockDefenseFixture } from './blockAssignments.js'
import { createDuel } from './duelFixtures.js'

export const ui2Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { ui2Tests.push({ name: `UI-2 · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function rejects(run: () => unknown) { try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error } throw new Error('Se esperaba RuleViolation') }

const board = { left: 0, top: 0, width: 1000, height: 600 }
const AXIS = 300
const enemies: GestureCandidate[] = [{ id: 'enemy-a', center: { x: 300, y: 120 } }, { id: 'enemy-b', center: { x: 700, y: 120 } }]
const frameOf = (state: DuelState) => gestureFrame(state)
const context = (state: DuelState, selectionRevision = 0): CombatDragContext => ({ duelId: state.id, turn: state.turn, revision: 4, selectionRevision })
const emptySelection = (): RelationSelection => ({ blocks: {}, attack: { attackerIds: [], targetChoices: {}, focusedAttackerId: null } })

/** Drives a full pointer gesture through the pure controller: press, move along points, release. */
function gesture(kind: GestureKind, state: DuelState, path: { x: number; y: number }[], candidates = enemies) {
  let current = startGesture(kind, 'src', 1, path[0], frameOf(state))
  for (const point of path.slice(1)) current = moveGesture(current, 1, point)
  const end = current.point
  return resolveGesture(current, regionAt(end, board, AXIS), candidates)
}
const fromOwn = { x: 500, y: 480 }

test('controlador: umbral distingue clic de arrastre, ignora otros punteros y no vuelve atrás', () => {
  const state = blockDefenseFixture()
  let g = startGesture('block', 'own-a', 7, { x: 10, y: 10 }, frameOf(state))
  g = moveGesture(g, 7, { x: 10 + GESTURE_THRESHOLD - 1, y: 10 })
  ok(!g.dragging, 'Por debajo del umbral sigue siendo un clic')
  equal(resolveGesture(g, 'rival', enemies), { type: 'click' })
  ok(moveGesture(g, 8, { x: 400, y: 400 }) === g, 'Otro puntero no altera el gesto')
  ok(moveGesture(g, 7, { x: NaN, y: 0 }) === g, 'Coordenadas inválidas se ignoran')
  g = moveGesture(g, 7, { x: 10, y: 10 + GESTURE_THRESHOLD })
  ok(g.dragging, 'Al cruzar el umbral empieza el arrastre')
  g = moveGesture(g, 7, { x: 10, y: 10 })
  ok(g.dragging, 'Volver al origen no lo convierte en clic')
})

test('controlador: zonas por eje y tablero, destino más cercano y vista previa solo en la mitad rival', () => {
  equal(regionAt({ x: 10, y: 10 }, board, AXIS), 'rival')
  equal(regionAt({ x: 10, y: 450 }, board, AXIS), 'own')
  equal(regionAt({ x: -5, y: 100 }, board, AXIS), 'outside')
  equal(regionAt({ x: 500, y: 650 }, board, AXIS), 'outside')
  equal(nearestCandidate({ x: 640, y: 290 }, enemies), 'enemy-b')
  equal(nearestCandidate({ x: 0, y: 0 }, []), null)
  const state = blockDefenseFixture()
  const g = moveGesture(startGesture('block', 'own-a', 1, fromOwn, frameOf(state)), 1, { x: 320, y: 250 })
  equal(gestureTarget(g, 'rival', enemies), 'enemy-a')
  equal(gestureTarget(g, 'own', enemies), null)
  equal(gestureTarget({ ...g, kind: 'declare' }, 'rival', enemies), null)
})

test('controlador: soltar en tu lado o fuera retira; en la mitad rival asigna al más cercano', () => {
  const state = blockDefenseFixture()
  equal(gesture('block', state, [fromOwn, { x: 650, y: 200 }]), { type: 'assign', targetId: 'enemy-b' })
  equal(gesture('block', state, [fromOwn, { x: 650, y: 200 }, { x: 600, y: 520 }]), { type: 'withdraw' })
  equal(gesture('directed', state, [fromOwn, { x: 1200, y: 100 }]), { type: 'withdraw' })
  equal(gesture('block', state, [fromOwn, { x: 650, y: 200 }], []), { type: 'none' })
  equal(gesture('declare', state, [fromOwn, { x: 500, y: 100 }]), { type: 'declare' })
  equal(gesture('declare', state, [fromOwn, { x: 500, y: 100 }, { x: 500, y: 500 }]), { type: 'withdraw' })
  equal(gesture('hand', state, [{ x: 500, y: 700 }, { x: 500, y: 450 }]), { type: 'summon' })
  equal(gesture('hand', state, [{ x: 500, y: 700 }, { x: 500, y: 100 }]), { type: 'none' })
  equal(gesture('hand', state, [{ x: 500, y: 700 }, { x: 500, y: 690 }]), { type: 'none' })
})

test('cancelaciones: Esc, pérdida de foco, pointercancel/captura y cambio de fase, turno o duelo', () => {
  for (const event of [{ type: 'keydown', key: 'Escape' }, { type: 'blur' }, { type: 'pointercancel' }, { type: 'lostpointercapture' }]) ok(isGestureCancel(event), `${event.type} debe cancelar`)
  for (const event of [{ type: 'keydown', key: 'Enter' }, { type: 'pointermove' }, { type: 'keyup', key: 'Escape' }]) ok(!isGestureCancel(event), `${event.type} no cancela`)
  const state = blockDefenseFixture(), g = startGesture('block', 'own-a', 1, fromOwn, frameOf(state))
  ok(!gestureFrameChanged(g, frameOf(state)), 'Mismo tablero no cancela')
  for (const change of [{ phase: 'resolve' as const }, { turn: state.turn + 1 }, { id: 'otro-duelo' }, { activePlayer: 'player' as const }]) ok(gestureFrameChanged(g, frameOf({ ...state, ...change })), `Cambio ${JSON.stringify(change)} debe cancelar`)
})

test('bloqueo por gesto: asignar, mover a otro atacante y retirar con prioridades intactas', () => {
  const state = blockDefenseFixture(), before = JSON.stringify(state)
  equal(gestureKindFor(state, { source: 'creature' }), 'block')
  let selection = emptySelection(), revision = 0
  const drop = (id: string, path: { x: number; y: number }[]) => {
    const next = applyRelationGesture(state, selection, context(state, revision), createCombatDrag(state, context(state, revision), id), gesture('block', state, path))
    if (next !== selection) revision++
    selection = next
  }
  drop('own-a', [fromOwn, { x: 310, y: 150 }])
  drop('own-b', [fromOwn, { x: 290, y: 90 }])
  equal(selection.blocks, { 'enemy-a': ['own-a', 'own-b'] })
  drop('own-a', [fromOwn, { x: 690, y: 150 }])
  equal(selection.blocks, { 'enemy-a': ['own-b'], 'enemy-b': ['own-a'] })
  const same = selection
  drop('own-a', [fromOwn, { x: 700, y: 120 }])
  ok(selection === same, 'Repetir el destino es inerte')
  drop('own-b', [fromOwn, { x: 300, y: 120 }, { x: 300, y: 560 }])
  equal(selection.blocks, { 'enemy-b': ['own-a'] })
  drop('own-c', [fromOwn, { x: 300, y: 500 }])
  equal(selection.blocks, { 'enemy-b': ['own-a'] })
  const stale = createCombatDrag(state, context(state, 0), 'own-c')
  rejects(() => applyRelationGesture(state, selection, context(state, revision), stale, { type: 'assign', targetId: 'enemy-a' }))
  equal(JSON.stringify(state), before)
})

test('escaramuza dirigida por gesto: varios al mismo objetivo conservan el orden y se retiran al soltar en tu lado', () => {
  const state: DuelState = { ...blockDefenseFixture('skirmish'), activePlayer: 'player', phase: 'attackers', attackers: [] }
  equal(gestureKindFor(state, { source: 'creature' }), 'directed')
  let selection = emptySelection()
  const drop = (id: string, path: { x: number; y: number }[], revision: number) => {
    selection = applyRelationGesture(state, selection, context(state, revision), createCombatDrag(state, context(state, revision), id), gesture('directed', state, path))
  }
  drop('own-b', [fromOwn, { x: 300, y: 150 }], 0)
  drop('own-a', [fromOwn, { x: 330, y: 160 }], 1)
  drop('own-c', [fromOwn, { x: 720, y: 100 }], 2)
  equal(selection.attack.attackerIds, ['own-b', 'own-a', 'own-c'])
  equal(selection.attack.targetChoices, { 'own-b': 'enemy-a', 'own-a': 'enemy-a', 'own-c': 'enemy-b' })
  drop('own-b', [fromOwn, { x: 900, y: 590 }], 3)
  equal(selection.attack.attackerIds, ['own-a', 'own-c'])
  ok(!('own-b' in selection.attack.targetChoices), 'La retirada quita el objetivo')
})

test('duelo: arrastrar hacia el rival declara atacante, de vuelta lo retira; el clic sigue siendo un clic', () => {
  const state: DuelState = { ...blockDefenseFixture(), activePlayer: 'player', phase: 'attackers', attackers: [], blockers: {} }
  equal(gestureKindFor(state, { source: 'creature' }), 'declare')
  const token = (revision: number) => createCombatDrag(state, context(state, revision), 'own-a')
  let selection = applyRelationGesture(state, emptySelection(), context(state), token(0), gesture('declare', state, [fromOwn, { x: 480, y: 80 }]))
  equal(selection.attack.attackerIds, ['own-a'])
  const again = applyRelationGesture(state, selection, context(state, 1), token(1), gesture('declare', state, [fromOwn, { x: 480, y: 80 }]))
  ok(again === selection, 'Declarar de nuevo es inerte')
  selection = applyRelationGesture(state, selection, context(state, 1), token(1), gesture('declare', state, [{ x: 500, y: 450 }, { x: 500, y: 520 }]))
  equal(selection.attack.attackerIds, [])
  equal(gesture('declare', state, [fromOwn, { x: fromOwn.x + 2, y: fromOwn.y }]), { type: 'click' })
  ok(applyRelationGesture(state, selection, context(state, 2), token(2), { type: 'click' }) === selection, 'Un clic no se aplica como gesto')
})

const fixtureCard = (id: string, attack: number, maxHealth: number, mana = 0): CreatureCard => ({ id, name: `Criatura ${id}`, attack, maxHealth, cost: { mana, sacrifices: 0 }, rarity: 'common', seed: true, reinvokeCost: 0, growthCap: 0 })
const cards = [fixtureCard('fx-1', 1, 2), fixtureCard('fx-2', 2, 1), fixtureCard('fx-3', 1, 3), fixtureCard('fx-4', 1, 1), fixtureCard('fx-5', 2, 2)]
const noop = () => {}
function props(duel: DuelState): CombatViewProps {
  return {
    duel, session: { ...createGameSession(cards), invokerMaxLife: 11, invokerLife: 11 }, enemyName: 'Centinela', enemyMaxLife: 17,
    notice: '', noticeRevision: 0, selectedCardId: null, sacrificeIds: [], attackerIds: [], targetChoices: {}, blockerChoices: {}, presenting: false,
    onSelectCard: noop, onDropHandCard: noop, onToggleSacrifice: noop, onSelectAttacker: noop, onCancelSummon: noop, onBeginCombat: noop, onDeclareAttacks: noop, onConfirmBlocks: noop,
    onStartRelationDrag: () => true, onCancelRelationDrag: noop, onDropRelation: noop, onMoveBlocker: noop, onMoveAttacker: noop,
  }
}
const mainDuel = () => createDuel({ playerDeck: cards, opponentDeck: [], opponentLife: 17, playerLife: 11 })
const text = (markup: string) => markup.replace(/<[^>]+>/g, '')

test('invocar desde la mano: soltar en tu mesa invoca la misma instancia que el clic', () => {
  const duel = mainDuel()
  equal(gestureKindFor(duel, { source: 'hand' }), 'hand')
  equal(gestureKindFor(duel, { source: 'hand', interactionPending: true }), null)
  equal(gestureKindFor(duel, { source: 'hand', presenting: true }), null)
  const card = duel.players.player.hand[0]
  equal(gesture('hand', duel, [{ x: 500, y: 700 }, { x: 500, y: 420 }]), { type: 'summon' })
  const controls = createCombatControls(duel)
  const result = applyCombatAction(controls, { type: 'summon', cardId: cardInstanceId(card) }, controls.revision)
  equal(result.state.duel.players.player.creatures.map((unit) => unit.card.id), [card.id])
  ok((renderToStaticMarkup(<CombatView {...props(duel)} />).match(/class="hand-card[^"]*is-grabbable/g) ?? []).length === duel.players.player.hand.length, 'Cada carta de la mano es un agarre en la fase principal')
})

test('fase principal: una criatura en mesa no es agarre, el intento no cambia nada y el tablero sigue usable', () => {
  const duel = summonCreature(mainDuel(), cards[0].id)
  equal(gestureKindFor(duel, { source: 'creature' }), null)
  rejects(() => createCombatDrag(duel, context(duel), duel.players.player.creatures[0].id))
  const markup = renderToStaticMarkup(<CombatView {...props(duel)} />)
  ok(!/class="creature-tile[^"]*is-grabbable/.test(markup) && !markup.includes('draggable="true"'), 'En principal ninguna criatura inicia un arrastre (ni nativo)')
  ok(markup.includes('draggable="false"'), 'Retratos y cartas declaran draggable=false')
  const before = JSON.stringify(duel)
  rejects(() => applyRelationGesture(duel, emptySelection(), context(duel), null, { type: 'declare' }))
  rejects(() => applyRelationGesture(duel, emptySelection(), context(duel), createCombatDrag({ ...duel, phase: 'attackers' }, context(duel), duel.players.player.creatures[0].id), { type: 'declare' }))
  equal(JSON.stringify(duel), before)
  const controls = createCombatControls(duel)
  const attack = applyCombatAction(controls, { type: 'begin-attack' }, controls.revision).state.duel
  equal([attack.phase, gestureKindFor(attack, { source: 'creature' })], ['attackers', 'declare'])
  const attackMarkup = renderToStaticMarkup(<CombatView {...props(attack)} />)
  ok(/<button type="button" class="creature-tile[^"]*is-grabbable/.test(attackMarkup) && attackMarkup.includes('Elegir atacante'), 'Tras la principal la criatura se puede elegir con clic y arrastrar')
})

test('mano solo en principal; fuera de ella, indicador compacto «Mano N · Mazo M» sin fila de mano', () => {
  const duel = mainDuel()
  const inMain = renderToStaticMarkup(<CombatView {...props(duel)} />)
  ok(inMain.includes('aria-label="Tu mano"') && !inMain.includes('combat-hand-indicator') && inMain.includes('has-hand'), 'En principal se ve la mano')
  const attack = startCombat(duel)
  for (const state of [attack, { ...blockDefenseFixture(), players: { ...blockDefenseFixture().players, player: { ...blockDefenseFixture().players.player, hand: duel.players.player.hand, deck: duel.players.player.deck } } }]) {
    const markup = renderToStaticMarkup(<CombatView {...props(state)} />)
    ok(!markup.includes('aria-label="Tu mano"') && !markup.includes('class="hand-card') && !markup.includes('has-hand'), 'Fuera de principal no hay fila de mano')
    ok(text(markup).includes(`Mano ${state.players.player.hand.length} · Mazo ${state.players.player.deck.length}`), 'Falta el indicador compacto')
  }
  const presenting = renderToStaticMarkup(<CombatView {...props({ ...duel, phase: 'resolve' })} presenting />)
  ok(!presenting.includes('class="hand-card') && presenting.includes('combat-hand-indicator'), 'La presentación también usa el indicador')
})

test('ningún elemento del combate usa arrastre nativo ni la caja «Sin asignar»', () => {
  const states: DuelState[] = [mainDuel(), blockDefenseFixture(), { ...blockDefenseFixture('skirmish'), activePlayer: 'player', phase: 'attackers', attackers: [] }, { ...blockDefenseFixture(), activePlayer: 'player', phase: 'attackers', attackers: [] }]
  for (const state of states) {
    const markup = renderToStaticMarkup(<CombatView {...props(state)} />)
    ok(!markup.includes('draggable="true"') && !markup.includes('Sin asignar') && !markup.includes('combat-unassign-zone'), `Arrastre nativo o caja retirada presente en ${state.phase}`)
  }
})
