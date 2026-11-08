import { LEGACY_ADVENTURE } from './legacyAdventure.js'
import { V04B_ADVENTURE } from './v04bAdventure.js'
import type { ExpeditionMode } from './mode.js'

/** The adventure binding chosen at page load; V0.4B is the default (M8b), the legacy one only with ?expedicion=legado. */
export function adventureForMode(mode: ExpeditionMode) {
  return mode === 'legacy' ? LEGACY_ADVENTURE : V04B_ADVENTURE
}
