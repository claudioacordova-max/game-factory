import { NPC_INTERACTION_DISTANCE, type VillageNpc } from './world.js'
import type { VillageId } from '../engine/model.js'
import { caravanLocation } from '../engine/autonomous.js'

export const VILLAGE_EXIT_POSITION: readonly [number, number, number] = [0, 0, -8.9]
export const VILLAGE_EXIT_INTERACTION_DISTANCE = 2.25

export type ContextInteractionTarget =
  | { kind: 'npc'; npc: VillageNpc }
  | { kind: 'exit' }

export function closestContextInteraction(
  playerPosition: readonly [number, number, number],
  npcs: readonly VillageNpc[],
): ContextInteractionTarget | undefined {
  const exitDistance = Math.hypot(
    playerPosition[0] - VILLAGE_EXIT_POSITION[0],
    playerPosition[2] - VILLAGE_EXIT_POSITION[2],
  )
  const exitAvailable = exitDistance <= VILLAGE_EXIT_INTERACTION_DISTANCE

  let closestNpc: VillageNpc | undefined
  let closestNpcDistance = NPC_INTERACTION_DISTANCE
  for (const npc of npcs) {
    const distance = Math.hypot(playerPosition[0] - npc.position[0], playerPosition[2] - npc.position[2])
    if (distance <= closestNpcDistance) {
      closestNpc = npc
      closestNpcDistance = distance
    }
  }

  if (exitAvailable && (!closestNpc || exitDistance <= closestNpcDistance)) return { kind: 'exit' }
  if (closestNpc) return { kind: 'npc', npc: closestNpc }
  return undefined
}

export function isCaravanPresentInVillage(villageId: VillageId, day: number): boolean {
  return caravanLocation(day) === villageId
}
