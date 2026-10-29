import { declareAttackers, RuleViolation } from '../engine/rules.js'
import type { DuelState } from '../engine/types.js'

export interface AttackSelection {
  attackerIds: string[]
  targetChoices: Record<string, string>
  focusedAttackerId: string | null
}

export function togglePlayerAttacker(current: AttackSelection, creatureId: string): AttackSelection {
  if (current.attackerIds.includes(creatureId)) {
    const attackerIds = current.attackerIds.filter((id) => id !== creatureId)
    const targetChoices = { ...current.targetChoices }
    delete targetChoices[creatureId]
    return {
      attackerIds,
      targetChoices,
      focusedAttackerId: current.focusedAttackerId === creatureId
        ? attackerIds[attackerIds.length - 1] ?? null
        : current.focusedAttackerId,
    }
  }
  return {
    ...current,
    attackerIds: [...current.attackerIds, creatureId],
    focusedAttackerId: creatureId,
  }
}

export function setAttackerTarget(current: AttackSelection, attackerId: string, targetId: string): AttackSelection {
  if (!current.attackerIds.includes(attackerId)) return current
  return {
    ...current,
    targetChoices: { ...current.targetChoices, [attackerId]: targetId },
    focusedAttackerId: attackerId,
  }
}

export function assignTargetToFocusedAttacker(current: AttackSelection, targetId: string): AttackSelection {
  if (!current.focusedAttackerId || !current.attackerIds.includes(current.focusedAttackerId)) return current
  return setAttackerTarget(current, current.focusedAttackerId, targetId)
}

export type BlockerChoices = Record<string, string[]>

export function toggleBlockerChoice(current: BlockerChoices, attackerId: string, blockerId: string): BlockerChoices {
  if (Object.entries(current).some(([id, ids]) => id !== attackerId && ids.includes(blockerId))) return current
  const existing = current[attackerId] ?? []
  const blockerIds = existing.includes(blockerId)
    ? existing.filter((id) => id !== blockerId)
    : [...existing, blockerId]
  return { ...current, [attackerId]: blockerIds }
}

export interface PendingSummonSelection {
  cardId: string | null
  sacrificeIds: string[]
}

export function cancelPendingSummon(): PendingSummonSelection {
  return { cardId: null, sacrificeIds: [] }
}

/** Atomic assignment: selected directed attackers always have an explicit valid target. */
export function assignDirectedAttacker(state: DuelState, current: AttackSelection, creatureId: string, targetId: string | null): AttackSelection {
  if (state.mode !== 'skirmish' || state.activePlayer !== 'player' || state.phase !== 'attackers' || state.winner) throw new RuleViolation('Solo puedes vincular ataques durante la escaramuza.')
  if (!state.players.player.creatures.some((unit) => unit.id === creatureId && unit.health > 0)) throw new RuleViolation('El atacante debe ser una criatura propia en juego.')
  declareAttackers(state, current.attackerIds, current.targetChoices)
  if (targetId !== null && !state.players.opponent.creatures.some((unit) => unit.id === targetId && unit.health > 0)) throw new RuleViolation('Elige una criatura enemiga en juego.')
  if (targetId === current.targetChoices[creatureId] || (targetId === null && !current.attackerIds.includes(creatureId))) return current
  const targetChoices = { ...current.targetChoices }
  if (targetId === null) delete targetChoices[creatureId]
  else targetChoices[creatureId] = targetId
  // A new/reassigned creature joins the end of its target's priority. Other groups keep theirs.
  const attackerIds = current.attackerIds.filter((id) => id !== creatureId)
  if (targetId !== null) attackerIds.push(creatureId)
  declareAttackers(state, attackerIds, targetChoices)
  return { attackerIds, targetChoices, focusedAttackerId: null }
}

/** Priority is local to one target; assignment itself remains exclusively a drag gesture. */
export function moveDirectedAttacker(state: DuelState, current: AttackSelection, creatureId: string, direction: -1 | 1): AttackSelection {
  if (state.mode !== 'skirmish' || state.activePlayer !== 'player' || state.phase !== 'attackers' || state.winner) throw new RuleViolation('Solo puedes ordenar ataques durante la escaramuza.')
  declareAttackers(state, current.attackerIds, current.targetChoices)
  if (direction !== -1 && direction !== 1) throw new RuleViolation('La prioridad solo puede subir o bajar una posición.')
  const targetId = current.targetChoices[creatureId]
  const group = current.attackerIds.filter((id) => targetId && current.targetChoices[id] === targetId)
  const index = group.indexOf(creatureId)
  if (index < 0) throw new RuleViolation('La criatura no tiene un ataque asignado que ordenar.')
  const otherId = group[index + direction]
  if (!otherId) return current
  const attackerIds = [...current.attackerIds]
  const ownIndex = attackerIds.indexOf(creatureId), otherIndex = attackerIds.indexOf(otherId)
  ;[attackerIds[ownIndex], attackerIds[otherIndex]] = [attackerIds[otherIndex], attackerIds[ownIndex]]
  return { ...current, attackerIds }
}
