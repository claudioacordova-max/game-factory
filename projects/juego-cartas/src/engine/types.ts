export type PlayerId = 'player' | 'opponent'

export type TurnPhase = 'main' | 'attackers' | 'blockers' | 'resolve' | 'resolved' | 'finished'

export interface SummonCost {
  mana: number
  sacrifices: number
}

export interface CreatureCard {
  id: string
  name: string
  attack: number
  maxHealth: number
  cost: SummonCost
  /** Temporary duel reference to an owned copy; absent from opponent cards. */
  copyId?: string
  startingHealth?: number
}

export interface Creature {
  id: string
  /** Persistent identity of the owned copy represented by this duel creature. */
  copyId?: string
  card: CreatureCard
  owner: PlayerId
  health: number
  summonedTurn: number
}

export interface Invoker {
  level: number
  /** Persistent session fatigue applied only to the player invoker. */
  fatigue: number
  life: number
  mana: number
  hand: CreatureCard[]
  deck: CreatureCard[]
  creatures: Creature[]
}

export interface DuelState {
  /** Unique identity used to make session outcome settlement idempotent. */
  id: string
  players: Record<PlayerId, Invoker>
  activePlayer: PlayerId
  turn: number
  phase: TurnPhase
  attackers: string[]
  /** Blockers are kept in the defender-chosen damage assignment order. */
  blockers: Record<string, string[]>
  winner: PlayerId | null
  nextCreatureNumber: number
}

export interface DuelSetup {
  playerDeck: CreatureCard[]
  opponentDeck: CreatureCard[]
  firstPlayer?: PlayerId
  playerFatigue?: number
}
