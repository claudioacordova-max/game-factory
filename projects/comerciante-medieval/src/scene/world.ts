import type { VillageId } from '../engine/model.js'

export interface VillageNpc {
  id: string
  familyId: string
  businessId: string
  villageId: VillageId
  name: string
  role: string
  professionKey: ProfessionKey
  appearance: 'feminine' | 'masculine'
  position: readonly [number, number, number]
  homePosition: readonly [number, number, number]
  businessPosition: readonly [number, number, number]
}

export type ProfessionKey = 'farmer' | 'woodcutter' | 'blacksmith' | 'tailor' | 'miner' | 'carpenter' | 'jeweler'

export const NPC_INTERACTION_DISTANCE = 1.85

export function isBeyondNpcInteractionDistance(
  playerPosition: readonly [number, number, number],
  npc: VillageNpc,
): boolean {
  return Math.hypot(playerPosition[0] - npc.position[0], playerPosition[2] - npc.position[2]) > NPC_INTERACTION_DISTANCE
}

export const VILLAGES: readonly { id: VillageId; name: string; theme: 'fields' | 'mountain' }[] = [
  { id: 'village-a', name: 'Valle de Robles', theme: 'fields' },
  { id: 'village-b', name: 'Piedra Alta', theme: 'mountain' },
]

const NPC_LAYOUT: readonly Omit<VillageNpc, 'villageId'>[] = [
  { id: 'npc-farmer-a', familyId: 'family-farmer-a', businessId: 'farmer-a', name: 'Inés', role: 'Agricultora', professionKey: 'farmer', appearance: 'feminine', position: [-5, 0, -4], homePosition: [-5.8, 0, -5.4], businessPosition: [-4.2, 0, -5.4] },
  { id: 'npc-woodcutter-a', familyId: 'family-woodcutter-a', businessId: 'woodcutter-a', name: 'Martín', role: 'Leñador', professionKey: 'woodcutter', appearance: 'masculine', position: [5, 0, -4], homePosition: [4.2, 0, -5.4], businessPosition: [5.8, 0, -5.4] },
  { id: 'npc-blacksmith-a', familyId: 'family-blacksmith-a', businessId: 'blacksmith-a', name: 'Alda', role: 'Herrera', professionKey: 'blacksmith', appearance: 'feminine', position: [-5, 0, 4], homePosition: [-5.8, 0, 5.4], businessPosition: [-4.2, 0, 5.4] },
  { id: 'npc-tailor-a', familyId: 'family-tailor-a', businessId: 'tailor-a', name: 'Tomás', role: 'Sastre', professionKey: 'tailor', appearance: 'masculine', position: [5, 0, 4], homePosition: [4.2, 0, 5.4], businessPosition: [5.8, 0, 5.4] },
  { id: 'npc-farmer-b', familyId: 'family-farmer-b', businessId: 'farmer-b', name: 'Mateo', role: 'Agricultor', professionKey: 'farmer', appearance: 'masculine', position: [-5, 0, -4], homePosition: [-5.8, 0, -5.4], businessPosition: [-4.2, 0, -5.4] },
  { id: 'npc-miner-b', familyId: 'family-miner-b', businessId: 'miner-b', name: 'Bruna', role: 'Minera', professionKey: 'miner', appearance: 'feminine', position: [5, 0, -4], homePosition: [4.2, 0, -5.4], businessPosition: [5.8, 0, -5.4] },
  { id: 'npc-carpenter-b', familyId: 'family-carpenter-b', businessId: 'carpenter-b', name: 'Nerea', role: 'Carpintera', professionKey: 'carpenter', appearance: 'feminine', position: [-5, 0, 4], homePosition: [-5.8, 0, 5.4], businessPosition: [-4.2, 0, 5.4] },
  { id: 'npc-jeweler-b', familyId: 'family-jeweler-b', businessId: 'jeweler-b', name: 'Darío', role: 'Joyero', professionKey: 'jeweler', appearance: 'masculine', position: [5, 0, 4], homePosition: [4.2, 0, 5.4], businessPosition: [5.8, 0, 5.4] },
]

export const VILLAGE_NPCS: readonly VillageNpc[] = NPC_LAYOUT.map((npc, index) => ({
  ...npc,
  villageId: index < 4 ? 'village-a' : 'village-b',
}))

export function npcsForVillage(villageId: VillageId): readonly VillageNpc[] {
  return VILLAGE_NPCS.filter(npc => npc.villageId === villageId)
}

export function npcForId(id: string): VillageNpc | undefined {
  return VILLAGE_NPCS.find(npc => npc.id === id)
}
