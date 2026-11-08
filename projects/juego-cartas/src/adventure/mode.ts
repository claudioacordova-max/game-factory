/** `?perf` (any value) mounts the performance probe; otherwise nothing is measured. The V0.4B expedition is the only game. */
export function perfEnabledFromSearch(search: string): boolean {
  return new URLSearchParams(search).has('perf')
}
