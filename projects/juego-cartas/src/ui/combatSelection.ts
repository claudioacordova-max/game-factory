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
