import type { DuelState } from '../engine/types.js'
import { combatDragKind } from './blockDrag.js'

/** UI-2: own pointer gestures replace native HTML5 drag-and-drop in combat. Pure logic only. */
export const GESTURE_THRESHOLD = 6
export type GestureKind = 'block' | 'directed' | 'declare' | 'hand'
export interface GesturePoint { x: number; y: number }
export interface GestureRect { left: number; top: number; width: number; height: number }
export interface GestureFrame { duelId: string; turn: number; phase: string; activePlayer: string }
export interface Gesture {
  kind: GestureKind; sourceId: string; pointerId: number
  origin: GesturePoint; point: GesturePoint; dragging: boolean; frame: GestureFrame
}
export type GestureRegion = 'rival' | 'own' | 'outside'
export interface GestureCandidate { id: string; center: GesturePoint }
export type GestureDrop =
  | { type: 'click' }
  | { type: 'none' }
  | { type: 'assign'; targetId: string }
  | { type: 'declare' }
  | { type: 'withdraw' }
  | { type: 'summon' }

export function gestureFrame(duel: Pick<DuelState, 'id' | 'turn' | 'phase' | 'activePlayer'>): GestureFrame {
  return { duelId: duel.id, turn: duel.turn, phase: duel.phase, activePlayer: duel.activePlayer }
}

/** Which gesture a pressed card may start; null means the card is not a grip in this state. */
export function gestureKindFor(duel: DuelState, options: { source: 'creature' | 'hand'; presenting?: boolean; interactionPending?: boolean }): GestureKind | null {
  if (options.presenting || duel.winner) return null
  if (options.source === 'hand') return duel.phase === 'main' && duel.activePlayer === 'player' && !options.interactionPending ? 'hand' : null
  return combatDragKind(duel)
}

export function startGesture(kind: GestureKind, sourceId: string, pointerId: number, point: GesturePoint, frame: GestureFrame): Gesture {
  return { kind, sourceId, pointerId, origin: point, point, dragging: false, frame }
}

/** Other pointers are ignored; once the threshold is crossed the gesture stays a drag. */
export function moveGesture(gesture: Gesture, pointerId: number, point: GesturePoint, threshold = GESTURE_THRESHOLD): Gesture {
  if (pointerId !== gesture.pointerId || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return gesture
  const dragging = gesture.dragging || Math.hypot(point.x - gesture.origin.x, point.y - gesture.origin.y) >= threshold
  return { ...gesture, point, dragging }
}

/** Above the combat axis is the rival half; outside the board rectangle is "outside". */
export function regionAt(point: GesturePoint, board: GestureRect, axisY: number): GestureRegion {
  if (point.x < board.left || point.x > board.left + board.width || point.y < board.top || point.y > board.top + board.height) return 'outside'
  return point.y < axisY ? 'rival' : 'own'
}

export function nearestCandidate(point: GesturePoint, candidates: readonly GestureCandidate[]): string | null {
  let best: string | null = null, distance = Infinity
  for (const candidate of candidates) {
    const next = Math.hypot(candidate.center.x - point.x, candidate.center.y - point.y)
    if (next < distance) { best = candidate.id; distance = next }
  }
  return best
}

/** Destination previewed while dragging (highlight and guide line). */
export function gestureTarget(gesture: Gesture, region: GestureRegion, candidates: readonly GestureCandidate[]): string | null {
  if (!gesture.dragging || region !== 'rival' || (gesture.kind !== 'block' && gesture.kind !== 'directed')) return null
  return nearestCandidate(gesture.point, candidates)
}

export function resolveGesture(gesture: Gesture, region: GestureRegion, candidates: readonly GestureCandidate[]): GestureDrop {
  if (!gesture.dragging) return { type: 'click' }
  if (gesture.kind === 'hand') return region === 'own' ? { type: 'summon' } : { type: 'none' }
  if (region !== 'rival') return { type: 'withdraw' }
  if (gesture.kind === 'declare') return { type: 'declare' }
  const targetId = nearestCandidate(gesture.point, candidates)
  return targetId ? { type: 'assign', targetId } : { type: 'none' }
}

/** Events that must end any gesture without applying it. */
export function isGestureCancel(event: { type: string; key?: string }): boolean {
  return event.type === 'blur' || event.type === 'pointercancel' || event.type === 'lostpointercapture' || (event.type === 'keydown' && event.key === 'Escape')
}

/** A phase, turn or duel change invalidates the gesture. */
export function gestureFrameChanged(gesture: Gesture, frame: GestureFrame): boolean {
  return gesture.frame.duelId !== frame.duelId || gesture.frame.turn !== frame.turn || gesture.frame.phase !== frame.phase || gesture.frame.activePlayer !== frame.activePlayer
}
