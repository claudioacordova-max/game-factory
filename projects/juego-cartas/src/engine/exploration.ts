export interface DungeonEncounter {
  id: string
  name: string
  enemyName: string
  discoveryCardId?: string
}

/** Session-local dungeon progress. Combat state remains owned by the duel engine. */
export interface ExplorationProgress {
  completedEncounterIds: string[]
  settledDuelIds: string[]
  claimedDiscoveryCardIds: string[]
}

export interface EncounterVictory {
  progress: ExplorationProgress
  discoveredCardId?: string
}

export class ExplorationViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ExplorationViolation'
  }
}

export function createExplorationProgress(): ExplorationProgress {
  return { completedEncounterIds: [], settledDuelIds: [], claimedDiscoveryCardIds: [] }
}

/** The first unfinished node is the only encounter currently accessible. */
export function currentEncounterId(
  progress: ExplorationProgress,
  encounters: readonly DungeonEncounter[],
): string | null {
  return encounters.find((encounter) => !progress.completedEncounterIds.includes(encounter.id))?.id ?? null
}

export function isDungeonComplete(
  progress: ExplorationProgress,
  encounters: readonly DungeonEncounter[],
): boolean {
  return currentEncounterId(progress, encounters) === null
}

export function canEnterEncounter(
  progress: ExplorationProgress,
  encounterId: string,
  encounters: readonly DungeonEncounter[],
): boolean {
  return currentEncounterId(progress, encounters) === encounterId
}

/** Commits one victory and its one-time discovery, ignoring duplicate settlement of that duel. */
export function recordEncounterVictory(
  progress: ExplorationProgress,
  encounterId: string,
  duelId: string,
  encounters: readonly DungeonEncounter[],
): EncounterVictory {
  if (progress.settledDuelIds.includes(duelId)) return { progress }

  const encounter = encounters.find((candidate) => candidate.id === encounterId)
  if (!encounter || !canEnterEncounter(progress, encounterId, encounters)) {
    throw new ExplorationViolation('Solo puedes completar el encuentro disponible en la mazmorra.')
  }

  const discoveredCardId = encounter.discoveryCardId
    && !progress.claimedDiscoveryCardIds.includes(encounter.discoveryCardId)
    ? encounter.discoveryCardId
    : undefined

  return {
    progress: {
      ...progress,
      completedEncounterIds: [...progress.completedEncounterIds, encounterId],
      settledDuelIds: [...progress.settledDuelIds, duelId],
      claimedDiscoveryCardIds: discoveredCardId
        ? [...progress.claimedDiscoveryCardIds, discoveredCardId]
        : progress.claimedDiscoveryCardIds,
    },
    discoveredCardId,
  }
}

/** Records a loss once without completing or advancing the current encounter. */
export function recordEncounterDefeat(
  progress: ExplorationProgress,
  encounterId: string,
  duelId: string,
  encounters: readonly DungeonEncounter[],
): ExplorationProgress {
  if (progress.settledDuelIds.includes(duelId)) return progress
  if (!encounters.some((candidate) => candidate.id === encounterId)
    || !canEnterEncounter(progress, encounterId, encounters)) {
    throw new ExplorationViolation('Solo puedes cerrar el encuentro disponible en la mazmorra.')
  }
  return { ...progress, settledDuelIds: [...progress.settledDuelIds, duelId] }
}
