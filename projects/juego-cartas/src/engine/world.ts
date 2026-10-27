import { DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES, PLAYER_DECK } from './content.js'
import {
  beginAdventureEncounter, canEnterEncounter, createExplorationProgress, enterRatWing,
  ExplorationViolation, leaveRatWing, settleAdventureEncounter,
} from './exploration.js'
import type { AdventureState } from './exploration.js'
import { createGameSession, effectiveCopyCard, requireOutsideCombat, unlockCreatureType } from './session.js'
import {
  INTERACTION_RANGE, isWalkable, ROOMS, roomWithObjects, safeExplorationPose,
} from './spatial.js'
import type { ExplorationObject, RoomAnchor, RoomId, SpatialPose } from './spatial.js'
import type { DuelState } from './types.js'

export interface ExpeditionState extends AdventureState {
  roomId: RoomId
  claimedChestIds: string[]
  usedShrineIds: string[]
  encounterReturnPoint: { roomId: RoomId; pose: SpatialPose } | null
}

export interface WorldInteraction {
  state: ExpeditionState
  kind: 'travel' | 'chest' | 'shrine' | 'encounter'
  duel?: DuelState
}

const ROOM_ENCOUNTERS: Record<RoomId, string> = {
  'sector-1': 'B1', 'sector-2': 'B2', 'sector-3': 'B3',
  'rats-1': 'R1', 'rats-2': 'R2', 'rats-3': 'R3', 'rats-4': 'R4',
}
const CHEST_REWARDS: Partial<Record<RoomId, readonly string[]>> = {
  'sector-1': ['P09'], 'sector-2': ['P10'], 'sector-3': ['P14', 'P18'], 'rats-4': ['P08', 'P12'],
}
const NEXT_ROOM: Partial<Record<RoomId, RoomId>> = {
  'sector-1': 'sector-2', 'sector-2': 'sector-3',
  'rats-1': 'rats-2', 'rats-2': 'rats-3', 'rats-3': 'rats-4',
}
const PREVIOUS_ROOM: Partial<Record<RoomId, RoomId>> = {
  'sector-2': 'sector-1', 'sector-3': 'sector-2',
  'rats-2': 'rats-1', 'rats-3': 'rats-2', 'rats-4': 'rats-3',
}

export function createExpeditionState(adventure: AdventureState = {
  session: createGameSession(PLAYER_DECK), progress: createExplorationProgress(),
}): ExpeditionState {
  return { ...adventure, roomId: 'sector-1', claimedChestIds: [], usedShrineIds: [], encounterReturnPoint: null }
}

function encounterCompleted(state: ExpeditionState, encounterId: string): boolean {
  return (encounterId.startsWith('R')
    ? state.progress.ratVisit?.completedEncounterIds
    : state.progress.completedEncounterIds)?.includes(encounterId) ?? false
}

export function isExpeditionComplete(state: ExpeditionState): boolean {
  return state.progress.completedEncounterIds.includes('B3')
}

/** Availability and physical locations have one source for both the scene and interaction validation. */
export function objectsForRoom(state: ExpeditionState): ExplorationObject[] {
  const room = ROOMS[state.roomId]
  const encounterId = ROOM_ENCOUNTERS[state.roomId]
  const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === encounterId)!
  const completed = encounterCompleted(state, encounterId)
  const object = (anchor: RoomAnchor, kind: ExplorationObject['kind'], label: string,
    status: ExplorationObject['status'] = 'available'): ExplorationObject => ({
    id: `${state.roomId}:${anchor}`, kind, label, status, position: { ...room.anchors[anchor] },
  })
  const objects = [object('enemy', 'enemy', encounter.name,
    completed ? 'completed' : canEnterEncounter(state.progress, encounterId, DUNGEON_ENCOUNTERS) ? 'available' : 'locked')]
  if (CHEST_REWARDS[state.roomId]) {
    const chestId = `${state.roomId}:chest`
    objects.push(object('chest', 'chest', 'Cofre de descubrimiento',
      state.claimedChestIds.includes(chestId) ? 'completed'
        : state.roomId === 'rats-4' && !state.progress.ratChestUnlocked ? 'locked' : 'available'))
  }
  if (state.roomId.startsWith('sector-')) {
    objects.push(object('shrine', 'shrine', 'Santuario de sanación',
      state.usedShrineIds.includes(`${state.roomId}:shrine`) ? 'completed' : 'available'))
  }
  const next = NEXT_ROOM[state.roomId]
  if (next) objects.push(object('forward', 'exit', `Avanzar · ${ROOMS[next].name}`, completed ? 'available' : 'locked'))
  const previous = PREVIOUS_ROOM[state.roomId]
  if (previous) objects.push(object('back', 'exit', `Regresar · ${ROOMS[previous].name}`))
  if (state.roomId === 'sector-1') objects.push(object('wing', 'exit', 'Entrar al ala de las ratas'))
  else if (state.roomId.startsWith('rats-')) objects.push(object('wing', 'exit', 'Salir al sector 1'))
  return objects
}

/** Rejections throw before any mutation; callers commit the returned transaction once. */
export function interactWorldObject(state: ExpeditionState, objectId: string, pose: SpatialPose): WorldInteraction {
  requireOutsideCombat(state.session)
  const objects = objectsForRoom(state)
  const object = objects.find((entry) => entry.id === objectId)
  if (!object || object.status !== 'available') {
    throw new ExplorationViolation('Ese objeto no está disponible en esta sala.')
  }
  if (!Number.isFinite(pose.yaw) || !isWalkable(roomWithObjects(ROOMS[state.roomId], objects), pose)
    || Math.hypot(object.position.x - pose.x, object.position.z - pose.z) > INTERACTION_RANGE + Number.EPSILON * 8) {
    throw new ExplorationViolation('Acércate al objeto para interactuar.')
  }
  if (object.kind === 'enemy') {
    const started = beginAdventureEncounter(state, ROOM_ENCOUNTERS[state.roomId], DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES)
    return {
      kind: 'encounter', duel: started.duel,
      state: { ...state, ...started.state, encounterReturnPoint: {
        roomId: state.roomId, pose: { ...safeExplorationPose(ROOMS[state.roomId], objects, pose) },
      } },
    }
  }
  if (object.kind === 'chest') {
    // Resolve all card references before constructing the transaction.
    const cards = CHEST_REWARDS[state.roomId]!.map((id) => {
      const card = PLAYER_CARD_TYPES.find((entry) => entry.id === id)
      if (!card) throw new ExplorationViolation(`Premio desconocido: ${id}.`)
      return card
    })
    const session = cards.reduce((current, card) => unlockCreatureType(current, card), state.session)
    return { kind: 'chest', state: { ...state, session, claimedChestIds: [...state.claimedChestIds, object.id] } }
  }
  if (object.kind === 'shrine') {
    let healed = false
    const copies = state.session.copies.map((copy) => {
      const card = PLAYER_CARD_TYPES.find((entry) => entry.id === copy.cardId)
      if (!card) throw new ExplorationViolation(`Tipo desconocido: ${copy.cardId}.`)
      const maxHealth = effectiveCopyCard(card, copy).maxHealth
      if (copy.health <= 0 || copy.health >= maxHealth) return copy
      healed = true
      return { ...copy, health: maxHealth }
    })
    return { kind: 'shrine', state: healed ? {
      ...state, session: { ...state.session, copies }, usedShrineIds: [...state.usedShrineIds, object.id],
    } : state }
  }
  const anchor = object.id.split(':')[1]
  if (anchor === 'wing') {
    const entering = state.roomId === 'sector-1'
    const adventure = entering ? enterRatWing(state) : leaveRatWing(state)
    return { kind: 'travel', state: { ...state, ...adventure, roomId: entering ? 'rats-1' : 'sector-1' } }
  }
  const roomId = (anchor === 'forward' ? NEXT_ROOM : PREVIOUS_ROOM)[state.roomId]
  if (!roomId) throw new ExplorationViolation('Esta puerta no tiene destino.')
  return { kind: 'travel', state: { ...state, roomId } }
}

/** Combat consequences remain owned by H2; the expedition keeps its exact room and safe return point. */
export function settleExpeditionEncounter(state: ExpeditionState, duel: DuelState): ExpeditionState {
  const adventure = settleAdventureEncounter(state, duel, DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES)
  if (adventure === state) return state
  const returnPoint = state.encounterReturnPoint
  const settled = { ...state, ...adventure }
  if (!returnPoint) return settled
  return {
    ...settled, roomId: returnPoint.roomId,
    encounterReturnPoint: { ...returnPoint, pose: safeExplorationPose(
      ROOMS[returnPoint.roomId], objectsForRoom({ ...settled, roomId: returnPoint.roomId }), returnPoint.pose,
    ) },
  }
}
