/** Spatial presentation only: availability, rewards and room transitions belong to the session. */
export interface Point2 { x: number; z: number }
export interface SpatialPose extends Point2 { yaw: number }
export interface SpatialObstacle extends Point2 { width: number; depth: number; height?: number }
export type RoomAnchor = 'enemy' | 'chest' | 'shrine' | 'forward' | 'back' | 'wing'
export interface RoomDefinition {
  id: string
  name: string
  width: number
  depth: number
  obstacles: readonly SpatialObstacle[]
  spawn: SpatialPose
  anchors: Record<RoomAnchor, Point2>
}
export interface ExplorationObject {
  id: string
  label: string
  kind: 'enemy' | 'chest' | 'shrine' | 'exit' | 'feature'
  position: Point2
  status: 'available' | 'locked' | 'completed'
  /** Optional contextual verb; defaults by kind. */
  action?: string
  /** Optional reason shown near a locked object (V0.4B exits). */
  reason?: string
  /** Optional presentation hint for alternative renderers; never used for rules. */
  visual?: string
  /** Exit set in a side wall (V0.4B): its door body runs along z instead of x. */
  sideWall?: boolean
}

export const AVATAR_RADIUS = 0.3
export const WALK_SPEED = 3.2
export const INTERACTION_RANGE = 1.65
export const MAX_FRAME_DELTA = 0.05

export function isWalkable(room: RoomDefinition, point: Point2, radius = AVATAR_RADIUS): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return false
  if (Math.abs(point.x) > room.width / 2 - radius || Math.abs(point.z) > room.depth / 2 - radius) return false
  return !room.obstacles.some((obstacle) =>
    Math.abs(point.x - obstacle.x) < obstacle.width / 2 + radius &&
    Math.abs(point.z - obstacle.z) < obstacle.depth / 2 + radius)
}

/** A fixed isometric camera looks from +X/+Z. Input is expressed in screen directions. */
export function cameraRelativeDirection(horizontal: number, vertical: number): Point2 {
  const length = Math.hypot(horizontal, vertical)
  if (!length || !Number.isFinite(length)) return { x: 0, z: 0 }
  return {
    x: (horizontal + vertical) / (Math.SQRT2 * length),
    z: (vertical - horizontal) / (Math.SQRT2 * length),
  }
}

/** Clamping stale frame deltas prevents jumps; short axis steps also prevent tunnelling. */
export function movePose(room: RoomDefinition, pose: SpatialPose, direction: Point2, delta: number): SpatialPose {
  const dt = Number.isFinite(delta) ? Math.min(MAX_FRAME_DELTA, Math.max(0, delta)) : 0
  const length = Math.hypot(direction.x, direction.z)
  if (!dt || !length || !Number.isFinite(length)) return pose
  const distance = WALK_SPEED * dt
  const dx = direction.x / length * distance, dz = direction.z / length * distance
  const steps = Math.max(1, Math.ceil(distance / 0.08))
  let { x, z } = pose
  for (let step = 0; step < steps; step++) {
    if (isWalkable(room, { x: x + dx / steps, z })) x += dx / steps
    if (isWalkable(room, { x, z: z + dz / steps })) z += dz / steps
  }
  return { x, z, yaw: Math.atan2(direction.x, direction.z) }
}

export function safePose(room: RoomDefinition, pose: SpatialPose): SpatialPose {
  if (isWalkable(room, pose) && Number.isFinite(pose.yaw)) return pose
  const spawn = { ...room.spawn, yaw: Number.isFinite(room.spawn.yaw) ? room.spawn.yaw : 0 }
  if (isWalkable(room, spawn)) return spawn
  // If new occupancy also covers spawn, find the nearest free rectangle boundary.
  // Both bounds and obstacles use the same inflated rectangles as movement.
  const boundX = room.width / 2 - AVATAR_RADIUS, boundZ = room.depth / 2 - AVATAR_RADIUS
  const xs = [spawn.x, -boundX, boundX], zs = [spawn.z, -boundZ, boundZ]
  const clearance = 0.000001
  for (const obstacle of room.obstacles) {
    xs.push(obstacle.x - obstacle.width / 2 - AVATAR_RADIUS - clearance, obstacle.x + obstacle.width / 2 + AVATAR_RADIUS + clearance)
    zs.push(obstacle.z - obstacle.depth / 2 - AVATAR_RADIUS - clearance, obstacle.z + obstacle.depth / 2 + AVATAR_RADIUS + clearance)
  }
  let fallback: SpatialPose | undefined
  let distance = Infinity
  for (const x of xs) for (const z of zs) {
    const candidate = { x, z, yaw: spawn.yaw }
    const nextDistance = Math.hypot(x - spawn.x, z - spawn.z)
    if (nextDistance < distance && isWalkable(room, candidate)) { fallback = candidate; distance = nextDistance }
  }
  if (!fallback) throw new Error(`Room ${room.id} has no safe avatar position`)
  return fallback
}

/** Used on mount, room changes and changed occupancy; a valid current pose keeps its identity. */
export function safeExplorationPose(room: RoomDefinition, objects: readonly ExplorationObject[], pose: SpatialPose): SpatialPose {
  return safePose(roomWithObjects(room, objects), pose)
}

export function closestInteractable(pose: Point2, objects: readonly ExplorationObject[]): ExplorationObject | undefined {
  let nearest: ExplorationObject | undefined
  let distance = INTERACTION_RANGE
  for (const object of objects) {
    if (object.status !== 'available') continue
    const nextDistance = Math.hypot(object.position.x - pose.x, object.position.z - pose.z)
    if (nextDistance <= distance) { nearest = object; distance = nextDistance }
  }
  return nearest
}

/** Physical bodies for props; completed enemies withdraw so the route stays open. */
export function roomWithObjects(room: RoomDefinition, objects: readonly ExplorationObject[]): RoomDefinition {
  return { ...room, obstacles: [...room.obstacles, ...objects.flatMap((object): SpatialObstacle[] =>
    object.kind === 'enemy' && object.status === 'completed' ? [] :
      [{ ...object.position, width: object.kind === 'exit' ? object.sideWall ? 0.3 : 1.3 : 0.75, depth: object.kind === 'exit' ? object.sideWall ? 1.3 : 0.3 : 0.65 }])] }
}
