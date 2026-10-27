export type PlayerId = 'player' | 'opponent'
export type RandomSource = () => number

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
  rarity?: 'common' | 'rare' | 'epic'
  seed?: boolean
  reinvokeCost?: number
  growth?: 'attack' | 'health'
  growthCap?: number
  growthProgress?: number
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
  kind: 'invoker'
  level: number
  /** Persistent session fatigue applied only to the player invoker. */
  fatigue: number
  life: number
  mana: number
  hand: CreatureCard[]
  deck: CreatureCard[]
  creatures: Creature[]
}

export interface CreatureGroup {
  kind: 'group'
  creatures: Creature[]
}
export type CombatSide = Invoker | CreatureGroup

export interface DuelState {
  mode: 'duel' | 'skirmish'
  targets: Record<string, string>
  /** Unique identity used to make session outcome settlement idempotent. */
  id: string
  /** Captured at creation; never infer participation from a later deck selection. */
  participantCopyIds: string[]
  encounterId?: string
  players: { player: Invoker; opponent: CombatSide }
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
  mode?: 'duel' | 'skirmish'
  playerDeck: CreatureCard[]
  opponentDeck: CreatureCard[]
  /** Optional random source for the player's one-time shuffle at duel setup. */
  random?: RandomSource
  firstPlayer?: PlayerId
  playerFatigue?: number
  playerLife?: number
  opponentLife?: number
  opponentInitialField?: CreatureCard[]
  encounterId?: string
}
