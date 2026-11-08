import type { DuelState } from '../engine/types.js'

export interface EncounterSummary {
  title: string
  outcome: string
  resources: string
  details: string[]
  won: boolean
}

/** Directed combat needs one live target per selected attacker; empty attacks remain a legal pass. */
export function attacksReady(duel: DuelState, attackerIds: readonly string[], targets: Readonly<Record<string, string>>): boolean {
  return duel.mode !== 'skirmish' || attackerIds.every((id) => duel.players.opponent.creatures.some((unit) => unit.id === targets[id]))
}
