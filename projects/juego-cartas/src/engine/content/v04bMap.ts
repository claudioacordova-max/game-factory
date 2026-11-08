/**
 * Isolated V0.4B map data (M6a): 19 rooms, official names/zones, exact graph, return exits and planned chests.
 * Pure data. Chests are informational for M7 (nothing here grants cards).
 */
export type V04BRoomId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19'
export type V04BZone = 'El Umbral' | 'Las Catacumbas' | 'Las Madrigueras' | 'Las Cámaras Rúnicas' | 'La Cripta Profunda'

export interface V04BChestData {
  cardIds: readonly string[]
  /** What makes the chest claimable (informational; evaluated by v04bWorld). */
  requirement: 'boss-1' | 'boss-2' | 'skirmish' | 'duel' | 'puzzle' | 'arrival'
}

export interface V04BRoomData {
  id: V04BRoomId
  name: string
  zone: V04BZone
  /** M4 encounter id (same as the room id) when the room has one. */
  encounterId?: V04BRoomId
  /**
   * Exits that stay open while the room's encounter is undefeated ("regreso"). Every other exit of an
   * encounter room is "forward" and blocked until victory. The connection through which the player entered also
   * counts as return when it is bidirectional (runtime rule in v04bWorld). Empty for rooms without encounter.
   */
  returnTo: readonly V04BRoomId[]
  chest?: V04BChestData
}

export const V04B_ROOMS: readonly V04BRoomData[] = [
  { id: '01', name: 'Atrio de la Cripta', zone: 'El Umbral', returnTo: [] },
  { id: '02', name: 'Sala del Centinela', zone: 'El Umbral', encounterId: '02', returnTo: ['01'] },
  { id: '03', name: 'Cruce de los Sellos', zone: 'Las Catacumbas', returnTo: [], chest: { cardIds: ['A04', 'R01', 'R02', 'N03'], requirement: 'boss-1' } },
  { id: '04', name: 'Cámara de los Caídos', zone: 'Las Catacumbas', encounterId: '04', returnTo: ['03'], chest: { cardIds: ['A03', 'H03', 'R03', 'H02'], requirement: 'skirmish' } },
  { id: '05', name: 'Galería de los Ecos', zone: 'Las Catacumbas', returnTo: [] },
  { id: '06', name: 'Salón del Osario', zone: 'Las Catacumbas', encounterId: '06', returnTo: ['05'] },
  { id: '07', name: 'Primera Madriguera', zone: 'Las Madrigueras', encounterId: '07', returnTo: ['03'], chest: { cardIds: ['A02', 'N07'], requirement: 'skirmish' } },
  { id: '08', name: 'Nido Profundo', zone: 'Las Madrigueras', encounterId: '08', returnTo: ['07'] },
  { id: '09', name: 'Corte de las Ratas', zone: 'Las Madrigueras', encounterId: '09', returnTo: ['08'], chest: { cardIds: ['A03', 'N03', 'N01', 'N02', 'N06'], requirement: 'duel' } },
  { id: '10', name: 'Altar', zone: 'Las Madrigueras', returnTo: [] },
  { id: '11', name: 'Archivo Rúnico', zone: 'Las Cámaras Rúnicas', returnTo: [] },
  { id: '12', name: 'Núcleo de Maná', zone: 'Las Cámaras Rúnicas', returnTo: [], chest: { cardIds: ['H01', 'N05', 'R02'], requirement: 'puzzle' } },
  { id: '13', name: 'Cámara del Titán', zone: 'Las Cámaras Rúnicas', returnTo: [], chest: { cardIds: ['R04'], requirement: 'arrival' } },
  { id: '14', name: 'Entrada a las Profundidades', zone: 'La Cripta Profunda', returnTo: [], chest: { cardIds: ['H02', 'N04', 'N08', 'N09'], requirement: 'boss-2' } },
  { id: '15', name: 'Antesala del Trono', zone: 'La Cripta Profunda', returnTo: [], chest: { cardIds: ['H03', 'N08', 'N09'], requirement: 'arrival' } },
  { id: '16', name: 'Foso de los Restos', zone: 'La Cripta Profunda', encounterId: '16', returnTo: ['14'], chest: { cardIds: ['N07', 'N01'], requirement: 'skirmish' } },
  { id: '17', name: 'Cámara de las Cadenas', zone: 'La Cripta Profunda', encounterId: '17', returnTo: ['16'], chest: { cardIds: ['N04', 'R03'], requirement: 'skirmish' } },
  { id: '18', name: 'Cámara del Sacrificio', zone: 'La Cripta Profunda', encounterId: '18', returnTo: ['14'], chest: { cardIds: ['H04'], requirement: 'duel' } },
  { id: '19', name: 'Salón del Trono', zone: 'La Cripta Profunda', encounterId: '19', returnTo: ['15'] },
]

/** Two-way connections (each usable in both directions when open). Source: V0.4B graph, alternative B. */
export const V04B_TWO_WAY_EDGES: readonly (readonly [V04BRoomId, V04BRoomId])[] = [
  ['01', '02'], ['02', '03'], ['03', '04'], ['04', '05'], ['05', '06'], ['06', '14'], ['14', '15'], ['15', '19'],
  ['03', '07'], ['07', '08'], ['08', '09'], ['09', '10'],
  ['04', '11'], ['11', '12'], ['12', '05'],
  ['03', '13'],
  ['14', '16'], ['16', '17'], ['17', '15'],
  ['14', '18'],
]

/** One-way connections: 10 to 04 only (04 to 10 does not exist). */
export const V04B_ONE_WAY_EDGES: readonly (readonly [V04BRoomId, V04BRoomId])[] = [['10', '04']]

export function v04bRoom(id: string): V04BRoomData {
  const room = V04B_ROOMS.find((candidate) => candidate.id === id)
  if (!room) throw new Error(`Sala V0.4B desconocida: ${id}`)
  return room
}

/** Directed neighbours of a room, from the graph above. */
export function v04bNeighbours(id: string): V04BRoomId[] {
  return [
    ...V04B_TWO_WAY_EDGES.flatMap(([a, b]) => (a === id ? [b] : b === id ? [a] : [])),
    ...V04B_ONE_WAY_EDGES.filter(([from]) => from === id).map(([, to]) => to),
  ]
}

export function v04bHasEdge(from: string, to: string): boolean {
  return v04bNeighbours(from).includes(to as V04BRoomId)
}

export function v04bEdgeIsTwoWay(a: string, b: string): boolean {
  return v04bHasEdge(a, b) && v04bHasEdge(b, a)
}

// ---------- Puzzle 11/12 ----------
export type V04BRune = 'hueso' | 'sombra' | 'mana'
export const V04B_RUNES: readonly V04BRune[] = ['hueso', 'sombra', 'mana']
/** Clue shown in room 11 (narrative text, adjustable). The order itself is kept private to this module. */
export const V04B_INSCRIPTION_TEXT = 'Primero lo que queda, luego lo que oculta, al final lo que fluye'
const PUZZLE_ORDER: readonly V04BRune[] = ['hueso', 'sombra', 'mana']
export const V04B_PUZZLE_LENGTH = PUZZLE_ORDER.length
/** True when `rune` is the correct next one after `progress` runes were correctly activated. */
export function v04bRuneIsNext(progress: number, rune: V04BRune): boolean {
  return PUZZLE_ORDER[progress] === rune
}
