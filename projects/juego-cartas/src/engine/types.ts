export type PlayerId = 'player' | 'opponent'
export type RandomSource = () => number
export type CollectionProfile = 'legacy' | 'v04b'
export type EntityKind = 'real' | 'token'

export interface PendingAbility {
  id: string
  description: string
  implementation: 'pending-m2' | 'pending-m3' | 'domain-m2' | 'domain-m3'
}

export type TurnPhase = 'main' | 'attackers' | 'blockers' | 'resolve' | 'resolved' | 'finished'

export interface SummonCost {
  mana: number
  sacrifices: number
}

export interface CreatureCard {
  /** Stable type ID, shared by all copies of this definition. */
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
  /** Definitions have no instance ID; every combat representation receives one. */
  instanceId?: string
  entityKind?: EntityKind
  group?: 'aggro' | 'ramp' | 'healing' | 'neutral'
  maxCopies?: 1 | 2
  special?: boolean
  abilities?: readonly PendingAbility[]
}

export interface Creature {
  /** Field identity, distinct from both the persistent copy and the card instance. */
  id: string
  entityKind?: EntityKind
  /** Persistent identity of the owned copy represented by this duel creature. */
  copyId?: string
  card: CreatureCard
  owner: PlayerId
  health: number
  summonedTurn: number
  /** Offensive bonus fixed when declaring attackers; cleared after that resolution. */
  attackBonus?: number
  /** Combat-only charges; healing never restores these. */
  shieldCharges?: number
  /** Combat-only H04 stat bonus, independent of the offensive A04 bonus. */
  ritualBonus?: number
  /** V0.4B «Eco de la cripta» (M8a): rival reinforcement created by an exhausted player deck. Combat-only. */
  echo?: true
}

export interface Invoker {
  kind: 'invoker'
  level: number
  /** Persistent session fatigue applied only to the player invoker. */
  fatigue: number
  life: number
  mana: number
  /** Included in mana; spent first and expires when leaving the current main phase. */
  temporaryMana?: number
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
  collectionProfile: CollectionProfile
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
  /** Captured once on main entry, consumed in stable field order before other actions. */
  mainHealing?: { sourceIds: string[]; index: number }
  /** V0.4B only: echoes created so far in this combat; the next one has size `echoCount + 1`. */
  echoCount?: number
}

export interface DuelSetup {
  collectionProfile?: CollectionProfile
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
