import { RuleViolation } from '../src/engine/rules.js'
import { applyBlockDrop, BLOCK_DRAG_MIME, createBlockDrag } from '../src/ui/blockDrag.js'
import type { BlockDragContext } from '../src/ui/blockDrag.js'
import { combatBoardLinks } from '../src/ui/boardLinks.js'
import { movePlayerBlocker, removePlayerBlocker } from '../src/ui/blockAssignments.js'
import { blockDefenseFixture } from './blockAssignments.js'

export const blockDragTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { blockDragTests.push({ name: `A5 arrastre · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo RuleViolation')
}
const context = (duelId: string, turn: number): BlockDragContext => ({ origin: 'tab-a', duelId, turn, revision: 7, selectionRevision: 0 })

test('payload propio asigna sin cambiar criaturas, recursos ni el estado previo', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const before = JSON.stringify(state)
  const raw = createBlockDrag(state, frame, 'own-a')
  const result = applyBlockDrop(state, {}, frame, raw, 'enemy-a')
  equal(result, { 'enemy-a': ['own-a'] })
  equal(JSON.stringify(state), before)
  ok(!['text/plain'].includes(BLOCK_DRAG_MIME), 'La mano y el campo deben usar tipos distintos.')
  ok(applyBlockDrop(state, result, frame, raw, 'enemy-a') === result, 'Soltar en el mismo destino es inerte.')
})

test('datos corruptos, tipos extraños y estructuras añadidas no alteran asignaciones', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn), chosen = { 'enemy-b': ['own-c'] }
  const valid = JSON.parse(createBlockDrag(state, frame, 'own-a'))
  for (const raw of ['own-a', '{', '[]', 'x'.repeat(2049), JSON.stringify({ ...valid, kind: 'hand' }), JSON.stringify({ ...valid, extra: true }), JSON.stringify({ ...valid, revision: -1 })]) {
    rejects(() => applyBlockDrop(state, chosen, frame, raw, 'enemy-a'))
    equal(chosen, { 'enemy-b': ['own-c'] })
  }
})

test('pestaña, duelo, turno y revisiones anteriores se rechazan', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const valid = JSON.parse(createBlockDrag(state, frame, 'own-a'))
  for (const change of [{ origin: 'tab-b' }, { duelId: 'other-duel' }, { turn: frame.turn + 1 }, { revision: frame.revision - 1 }, { selectionRevision: 1 }]) {
    rejects(() => applyBlockDrop(state, {}, frame, JSON.stringify({ ...valid, ...change }), 'enemy-a'))
  }
  const raw = createBlockDrag(state, frame, 'own-a')
  rejects(() => applyBlockDrop(state, {}, { ...frame, selectionRevision: 1 }, raw, 'enemy-a'))
})

test('criaturas ajenas, desaparecidas y enemigos que no atacan son destinos inválidos', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  rejects(() => createBlockDrag(state, frame, 'enemy-a'))
  const raw = createBlockDrag(state, frame, 'own-a')
  rejects(() => applyBlockDrop(state, {}, frame, raw, 'enemy-idle'))
  rejects(() => applyBlockDrop(state, {}, frame, raw, 'missing'))
  const removed = { ...state, players: { ...state.players, player: { ...state.players.player, creatures: state.players.player.creatures.filter((unit) => unit.id !== 'own-a') } } }
  rejects(() => applyBlockDrop(removed, {}, frame, raw, 'enemy-a'))
  rejects(() => applyBlockDrop({ ...state, phase: 'main' }, {}, frame, raw, 'enemy-a'))
})

test('reasignar un arrastre mantiene exclusividad y añade al final del nuevo orden', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const first = applyBlockDrop(state, {}, frame, createBlockDrag(state, frame, 'own-a'), 'enemy-a')
  const secondContext = { ...frame, selectionRevision: 1 }
  const second = applyBlockDrop(state, first, secondContext, createBlockDrag(state, secondContext, 'own-b'), 'enemy-a')
  equal(second, { 'enemy-a': ['own-a', 'own-b'] })
  const thirdContext = { ...frame, selectionRevision: 2 }
  const third = applyBlockDrop(state, second, thirdContext, createBlockDrag(state, thirdContext, 'own-a'), 'enemy-b')
  equal(third, { 'enemy-a': ['own-b'], 'enemy-b': ['own-a'] })
  equal(second, { 'enemy-a': ['own-a', 'own-b'] })
})

test('las conexiones siguen todos los bloqueadores, su orden y su retirada', () => {
  const state = blockDefenseFixture(), choices = { 'enemy-a': ['own-a', 'own-b'] }
  equal(combatBoardLinks(state, [], {}, choices), [{ from: 'own-a', to: 'enemy-a', kind: 'block', order: 1 }, { from: 'own-b', to: 'enemy-a', kind: 'block', order: 2 }])
  const moved = movePlayerBlocker(state, choices, 'own-b', -1)
  equal(combatBoardLinks(state, [], {}, moved), [{ from: 'own-b', to: 'enemy-a', kind: 'block', order: 1 }, { from: 'own-a', to: 'enemy-a', kind: 'block', order: 2 }])
  const removed = removePlayerBlocker(state, moved, 'own-a')
  equal(combatBoardLinks(state, [], {}, removed), [{ from: 'own-b', to: 'enemy-a', kind: 'block', order: 1 }])
  equal(combatBoardLinks({ ...state, phase: 'main' }, [], {}, choices), [])
})

test('dos atacantes dirigidos comparten objetivo sin perder una conexión', () => {
  const state = { ...blockDefenseFixture('skirmish'), phase: 'attackers' as const, activePlayer: 'player' as const }
  equal(combatBoardLinks(state, ['own-a', 'own-b'], { 'own-a': 'enemy-a', 'own-b': 'enemy-a' }, {}), [{ from: 'own-a', to: 'enemy-a', kind: 'target' }, { from: 'own-b', to: 'enemy-a', kind: 'target' }])
  equal(combatBoardLinks(state, ['own-a'], { 'own-a': 'missing' }, {}), [])
})
