import { LEGACY_ADVENTURE } from './legacyAdventure.js'
import { V04B_ADVENTURE } from './v04bAdventure.js'
import type { ExpeditionMode } from './mode.js'

/** The adventure binding chosen at page load; the legacy one is the default. */
export function adventureForMode(mode: ExpeditionMode) {
  return mode === 'v04b' ? V04B_ADVENTURE : LEGACY_ADVENTURE
}
