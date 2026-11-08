import { RuleViolation } from '../src/engine/rules.js'
import { applyCombatBlockDrop, createCombatDrag } from '../src/ui/blockDrag.js'
import type { CombatDragContext } from '../src/ui/blockDrag.js'
import { combatBoardLinks } from '../src/ui/boardLinks.js'
import { movePlayerBlocker, removePlayerBlocker } from '../src/ui/blockAssignments.js'
import { blockDefenseFixture } from './blockAssignments.js'

// UI-2: the native drag payload (JSON in dataTransfer) became an in-memory token. These tests keep the same
// context guarantees (duel, turn, revisions, malformed data, invalid creatures). The former "origin" (tab) field is
// gone because the token never leaves the page; a token from another board fails on duel/revision instead.
export const blockDragTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { blockDragTests.push({ name: `A5 arrastre · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo RuleViolation')
}
const context = (duelId: string, turn: number): CombatDragContext => ({ duelId, turn, revision: 7, selectionRevision: 0 })

test('token propio asigna sin cambiar criaturas, recursos ni el estado previo', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const before = JSON.stringify(state)
  const token = createCombatDrag(state, frame, 'own-a')
  const result = applyCombatBlockDrop(state, {}, frame, token, 'enemy-a')
  equal(result, { 'enemy-a': ['own-a'] })
  equal(JSON.stringify(state), before)
  ok(typeof token === 'object' && Object.isFrozen(token) && token.kind === 'block', 'El token vive en memoria, inmutable y tipado por fase.')
  ok(applyCombatBlockDrop(state, result, frame, token, 'enemy-a') === result, 'Soltar en el mismo destino es inerte.')
})

test('datos corruptos, tipos extraños y estructuras añadidas no alteran asignaciones', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn), chosen = { 'enemy-b': ['own-c'] }
  const valid = createCombatDrag(state, frame, 'own-a')
  for (const token of ['own-a', JSON.stringify(valid), null, [], 7, { ...valid, kind: 'hand' }, { ...valid, kind: 'directed' }, { ...valid, extra: true }, { ...valid, revision: -1 }, { ...valid, creatureId: '' }]) {
    rejects(() => applyCombatBlockDrop(state, chosen, frame, token, 'enemy-a'))
    equal(chosen, { 'enemy-b': ['own-c'] })
  }
})

test('duelo, turno y revisiones anteriores se rechazan', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const valid = createCombatDrag(state, frame, 'own-a')
  for (const change of [{ duelId: 'other-duel' }, { turn: frame.turn + 1 }, { revision: frame.revision - 1 }, { selectionRevision: 1 }]) {
    rejects(() => applyCombatBlockDrop(state, {}, frame, { ...valid, ...change }, 'enemy-a'))
  }
  rejects(() => applyCombatBlockDrop(state, {}, { ...frame, selectionRevision: 1 }, valid, 'enemy-a'))
  rejects(() => createCombatDrag(state, { ...frame, duelId: 'other-duel' }, 'own-a'))
})

test('criaturas ajenas, desaparecidas y enemigos que no atacan son destinos inválidos', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  rejects(() => createCombatDrag(state, frame, 'enemy-a'))
  const token = createCombatDrag(state, frame, 'own-a')
  rejects(() => applyCombatBlockDrop(state, {}, frame, token, 'enemy-idle'))
  rejects(() => applyCombatBlockDrop(state, {}, frame, token, 'missing'))
  const removed = { ...state, players: { ...state.players, player: { ...state.players.player, creatures: state.players.player.creatures.filter((unit) => unit.id !== 'own-a') } } }
  rejects(() => applyCombatBlockDrop(removed, {}, frame, token, 'enemy-a'))
  rejects(() => applyCombatBlockDrop({ ...state, phase: 'main' }, {}, frame, token, 'enemy-a'))
})

test('reasignar un arrastre mantiene exclusividad y añade al final del nuevo orden', () => {
  const state = blockDefenseFixture(), frame = context(state.id, state.turn)
  const first = applyCombatBlockDrop(state, {}, frame, createCombatDrag(state, frame, 'own-a'), 'enemy-a')
  const secondContext = { ...frame, selectionRevision: 1 }
  const second = applyCombatBlockDrop(state, first, secondContext, createCombatDrag(state, secondContext, 'own-b'), 'enemy-a')
  equal(second, { 'enemy-a': ['own-a', 'own-b'] })
  const thirdContext = { ...frame, selectionRevision: 2 }
  const third = applyCombatBlockDrop(state, second, thirdContext, createCombatDrag(state, thirdContext, 'own-a'), 'enemy-b')
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
