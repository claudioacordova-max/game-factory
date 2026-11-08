import { RuleViolation, declareAttackers, declareBlockers, resolveCombat } from '../src/engine/rules.js'
import type { DuelState } from '../src/engine/types.js'
import { combatLayout, COMBAT_CARD_WIDTH } from '../src/ui/combatLayout.js'
import { assignDirectedAttacker, moveDirectedAttacker } from '../src/ui/combatSelection.js'
import type { AttackSelection } from '../src/ui/combatSelection.js'
import { createCombatDrag, readCombatDrag, applyCombatBlockDrop } from '../src/ui/blockDrag.js'
import { combatBoardLinks } from '../src/ui/boardLinks.js'
import { movePlayerBlocker } from '../src/ui/blockAssignments.js'
import { applyCombatAction, continueToPlayerDecision, createCombatControls } from '../src/ui/combatActions.js'
import { blockDefenseFixture } from './blockAssignments.js'

export const iterationUxTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { iterationUxTests.push({ name: `UX/fatiga · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
function rejects(action: () => unknown) { try { action() } catch (error) { if (error instanceof RuleViolation) return; throw error } throw new Error('Falta rechazo') }
const directed = (): DuelState => ({ ...blockDefenseFixture('skirmish'), activePlayer: 'player', phase: 'attackers', attackers: [] })
// UI-2: in-memory drag token; the tab origin field no longer exists (nothing leaves the page).
const context = (state: DuelState) => ({ duelId: state.id, turn: state.turn, revision: 3, selectionRevision: 0 })
const empty = (): AttackSelection => ({ attackerIds: [], targetChoices: {}, focusedAttackerId: null })

test('arrastre dirigido asigna varios, reasigna al final y retira sin perder prioridades existentes', () => {
  const state = directed(), baseline = JSON.stringify(state)
  let selection = assignDirectedAttacker(state, empty(), 'own-b', 'enemy-a')
  selection = assignDirectedAttacker(state, selection, 'own-a', 'enemy-a')
  selection = assignDirectedAttacker(state, selection, 'own-c', 'enemy-b')
  equal(selection.attackerIds, ['own-b', 'own-a', 'own-c'])
  ok(assignDirectedAttacker(state, selection, 'own-a', 'enemy-a') === selection, 'Repetir destino debe ser inerte')
  const layout = combatLayout(state, selection.attackerIds, selection.targetChoices, {})
  equal(layout.groups.map((group) => [group.id, group.own]), [['enemy-a', ['own-b', 'own-a']], ['enemy-b', ['own-c']], ['enemy-idle', []]])
  ok(layout.positions['own-b'] < layout.positions['own-a'], 'Orden visual contradice represalia')
  const moved = assignDirectedAttacker(state, selection, 'own-b', 'enemy-b')
  equal(moved.targetChoices, { 'own-b': 'enemy-b', 'own-a': 'enemy-a', 'own-c': 'enemy-b' })
  const removed = assignDirectedAttacker(state, moved, 'own-a', null)
  equal(removed.attackerIds, ['own-c', 'own-b'])
  equal(combatBoardLinks(state, removed.attackerIds, removed.targetChoices, {}).length, 2)
  rejects(() => assignDirectedAttacker(state, selection, 'own-a', 'missing'))
  rejects(() => assignDirectedAttacker(state, selection, 'enemy-a', 'enemy-b'))
  equal(JSON.stringify(state), baseline)
})

test('drag compartido rechaza datos externos/obsoletos y conserva exclusividad al mover y retirar', () => {
  const state = blockDefenseFixture(), frame = context(state), raw = createCombatDrag(state, frame, 'own-a')
  equal(readCombatDrag(state, frame, raw), 'own-a')
  for (const value of [[], '{', 'x'.repeat(2049), JSON.stringify(raw), { ...raw, extra: true }, { ...raw, origin: 'other' }, { ...raw, duelId: 'other' }]) rejects(() => readCombatDrag(state, frame, value))
  rejects(() => readCombatDrag(state, { ...frame, selectionRevision: 1 }, raw))
  rejects(() => readCombatDrag({ ...state, phase: 'main' }, frame, raw))
  let choices = applyCombatBlockDrop(state, { 'enemy-b': ['own-c'] }, frame, raw, 'enemy-a')
  choices = applyCombatBlockDrop(state, choices, frame, raw, 'enemy-b')
  equal(choices, { 'enemy-b': ['own-c', 'own-a'] })
  choices = applyCombatBlockDrop(state, choices, frame, raw, null)
  equal(choices, { 'enemy-b': ['own-c'] })
  const attack = directed(), attackFrame = context(attack)
  equal(readCombatDrag(attack, attackFrame, createCombatDrag(attack, attackFrame, 'own-a')), 'own-a')
})

test('grupos de defensa conservan orden efectivo, separación, exclusividad y espacio sin solapamientos', () => {
  const state = blockDefenseFixture(), baseline = JSON.stringify(state)
  const choices = { 'enemy-a': ['own-a', 'own-b'] }
  const first = combatLayout(state, [], {}, choices)
  const changed = movePlayerBlocker(state, choices, 'own-b', -1)
  const reordered = combatLayout(state, [], {}, changed)
  ok(first.positions['own-a'] < first.positions['own-b'] && reordered.positions['own-b'] < reordered.positions['own-a'], 'La posición debe seguir prioridad')
  for (const layout of [first, reordered]) {
    const ids = [...layout.groups.flatMap((group) => [...group.own, ...group.enemy]), ...layout.availableOwn, ...layout.availableEnemy]
    equal(new Set(ids).size, state.players.player.creatures.length + state.players.opponent.creatures.length)
    for (const row of new Set(Object.values(layout.rows))) {
      const positions = state.players.player.creatures.filter((unit) => layout.rows[unit.id] === row).map((unit) => layout.positions[unit.id]).sort((a, b) => a - b)
      ok(positions.every((left, index) => index === 0 || left - positions[index - 1] >= COMBAT_CARD_WIDTH), 'Cartas propias solapadas en una fila')
    }
    ok(layout.groups.slice(1).every((group, i) => group.left > layout.groups[i].left + layout.groups[i].width), 'Grupos sin separación')
  }
  const normal = resolveCombat(declareBlockers(state, choices)), reversed = resolveCombat(declareBlockers(state, changed))
  ok(normal.players.player.creatures.length !== reversed.players.player.creatures.length, 'La prueba debe cubrir una prioridad con consecuencias reales')
  equal(JSON.stringify(state), baseline)
})

test('instantánea de duelo contiene los bloqueos reales predaño y resultado equivale a resolverla una sola vez', () => {
  const source: DuelState = { ...blockDefenseFixture(), phase: 'attackers', activePlayer: 'player', attackers: [], blockers: {} }
  const baseline = JSON.stringify(source), control = createCombatControls(source)
  const action = { type: 'attack' as const, attackerIds: ['own-b', 'own-a'], targets: {} }
  const result = applyCombatAction(control, action, control.revision)
  ok(result.presentation, 'Falta instantánea')
  equal(result.presentation.phase, 'resolve')
  equal(result.presentation.attackers, action.attackerIds)
  equal(result.presentation.players, source.players)
  equal(result.state.duel, continueToPlayerDecision(resolveCombat(result.presentation)))
  const layout = combatLayout(result.presentation, result.presentation.attackers, {}, result.presentation.blockers)
  equal(layout.groups.filter((group) => !group.neutral).map((group) => group.own[0]), action.attackerIds)
  equal(combatBoardLinks(result.presentation, result.presentation.attackers, {}, result.presentation.blockers).length, Object.values(result.presentation.blockers).flat().length)
  ok(applyCombatAction(result.state, action, control.revision).state === result.state, 'Evento anterior no debe repetir combate')
  equal(JSON.stringify(source), baseline)
})

test('grupos grandes conservan disponibles en otra fila y reflejan prioridades sin superponer cartas', () => {
  const initial = directed(), template = initial.players.player.creatures[0]
  const own = Array.from({ length: 12 }, (_, index) => ({ ...template, id: `large-${index}`, copyId: `large-copy-${index}` }))
  const state = { ...initial, players: { ...initial.players, player: { ...initial.players.player, creatures: own } } }
  const attackers = own.slice(0, 10).map((unit) => unit.id)
  const targets = Object.fromEntries(attackers.map((id, index) => [id, index < 7 ? 'enemy-a' : 'enemy-b']))
  const layout = combatLayout(state, attackers, targets, {})
  ok(layout.width > 1024, 'El fixture debe requerir desplazamiento compartido')
  equal(layout.groups[0].own, attackers.slice(0, 7))
  equal(layout.availableOwn, ['large-10', 'large-11'])
  const sorted = attackers.map((id) => layout.positions[id]).sort((a, b) => a - b)
  ok(sorted.every((left, index) => index === 0 || left - sorted[index - 1] >= COMBAT_CARD_WIDTH), 'Overflow no debe comprimir cartas')
  ok(combatLayout(state, [...attackers].reverse(), { ...targets }, {}).positions['large-0'] !== layout.positions['large-0'], 'La prioridad declarada debe cambiar posición')
  const narrowed = assignDirectedAttacker(state, { attackerIds: attackers, targetChoices: targets, focusedAttackerId: null }, 'large-0', null)
  const after = combatLayout(state, narrowed.attackerIds, narrowed.targetChoices, {})
  equal(after.groups[0].own, attackers.slice(1, 7))
  ok(after.availableOwn.includes('large-0') && after.rows['large-0'] > after.rows['large-1'], 'Retirada debe volver a la fila inferior')
})

test('prioridad de atacantes modifica represalia real, preserva otros grupos y rechaza cambios inválidos', () => {
  const state = directed(), baseline = JSON.stringify(state)
  const selection: AttackSelection = { attackerIds: ['own-a', 'own-c', 'own-b'], targetChoices: { 'own-a': 'enemy-a', 'own-b': 'enemy-a', 'own-c': 'enemy-b' }, focusedAttackerId: null }
  const moved = moveDirectedAttacker(state, selection, 'own-b', -1)
  equal(moved.attackerIds, ['own-b', 'own-c', 'own-a'])
  equal(moved.targetChoices, selection.targetChoices)
  ok(moveDirectedAttacker(state, moved, 'own-b', -1) === moved, 'El límite debe ser inerte')
  const normal = resolveCombat(declareAttackers(state, selection.attackerIds, selection.targetChoices))
  const reversed = resolveCombat(declareAttackers(state, moved.attackerIds, moved.targetChoices))
  equal(normal.players.player.creatures.map((unit) => [unit.id, unit.health]), [['own-b', 3], ['own-c', 1]])
  equal(reversed.players.player.creatures.map((unit) => [unit.id, unit.health]), [['own-a', 2], ['own-b', 1], ['own-c', 1]])
  equal(normal.players.opponent.creatures, reversed.players.opponent.creatures)
  const layout = combatLayout(state, moved.attackerIds, moved.targetChoices, {})
  ok(layout.positions['own-b'] < layout.positions['own-a'], 'Prioridad visual distinta de la enviada al motor')
  equal(assignDirectedAttacker(state, moved, 'own-b', 'enemy-a'), moved)
  const reassigned = assignDirectedAttacker(state, moved, 'own-b', 'enemy-b')
  equal(reassigned.attackerIds.filter((id) => reassigned.targetChoices[id] === 'enemy-b'), ['own-c', 'own-b'])
  rejects(() => moveDirectedAttacker(state, selection, 'missing', 1))
  rejects(() => moveDirectedAttacker({ ...state, phase: 'main' }, selection, 'own-a', 1))
  rejects(() => moveDirectedAttacker(state, selection, 'own-a', 0 as 1))
  equal(JSON.stringify(state), baseline)
})

test('distribución contextual centra disponibles debajo sin sumar su ancho y vuelve a filas normales', () => {
  const state = blockDefenseFixture()
  const layout = combatLayout(state, [], {}, { 'enemy-a': ['own-a'] })
  equal(layout.availableOwn, ['own-b', 'own-c'])
  ok(layout.contextual && layout.rows['own-b'] > layout.rows['own-a'], 'Disponibles deben quedar debajo de relaciones')
  const center = (layout.positions['own-b'] + layout.positions['own-c'] + COMBAT_CARD_WIDTH) / 2
  equal(center, layout.width / 2)
  const withAllBlocked = combatLayout(state, [], {}, { 'enemy-a': ['own-a'], 'enemy-b': ['own-b', 'own-c'] })
  ok(layout.width <= withAllBlocked.width, 'La fila de disponibles no debe agregarse a la derecha')
  const normal = combatLayout({ ...state, phase: 'main', activePlayer: 'player' }, [], {}, {})
  ok(!normal.contextual && normal.groups.length === 0 && normal.rowCount === 2, 'Fuera de relaciones no debe haber zonas permanentes')
  equal(Object.values(normal.rows).sort(), [0, 0, 0, 1, 1, 1])
  const preview: DuelState = { ...state, activePlayer: 'player', phase: 'resolve', attackers: ['own-a', 'own-b'], blockers: { 'own-a': ['enemy-a'] } }
  const shown = combatLayout(preview, preview.attackers, {}, preview.blockers)
  ok(shown.groups.some((group) => group.own.includes('own-b') && group.enemy.length === 0), 'Ataque directo no bloqueado debe seguir como participante')
  equal(shown.availableOwn, ['own-c'])
})
