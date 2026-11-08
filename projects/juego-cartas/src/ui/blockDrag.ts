import { RuleViolation } from '../engine/rules.js'
import type { DuelState } from '../engine/types.js'
import { assignPlayerBlocker, removePlayerBlocker } from './blockAssignments.js'
import type { BlockAssignments } from './blockAssignments.js'
import { assignDirectedAttacker, togglePlayerAttacker } from './combatSelection.js'
import type { AttackSelection } from './combatSelection.js'
import type { GestureDrop } from './combatGesture.js'

/**
 * UI-2: the drag token lives in memory (no dataTransfer/JSON payload). It still binds one gesture to the
 * duel, turn, controls revision and relation-selection revision it started in, so stale gestures are rejected.
 */
export type CombatDragKind = 'block' | 'directed' | 'declare'
export interface CombatDragContext { duelId: string; turn: number; revision: number; selectionRevision: number }
export interface CombatDragToken extends Readonly<CombatDragContext> { readonly kind: CombatDragKind; readonly creatureId: string }

const TOKEN_KEYS = 'creatureId,duelId,kind,revision,selectionRevision,turn'
function validText(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 128 }
function validRevision(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 }

/** Relation gestures exist only in defense, directed skirmish attacks and duel attack declaration. */
export function combatDragKind(state: DuelState): CombatDragKind | null {
  if (state.winner) return null
  if (state.phase === 'blockers' && state.activePlayer === 'opponent') return 'block'
  if (state.phase === 'attackers' && state.activePlayer === 'player') return state.mode === 'skirmish' ? 'directed' : 'declare'
  return null
}

function requireKind(state: DuelState): CombatDragKind {
  const kind = combatDragKind(state)
  if (!kind) throw new RuleViolation('No se pueden cambiar vínculos en esta fase.')
  return kind
}

function validContext(state: DuelState, context: CombatDragContext): boolean {
  return validText(context.duelId) && context.duelId === state.id && context.turn === state.turn && validRevision(context.revision) && validRevision(context.selectionRevision)
}

function ownLiving(state: DuelState, id: string): boolean {
  return state.players.player.creatures.some((unit) => unit.id === id && unit.owner === 'player' && unit.health > 0)
}

export function createCombatDrag(state: DuelState, context: CombatDragContext, creatureId: string): CombatDragToken {
  const kind = requireKind(state)
  if (!validContext(state, context)) throw new RuleViolation('El contexto del arrastre ya no está disponible.')
  if (!ownLiving(state, creatureId)) throw new RuleViolation('Arrastra una criatura propia en juego.')
  return Object.freeze({ kind, duelId: context.duelId, turn: context.turn, revision: context.revision, selectionRevision: context.selectionRevision, creatureId })
}

/** One authenticated gesture assigns, moves or withdraws a relation. */
export function readCombatDrag(state: DuelState, context: CombatDragContext, token: unknown): string {
  const kind = requireKind(state)
  if (!token || typeof token !== 'object' || Array.isArray(token)) throw new RuleViolation('Arrastre de criatura inválido.')
  const entry = token as Partial<CombatDragToken>
  if (Object.keys(entry).sort().join(',') !== TOKEN_KEYS || !validText(entry.creatureId) || !validText(entry.duelId) || !validRevision(entry.turn) || !validRevision(entry.revision) || !validRevision(entry.selectionRevision)) throw new RuleViolation('Arrastre de criatura inválido.')
  if (entry.kind !== kind || entry.duelId !== state.id || entry.duelId !== context.duelId || entry.turn !== state.turn || entry.turn !== context.turn || entry.revision !== context.revision || entry.selectionRevision !== context.selectionRevision) throw new RuleViolation('El tablero cambió. Vuelve a arrastrar la criatura.')
  if (!ownLiving(state, entry.creatureId)) throw new RuleViolation('La criatura ya no está en juego.')
  return entry.creatureId
}

export function applyCombatBlockDrop(state: DuelState, current: BlockAssignments, context: CombatDragContext, token: unknown, targetId: string | null): BlockAssignments {
  const id = readCombatDrag(state, context, token)
  return targetId === null ? removePlayerBlocker(state, current, id) : assignPlayerBlocker(state, current, id, targetId)
}

export interface RelationSelection { blocks: BlockAssignments; attack: AttackSelection }

/** Applies a finished gesture with the unchanged domain assignment functions. Unchanged parts keep identity. */
export function applyRelationGesture(state: DuelState, current: RelationSelection, context: CombatDragContext, token: unknown, drop: GestureDrop): RelationSelection {
  if (drop.type !== 'assign' && drop.type !== 'withdraw' && drop.type !== 'declare') return current
  const id = readCombatDrag(state, context, token)
  const kind = (token as CombatDragToken).kind
  const targetId = drop.type === 'assign' ? drop.targetId : null
  if (kind === 'block') {
    if (drop.type === 'declare') return current
    const blocks = applyCombatBlockDrop(state, current.blocks, context, token, targetId)
    return blocks === current.blocks ? current : { ...current, blocks }
  }
  if (kind === 'directed') {
    if (drop.type === 'declare') return current
    const attack = assignDirectedAttacker(state, current.attack, id, targetId)
    return attack === current.attack ? current : { ...current, attack }
  }
  if (drop.type === 'assign') return current
  const declared = current.attack.attackerIds.includes(id)
  if ((drop.type === 'declare') === declared) return current
  return { ...current, attack: togglePlayerAttacker(current.attack, id) }
}
