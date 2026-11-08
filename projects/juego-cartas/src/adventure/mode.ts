/** URL switches. Without `?expedicion=v04b` the legacy game is created exactly as before. */
export type ExpeditionMode = 'legacy' | 'v04b'

export function expeditionModeFromSearch(search: string): ExpeditionMode {
  return new URLSearchParams(search).get('expedicion') === 'v04b' ? 'v04b' : 'legacy'
}

/** `?perf` (any value, combinable) mounts the performance probe; otherwise nothing is measured. */
export function perfEnabledFromSearch(search: string): boolean {
  return new URLSearchParams(search).has('perf')
}
