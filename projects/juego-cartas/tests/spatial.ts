import {
  AVATAR_RADIUS, cameraRelativeDirection, closestInteractable, INTERACTION_RANGE,
  isWalkable, MAX_FRAME_DELTA, movePose, ROOMS, roomWithObjects, safeExplorationPose, safePose, WALK_SPEED,
} from '../src/engine/spatial.js'
import type { ExplorationObject, Point2, RoomDefinition } from '../src/engine/spatial.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function near(a: number, b: number): boolean { return Math.abs(a - b) < 1e-8 }

const room = ROOMS['sector-1']
const start = { x: 0, z: 1, yaw: 0 }
const cardinal = movePose(room, start, { x: 1, z: 0 }, 0.03)
const diagonal = movePose(room, start, { x: 1, z: 1 }, 0.03)
assert(near(Math.hypot(cardinal.x - start.x, cardinal.z - start.z), WALK_SPEED * 0.03), 'Cardinal speed')
assert(near(Math.hypot(diagonal.x - start.x, diagonal.z - start.z), WALK_SPEED * 0.03), 'Diagonal speed must be normalized')
const up = cameraRelativeDirection(0, -1), right = cameraRelativeDirection(1, 0)
assert(up.x < 0 && up.z < 0 && right.x > 0 && right.z < 0, 'Controls follow the fixed camera')
assert(near(Math.hypot(cameraRelativeDirection(1, 1).x, cameraRelativeDirection(1, 1).z), 1), 'Camera diagonal normalized')
assert(near(cardinal.yaw, Math.PI / 2), 'Face follows world movement')
assert(movePose(room, start, { x: 1, z: 0 }, -1) === start, 'Negative delta ignored')
assert(movePose(room, start, { x: 1, z: 0 }, Infinity) === start, 'Infinite delta ignored')
assert(near(movePose(room, start, { x: 1, z: 0 }, 999).x - start.x, WALK_SPEED * MAX_FRAME_DELTA), 'Stale delta clamped')

let pose = { ...start }
for (let i = 0; i < 500; i++) {
  pose = movePose(room, pose, { x: 1, z: 0 }, 999)
  assert(isWalkable(room, pose), 'Cannot cross room boundary even with huge delta')
}
assert(pose.x <= room.width / 2 - AVATAR_RADIUS, 'Right boundary includes avatar radius')
pose = { x: -2.5, z: 3.3, yaw: 0 }
for (let i = 0; i < 100; i++) {
  pose = movePose(room, pose, { x: 0, z: -1 }, 999)
  assert(isWalkable(room, pose), 'Cannot cross obstacle even with huge delta')
}
assert(pose.z >= 1.05 + AVATAR_RADIUS, 'Sarcophagus blocks direct movement')
assert(!isWalkable(room, { x: NaN, z: 0 }), 'Nonfinite positions rejected')
assert(safePose(room, { x: 999, z: 999, yaw: 0 }).z === room.spawn.z, 'Invalid return position uses safe spawn')

const objects: ExplorationObject[] = [
  { id: 'locked', label: 'Bloqueado', kind: 'exit', position: { x: 0, z: 0.05 }, status: 'locked' },
  { id: 'completed', label: 'Terminado', kind: 'enemy', position: { x: 0, z: 0.1 }, status: 'completed' },
  { id: 'far', label: 'Lejos', kind: 'chest', position: { x: 0, z: INTERACTION_RANGE + 0.01 }, status: 'available' },
  { id: 'near', label: 'Cerca', kind: 'shrine', position: { x: 0, z: 1 }, status: 'available' },
  { id: 'nearest', label: 'Más cerca', kind: 'enemy', position: { x: 0, z: 0.8 }, status: 'available' },
]
assert(closestInteractable({ x: 0, z: 0 }, objects)?.id === 'nearest', 'Only closest available object interacts')
assert(!closestInteractable({ x: 0, z: -4 }, objects), 'No remote interactions')
assert(!closestInteractable({ x: 0, z: 0 }, objects.slice(0, 3)), 'Locked, completed and distant ignored')
assert(closestInteractable({ x: 0, z: 1 - INTERACTION_RANGE }, [objects[3]])?.id === 'near', 'Range boundary allowed')
const bodies = roomWithObjects(room, objects)
assert(!isWalkable(bodies, objects[4].position), 'Available enemy body blocks movement')
assert(!isWalkable(bodies, objects[0].position), 'Locked gate is a physical barrier')
const withdrawn = roomWithObjects(room, [{ ...objects[4], status: 'completed' }])
assert(isWalkable(withdrawn, objects[4].position), 'Completed enemy leaves route open')

// Regression: a return pose at a live enemy used to pass static validation and stay trapped.
const ratRoom = ROOMS['rats-1']
const rat: ExplorationObject = { id: 'R1', label: 'Ratas', kind: 'enemy', position: ratRoom.anchors.enemy, status: 'available' }
const insideEnemy = { x: 0, z: -2.4, yaw: 0 }
assert(isWalkable(ratRoom, insideEnemy), 'Reproduction: enemy anchor is valid in the unfurnished room')
assert(!isWalkable(roomWithObjects(ratRoom, [rat]), insideEnemy), 'Reproduction: live enemy occupies the return pose')
let returned = safeExplorationPose(ratRoom, [rat], insideEnemy)
assert(returned.x === ratRoom.spawn.x && returned.z === ratRoom.spawn.z, 'Occupied initial/return pose falls back to spawn')
const returnedStart = { ...returned }
for (let step = 0; step < 100; step++) {
  returned = movePose(roomWithObjects(ratRoom, [rat]), returned, { x: 1, z: 0 }, 0.016)
  assert(isWalkable(roomWithObjects(ratRoom, [rat]), returned), 'Corrected return stays outside occupied geometry for 100 steps')
}
assert(Math.hypot(returned.x - returnedStart.x, returned.z - returnedStart.z) > 1, 'Corrected avatar is free to move')

const completedRat: ExplorationObject = { ...rat, status: 'completed' }
const beforeRespawn = safeExplorationPose(ratRoom, [completedRat], insideEnemy)
assert(beforeRespawn === insideEnemy, 'Valid pose remains unchanged while enemy is withdrawn')
assert(safeExplorationPose(ratRoom, [{ ...completedRat }], beforeRespawn) === beforeRespawn, 'Equivalent new object array cannot reset current position')
const afterRespawn = safeExplorationPose(ratRoom, [rat], beforeRespawn)
assert(isWalkable(roomWithObjects(ratRoom, [rat]), afterRespawn), 'Occupation change repairs a newly covered current pose')
assert(afterRespawn !== beforeRespawn, 'Enemy respawning on the avatar cannot leave it trapped')
assert(safeExplorationPose(ratRoom, [completedRat], afterRespawn) === afterRespawn, 'Removing occupancy does not move a valid avatar')

const spawnChest: ExplorationObject = { id: 'spawn-body', label: 'Cofre', kind: 'chest', position: ratRoom.spawn, status: 'available' }
const blockedSpawnRoom = roomWithObjects(ratRoom, [rat, spawnChest])
const alternateReturn = safeExplorationPose(ratRoom, [rat, spawnChest], insideEnemy)
assert(isWalkable(blockedSpawnRoom, alternateReturn), 'An occupied spawn also requires a free fallback')
assert(alternateReturn.x !== ratRoom.spawn.x || alternateReturn.z !== ratRoom.spawn.z, 'Fallback never returns an occupied spawn')
assert(safeExplorationPose(ratRoom, [rat, spawnChest], alternateReturn) === alternateReturn, 'Resolved fallback is stable on another render')

/** Grid flood fill checks a navigable route from spawn to interaction range of each anchor. */
function reachablePoints(definition: RoomDefinition): Point2[] {
  const step = 0.2, queue: Point2[] = [{ ...definition.spawn }], seen = new Set(['0:0'])
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]
    for (const offset of [{ x: step, z: 0 }, { x: -step, z: 0 }, { x: 0, z: step }, { x: 0, z: -step }]) {
      const next = { x: point.x + offset.x, z: point.z + offset.z }
      const key = `${Math.round((next.x - definition.spawn.x) / step)}:${Math.round((next.z - definition.spawn.z) / step)}`
      if (!seen.has(key) && isWalkable(definition, next)) { seen.add(key); queue.push(next) }
    }
  }
  return queue
}
for (const definition of Object.values(ROOMS)) {
  assert(isWalkable(definition, definition.spawn), `${definition.id}: valid spawn`)
  const anchorObjects = Object.entries(definition.anchors).map(([id, position]): ExplorationObject => ({
    id, label: id, position, kind: id === 'enemy' ? 'enemy' : id === 'chest' ? 'chest' : id === 'shrine' ? 'shrine' : 'exit', status: 'available',
  }))
  const furnished = roomWithObjects(definition, anchorObjects)
  assert(isWalkable(furnished, definition.spawn), `${definition.id}: props cannot obstruct spawn`)
  const reachable = reachablePoints(furnished)
  for (const [id, anchor] of Object.entries(definition.anchors)) {
    assert(reachable.some((point) => Math.hypot(point.x - anchor.x, point.z - anchor.z) < INTERACTION_RANGE), `${definition.id}: ${id} must be approachable`)
  }
}

console.log('Spatial checks passed: movement, camera, collisions, safe returns, occupancy changes, proximity and seven furnished room routes.')
