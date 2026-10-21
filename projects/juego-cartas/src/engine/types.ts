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
}

export interface Creature {
  id: string
  card: CreatureCard
  owner: PlayerId
  health: number
  summonedTurn: number
}

export interface Invoker {
  level: number
  life: number
  mana: number
  hand: CreatureCard[]
  deck: CreatureCard[]
  creatures: Creature[]
}

export interface DuelState {
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
}
