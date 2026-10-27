import { PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { createGameSession } from '../src/engine/session.js'
import { declareAttackers, resolveCombat, startCombat, summonCreature } from '../src/engine/rules.js'
import { createExpeditionState, objectsForRoom, settleExpeditionEncounter } from '../src/engine/world.js'
import { interactWorldObject } from './duelFixtures.js'
import type { ExpeditionState, WorldInteraction } from '../src/engine/world.js'
import type { DuelState } from '../src/engine/types.js'
import { attacksReady, encounterSummary, worldInteractionMessage } from '../src/ui/encounterSummary.js'

export const presentationTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { presentationTests.push({ name: `H5 presentación · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
const card = (id: string) => PLAYER_CARD_TYPES.find((entry) => entry.id === id)!
function interact(state: ExpeditionState, anchor: string): WorldInteraction {
  const object = objectsForRoom(state).find((entry) => entry.id === `${state.roomId}:${anchor}`)!
  return interactWorldObject(state, object.id, { x: object.position.x + 1, z: object.position.z, yaw: 0 })
}
// Explicit terminal fixtures verify presentation of a transaction; they do not establish balance.
const terminal = (duel: DuelState, winner: 'player' | 'opponent' = 'player'): DuelState => ({ ...duel, phase: 'finished', winner })

test('R1 real informa premio +1, fatiga sin descuento, herida y retorno al ala', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = { ...state, session: { ...state.session, invokerMaxLife: 9, invokerLife: 9, fatigue: 4 } }
  const started = interact(state, 'enemy')
  ok(started.duel)
  equal(worldInteractionMessage(state, started), 'Comienza la escaramuza contra Ratas · 1.')
  let duel = summonCreature(started.duel, 'P01')
  const attacker = duel.players.player.creatures[0].id, target = duel.players.opponent.creatures[0].id
  duel = resolveCombat(declareAttackers(startCombat(duel), [attacker], { [attacker]: target }))
  const after = settleExpeditionEncounter(started.state, duel)
  const summary = encounterSummary(started.state, after, duel)
  equal(summary.resources, 'Vida máxima 9 → 10 · Fatiga 4 → 4 · Vida actual restaurada a 10/10')
  ok(summary.outcome.includes('siguiente sala del ala'))
  ok(summary.details[0].includes('Rata amaestrada 1/2'))
  equal(summary.details[2], 'Mejoras por victoria: ninguna.')
  equal(summary.details[3], 'Descubrimientos en reserva: ninguno.')
})

test('sacrificio real, crecimiento ganado y descubrimiento se muestran desde la liquidación', () => {
  const state = createExpeditionState({ session: createGameSession([card('P01'), card('P16'), card('P03')]), progress: createExpeditionState().progress })
  const started = interact(state, 'enemy')
  ok(started.duel)
  let duel = summonCreature(started.duel, 'P01')
  const sacrificed = duel.players.player.creatures[0]
  duel = summonCreature(duel, 'P16', [sacrificed.id])
  // The terminal fixture isolates labels; growth itself has independent H3 real-combat coverage.
  duel = terminal(duel)
  const after = settleExpeditionEncounter(started.state, duel)
  const snapshot = JSON.stringify([started.state, after, duel])
  const summary = encounterSummary(started.state, after, duel, [sacrificed.copyId!])
  equal(summary.details[1], 'Bajas: ninguna. Sacrificios: Rata amaestrada.')
  equal(summary.details[2], 'Mejoras por victoria: Basilisco ancestral: ATQ +1.')
  equal(summary.details[3], 'Descubrimientos en reserva: Quimera menor.')
  ok(summary.outcome.includes('sector 2'))
  equal(JSON.stringify([started.state, after, duel]), snapshot)
})

test('derrota comunica máximo real, fatiga +1 y bajas sin atribuirlas a sacrificios', () => {
  const initial = createExpeditionState()
  const state = { ...initial, session: { ...initial.session, invokerMaxLife: 5, invokerLife: 5, fatigue: 2 } }
  const started = interact(state, 'enemy')
  ok(started.duel)
  let duel = summonCreature(started.duel, 'P01')
  // Isolated casualty fixture: remove the field representation, then settle the actual active attempt.
  duel = terminal({ ...duel, players: { ...duel.players, player: { ...duel.players.player, life: 0, creatures: [] } } }, 'opponent')
  const after = settleExpeditionEncounter(started.state, duel)
  const summary = encounterSummary(started.state, after, duel)
  equal(summary.resources, 'Vida máxima 5 → 5 · Fatiga 2 → 3 · Vida actual restaurada a 5/5')
  equal(summary.details[1], 'Bajas: Rata amaestrada. Sacrificios: ninguno.')
  ok(summary.outcome.includes('reintentar aquí'))
})

test('R4 distingue cofre pendiente y reclamado; B3 no anuncia otro jefe', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = { ...state, roomId: 'rats-4', progress: { ...state.progress, ratVisit: { id: 1, completedEncounterIds: ['R1', 'R2', 'R3'] } } }
  const started = interact(state, 'enemy')
  ok(started.duel)
  const duel = terminal(started.duel)
  const after = settleExpeditionEncounter(started.state, duel)
  ok(encounterSummary(started.state, after, duel).outcome.includes('Acércate al cofre'))
  ok(encounterSummary(started.state, { ...after, claimedChestIds: ['rats-4:chest'] }, duel).outcome.includes('ya fue reclamado'))
  const main: ExpeditionState = { ...createExpeditionState(), roomId: 'sector-3', progress: { ...createExpeditionState().progress, completedEncounterIds: ['B1', 'B2'] } }
  const boss = interact(main, 'enemy')
  ok(boss.duel)
  const final = terminal(boss.duel)
  const summary = encounterSummary(boss.state, settleExpeditionEncounter(boss.state, final), final)
  equal(summary.title, 'Demo completada')
  ok(summary.outcome.includes('seguir explorando'))
  ok(!summary.outcome.includes('siguiente'))
})

test('cofre y santuarios describen copias y no inventan restauración del invocador', () => {
  let state = createExpeditionState()
  const chest = interact(state, 'chest')
  ok(worldInteractionMessage(state, chest).includes('Acólita del umbral'))
  ok(worldInteractionMessage(state, chest).includes('reserva'))
  const healthy = interact(state, 'shrine')
  equal(worldInteractionMessage(state, healthy), 'No hay copias heridas. El santuario conserva su uso.')
  state = { ...state, session: { ...state.session, invokerMaxLife: 7, invokerLife: 3, copies: state.session.copies.map((copy) => ({ ...copy, health: 1 })) } }
  const healed = interact(state, 'shrine')
  ok(worldInteractionMessage(state, healed).includes('incluida la reserva'))
  ok(worldInteractionMessage(state, healed).includes('sigue en 7'))
  equal([healed.state.session.invokerMaxLife, healed.state.session.invokerLife], [7, 3])
})

test('ataques dirigidos no habilitan confirmar con objetivos vacíos o eliminados', () => {
  const state = interact(createExpeditionState(), 'wing').state
  const started = interact(state, 'enemy')
  ok(started.duel)
  const duel = summonCreature(started.duel, 'P01')
  const ownId = duel.players.player.creatures[0].id, enemyId = duel.players.opponent.creatures[0].id
  equal(attacksReady(duel, [ownId], {}), false)
  equal(attacksReady(duel, [ownId], { [ownId]: 'missing' }), false)
  equal(attacksReady(duel, [ownId], { [ownId]: enemyId }), true)
  equal(attacksReady(duel, [], {}), true)
  const main = interact(createExpeditionState(), 'enemy')
  ok(main.duel)
  equal(attacksReady(main.duel, [ownId], {}), true)
})
