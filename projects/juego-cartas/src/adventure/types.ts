import type { CreatureCard, DuelState, GameSession } from '../engine/index.js'
import type { ExplorationObject, RoomDefinition, SpatialPose } from '../engine/spatial.js'
import type { EncounterSummary } from '../ui/encounterSummary.js'

/**
 * World binding used by the shared game shell (App). Combat, collection and HUD wiring stay in one place;
 * each expedition only provides its state, rooms, objects, interaction and settlement. No second engine.
 */
/** Cards obtained from a one-time chest (V0.4B), shown in the reward overlay. */
export interface ChestReward { source: string; cards: { copyId: string; card: CreatureCard }[] }

export interface AdventureAdapter<S> {
  id: 'legacy' | 'v04b'
  create(): S
  session(state: S): GameSession
  withSession(state: S, session: GameSession): S
  /** Catalogue for the collection overlay; undefined keeps the legacy default. */
  collectionCardTypes?: readonly CreatureCard[]
  reinvokeCardTypes: readonly CreatureCard[]
  /** Placeholder combat state before the first encounter (never active). */
  initialDuel(state: S): DuelState
  /** Key for remembered poses; equals the current room definition id. */
  roomKey(state: S): string
  room(state: S): RoomDefinition
  objects(state: S): ExplorationObject[]
  interact(state: S, objectId: string, pose: SpatialPose): { state: S; duel?: DuelState; message: string; pose?: { key: string; pose: SpatialPose }; reward?: ChestReward }
  settle(state: S, duel: DuelState, sacrificedCopyIds: readonly string[]): { state: S; summary: EncounterSummary; returnPose?: { key: string; pose: SpatialPose } }
  encounter(duel: DuelState): { name: string; maxLife: number }
  location(state: S): { roomName: string; zoneName?: string; complete: boolean }
}
