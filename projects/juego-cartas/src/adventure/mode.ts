/**
 * URL switches (M8b). Without a parameter the V0.4B expedition starts; `?expedicion=legado` creates the legacy game
 * exactly as before. `?expedicion=v04b` keeps working and any other value also falls back to the default.
 */
export type ExpeditionMode = 'legacy' | 'v04b'

export function expeditionModeFromSearch(search: string): ExpeditionMode {
  return new URLSearchParams(search).get('expedicion') === 'legado' ? 'legacy' : 'v04b'
}

/** `?perf` (any value, combinable) mounts the performance probe; otherwise nothing is measured. */
export function perfEnabledFromSearch(search: string): boolean {
  return new URLSearchParams(search).has('perf')
}
