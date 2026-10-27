import { createDuel } from './duelFixtures.js'
import type { CreatureCard } from '../src/engine/types.js'
import { applyCombatAction, cancelSummonShortcut, continueToPlayerDecision, createCombatControls } from '../src/ui/combatActions.js'
import type { CombatAction, CombatControls } from '../src/ui/combatActions.js'

export const combatActionTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { combatActionTests.push({ name: `A4 acciones · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(message) }
const card = (id: string, overrides: Partial<CreatureCard> = {}): CreatureCard => ({ id, name: id, attack: 1, maxHealth: 5, copyId: `copy-${id}`, cost: { mana: 0, sacrifices: 0 }, ...overrides })
const seeds = [card('seed-a'), card('seed-b'), card('seed-c'), card('seed-d'), card('seed-e')]
const ritual = card('ritual', { cost: { mana: 1, sacrifices: 2 }, attack: 5 })
const act = (state: CombatControls, action: CombatAction) => applyCombatAction(state, action, state.revision)
function readyRitual(): CombatControls {
  let state = createCombatControls(createDuel({ playerDeck: [seeds[0], seeds[1], ritual], opponentDeck: [] }))
  state = act(state, { type: 'summon', cardId: seeds[0].id }).state
  state = act(state, { type: 'summon', cardId: seeds[1].id }).state
  return act(state, { type: 'summon', cardId: ritual.id }).state
}
function mainDuel(options: Partial<Parameters<typeof createDuel>[0]> = {}) { return createCombatControls(createDuel({ playerDeck: seeds, opponentDeck: [], ...options })) }
const begin = (state: CombatControls) => act(state, { type: 'begin-attack' }).state

test('el intento inmediato de invocación paga una sola vez y conserva la entrada', () => {
  const source = mainDuel()
  const snapshot = JSON.stringify(source)
  const result = act(source, { type: 'summon', cardId: seeds[0].id })
  equal(JSON.stringify(source), snapshot)
  equal(result.state.duel.players.player.creatures.length, 1)
  equal(result.state.pending, null)
  const replay = applyCombatAction(result.state, { type: 'summon', cardId: seeds[0].id }, source.revision)
  ok(replay.state === result.state, 'Un evento de render anterior debe ser ignorado.')
  equal(replay.sacrificedCopyIds, [])
  const legitimate = act(replay.state, { type: 'summon', cardId: seeds[1].id })
  equal(legitimate.state.duel.players.player.creatures.length, 2)
})

test('recursos, carta inválida y fase inválida se rechazan sin mutar recursos ni selección', () => {
  const source = mainDuel({ playerDeck: [card('costly', { cost: { mana: 2, sacrifices: 0 } }), seeds[0]] })
  for (const action of [{ type: 'summon', cardId: 'costly' }, { type: 'summon', cardId: 'missing' }] as const) {
    const result = act(source, action)
    ok(result.state === source && result.message.length > 0, 'El intento inválido debe explicar y conservar el estado.')
  }
  const attacking = begin(source)
  ok(act(attacking, { type: 'summon', cardId: seeds[0].id }).state === attacking, 'No se puede invocar fuera de principal.')
})

test('dos sacrificios permiten selección parcial, deselección y cancelación sin bajas', () => {
  const source = readyRitual()
  const first = source.duel.players.player.creatures[0].id
  const partial = act(source, { type: 'sacrifice', creatureId: first }).state
  ok(partial.duel === source.duel, 'La selección incompleta no debe tocar el duelo.')
  equal(partial.pending?.sacrificeIds, [first])
  equal(act(partial, { type: 'sacrifice', creatureId: first }).state.pending?.sacrificeIds, [])
  const canceled = act(partial, { type: 'cancel' })
  ok(canceled.state.duel === source.duel, 'Cancelar no debe pagar, sacrificar o curar.')
  equal(canceled.state.pending, null)
  equal(canceled.sacrificedCopyIds, [])
})

test('la última selección ejecuta el ritual atómico y no puede repetirse', () => {
  const source = readyRitual()
  const [first, second] = source.duel.players.player.creatures
  const partial = act(source, { type: 'sacrifice', creatureId: first.id }).state
  const result = act(partial, { type: 'sacrifice', creatureId: second.id })
  equal(result.sacrificedCopyIds, [first.copyId, second.copyId])
  equal(result.state.duel.players.player.mana, 0)
  equal(result.state.duel.players.player.creatures.map((unit) => unit.card.id), [ritual.id])
  equal(result.state.pending, null)
  equal(result.state.duel.phase, 'attackers')
  const replay = applyCombatAction(result.state, { type: 'sacrifice', creatureId: second.id }, partial.revision)
  ok(replay.state === result.state, 'Un replay no debe sacrificar ni cobrar otra vez.')
  ok(act(result.state, { type: 'sacrifice', creatureId: second.id }).state === result.state, 'Un ID antiguo tampoco se acepta en la fase siguiente.')
  const legitimate = act(replay.state, { type: 'attack', attackerIds: [], targets: {} })
  equal(legitimate.state.duel.turn, 3)
  equal(legitimate.sacrificedCopyIds, [])
  equal(legitimate.state.duel.players.player.creatures.map((unit) => unit.card.id), [ritual.id])
})

test('el último sacrificio revalida recursos e identidades actuales antes de perder copias', () => {
  const source = readyRitual()
  const [first, second] = source.duel.players.player.creatures
  const partial = act(source, { type: 'sacrifice', creatureId: first.id }).state
  const noMana = { ...partial, duel: { ...partial.duel, players: { ...partial.duel.players, player: { ...partial.duel.players.player, mana: 0 } } } }
  const result = act(noMana, { type: 'sacrifice', creatureId: second.id })
  ok(result.state === noMana && result.message.includes('maná'), 'Debe revalidar el maná antes del pago final.')
  equal(result.sacrificedCopyIds, [])
  ok(act(partial, { type: 'sacrifice', creatureId: 'missing' }).state === partial, 'Una criatura inexistente no modifica la selección.')
  const stale = { ...partial, pending: { ...partial.pending!, sacrificeIds: ['missing'] } }
  ok(act(stale, { type: 'sacrifice', creatureId: second.id }).state === stale, 'Un sacrificio previo obsoleto no permite perder otras criaturas.')
})

test('el avance y otras invocaciones no interrumpen un sacrificio pendiente', () => {
  const source = readyRitual()
  ok(act(source, { type: 'advance' }).state === source, 'El avance automático debe respetar la selección.')
  ok(act(source, { type: 'begin-attack' }).state === source, 'El ataque debe esperar completar o cancelar.')
  ok(act(source, { type: 'summon', cardId: ritual.id }).state === source, 'Un segundo evento no debe reiniciar el sacrificio.')
})

test('confirmar cero atacantes pasa el enemigo vacío sin exigir bloqueos y roba exactamente una vez', () => {
  const source = begin(mainDuel())
  const beforeHand = source.duel.players.player.hand.length, beforeDeck = source.duel.players.player.deck.length
  const result = act(source, { type: 'attack', attackerIds: [], targets: {} })
  equal([result.state.duel.activePlayer, result.state.duel.phase, result.state.duel.turn], ['player', 'main', 3])
  equal(result.state.duel.players.player.hand.length, beforeHand + 1)
  equal(result.state.duel.players.player.deck.length, beforeDeck - 1)
  ok(continueToPlayerDecision(result.state.duel) === result.state.duel, 'La continuación ya satisfecha debe ser idempotente.')
  ok(applyCombatAction(result.state, { type: 'attack', attackerIds: [], targets: {} }, source.revision).state === result.state, 'No se puede repetir el turno confirmado.')
})

test('un ataque enemigo real conserva la confirmación de cero bloqueadores', () => {
  const source = begin(mainDuel({ opponentInitialField: [card('enemy', { attack: 2 })] }))
  const defense = act(source, { type: 'attack', attackerIds: [], targets: {} }).state
  equal([defense.duel.phase, defense.duel.activePlayer, defense.duel.turn], ['blockers', 'opponent', 2])
  equal(defense.duel.players.player.life, 20)
  ok(act(defense, { type: 'blocks', choices: { missing: [] } }).state === defense, 'Una asignación inválida conserva la defensa pendiente.')
  const next = act(defense, { type: 'blocks', choices: {} }).state
  equal([next.duel.activePlayer, next.duel.turn, next.duel.players.player.life], ['player', 3, 18])
  equal(next.duel.players.player.deck.length, source.duel.players.player.deck.length - 1)
})

test('un ataque letal termina antes de mantenimiento y robo enemigos', () => {
  let state = mainDuel({ playerDeck: [card('finisher', { attack: 4 }), ...seeds], opponentDeck: seeds, opponentLife: 3 })
  state = act(state, { type: 'summon', cardId: 'finisher' }).state
  state = begin(state)
  const attacker = state.duel.players.player.creatures[0].id
  const before = state.duel.players.opponent
  const result = act(state, { type: 'attack', attackerIds: [attacker], targets: {} }).state.duel
  equal([result.phase, result.winner, result.turn], ['finished', 'player', 1])
  ok(result.players.opponent.kind === 'invoker' && before.kind === 'invoker', 'Fixture de invocador.')
  equal(result.players.opponent.deck, before.deck)
  equal(result.players.opponent.hand, before.hand)
})

test('la escaramuza exige objetivo dirigido y conserva represalia y fin letal', () => {
  let state = mainDuel({ playerDeck: [card('fighter', { attack: 3 }), ...seeds], mode: 'skirmish', opponentInitialField: [card('rat', { attack: 1, maxHealth: 2 })] })
  state = act(state, { type: 'summon', cardId: 'fighter' }).state
  state = begin(state)
  const attacker = state.duel.players.player.creatures[0].id, target = state.duel.players.opponent.creatures[0].id
  ok(act(state, { type: 'attack', attackerIds: [attacker], targets: {} }).state === state, 'El objetivo sigue siendo obligatorio.')
  const next = act(state, { type: 'attack', attackerIds: [attacker], targets: { [attacker]: target } }).state.duel
  equal([next.phase, next.winner, next.turn], ['finished', 'player', 1])
  equal(next.players.player.creatures[0].health, 4)
  equal(next.players.opponent.kind, 'group')
})

test('una escaramuza no letal encadena ataque del grupo y siguiente turno', () => {
  let state = mainDuel({ playerDeck: [card('fighter', { attack: 2 }), ...seeds], mode: 'skirmish', opponentInitialField: [card('rat', { maxHealth: 9 })] })
  state = begin(act(state, { type: 'summon', cardId: 'fighter' }).state)
  const attacker = state.duel.players.player.creatures[0].id, target = state.duel.players.opponent.creatures[0].id
  const defense = act(state, { type: 'attack', attackerIds: [attacker], targets: { [attacker]: target } }).state
  equal([defense.duel.phase, defense.duel.activePlayer], ['blockers', 'opponent'])
  const next = act(defense, { type: 'blocks', choices: {} }).state.duel
  equal([next.turn, next.players.player.life, next.players.player.creatures[0].health], [3, 19, 4])
})

test('defensa letal termina sin robar ni comenzar otro turno', () => {
  const source = begin(mainDuel({ playerLife: 1, opponentInitialField: [card('killer', { attack: 2 })] }))
  const defense = act(source, { type: 'attack', attackerIds: [], targets: {} }).state
  const result = act(defense, { type: 'blocks', choices: {} }).state.duel
  equal([result.phase, result.winner, result.turn], ['finished', 'opponent', 2])
  equal(result.players.player.deck, source.duel.players.player.deck)
})

test('Escape solo cancela como tecla simple fuera de edición', () => {
  const event = { key: 'Escape', repeat: false, ctrlKey: false, altKey: false, metaKey: false }
  equal(cancelSummonShortcut(event, false), true)
  equal(cancelSummonShortcut(event, true), false)
  for (const option of ['repeat', 'ctrlKey', 'altKey', 'metaKey'] as const) equal(cancelSummonShortcut({ ...event, [option]: true }, false), false)
  equal(cancelSummonShortcut({ ...event, key: 'Enter' }, false), false)
})
