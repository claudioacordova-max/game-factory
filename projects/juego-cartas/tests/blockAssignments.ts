import { declareBlockers, resolveCombat, RuleViolation } from '../src/engine/rules.js'
import type { Creature, DuelState, PlayerId } from '../src/engine/types.js'
import { assignPlayerBlocker, movePlayerBlocker, removePlayerBlocker } from '../src/ui/blockAssignments.js'
import type { BlockAssignments } from '../src/ui/blockAssignments.js'
import { createDuel } from './duelFixtures.js'

type Test = { name: string; run: () => void }
export const blockAssignmentTests: Test[] = []
export { defense as blockDefenseFixture }
function test(name: string, run: () => void) { blockAssignmentTests.push({ name: `A5 · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function rejects(run: () => unknown) {
  try { run() } catch (error) {
    if (error instanceof RuleViolation) return
    throw error
  }
  throw new Error('Se esperaba un rechazo RuleViolation')
}
function creature(id: string, owner: PlayerId, attack: number, health: number): Creature {
  return {
    id, owner, health, summonedTurn: 1, copyId: owner === 'player' ? `copy-${id}` : undefined,
    card: { id: `card-${id}`, name: id, attack, maxHealth: health, cost: { mana: 0, sacrifices: 0 } },
  }
}
function defense(mode: 'duel' | 'skirmish' = 'duel'): DuelState {
  const initial = createDuel({ playerDeck: [], opponentDeck: [] })
  const enemies = [creature('enemy-a', 'opponent', 4, 8), creature('enemy-b', 'opponent', 2, 8), creature('enemy-idle', 'opponent', 1, 8)]
  return {
    ...initial, mode, phase: 'blockers', activePlayer: 'opponent', attackers: ['enemy-a', 'enemy-b'],
    players: {
      player: { ...initial.players.player, creatures: [creature('own-a', 'player', 1, 2), creature('own-b', 'player', 1, 5), creature('own-c', 'player', 1, 3)] },
      opponent: mode === 'skirmish' ? { kind: 'group', creatures: enemies } : { ...initial.players.player, creatures: enemies },
    },
  }
}

test('asignar varios bloqueadores conserva orden, recursos y estado originales', () => {
  const state = defense()
  const before = JSON.stringify(state)
  const initial: BlockAssignments = {}
  const first = assignPlayerBlocker(state, initial, 'own-b', 'enemy-a')
  const second = assignPlayerBlocker(state, first, 'own-a', 'enemy-a')
  equal(second, { 'enemy-a': ['own-b', 'own-a'] })
  equal(initial, {})
  equal(first, { 'enemy-a': ['own-b'] })
  equal(JSON.stringify(state), before)
})

test('soltar otra vez sobre el mismo objetivo es inerte y no elimina ni reordena', () => {
  const current = { 'enemy-a': ['own-a', 'own-b'] }
  ok(assignPlayerBlocker(defense(), current, 'own-a', 'enemy-a') === current, 'El drop repetido debe conservar la referencia')
  equal(current, { 'enemy-a': ['own-a', 'own-b'] })
})

test('reasignar mueve exclusivamente y añade al final del nuevo objetivo', () => {
  const current = { 'enemy-a': ['own-a', 'own-c'], 'enemy-b': ['own-b'] }
  const after = assignPlayerBlocker(defense(), current, 'own-a', 'enemy-b')
  equal(after, { 'enemy-a': ['own-c'], 'enemy-b': ['own-b', 'own-a'] })
  equal(current, { 'enemy-a': ['own-a', 'own-c'], 'enemy-b': ['own-b'] })
  equal(Object.values(after).flat().filter((id) => id === 'own-a').length, 1)
  equal(assignPlayerBlocker(defense(), { 'enemy-a': ['own-a'] }, 'own-a', 'enemy-b'), { 'enemy-b': ['own-a'] })
})

test('retirar conserva otros bloqueos, borra destino vacío y no elimina criaturas', () => {
  const state = defense()
  const current = { 'enemy-a': ['own-a', 'own-b'], 'enemy-b': ['own-c'] }
  equal(removePlayerBlocker(state, current, 'own-a'), { 'enemy-a': ['own-b'], 'enemy-b': ['own-c'] })
  equal(removePlayerBlocker(state, { 'enemy-a': ['own-a'] }, 'own-a'), {})
  const empty = {}
  ok(removePlayerBlocker(state, empty, 'own-b') === empty, 'Retirar una no asignada es inerte')
  equal(state.players.player.creatures.map((unit) => unit.id), ['own-a', 'own-b', 'own-c'])
  equal(current, { 'enemy-a': ['own-a', 'own-b'], 'enemy-b': ['own-c'] })
})

test('orden subir/bajar cambia solo posiciones y respeta ambos límites', () => {
  const state = defense()
  const current = { 'enemy-a': ['own-a', 'own-b', 'own-c'] }
  equal(movePlayerBlocker(state, current, 'own-b', -1), { 'enemy-a': ['own-b', 'own-a', 'own-c'] })
  equal(movePlayerBlocker(state, current, 'own-b', 1), { 'enemy-a': ['own-a', 'own-c', 'own-b'] })
  ok(movePlayerBlocker(state, current, 'own-a', -1) === current, 'Subir la primera conserva la asignación')
  ok(movePlayerBlocker(state, current, 'own-c', 1) === current, 'Bajar la última conserva la asignación')
  const split = { 'enemy-a': ['own-a', 'own-b'], 'enemy-b': ['own-c'] }
  equal(movePlayerBlocker(state, split, 'own-b', -1), { 'enemy-a': ['own-b', 'own-a'], 'enemy-b': ['own-c'] })
  equal(current, { 'enemy-a': ['own-a', 'own-b', 'own-c'] })
  rejects(() => movePlayerBlocker(state, {}, 'own-a', 1))
  rejects(() => movePlayerBlocker(state, current, 'own-a', 0 as -1 | 1))
})

test('rechaza fase, turno y finalización incorrectos en todas las operaciones', () => {
  const original = defense()
  const invalidStates: DuelState[] = [
    ...(['main', 'attackers', 'resolve', 'resolved', 'finished'] as const).map((phase) => ({ ...original, phase })),
    { ...original, activePlayer: 'player' }, { ...original, winner: 'opponent' },
  ]
  for (const state of invalidStates) {
    rejects(() => assignPlayerBlocker(state, {}, 'own-a', 'enemy-a'))
    rejects(() => removePlayerBlocker(state, { 'enemy-a': ['own-a'] }, 'own-a'))
    rejects(() => movePlayerBlocker(state, { 'enemy-a': ['own-a'] }, 'own-a', 1))
  }
})

test('rechaza IDs ajenos, inexistentes, no atacantes y asignaciones previas inválidas sin mutación', () => {
  const state = defense()
  const before = JSON.stringify(state)
  for (const blockerId of ['missing', 'enemy-a']) {
    rejects(() => assignPlayerBlocker(state, {}, blockerId, 'enemy-a'))
    rejects(() => removePlayerBlocker(state, {}, blockerId))
    rejects(() => movePlayerBlocker(state, {}, blockerId, 1))
  }
  for (const attackerId of ['missing', 'own-a', 'enemy-idle']) rejects(() => assignPlayerBlocker(state, {}, 'own-a', attackerId))
  const invalidAssignments: BlockAssignments[] = [
    { 'enemy-a': ['own-a', 'own-a'] },
    { 'enemy-a': ['own-a'], 'enemy-b': ['own-a'] },
    { 'enemy-idle': ['own-a'] },
    { 'enemy-a': ['missing'] },
  ]
  for (const assignments of invalidAssignments) rejects(() => assignPlayerBlocker(state, assignments, 'own-c', 'enemy-b'))
  rejects(() => assignPlayerBlocker({ ...state, attackers: ['ghost'] }, {}, 'own-a', 'ghost'))
  equal(JSON.stringify(state), before)
})

test('motor real respeta daño ordenado en duelo y escaramuza y conserva bloqueo parcial', () => {
  for (const mode of ['duel', 'skirmish'] as const) {
    const state = defense(mode)
    let assignments = assignPlayerBlocker(state, {}, 'own-a', 'enemy-a')
    assignments = assignPlayerBlocker(state, assignments, 'own-b', 'enemy-a')
    const normal = resolveCombat(declareBlockers(state, assignments))
    equal(normal.players.player.creatures.map((unit) => [unit.id, unit.health]), [['own-b', 3], ['own-c', 3]])
    equal(normal.players.player.life, state.players.player.life - 2)
    equal(normal.players.opponent.creatures.find((unit) => unit.id === 'enemy-a')?.health, 6)
    const reordered = movePlayerBlocker(state, assignments, 'own-b', -1)
    const reversed = resolveCombat(declareBlockers(state, reordered))
    equal(reversed.players.player.creatures.map((unit) => [unit.id, unit.health]), [['own-a', 2], ['own-b', 1], ['own-c', 3]])
    equal(reversed.players.player.life, state.players.player.life - 2)
    equal(assignments, { 'enemy-a': ['own-a', 'own-b'] })
  }
})

test('bloqueo no traspasa daño sobrante al invocador; dejar todos sin bloquear es válido', () => {
  const state = defense()
  const blocked = resolveCombat(declareBlockers(state, assignPlayerBlocker(state, {}, 'own-a', 'enemy-a')))
  equal(blocked.players.player.life, state.players.player.life - 2)
  const empty = removePlayerBlocker(state, assignPlayerBlocker(state, {}, 'own-a', 'enemy-a'), 'own-a')
  equal(resolveCombat(declareBlockers(state, empty)).players.player.life, state.players.player.life - 6)
})
