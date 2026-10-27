import { RuleViolation } from '../engine/rules.js'
import type { DuelState } from '../engine/types.js'
import { assignPlayerBlocker } from './blockAssignments.js'
import type { BlockAssignments } from './blockAssignments.js'

export const BLOCK_DRAG_MIME = 'application/x-game-factory-blocker+json'
export interface BlockDragContext { origin: string; duelId: string; turn: number; revision: number; selectionRevision: number }
interface BlockDragPayload extends BlockDragContext { kind: 'blocker'; blockerId: string }

function validText(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 128 }
function validRevision(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 }
function requireDefense(state: DuelState) {
  if (state.phase !== 'blockers' || state.activePlayer !== 'opponent' || state.winner !== null) throw new RuleViolation('El arrastre de bloqueadores solo está disponible durante la defensa.')
}

export function createBlockDrag(state: DuelState, context: BlockDragContext, blockerId: string): string {
  requireDefense(state)
  if (!validText(context.origin) || context.duelId !== state.id || context.turn !== state.turn || !validRevision(context.revision) || !validRevision(context.selectionRevision)) throw new RuleViolation('El contexto del arrastre ya no está disponible.')
  if (!state.players.player.creatures.some((unit) => unit.id === blockerId && unit.owner === 'player' && unit.health > 0)) throw new RuleViolation('Solo puedes arrastrar criaturas propias en juego para bloquear.')
  return JSON.stringify({ kind: 'blocker', ...context, blockerId } satisfies BlockDragPayload)
}

/** Rejects stale, cross-tab and unrelated drags before changing any assignment. */
export function applyBlockDrop(state: DuelState, current: BlockAssignments, context: BlockDragContext, raw: string, attackerId: string): BlockAssignments {
  requireDefense(state)
  let payload: unknown
  try { payload = raw.length <= 2048 ? JSON.parse(raw) : null } catch { payload = null }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new RuleViolation('Ese arrastre no contiene un bloqueador válido.')
  const entry = payload as Partial<BlockDragPayload>
  const keys = Object.keys(entry).sort().join(',')
  if (keys !== 'blockerId,duelId,kind,origin,revision,selectionRevision,turn' || entry.kind !== 'blocker' || !validText(entry.blockerId) || !validText(entry.duelId) || !validText(entry.origin) || !validRevision(entry.revision) || !validRevision(entry.selectionRevision) || !validRevision(entry.turn)) throw new RuleViolation('Ese arrastre no contiene un bloqueador válido.')
  if (entry.origin !== context.origin || entry.duelId !== state.id || entry.duelId !== context.duelId || entry.turn !== state.turn || entry.turn !== context.turn || entry.revision !== context.revision || entry.selectionRevision !== context.selectionRevision) throw new RuleViolation('El arrastre pertenece a otro tablero o a una decisión anterior. Vuelve a arrastrar la criatura.')
  return assignPlayerBlocker(state, current, entry.blockerId, attackerId)
}
