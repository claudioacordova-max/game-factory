import {
  createV04BEncounterDuel, createV04BPlay, interactV04BObject, isV04BExpeditionComplete, settleV04BEncounter, v04bObjectsForRoom, v04bRoom,
  v04bSpatialRoom, V04B_CARD_TYPES, V04B_ENCOUNTERS,
} from '../engine/index.js'
import type { V04BPlayState, V04BRoomId } from '../engine/index.js'
import { v04bEncounterSummary, v04bInteractionMessage } from '../ui/v04bMessages.js'
import type { AdventureAdapter, ChestReward } from './types.js'

function chestReward(roomId: V04BRoomId, cardIds: readonly string[], copyIds: readonly string[]): ChestReward {
  if (cardIds.length !== copyIds.length) throw new Error('Concesión de cofre incoherente.')
  return { source: v04bRoom(roomId).name, cards: cardIds.map((id, index) => {
    const card = V04B_CARD_TYPES.find((entry) => entry.id === id)
    if (!card) throw new Error(`Tipo desconocido: ${id}`)
    return { copyId: copyIds[index], card }
  }) }
}

/** V0.4B expedition (M6b, chests M7), only reachable with ?expedicion=v04b. */
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
      ...(result.kind === 'chest' && result.result.opened ? { reward: chestReward(result.roomId, result.result.cardIds, result.result.copyIds) } : {}),
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
