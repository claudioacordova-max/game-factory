import { ExplorationViolation, startSessionDuel } from '../engine/index.js'
import { DUNGEON_ENCOUNTERS, MAIN_ENCOUNTERS, PLAYER_CARD_TYPES } from '../engine/content.js'
import { ROOMS } from '../engine/spatial.js'
import { createExpeditionState, interactWorldObject, isExpeditionComplete, objectsForRoom, settleExpeditionEncounter } from '../engine/world.js'
import type { ExpeditionState } from '../engine/world.js'
import { encounterSummary, worldInteractionMessage } from '../ui/encounterSummary.js'
import type { AdventureAdapter } from './types.js'

/** The unchanged legacy expedition (default game), expressed as calls the shell already made. */
export const LEGACY_ADVENTURE: AdventureAdapter<ExpeditionState> = {
  id: 'legacy',
  create: () => createExpeditionState(),
  session: (state) => state.session,
  withSession: (state, session) => ({ ...state, session }),
  reinvokeCardTypes: PLAYER_CARD_TYPES,
  initialDuel: (state) => startSessionDuel(state.session, PLAYER_CARD_TYPES, MAIN_ENCOUNTERS[0].opponentDeck),
  roomKey: (state) => state.roomId,
  room: (state) => ROOMS[state.roomId],
  objects: (state) => objectsForRoom(state),
  interact(state, objectId, pose) {
    const result = interactWorldObject(state, objectId, pose)
    const message = worldInteractionMessage(state, result)
    if (result.kind === 'encounter' && !result.duel) throw new ExplorationViolation('No se pudo preparar el encuentro.')
    return { state: result.state, duel: result.duel, message }
  },
  settle(state, duel, sacrificedCopyIds) {
    const next = settleExpeditionEncounter(state, duel)
    const summary = encounterSummary(state, next, duel, sacrificedCopyIds)
    const point = next.encounterReturnPoint
    return { state: next, summary, ...(point ? { returnPose: { key: point.roomId, pose: point.pose } } : {}) }
  },
  encounter(duel) {
    const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === duel.encounterId)
    return { name: encounter?.enemyName ?? 'Oponente', maxLife: encounter?.opponentLife ?? 0 }
  },
  location: (state) => ({ roomName: ROOMS[state.roomId].name, complete: isExpeditionComplete(state) }),
}
