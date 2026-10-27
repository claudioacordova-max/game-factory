import { PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { createGameSession, unlockCreatureType } from '../src/engine/session.js'
import { declareAttackers, resolveCombat, startCombat, summonCreature } from '../src/engine/rules.js'
import { isWalkable, ROOMS, roomWithObjects } from '../src/engine/spatial.js'
import type { RoomId, SpatialPose } from '../src/engine/spatial.js'
import type { DuelState } from '../src/engine/types.js'
import {
  createExpeditionState, isExpeditionComplete, objectsForRoom, settleExpeditionEncounter,
} from '../src/engine/world.js'
import { interactWorldObject } from './duelFixtures.js'
import type { ExpeditionState } from '../src/engine/world.js'

type Test = { name: string; run: () => void }
export const worldTests: Test[] = []
function test(name: string, run: () => void) { worldTests.push({ name: `H5 · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function rejectedWithoutChange(state: ExpeditionState, run: () => unknown) {
  const snapshot = JSON.stringify(state)
  let rejected = false
  try { run() } catch { rejected = true }
  ok(rejected, 'Se esperaba rechazar la acción')
  equal(JSON.stringify(state), snapshot)
}
const card = (id: string) => PLAYER_CARD_TYPES.find((entry) => entry.id === id)!
function near(state: ExpeditionState, anchor: string): SpatialPose {
  const object = objectsForRoom(state).find((entry) => entry.id === `${state.roomId}:${anchor}`)!
  return { x: object.position.x + 1, z: object.position.z, yaw: 0 }
}
function interact(state: ExpeditionState, anchor: string) {
  return interactWorldObject(state, `${state.roomId}:${anchor}`, near(state, anchor))
}
// Isolated gate/service fixtures and terminal results below test transactions, never expedition balance.
function mainCompleted(state: ExpeditionState, ids: string[]): ExpeditionState {
  return { ...state, progress: { ...state.progress, completedEncounterIds: ids } }
}
function ratCompleted(state: ExpeditionState, ids: string[]): ExpeditionState {
  ok(state.progress.ratVisit)
  return { ...state, progress: { ...state.progress, ratVisit: { ...state.progress.ratVisit, completedEncounterIds: ids } } }
}
function terminal(duel: DuelState, winner: 'player' | 'opponent' = 'player'): DuelState {
  return { ...duel, phase: 'finished', winner }
}

test('inicio, fuentes de objetos y puertas principales persistentes', () => {
  let state = createExpeditionState()
  equal([state.roomId, state.claimedChestIds, state.usedShrineIds, state.encounterReturnPoint], ['sector-1', [], [], null])
  equal(objectsForRoom(state).map((object) => [object.kind, object.status]), [
    ['enemy', 'available'], ['chest', 'available'], ['shrine', 'available'], ['exit', 'locked'], ['exit', 'available'],
  ])
  rejectedWithoutChange(state, () => interact(state, 'forward'))
  state = mainCompleted(state, ['B1'])
  state = interact(state, 'forward').state
  equal(state.roomId, 'sector-2')
  rejectedWithoutChange(state, () => interact(state, 'forward'))
  state = mainCompleted(state, ['B1', 'B2'])
  state = interact(state, 'forward').state
  equal(state.roomId, 'sector-3')
  state = interact(state, 'back').state
  state = interact(state, 'back').state
  equal(state.roomId, 'sector-1')
  equal(objectsForRoom(state).find((object) => object.kind === 'enemy')?.status, 'completed')
  equal(interact(state, 'forward').state.roomId, 'sector-2')
})

test('cofres de sectores son libres y entregan exactamente P09, P10, P14 y P18 en reserva', () => {
  let state = createExpeditionState()
  const deck = state.session.activeDeckCopyIds
  for (const [roomId, rewards] of [
    ['sector-1', ['P09']], ['sector-2', ['P10']], ['sector-3', ['P14', 'P18']],
  ] as const) {
    state = { ...state, roomId }
    const initialCopies = state.session.copies.length
    state = interact(state, 'chest').state
    equal(state.session.copies.slice(initialCopies).map((copy) => copy.cardId), rewards)
    for (const copy of state.session.copies.slice(initialCopies)) {
      equal([copy.health, copy.bonusAttack, copy.bonusHealth], [card(copy.cardId).maxHealth, 0, 0])
    }
    equal(state.session.activeDeckCopyIds, deck)
    equal(state.progress.completedEncounterIds, [])
    rejectedWithoutChange(state, () => interact(state, 'chest'))
  }
  equal(state.claimedChestIds, ['sector-1:chest', 'sector-2:chest', 'sector-3:chest'])
})

test('R4 habilita cofre explícito P08/P12 y no entrega automáticamente sus copias', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = { ...ratCompleted(state, ['R1', 'R2', 'R3']), roomId: 'rats-4' }
  rejectedWithoutChange(state, () => interact(state, 'chest'))
  const started = interact(state, 'enemy')
  ok(started.duel)
  state = settleExpeditionEncounter(started.state, terminal(started.duel))
  equal(state.progress.ratChestUnlocked, true)
  ok(!state.session.unlockedCardIds.includes('P08'))
  ok(!state.session.unlockedCardIds.includes('P12'))
  const deck = state.session.activeDeckCopyIds
  state = interact(state, 'chest').state
  equal(state.session.copies.slice(-2).map((copy) => copy.cardId), ['P08', 'P12'])
  equal(state.session.activeDeckCopyIds, deck)
  equal(state.claimedChestIds, ['rats-4:chest'])
})

test('todas las 18 cartas son obtenibles por las fuentes exactas, con una copia por tipo', () => {
  let state = createExpeditionState()
  for (const [boss, roomId] of [['B1', 'sector-1'], ['B2', 'sector-2'], ['B3', 'sector-3']] as const) {
    equal(state.roomId, roomId)
    state = interact(state, 'chest').state
    const started = interact(state, 'enemy')
    ok(started.duel)
    equal(started.duel.encounterId, boss)
    state = settleExpeditionEncounter(started.state, terminal(started.duel))
    if (boss !== 'B3') state = interact(state, 'forward').state
  }
  state = interact(interact(state, 'back').state, 'back').state
  state = interact(state, 'wing').state
  state = { ...ratCompleted(state, ['R1', 'R2', 'R3']), roomId: 'rats-4' }
  const started = interact(state, 'enemy')
  ok(started.duel)
  state = settleExpeditionEncounter(started.state, terminal(started.duel))
  state = interact(state, 'chest').state
  equal(state.session.unlockedCardIds.slice().sort(), PLAYER_CARD_TYPES.map((entry) => entry.id).sort())
  equal(new Set(state.session.copies.map((copy) => copy.cardId)).size, 18)
  equal(state.session.copies.length, 18)
})

test('cofre reclamado no repone pérdidas y sigue gastado tras salir y volver', () => {
  let state = interact(createExpeditionState(), 'chest').state
  const lost = state.session.copies.find((copy) => copy.cardId === 'P09')!
  state = { ...state, session: { ...state.session, copies: state.session.copies.filter((copy) => copy.id !== lost.id) } }
  state = interact(state, 'wing').state
  state = interact(state, 'wing').state
  rejectedWithoutChange(state, () => interact(state, 'chest'))
  ok(!state.session.copies.some((copy) => copy.cardId === 'P09'))
  equal(unlockCreatureType(state.session, card('P09')), state.session)
})

test('cofre del ala reclamado persiste en visitas y las victorias R4 repetidas no duplican ni reponen', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = { ...ratCompleted(state, ['R1', 'R2', 'R3']), roomId: 'rats-4' }
  const first = interact(state, 'enemy')
  ok(first.duel)
  state = interact(settleExpeditionEncounter(first.state, terminal(first.duel)), 'chest').state
  state = { ...state, session: { ...state.session, copies: state.session.copies.filter((copy) => copy.cardId !== 'P08') } }
  state = interact(state, 'wing').state
  state = interact(state, 'wing').state
  state = { ...ratCompleted(state, ['R1', 'R2', 'R3']), roomId: 'rats-4' }
  const again = interact(state, 'enemy')
  ok(again.duel)
  state = settleExpeditionEncounter(again.state, terminal(again.duel))
  rejectedWithoutChange(state, () => interact(state, 'chest'))
  equal(state.session.copies.filter((copy) => copy.cardId === 'P12').length, 1)
  equal(state.session.copies.filter((copy) => copy.cardId === 'P08').length, 0)
})

test('santuario sana baraja y reserva incluida P17 +3, sin tocar invocador ni revivir', () => {
  const session = createGameSession([card('P01'), card('P17'), card('P02')])
  let state = createExpeditionState({ session: {
    ...session, activeDeckCopyIds: [session.copies[0].id], invokerMaxLife: 7, invokerLife: 4, fatigue: 3,
    copies: session.copies.map((copy, index) => ({ ...copy, health: index === 2 ? 0 : 1, bonusHealth: index === 1 ? 3 : 0 })),
  }, progress: createExpeditionState().progress })
  const before = state.session
  state = interact(state, 'shrine').state
  equal(state.session.copies.map((copy) => copy.health), [2, 11, 0])
  equal([state.session.invokerMaxLife, state.session.invokerLife, state.session.fatigue], [7, 4, 3])
  equal(state.session.activeDeckCopyIds, before.activeDeckCopyIds)
  equal(state.session.unlockedCardIds, before.unlockedCardIds)
  equal(state.usedShrineIds, ['sector-1:shrine'])
  rejectedWithoutChange(state, () => interact(state, 'shrine'))
})

test('ninguna herida no consume santuario; cada uno de los tres se puede gastar solo una vez', () => {
  let state = createExpeditionState()
  equal(interact(state, 'shrine').state, state)
  equal(state.usedShrineIds, [])
  for (const roomId of ['sector-1', 'sector-2', 'sector-3'] as const) {
    state = { ...state, roomId, session: { ...state.session, copies: state.session.copies.map((copy) => ({ ...copy, health: 1 })) } }
    state = interact(state, 'shrine').state
    ok(state.session.copies.every((copy) => copy.health === card(copy.cardId).maxHealth))
    rejectedWithoutChange(state, () => interact(state, 'shrine'))
  }
  equal(state.usedShrineIds, ['sector-1:shrine', 'sector-2:shrine', 'sector-3:shrine'])
  state = { ...state, roomId: 'sector-1' }
  state = interact(interact(state, 'wing').state, 'wing').state
  equal(state.usedShrineIds.length, 3)
  rejectedWithoutChange(state, () => interact(state, 'shrine'))
})

test('solo entrada real al ala reinicia encuentros; salas internas no cambian visita ni recursos', () => {
  let state = createExpeditionState()
  state = { ...state, session: { ...state.session, invokerMaxLife: 6, invokerLife: 5, fatigue: 4,
    copies: state.session.copies.map((copy) => ({ ...copy, health: 1 })) } }
  state = interact(state, 'chest').state
  const persistentSession = state.session
  state = interact(state, 'wing').state
  equal(state.roomId, 'rats-1')
  rejectedWithoutChange(state, () => interact(state, 'forward'))
  state = ratCompleted(state, ['R1'])
  const visit = state.progress.ratVisit
  state = interact(state, 'forward').state
  equal([state.roomId, state.progress.ratVisit], ['rats-2', visit])
  ok(state.progress.ratVisit === visit)
  state = interact(state, 'back').state
  equal(state.progress.ratVisit, visit)
  state = interact(state, 'forward').state
  state = interact(state, 'wing').state
  equal([state.roomId, state.progress.ratVisit], ['sector-1', null])
  state = interact(state, 'wing').state
  equal(state.progress.ratVisit?.completedEncounterIds, [])
  ok(state.progress.ratVisit?.id !== visit?.id)
  ok(state.session === persistentSession)
  equal(state.claimedChestIds, ['sector-1:chest'])
})

test('salida voluntaria disponible desde cualquiera de las cuatro salas del ala', () => {
  const initial = interact(createExpeditionState(), 'wing').state
  for (const roomId of ['rats-1', 'rats-2', 'rats-3', 'rats-4'] as RoomId[]) {
    const state = { ...initial, roomId }
    const exited = interact(state, 'wing').state
    equal([exited.roomId, exited.progress.ratVisit], ['sector-1', null])
    equal(exited.session, state.session)
  }
})

test('interacciones inválidas, lejanas, bloqueadas o con pose imposible son atómicas', () => {
  const state = createExpeditionState()
  const pose = near(state, 'chest')
  for (const [id, invalidPose] of [
    ['missing', pose], ['sector-2:chest', pose], ['sector-1:forward', near(state, 'forward')],
    ['sector-1:chest', ROOMS['sector-1'].spawn],
    ['sector-1:chest', { ...pose, x: NaN }], ['sector-1:chest', { ...pose, yaw: Infinity }],
    ['sector-1:chest', { ...pose, x: ROOMS['sector-1'].anchors.chest.x }],
    ['sector-1:chest', { ...pose, x: ROOMS['sector-1'].anchors.chest.x + 1.651 }],
  ] as const) rejectedWithoutChange(state, () => interactWorldObject(state, id, invalidPose))
  const boundary = { ...pose, x: ROOMS['sector-1'].anchors.chest.x - 1.65 }
  equal(interactWorldObject(state, 'sector-1:chest', boundary).kind, 'chest')
})

test('combate activo bloquea encuentros, cofres, santuarios y puertas', () => {
  const started = interact(createExpeditionState(), 'enemy')
  ok(started.duel)
  for (const anchor of ['enemy', 'chest', 'shrine', 'wing', 'forward']) {
    rejectedWithoutChange(started.state, () => interact(started.state, anchor))
  }
  rejectedWithoutChange(started.state, () => settleExpeditionEncounter(started.state, started.duel!))
})

test('R1 real vuelve al punto conservado, persiste heridas y liquida una sola vez', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = { ...state, session: { ...state.session, invokerMaxLife: 10, invokerLife: 10, fatigue: 2 } }
  const pose = near(state, 'enemy')
  const snapshot = { ...pose }
  const started = interactWorldObject(state, 'rats-1:enemy', pose)
  ok(started.duel)
  pose.x = 99
  let duel = summonCreature(started.duel, 'P01')
  const attacker = duel.players.player.creatures[0].id
  const target = duel.players.opponent.creatures[0].id
  duel = resolveCombat(declareAttackers(startCombat(duel), [attacker], { [attacker]: target }))
  equal(duel.winner, 'player')
  state = settleExpeditionEncounter(started.state, duel)
  equal([state.roomId, state.encounterReturnPoint?.pose], ['rats-1', snapshot])
  equal(state.progress.ratVisit?.completedEncounterIds, ['R1'])
  equal([state.session.invokerMaxLife, state.session.invokerLife, state.session.fatigue], [11, 11, 2])
  equal(state.session.copies.find((copy) => copy.cardId === 'P01')?.health, 1)
  ok(isWalkable(roomWithObjects(ROOMS[state.roomId], objectsForRoom(state)), state.encounterReturnPoint!.pose))
  ok(settleExpeditionEncounter(state, duel) === state)
})

test('derrota conserva sala y encuentros anteriores; reintento no reinicia visita', () => {
  let state = interact(createExpeditionState(), 'wing').state
  state = ratCompleted(state, ['R1'])
  state = interact(state, 'forward').state
  const visitId = state.progress.ratVisit!.id
  const started = interact(state, 'enemy')
  ok(started.duel)
  state = settleExpeditionEncounter(started.state, terminal(started.duel, 'opponent'))
  equal([state.roomId, state.progress.ratVisit?.id, state.progress.ratVisit?.completedEncounterIds], ['rats-2', visitId, ['R1']])
  equal(objectsForRoom(state).find((object) => object.kind === 'enemy')?.status, 'available')
  const retry = interact(state, 'enemy')
  ok(retry.duel && retry.duel.id !== started.duel.id)
  equal(retry.state.progress.ratVisit?.id, visitId)
})

test('B3 finaliza sin puerta ni jefe inexistente y permite retroceder e inspeccionar estado', () => {
  let state: ExpeditionState = { ...mainCompleted(createExpeditionState(), ['B1', 'B2']), roomId: 'sector-3' }
  const started = interact(state, 'enemy')
  ok(started.duel)
  state = settleExpeditionEncounter(started.state, terminal(started.duel))
  ok(isExpeditionComplete(state))
  equal(objectsForRoom(state).filter((object) => object.kind === 'enemy').map((object) => object.status), ['completed'])
  ok(!objectsForRoom(state).some((object) => object.id.endsWith(':forward')))
  equal(interact(state, 'back').state.roomId, 'sector-2')
  equal(state.session.copies.length, 8)
})
