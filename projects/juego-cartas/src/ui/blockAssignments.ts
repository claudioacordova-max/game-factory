import { declareBlockers, RuleViolation } from '../engine/rules.js'
import type { DuelState } from '../engine/types.js'

export type BlockAssignments = Record<string, string[]>

function requireEnemyAttacker(state: DuelState, attackerId: string): void {
  if (!state.attackers.includes(attackerId)
    || !state.players.opponent.creatures.some((unit) => unit.id === attackerId && unit.owner === 'opponent' && unit.health > 0)) {
    throw new RuleViolation('Solo puedes bloquear a una criatura enemiga atacante en juego.')
  }
}

function requirePlayerBlocker(state: DuelState, blockerId: string): void {
  if (!state.players.player.creatures.some((unit) => unit.id === blockerId && unit.owner === 'player' && unit.health > 0)) {
    throw new RuleViolation('El bloqueador debe ser una criatura propia en juego.')
  }
}

function validateDefense(state: DuelState, assignments: BlockAssignments): void {
  if (state.phase !== 'blockers' || state.activePlayer !== 'opponent' || state.winner !== null) {
    throw new RuleViolation('Solo puedes asignar bloqueadores durante la defensa del ataque enemigo.')
  }
  // Reuse engine validation for duplicate/exclusive assignments without changing state.
  declareBlockers(state, assignments)
  for (const [attackerId, blockerIds] of Object.entries(assignments)) {
    requireEnemyAttacker(state, attackerId)
    for (const blockerId of blockerIds) requirePlayerBlocker(state, blockerId)
  }
}

/** A repeated drop is inert; moving to another attacker appends in damage order. */
export function assignPlayerBlocker(
  state: DuelState, current: BlockAssignments, blockerId: string, attackerId: string,
): BlockAssignments {
  validateDefense(state, current)
  requirePlayerBlocker(state, blockerId)
  requireEnemyAttacker(state, attackerId)
  if (current[attackerId]?.includes(blockerId)) return current
  const next: BlockAssignments = {}
  for (const [targetId, ids] of Object.entries(current)) {
    const remaining = ids.filter((id) => id !== blockerId)
    if (remaining.length) next[targetId] = remaining
  }
  next[attackerId] = [...(next[attackerId] ?? []), blockerId]
  return next
}

/** Removing a block leaves the creature in play; unassigned creatures are unchanged. */
export function removePlayerBlocker(
  state: DuelState, current: BlockAssignments, blockerId: string,
): BlockAssignments {
  validateDefense(state, current)
  requirePlayerBlocker(state, blockerId)
  if (!Object.values(current).some((ids) => ids.includes(blockerId))) return current
  const next: BlockAssignments = {}
  for (const [attackerId, ids] of Object.entries(current)) {
    const remaining = ids.filter((id) => id !== blockerId)
    if (remaining.length) next[attackerId] = remaining
  }
  return next
}

/** Adjusts one blocker's damage position, preserving assignment and all other targets. */
export function movePlayerBlocker(
  state: DuelState, current: BlockAssignments, blockerId: string, direction: -1 | 1,
): BlockAssignments {
  validateDefense(state, current)
  requirePlayerBlocker(state, blockerId)
  if (direction !== -1 && direction !== 1) throw new RuleViolation('El orden de bloqueo solo puede subir o bajar una posición.')
  const entry = Object.entries(current).find(([, ids]) => ids.includes(blockerId))
  if (!entry) throw new RuleViolation('La criatura no tiene un bloqueo asignado que ordenar.')
  const [attackerId, ids] = entry
  const index = ids.indexOf(blockerId)
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= ids.length) return current
  const reordered = [...ids]
  ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
  return { ...current, [attackerId]: reordered }
}
