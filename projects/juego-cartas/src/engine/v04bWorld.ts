import { ExplorationViolation } from './exploration.js'
import { createV04BInitialSession } from './v04bPreparations.js'
import { enterRatCircuitFrom03, leaveAltarTo04, ratCycleStatus, recordRatEncounterVictory, RAT_ROOM_IDS, useRatAltar } from './restoration.js'
import { requireOutsideCombat } from './session.js'
import type { GameSession, RatRoomId } from './session.js'
import {
  V04B_INSCRIPTION_TEXT, V04B_PUZZLE_LENGTH, V04B_ROOMS, V04B_RUNES, v04bEdgeIsTwoWay, v04bNeighbours, v04bRoom, v04bRuneIsNext,
} from './content/v04bMap.js'
import type { V04BRoomId, V04BRune } from './content/v04bMap.js'

/**
 * V0.4B exploration state (M6a): pure, immutable engine layer over the M5 session. No UI, 3D, duels or rewards.
 * Contract (as M5): incoherent events throw ExplorationViolation (or RuleViolation from the session);
 * legitimate interactions that do nothing return a result with a `reason` and the unchanged state.
 */
export interface V04BExpedition {
  session: GameSession
  currentRoomId: V04BRoomId
  /** Room the player came from (null at start). Its connection counts as return when bidirectional. */
  previousRoomId: V04BRoomId | null
  /** Non-rat encounters currently defeated. Rat rooms 07/08/09 live in `session.ratCycle` (they can reactivate). */
  defeatedRoomIds: readonly V04BRoomId[]
  /** Rooms whose encounter was ever defeated (survives rat reactivation); used for one-time chests. */
  everDefeatedRoomIds: readonly V04BRoomId[]
  visitedRoomIds: readonly V04BRoomId[]
  /** Correct runes activated in a row (0..3) and whether the puzzle is solved. The order lives in the map data. */
  puzzle: { progress: number; solved: boolean }
  wallExamined: boolean
}

export function createV04BExpedition(session: GameSession = createV04BInitialSession()): V04BExpedition {
  if (session.collectionProfile !== 'v04b' || !session.ratCycle || !session.orb) throw new ExplorationViolation('La exploración V0.4B requiere una sesión V0.4B.')
  return { session, currentRoomId: '01', previousRoomId: null, defeatedRoomIds: [], everDefeatedRoomIds: [], visitedRoomIds: ['01'], puzzle: { progress: 0, solved: false }, wallExamined: false }
}

const isRatRoom = (roomId: string): roomId is RatRoomId => (RAT_ROOM_IDS as readonly string[]).includes(roomId)

export function isEncounterDefeated(state: V04BExpedition, roomId: V04BRoomId): boolean {
  return isRatRoom(roomId) ? state.session.ratCycle!.defeated.includes(roomId) : state.defeatedRoomIds.includes(roomId)
}

/** The 03-13 seal opens when the 12 puzzle is solved. */
export function isSealOpen(state: V04BExpedition): boolean {
  return state.puzzle.solved
}

/** B3 defeated: end of the demo. */
export function isV04BExpeditionComplete(state: V04BExpedition): boolean {
  return isEncounterDefeated(state, '19')
}

// ---------- Salidas ----------
export type ExitStatus = 'open' | 'blocked' | 'hidden' | 'sealed'
export interface RoomExit { to: V04BRoomId; status: ExitStatus; reason: string }

function exitStatus(state: V04BExpedition, from: V04BRoomId, to: V04BRoomId): { status: ExitStatus; reason: string } {
  const open = { status: 'open' as const, reason: '' }
  // Conditional connections.
  if (from === '03' && to === '13') {
    if (!isEncounterDefeated(state, '02')) return { status: 'hidden', reason: 'Aún no hay puerta visible' }
    if (!isSealOpen(state)) return { status: 'sealed', reason: 'Sello cerrado: se libera resolviendo el puzle de la sala 12' }
    return open
  }
  if (from === '14' && to === '18') {
    return state.wallExamined ? open : { status: 'hidden', reason: 'Entrada oculta' }
  }
  if (from === '10' && to === '09' && ratCycleStatus(state.session).returnClosed) {
    return { status: 'blocked', reason: 'Ya recargaste: sal por 04 y vuelve a entrar desde 03' }
  }
  // Encounter blocking: forward exits stay blocked until victory; return (or the connection of entry) stays open.
  const room = v04bRoom(from)
  if (room.encounterId && !isEncounterDefeated(state, from)) {
    const isReturn = room.returnTo.includes(to) || (state.previousRoomId === to && v04bEdgeIsTwoWay(from, to))
    if (!isReturn) return { status: 'blocked', reason: `Vence el encuentro de ${room.name} para avanzar` }
  }
  return open
}

/** Exits of the current room with status and reason (hidden exits are listed so the UI can filter them). */
export function roomExits(state: V04BExpedition): RoomExit[] {
  return v04bNeighbours(state.currentRoomId).map((to) => ({ to, ...exitStatus(state, state.currentRoomId, to) }))
}

export function openExits(state: V04BExpedition): V04BRoomId[] {
  return roomExits(state).filter((exit) => exit.status === 'open').map((exit) => exit.to)
}

function requireIdle(state: V04BExpedition): void {
  requireOutsideCombat(state.session)
}

function requireRoom(state: V04BExpedition, roomId: V04BRoomId, what: string): void {
  requireIdle(state)
  if (state.currentRoomId !== roomId) throw new ExplorationViolation(`${what} solo está disponible en la sala ${roomId}.`)
}

const addOnce = <T,>(list: readonly T[], item: T): T[] => (list.includes(item) ? [...list] : [...list, item])

// ---------- Viaje ----------
/** Moves through an open exit of the current room. M5 events: 03 to 07 enters the rat circuit, 10 to 04 leaves the altar. */
export function travel(state: V04BExpedition, toRoomId: string): V04BExpedition {
  requireIdle(state)
  const exit = roomExits(state).find((candidate) => candidate.to === toRoomId)
  if (!exit || exit.status === 'hidden') throw new ExplorationViolation(`No hay conexión de ${state.currentRoomId} a ${toRoomId}.`)
  if (exit.status !== 'open') throw new ExplorationViolation(`Salida ${exit.status === 'sealed' ? 'sellada' : 'bloqueada'}: ${exit.reason}.`)
  const from = state.currentRoomId
  let session = state.session
  if (from === '03' && exit.to === '07') session = enterRatCircuitFrom03(session)
  if (from === '10' && exit.to === '04') session = leaveAltarTo04(session)
  return { ...state, session, currentRoomId: exit.to, previousRoomId: from, visitedRoomIds: addOnce(state.visitedRoomIds, exit.to) }
}

// ---------- Victorias ----------
/** Marks the current room's encounter as defeated. No duel, restoration or reward is connected (M7/M8). */
export function recordRoomVictory(state: V04BExpedition, roomId: string): V04BExpedition {
  requireIdle(state)
  if (roomId !== state.currentRoomId) throw new ExplorationViolation(`Solo se puede registrar la victoria de la sala actual (${state.currentRoomId}).`)
  const room = v04bRoom(roomId)
  if (!room.encounterId) throw new ExplorationViolation(`La sala ${roomId} no tiene encuentro.`)
  if (isEncounterDefeated(state, room.id)) throw new ExplorationViolation(`El encuentro de la sala ${roomId} ya está vencido.`)
  const everDefeatedRoomIds = addOnce(state.everDefeatedRoomIds, room.id)
  if (isRatRoom(room.id)) return { ...state, session: recordRatEncounterVictory(state.session, room.id), everDefeatedRoomIds }
  return { ...state, defeatedRoomIds: addOnce(state.defeatedRoomIds, room.id), everDefeatedRoomIds }
}

// ---------- Interacciones ----------
export interface AltarUse { state: V04BExpedition; recharged: boolean; reason: string }

/** Altar in 10: delegates to the M5 rat cycle. */
export function useAltar(state: V04BExpedition): AltarUse {
  requireRoom(state, '10', 'El altar')
  const result = useRatAltar(state.session)
  return { state: result.recharged ? { ...state, session: result.session } : state, recharged: result.recharged, reason: result.reason }
}

/** Inscription in 11: only the clue text. */
export function readInscription(state: V04BExpedition): string {
  requireRoom(state, '11', 'La inscripción')
  return V04B_INSCRIPTION_TEXT
}

export type PedestalOutcome = 'advanced' | 'reset' | 'solved' | 'ignored'
export interface PedestalActivation { state: V04BExpedition; outcome: PedestalOutcome; reason: string }

/** Pedestal in 12. A wrong rune resets the progress without penalty; once solved, further activations do nothing. */
export function activatePedestal(state: V04BExpedition, rune: V04BRune): PedestalActivation {
  requireRoom(state, '12', 'Los pedestales')
  if (!V04B_RUNES.includes(rune)) throw new ExplorationViolation(`Runa desconocida: ${String(rune)}.`)
  if (state.puzzle.solved) return { state, outcome: 'ignored', reason: 'Los pedestales ya están encendidos' }
  if (!v04bRuneIsNext(state.puzzle.progress, rune)) {
    return { state: { ...state, puzzle: { progress: 0, solved: false } }, outcome: 'reset', reason: 'Los pedestales se apagan' }
  }
  const progress = state.puzzle.progress + 1
  const solved = progress === V04B_PUZZLE_LENGTH
  return { state: { ...state, puzzle: { progress, solved } }, outcome: solved ? 'solved' : 'advanced', reason: '' }
}

export interface WallExamination { state: V04BExpedition; revealed: boolean; reason: string }

/** Cracked wall in 14: opens 14-18 permanently; repeating does nothing. */
export function examineWall(state: V04BExpedition): WallExamination {
  requireRoom(state, '14', 'El muro')
  if (state.wallExamined) return { state, revealed: false, reason: 'El muro ya fue examinado' }
  return { state: { ...state, wallExamined: true }, revealed: true, reason: '' }
}

// ---------- Cofres (solo informativo para M7) ----------
export interface ChestAvailability { roomId: V04BRoomId; cardIds: readonly string[]; available: boolean; reason: string }

/** Every planned chest with whether it would be claimable now. Informational: nothing is granted or claimed. */
export function chestAvailability(state: V04BExpedition): ChestAvailability[] {
  return V04B_ROOMS.filter((room) => room.chest).map((room) => {
    const chest = room.chest!
    const ever = state.everDefeatedRoomIds.includes(room.id)
    const [available, reason]: [boolean, string] =
      chest.requirement === 'boss-1' ? [state.everDefeatedRoomIds.includes('02'), 'Vence a El Centinela']
        : chest.requirement === 'boss-2' ? [state.everDefeatedRoomIds.includes('06'), 'Vence a El Prior']
          : chest.requirement === 'puzzle' ? [state.puzzle.solved, 'Resuelve el puzle de las runas']
            : chest.requirement === 'arrival' ? [state.visitedRoomIds.includes(room.id), 'Llega a la sala']
              : [ever, 'Vence el encuentro de la sala']
    return { roomId: room.id, cardIds: chest.cardIds, available, reason: available ? '' : reason }
  })
}

export function availableChests(state: V04BExpedition): ChestAvailability[] {
  return chestAvailability(state).filter((chest) => chest.available)
}
