import { ExplorationViolation } from './exploration.js'
import { applyBossRestoration, ratCycleStatus } from './restoration.js'
import { finishSessionDuel, requireOutsideCombat } from './session.js'
import { INTERACTION_RANGE, isWalkable, roomWithObjects, safeExplorationPose } from './spatial.js'
import type { ExplorationObject, SpatialPose } from './spatial.js'
import type { DuelState, RandomSource } from './types.js'
import { createV04BEncounterDuel } from './v04bPreparations.js'
import { V04B_ENCOUNTERS } from './content/v04bEncounters.js'
import { v04bRoom, v04bRuneIsNext, V04B_PUZZLE_LENGTH, V04B_RUNES } from './content/v04bMap.js'
import type { V04BRoomId, V04BRune } from './content/v04bMap.js'
import {
  activatePedestal, createV04BExpedition, examineWall, isEncounterDefeated, readInscription, recordRoomVictory, roomExits, travel, useAltar,
} from './v04bWorld.js'
import type { AltarUse, PedestalActivation, V04BExpedition, WallExamination } from './v04bWorld.js'
import { v04bArrivalPose, v04bSpatialRoom } from './v04bSpatial.js'

/**
 * V0.4B playable expedition (M6b): binds the M6a exploration state to 3D objects, the M4 encounters and the
 * existing settlement. Pure and immutable; the UI only commits the returned transaction.
 */
export interface V04BPlayState {
  expedition: V04BExpedition
  /** Safe pose to return to after the active encounter (same room). */
  returnPoint: { roomId: V04BRoomId; pose: SpatialPose } | null
}

export function createV04BPlay(expedition: V04BExpedition = createV04BExpedition()): V04BPlayState {
  return { expedition, returnPoint: null }
}

export const RUNE_NAMES: Record<V04BRune, string> = { hueso: 'Hueso', sombra: 'Sombra', mana: 'Maná' }

/** Runes already lit in the current attempt, derived without exposing the private order. */
export function litRunes(state: V04BExpedition): V04BRune[] {
  if (state.puzzle.solved) return [...V04B_RUNES]
  const lit: V04BRune[] = []
  for (let step = 0; step < state.puzzle.progress && step < V04B_PUZZLE_LENGTH; step++) {
    const rune = V04B_RUNES.find((candidate) => v04bRuneIsNext(step, candidate))
    if (rune) lit.push(rune)
  }
  return lit
}

const objectId = (roomId: V04BRoomId, suffix: string) => `v04b-${roomId}:${suffix}`

/** Objects of the current room: availability comes only from v04bWorld; positions from v04bSpatial. Chests are hidden (M7). */
export function v04bObjectsForRoom(state: V04BPlayState): ExplorationObject[] {
  const exp = state.expedition
  const roomId = exp.currentRoomId
  const room = v04bSpatialRoom(roomId)
  const objects: ExplorationObject[] = []
  const data = v04bRoom(roomId)
  if (data.encounterId && room.features.encounter) {
    const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === data.encounterId)!
    objects.push({ id: objectId(roomId, 'enemy'), kind: 'enemy', label: encounter.name, position: { ...room.features.encounter },
      status: isEncounterDefeated(exp, roomId) ? 'completed' : 'available', visual: `enemy:${roomId}` })
  }
  if (room.features.altar) {
    objects.push({ id: objectId(roomId, 'altar'), kind: 'feature', label: 'Altar', action: 'Usar el altar', position: { ...room.features.altar },
      status: 'available', visual: ratCycleStatus(exp.session).canRecharge ? 'altar:ready' : 'altar:idle' })
  }
  if (room.features.inscription) {
    objects.push({ id: objectId(roomId, 'inscription'), kind: 'feature', label: 'Inscripción rúnica', action: 'Leer la inscripción',
      position: { ...room.features.inscription }, status: 'available', visual: 'inscription' })
  }
  if (room.features.pedestals) {
    const lit = litRunes(exp)
    for (const rune of V04B_RUNES) {
      objects.push({ id: objectId(roomId, `pedestal:${rune}`), kind: 'feature', label: `Pedestal de ${RUNE_NAMES[rune]}`, action: 'Activar la runa',
        position: { ...room.features.pedestals[rune] }, status: exp.puzzle.solved ? 'completed' : 'available',
        visual: `pedestal:${rune}:${lit.includes(rune) ? 'lit' : 'off'}` })
    }
  }
  if (room.features.crackedWall && !exp.wallExamined) {
    objects.push({ id: objectId(roomId, 'wall'), kind: 'feature', label: 'Una marca ritual tenue en la piedra', action: 'Examinar el muro agrietado',
      position: { ...room.features.crackedWall }, status: 'available', visual: 'cracked-wall' })
  }
  for (const exit of roomExits(exp)) {
    if (exit.status === 'hidden') continue
    const anchor = room.exits[exit.to]
    if (!anchor) throw new Error(`Sala ${roomId}: salida ${exit.to} sin ancla`)
    const special = roomId === '03' && exit.to === '13' ? 'titan' : roomId === '14' && exit.to === '18' ? 'breach' : exit.status === 'sealed' ? 'sealed' : 'door'
    objects.push({ id: objectId(roomId, `exit:${exit.to}`), kind: 'exit', label: `Hacia ${v04bRoom(exit.to).name}`, position: { ...anchor.position },
      status: exit.status === 'open' ? 'available' : 'locked', ...(exit.reason ? { reason: exit.reason } : {}),
      ...(anchor.side === 'west' || anchor.side === 'east' ? { sideWall: true } : {}),
      visual: `exit:${special}:${exit.status}` })
  }
  return objects
}

export type V04BInteraction =
  | { kind: 'travel'; state: V04BPlayState; from: V04BRoomId; to: V04BRoomId; arrival: SpatialPose }
  | { kind: 'encounter'; state: V04BPlayState; duel: DuelState }
  | { kind: 'altar'; state: V04BPlayState; result: AltarUse }
  | { kind: 'inscription'; state: V04BPlayState; text: string }
  | { kind: 'pedestal'; state: V04BPlayState; rune: V04BRune; result: PedestalActivation }
  | { kind: 'wall'; state: V04BPlayState; result: WallExamination }

/** Rejections throw before any mutation, as in the legacy world. */
export function interactV04BObject(state: V04BPlayState, id: string, pose: SpatialPose, random?: RandomSource): V04BInteraction {
  const exp = state.expedition
  requireOutsideCombat(exp.session)
  const room = v04bSpatialRoom(exp.currentRoomId)
  const objects = v04bObjectsForRoom(state)
  const object = objects.find((entry) => entry.id === id)
  if (!object || object.status !== 'available') throw new ExplorationViolation(object?.reason ? `${object.reason}.` : 'Ese objeto no está disponible en esta sala.')
  if (!Number.isFinite(pose.yaw) || !isWalkable(roomWithObjects(room, objects), pose)
    || Math.hypot(object.position.x - pose.x, object.position.z - pose.z) > INTERACTION_RANGE + Number.EPSILON * 8) {
    throw new ExplorationViolation('Acércate al objeto para interactuar.')
  }
  const suffix = id.slice(id.indexOf(':') + 1)
  const withExpedition = (expedition: V04BExpedition): V04BPlayState => ({ ...state, expedition })
  if (suffix.startsWith('exit:')) {
    const to = suffix.slice(5) as V04BRoomId
    const next = travel(exp, to)
    return { kind: 'travel', state: { expedition: next, returnPoint: null }, from: exp.currentRoomId, to, arrival: v04bArrivalPose(to, exp.currentRoomId) }
  }
  if (suffix === 'enemy') {
    const started = createV04BEncounterDuel(exp.session, exp.currentRoomId, random ? { random } : {})
    return { kind: 'encounter', duel: started.duel, state: {
      expedition: { ...exp, session: started.session },
      returnPoint: { roomId: exp.currentRoomId, pose: { ...safeExplorationPose(room, objects, pose) } },
    } }
  }
  if (suffix === 'altar') { const result = useAltar(exp); return { kind: 'altar', result, state: withExpedition(result.state) } }
  if (suffix === 'inscription') return { kind: 'inscription', text: readInscription(exp), state }
  if (suffix.startsWith('pedestal:')) {
    const rune = suffix.slice(9) as V04BRune
    const result = activatePedestal(exp, rune)
    return { kind: 'pedestal', rune, result, state: withExpedition(result.state) }
  }
  if (suffix === 'wall') { const result = examineWall(exp); return { kind: 'wall', result, state: withExpedition(result.state) } }
  throw new ExplorationViolation('Ese objeto no tiene interacción.')
}

export interface V04BSettlement {
  state: V04BPlayState
  won: boolean
  /** B1/B2 free restoration applied after the settlement. */
  restored: boolean
  roomId: V04BRoomId
  /** Session right after finishSessionDuel, before any boss restoration (for the result summary). */
  settledSession: V04BExpedition['session']
}

/**
 * Settles the active V0.4B encounter with the existing liquidation (wounds, losses, fatigue 0-1 on defeat).
 * Victory records the room; B1 (02) and B2 (06) also apply the free restoration. No card rewards.
 * Idempotent: an already settled duel returns the same state.
 */
export function settleV04BEncounter(state: V04BPlayState, duel: DuelState): V04BSettlement {
  const exp = state.expedition
  const roomId = (duel.encounterId ?? exp.currentRoomId) as V04BRoomId
  if (exp.session.settledDuelIds.includes(duel.id)) return { state, won: duel.winner === 'player', restored: false, roomId, settledSession: exp.session }
  if (roomId !== exp.currentRoomId) throw new ExplorationViolation('El resultado no pertenece a la sala actual.')
  const settledSession = finishSessionDuel(exp.session, duel)
  let expedition: V04BExpedition = { ...exp, session: settledSession }
  const won = duel.winner === 'player'
  let restored = false
  if (won) {
    expedition = recordRoomVictory(expedition, roomId)
    if (roomId === '02' || roomId === '06') { expedition = { ...expedition, session: applyBossRestoration(expedition.session) }; restored = true }
  }
  const returnPoint = state.returnPoint
  const pose = returnPoint && returnPoint.roomId === roomId
    ? safeExplorationPose(v04bSpatialRoom(roomId), v04bObjectsForRoom({ expedition, returnPoint: null }), returnPoint.pose) : null
  return { state: { expedition, returnPoint: pose ? { roomId, pose } : null }, won, restored, roomId, settledSession }
}
