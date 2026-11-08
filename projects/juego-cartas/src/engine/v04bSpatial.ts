import { v04bNeighbours, v04bRoom, V04B_ONE_WAY_EDGES, V04B_ROOMS } from './content/v04bMap.js'
import type { V04BRoomId, V04BRune } from './content/v04bMap.js'
import type { Point2, RoomDefinition, SpatialObstacle, SpatialPose } from './spatial.js'

/**
 * V0.4B spatial presentation (M6b): 19 compact rooms compatible with the legacy spatial helpers
 * (isWalkable, movePose, safePose, roomWithObjects). Pure data; availability stays in v04bWorld.
 */
export type WallSide = 'north' | 'south' | 'west' | 'east'

export interface V04BRoomDefinition extends RoomDefinition {
  roomId: V04BRoomId
  /** Exit anchor per neighbour (graph edge leaving this room). */
  exits: Partial<Record<V04BRoomId, { side: WallSide; position: Point2 }>>
  /** Spawn per room the player can arrive from (every incoming edge, including 10 to 04). */
  arrivals: Partial<Record<V04BRoomId, SpatialPose>>
  /** Interactive feature anchors (encounter, altar, inscription, pedestals, cracked wall, chest M7). */
  features: { encounter?: Point2; altar?: Point2; inscription?: Point2; pedestals?: Record<V04BRune, Point2>; crackedWall?: Point2; chest?: Point2 }
}

const ROOM_WIDTH = 14, ROOM_DEPTH = 12
/** Exit anchors on each wall; the north one matches the legacy forward opening in the rear masonry. */
export const WALL_EXITS: Record<WallSide, Point2> = {
  north: { x: 0, z: -5.1 }, south: { x: 0, z: 5.1 }, west: { x: -5.8, z: 1.4 }, east: { x: 5.8, z: 1.4 },
}
/** Arrival in front of the exit leading back, outside its interaction range, facing into the room. */
export const WALL_ARRIVALS: Record<WallSide, SpatialPose> = {
  north: { x: 0, z: -3.3, yaw: 0 }, south: { x: 0, z: 3.3, yaw: Math.PI },
  west: { x: -3.9, z: 1.4, yaw: Math.PI / 2 }, east: { x: 3.9, z: 1.4, yaw: -Math.PI / 2 },
}

const tomb = (x: number, z: number, width = 1.15, depth = 2.1): SpatialObstacle => ({ x, z, width, depth, height: 0.85 })
const pillar = (x: number, z: number): SpatialObstacle => ({ x, z, width: 0.8, depth: 0.8, height: 1.8 })
/** Obstacle sets; index 0-1 are drawn as sarcophagi, later ones as pillars (CryptEnvironment convention). */
const LAYOUTS = {
  legacyEast: [tomb(-2.5, 0), tomb(2.5, -0.4), pillar(5, -4.1)],
  legacyWest: [tomb(-2.5, 0), tomb(2.5, -0.4), pillar(-5, -4.1)],
  crossing: [tomb(-2.6, -1), tomb(2.6, -1), pillar(-5.2, -4.2), pillar(5.2, -4.2)],
  lateral: [tomb(-3.2, -1.2, 2, 1), tomb(3.2, -1.2, 2, 1), pillar(-5.2, 3.8)],
  staggered: [tomb(-2.2, 1.8, 1.1, 2), tomb(2.2, -1.8, 1.1, 2), pillar(5.2, -4.2)],
  archive: [tomb(-3.2, 0.6, 2, 1), tomb(3.2, -1.2, 2, 1), pillar(5.2, 3.8)],
} satisfies Record<string, SpatialObstacle[]>
type Layout = keyof typeof LAYOUTS

interface RoomPlan {
  sides: Partial<Record<V04BRoomId, WallSide>>
  layout: Layout
  features?: V04BRoomDefinition['features']
}

const ENEMY = { x: 0, z: -2.4 }
/** Chest anchor (M7): front-east corner, clear of every exit, arrival, layout obstacle and feature. */
export const V04B_CHEST_ANCHOR: Point2 = { x: 4.4, z: 4.2 }
/** Wall assignment per edge: the side of an exit is also where the player appears when arriving from it. */
const PLANS: Record<V04BRoomId, RoomPlan> = {
  '01': { sides: { '02': 'north' }, layout: 'legacyEast' },
  '02': { sides: { '01': 'south', '03': 'north' }, layout: 'legacyWest', features: { encounter: ENEMY } },
  '03': { sides: { '02': 'south', '04': 'north', '07': 'east', '13': 'west' }, layout: 'crossing' },
  '04': { sides: { '03': 'south', '05': 'north', '11': 'west', '10': 'east' }, layout: 'legacyWest', features: { encounter: ENEMY } },
  '05': { sides: { '04': 'south', '06': 'north', '12': 'west' }, layout: 'legacyEast' },
  '06': { sides: { '05': 'south', '14': 'north' }, layout: 'staggered', features: { encounter: { x: 0, z: -2.6 } } },
  '07': { sides: { '03': 'west', '08': 'north' }, layout: 'legacyEast', features: { encounter: ENEMY } },
  '08': { sides: { '07': 'south', '09': 'north' }, layout: 'lateral', features: { encounter: ENEMY } },
  '09': { sides: { '08': 'south', '10': 'north' }, layout: 'legacyWest', features: { encounter: ENEMY } },
  '10': { sides: { '09': 'south', '04': 'west' }, layout: 'lateral', features: { altar: { x: 0, z: -2.8 } } },
  '11': { sides: { '04': 'east', '12': 'north' }, layout: 'archive', features: { inscription: { x: -3.4, z: -4.2 } } },
  '12': { sides: { '11': 'south', '05': 'east' }, layout: 'legacyWest',
    features: { pedestals: { hueso: { x: -2.2, z: -3 }, sombra: { x: 0, z: -3.4 }, mana: { x: 2.2, z: -3 } } } },
  '13': { sides: { '03': 'east' }, layout: 'legacyWest' },
  '14': { sides: { '06': 'south', '15': 'north', '16': 'east', '18': 'west' }, layout: 'crossing', features: { crackedWall: { x: -6.4, z: WALL_EXITS.west.z } } },
  '15': { sides: { '14': 'south', '19': 'north', '17': 'east' }, layout: 'lateral' },
  '16': { sides: { '14': 'west', '17': 'north' }, layout: 'staggered', features: { encounter: { x: 0, z: -2.6 } } },
  '17': { sides: { '16': 'south', '15': 'west' }, layout: 'legacyEast', features: { encounter: ENEMY } },
  '18': { sides: { '14': 'east' }, layout: 'lateral', features: { encounter: ENEMY } },
  '19': { sides: { '15': 'south' }, layout: 'legacyEast', features: { encounter: ENEMY } },
}

/** Rooms that can be entered from a neighbour: every two-way neighbour plus one-way sources (10 to 04). */
function incomingFrom(roomId: V04BRoomId): V04BRoomId[] {
  return [...new Set([...v04bNeighbours(roomId).filter((other) => v04bNeighbours(other).includes(roomId)),
    ...V04B_ONE_WAY_EDGES.filter(([, to]) => to === roomId).map(([from]) => from)])]
}

function focusOf(plan: RoomPlan, exits: V04BRoomDefinition['exits']): Point2 {
  const f = plan.features
  return { ...(f?.encounter ?? f?.altar ?? f?.inscription ?? f?.pedestals?.sombra ?? f?.crackedWall ?? exits[Object.keys(exits)[0] as V04BRoomId]!.position) }
}

function defineV04BRoom(roomId: V04BRoomId): V04BRoomDefinition {
  const plan = PLANS[roomId]
  const data = v04bRoom(roomId)
  const features: V04BRoomDefinition['features'] = { ...plan.features, ...(data.chest ? { chest: { ...V04B_CHEST_ANCHOR } } : {}) }
  const exits: V04BRoomDefinition['exits'] = {}
  for (const to of v04bNeighbours(roomId)) {
    const side = plan.sides[to]
    if (!side) throw new Error(`Sala ${roomId}: falta muro para la salida a ${to}`)
    exits[to] = { side, position: { ...WALL_EXITS[side] } }
  }
  const arrivals: V04BRoomDefinition['arrivals'] = {}
  const sources = incomingFrom(roomId)
  for (const from of sources) {
    const side = plan.sides[from]
    if (!side) throw new Error(`Sala ${roomId}: falta muro para la llegada desde ${from}`)
    arrivals[from] = { ...WALL_ARRIVALS[side] }
  }
  const focus = focusOf(plan, exits)
  const exitAt = (side: WallSide) => Object.values(exits).find((exit) => exit?.side === side)?.position ?? focus
  return {
    id: `v04b-${roomId}`, roomId, name: data.name, width: ROOM_WIDTH, depth: ROOM_DEPTH,
    obstacles: LAYOUTS[plan.layout].map((obstacle) => ({ ...obstacle })),
    // Room 01 starts at the legacy spawn; other rooms default to the arrival from their first neighbour in graph order.
    spawn: roomId === '01' ? { x: 0, z: 3.3, yaw: Math.PI } : { ...arrivals[sources[0]]! },
    // Legacy-compatible anchors: `enemy` is the room focus (floor art); the others mirror exits or the focus.
    anchors: { enemy: focus, chest: focus, shrine: focus, forward: exitAt('north'), back: exitAt('south'), wing: exitAt('west') },
    exits, arrivals, features,
  }
}

export const V04B_SPATIAL_ROOMS: Record<V04BRoomId, V04BRoomDefinition> = Object.fromEntries(
  V04B_ROOMS.map((room) => [room.id, defineV04BRoom(room.id)]),
) as Record<V04BRoomId, V04BRoomDefinition>

export function v04bSpatialRoom(roomId: string): V04BRoomDefinition {
  const room = V04B_SPATIAL_ROOMS[roomId as V04BRoomId]
  if (!room) throw new Error(`Sala V0.4B desconocida: ${roomId}`)
  return room
}

/** Spawn when arriving in `roomId` from `fromRoomId` (falls back to the room spawn). */
export function v04bArrivalPose(roomId: V04BRoomId, fromRoomId: V04BRoomId | null): SpatialPose {
  const room = v04bSpatialRoom(roomId)
  return { ...(fromRoomId && room.arrivals[fromRoomId] ? room.arrivals[fromRoomId]! : room.spawn) }
}
