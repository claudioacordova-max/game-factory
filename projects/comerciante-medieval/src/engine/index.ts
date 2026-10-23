/**
 * Empty engine boundary for the first project milestone.
 * Economic state and rules are introduced in Hito 2.
 */
export type EngineState = Record<string, never>

export function createEngine(): EngineState {
  return {}
}
