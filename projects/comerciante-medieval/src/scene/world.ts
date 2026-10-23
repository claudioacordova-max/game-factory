import type { VillageId } from '../engine/model.js'

export interface VillageNpc {
  id: string
  familyId: string
  businessId: string
  villageId: VillageId
  name: string
  role: string
  position: readonly [number, number, number]
  homePosition: readonly [number, number, number]
  businessPosition: readonly [number, number, number]
}

export const VILLAGES: readonly { id: VillageId; name: string; theme: 'fields' | 'mountain' }[] = [
  { id: 'village-a', name: 'Pueblo A', theme: 'fields' },
  { id: 'village-b', name: 'Pueblo B', theme: 'mountain' },
]

const NPC_LAYOUT: readonly Omit<VillageNpc, 'villageId'>[] = [
  { id: 'npc-farmer-a', familyId: 'family-farmer-a', businessId: 'farmer-a', name: 'Agricultor A', role: 'Agricultor', position: [-5, 0, -4], homePosition: [-5.8, 0, -5.4], businessPosition: [-4.2, 0, -5.4] },
  { id: 'npc-woodcutter-a', familyId: 'family-woodcutter-a', businessId: 'woodcutter-a', name: 'Leñador A', role: 'Leñador', position: [5, 0, -4], homePosition: [4.2, 0, -5.4], businessPosition: [5.8, 0, -5.4] },
  { id: 'npc-blacksmith-a', familyId: 'family-blacksmith-a', businessId: 'blacksmith-a', name: 'Herrero A', role: 'Herrero', position: [-5, 0, 4], homePosition: [-5.8, 0, 5.4], businessPosition: [-4.2, 0, 5.4] },
  { id: 'npc-tailor-a', familyId: 'family-tailor-a', businessId: 'tailor-a', name: 'Sastre A', role: 'Sastre', position: [5, 0, 4], homePosition: [4.2, 0, 5.4], businessPosition: [5.8, 0, 5.4] },
  { id: 'npc-farmer-b', familyId: 'family-farmer-b', businessId: 'farmer-b', name: 'Agricultor B', role: 'Agricultor', position: [-5, 0, -4], homePosition: [-5.8, 0, -5.4], businessPosition: [-4.2, 0, -5.4] },
  { id: 'npc-miner-b', familyId: 'family-miner-b', businessId: 'miner-b', name: 'Minero B', role: 'Minero', position: [5, 0, -4], homePosition: [4.2, 0, -5.4], businessPosition: [5.8, 0, -5.4] },
  { id: 'npc-carpenter-b', familyId: 'family-carpenter-b', businessId: 'carpenter-b', name: 'Carpintero B', role: 'Carpintero', position: [-5, 0, 4], homePosition: [-5.8, 0, 5.4], businessPosition: [-4.2, 0, 5.4] },
  { id: 'npc-jeweler-b', familyId: 'family-jeweler-b', businessId: 'jeweler-b', name: 'Joyero B', role: 'Joyero', position: [5, 0, 4], homePosition: [4.2, 0, 5.4], businessPosition: [5.8, 0, 5.4] },
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
