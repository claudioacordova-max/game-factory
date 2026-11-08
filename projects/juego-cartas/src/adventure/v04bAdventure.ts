import {
  createV04BEncounterDuel, createV04BPlay, interactV04BObject, isV04BExpeditionComplete, settleV04BEncounter, v04bObjectsForRoom, v04bRoom,
  v04bSpatialRoom, V04B_CARD_TYPES, V04B_ENCOUNTERS,
} from '../engine/index.js'
import type { V04BPlayState } from '../engine/index.js'
import { v04bEncounterSummary, v04bInteractionMessage } from '../ui/v04bMessages.js'
import type { AdventureAdapter } from './types.js'

/** V0.4B expedition (M6b), only reachable with ?expedicion=v04b. */
export const V04B_ADVENTURE: AdventureAdapter<V04BPlayState> = {
  id: 'v04b',
  create: () => createV04BPlay(),
  session: (state) => state.expedition.session,
  withSession: (state, session) => ({ ...state, expedition: { ...state.expedition, session } }),
  collectionCardTypes: V04B_CARD_TYPES,
  reinvokeCardTypes: V04B_CARD_TYPES,
  // Pure construction for the placeholder; the returned session lock is discarded.
  initialDuel: (state) => createV04BEncounterDuel(state.expedition.session, '02').duel,
  roomKey: (state) => v04bSpatialRoom(state.expedition.currentRoomId).id,
  room: (state) => v04bSpatialRoom(state.expedition.currentRoomId),
  objects: (state) => v04bObjectsForRoom(state),
  interact(state, objectId, pose) {
    const result = interactV04BObject(state, objectId, pose)
    const message = v04bInteractionMessage(result)
    return {
      state: result.state, message,
      ...(result.kind === 'encounter' ? { duel: result.duel } : {}),
      ...(result.kind === 'travel' ? { pose: { key: v04bSpatialRoom(result.to).id, pose: result.arrival } } : {}),
    }
  },
  settle(state, duel, sacrificedCopyIds) {
    const settlement = settleV04BEncounter(state, duel)
    const summary = v04bEncounterSummary(state.expedition.session, settlement, duel, sacrificedCopyIds)
    const point = settlement.state.returnPoint
    return { state: settlement.state, summary, ...(point ? { returnPose: { key: v04bSpatialRoom(point.roomId).id, pose: point.pose } } : {}) }
  },
  encounter(duel) {
    const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === duel.encounterId)
    return { name: encounter?.name ?? 'Oponente', maxLife: encounter?.opponentLife ?? 0 }
  },
  location(state) {
    const room = v04bRoom(state.expedition.currentRoomId)
    return { roomName: room.name, zoneName: room.zone, complete: isV04BExpeditionComplete(state.expedition) }
  },
}
