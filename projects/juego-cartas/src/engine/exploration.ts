import { beginSessionDuel, finishSessionDuel, unlockCreatureType, requireOutsideCombat } from './session.js'
import type { GameSession } from './session.js'
import type { CreatureCard, DuelState, RandomSource } from './types.js'

export interface DungeonEncounter {
  id: string
  name: string
  enemyName: string
  discoveryCardId?: string
  zone: string
  mode: 'duel' | 'skirmish'
  opponentLife: number
  opponentDeck: CreatureCard[]
  opponentInitialField: CreatureCard[]
  rewardMaxLife: number | 'restore'
  reducesFatigue: boolean
  repeatable: boolean
  rewardCardIds: string[]
}

/** Session-local dungeon progress. Combat state remains owned by the duel engine. */
export interface ExplorationProgress {
  completedEncounterIds: string[]
  settledDuelIds: string[]
  claimedDiscoveryCardIds: string[]
  ratVisit: { id: number; completedEncounterIds: string[] } | null
  nextRatVisitId: number
  ratChestUnlocked: boolean
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
  return { completedEncounterIds: [], settledDuelIds: [], claimedDiscoveryCardIds: [], ratVisit: null, nextRatVisitId: 1, ratChestUnlocked: false }
}

/** The first unfinished node is the only encounter currently accessible. */
export function currentEncounterId(
  progress: ExplorationProgress,
  encounters: readonly DungeonEncounter[],
): string | null {
  const completed = progress.ratVisit?.completedEncounterIds ?? progress.completedEncounterIds
  return encounters.find((encounter) => encounter.id.startsWith(progress.ratVisit ? 'R' : 'B') && !completed.includes(encounter.id))?.id ?? null
}

export function isDungeonComplete(
  progress: ExplorationProgress,
  encounters: readonly DungeonEncounter[],
): boolean {
  return encounters.filter((encounter) => encounter.id.startsWith('B')).every((encounter) => progress.completedEncounterIds.includes(encounter.id))
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
      completedEncounterIds: encounterId.startsWith('R') ? progress.completedEncounterIds : [...progress.completedEncounterIds, encounterId],
      ratVisit: encounterId.startsWith('R') && progress.ratVisit
        ? { ...progress.ratVisit, completedEncounterIds: [...progress.ratVisit.completedEncounterIds, encounterId] } : progress.ratVisit,
      ratChestUnlocked: progress.ratChestUnlocked || encounterId === 'R4',
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

/** Session, route and rewards are committed together, with no intermediate React updates. */
export interface AdventureState {
  session: GameSession
  progress: ExplorationProgress
}

/** Explicit transition from sector 1; never heals or resets persistent rewards. */
export function enterRatWing(state: AdventureState): AdventureState {
  requireOutsideCombat(state.session)
  if (state.progress.ratVisit) throw new ExplorationViolation('Ya estas en el ala de ratas.')
  return { ...state, progress: { ...state.progress,
    ratVisit: { id: state.progress.nextRatVisitId, completedEncounterIds: [] },
    nextRatVisitId: state.progress.nextRatVisitId + 1,
  } }
}

export function leaveRatWing(state: AdventureState): AdventureState {
  requireOutsideCombat(state.session)
  if (!state.progress.ratVisit) throw new ExplorationViolation('No estas en el ala de ratas.')
  return { ...state, progress: { ...state.progress, ratVisit: null } }
}

export function beginAdventureEncounter(
  state: AdventureState, encounterId: string,
  encounters: readonly DungeonEncounter[], cardTypes: readonly CreatureCard[], random?: RandomSource,
): { state: AdventureState; duel: DuelState; encounter: DungeonEncounter } {
  const encounter = encounters.find((entry) => entry.id === encounterId)
  if (!encounter || !canEnterEncounter(state.progress, encounterId, encounters)) {
    throw new ExplorationViolation('Ese encuentro todavía está bloqueado o ya se completó.')
  }
  const started = beginSessionDuel(state.session, cardTypes, encounter.opponentDeck, {
    mode: encounter.mode, encounterId, opponentLife: encounter.opponentLife, opponentInitialField: encounter.opponentInitialField,
    random,
  })
  return { state: { ...state, session: started.session }, duel: started.duel, encounter }
}

export function settleAdventureEncounter(
  state: AdventureState, duel: DuelState,
  encounters: readonly DungeonEncounter[], cardTypes: readonly CreatureCard[],
): AdventureState {
  if (state.session.settledDuelIds.includes(duel.id)) return state
  if (state.session.activeDuelId !== duel.id || !duel.encounterId
    || state.session.activeEncounterId !== duel.encounterId) {
    throw new ExplorationViolation('El resultado no corresponde al intento activo.')
  }
  const encounter = encounters.find((entry) => entry.id === duel.encounterId)
  if (!encounter || duel.phase !== 'finished' || !duel.winner) {
    throw new ExplorationViolation('El encuentro debe terminar antes de liquidarse.')
  }
  // Validate reward references before computing any new state.
  const rewards = encounter.rewardCardIds.map((id) => {
    const card = cardTypes.find((candidate) => candidate.id === id)
    if (!card) throw new ExplorationViolation(`Premio desconocido: ${id}.`)
    return card
  })
  const progress = duel.winner === 'player'
    ? recordEncounterVictory(state.progress, encounter.id, duel.id, encounters).progress
    : recordEncounterDefeat(state.progress, encounter.id, duel.id, encounters)
  let session = finishSessionDuel(state.session, duel, encounter)
  if (duel.winner === 'player') {
    for (const card of rewards) session = unlockCreatureType(session, card)
  }
  return { ...state, session, progress }
}
