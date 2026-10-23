/** Returns the yaw (in radians) for a model whose forward axis is +Z. */
export function yawFromMovementDirection(x: number, z: number): number | undefined {
  if (x === 0 && z === 0) return undefined
  return Math.atan2(x, z)
}

export function clampedMovementStep(
  currentX: number,
  currentZ: number,
  deltaX: number,
  deltaZ: number,
  limit = 9.3,
): { x: number; z: number; yaw: number | undefined } {
  const x = Math.max(-limit, Math.min(limit, currentX + deltaX))
  const z = Math.max(-limit, Math.min(limit, currentZ + deltaZ))
  return {
    x,
    z,
    yaw: yawFromMovementDirection(x - currentX, z - currentZ),
  }
}
