import type { RoomDefinition } from '../engine/spatial.js'

/** Presentation data only. Never used to decide availability, occupancy or rewards. */
export interface CryptTheme {
  stone: string; trim: string; floor: string; inset: string; light: string; background: string
  kind: 'threshold' | 'catacombs' | 'ceremony' | 'infiltration' | 'burrows' | 'colony' | 'lair'
  wing: boolean
}

export const CRYPT_THEMES: Record<string, CryptTheme> = {
  'sector-1': { kind: 'threshold', stone: '#59616b', trim: '#a18c66', floor: '#39434c', inset: '#26313b', light: '#efc88a', background: '#101923', wing: false },
  'sector-2': { kind: 'catacombs', stone: '#485362', trim: '#89939e', floor: '#303b49', inset: '#1e2936', light: '#93c9df', background: '#0e1724', wing: false },
  'sector-3': { kind: 'ceremony', stone: '#535565', trim: '#b69a67', floor: '#383b4b', inset: '#242332', light: '#bdabe9', background: '#151321', wing: false },
  'rats-1': { kind: 'infiltration', stone: '#626052', trim: '#9c8b60', floor: '#45483c', inset: '#30372d', light: '#d5c38b', background: '#191d17', wing: true },
  'rats-2': { kind: 'burrows', stone: '#605746', trim: '#a08c58', floor: '#4b4233', inset: '#352e23', light: '#ddba7f', background: '#201b15', wing: true },
  'rats-3': { kind: 'colony', stone: '#555c48', trim: '#9e9162', floor: '#414534', inset: '#292f23', light: '#bfd09a', background: '#161d15', wing: true },
  'rats-4': { kind: 'lair', stone: '#655547', trim: '#be9e61', floor: '#4e4036', inset: '#352920', light: '#e2ad77', background: '#241a19', wing: true },
}

export function cryptTheme(roomId: string): CryptTheme {
  return CRYPT_THEMES[roomId] ?? CRYPT_THEMES['sector-1']
}

export interface MasonryBlock { x: number; y: number; z: number; width: number; height: number; depth: number }

/** All masonry is outside the room bounds, including the low camera-facing cutaway. */
export function boundaryMasonry(room: RoomDefinition): MasonryBlock[] {
  const blocks: MasonryBlock[] = []
  const wing = cryptTheme(room.id).wing
  for (let course = 0; course < 3; course++) {
    const count = 10, width = room.width / count
    for (let i = 0; i < count; i++) {
      // The broken wing wall has a stepped silhouette; the central opening frames the real forward exit.
      if ((i === 4 || i === 5) && course < 2) continue
      if (wing && course === 2 && i % 3 === 1) continue
      blocks.push({ x: -room.width / 2 + width * (i + 0.5), y: 0.38 + course * 0.77,
        z: -room.depth / 2 - 0.94, width: width - 0.025, height: 0.74, depth: 0.44 })
    }
    for (let i = 0; i < 8; i++) {
      if (wing && course === 2 && i % 2 === 0) continue
      blocks.push({ x: -room.width / 2 - 0.94, y: 0.38 + course * 0.77,
        z: -room.depth / 2 + room.depth / 8 * (i + 0.5), width: 0.44, height: 0.74, depth: room.depth / 8 - 0.025 })
    }
  }
  blocks.push({ x: room.width / 2 + 0.13, y: 0.1, z: 0, width: 0.22, height: 0.2, depth: room.depth },
    { x: 0, y: 0.1, z: room.depth / 2 + 0.13, width: room.width, height: 0.2, depth: 0.22 },
    // Low curbs mark the original navigation edge in front of the exterior foundation.
    // They remain outside that edge and below niches/burrows, preserving their visibility.
    { x: -room.width / 2 - 0.125, y: 0.1, z: 0, width: 0.25, height: 0.2, depth: room.depth },
    { x: 0, y: 0.1, z: -room.depth / 2 - 0.125, width: room.width, height: 0.2, depth: 0.25 })
  return blocks
}

export type RatAppearance = 'rat' | 'large' | 'clumsy' | 'biter'
/** IDs correspond to the existing encounter's initial field, not to new creatures. */
export const RAT_GROUPS: Record<string, readonly { cardId: string; appearance: RatAppearance; x: number; z: number; scale: number; heightScale: number }[]> = {
  'rats-1': [{ cardId: 'E01', appearance: 'rat', x: 0, z: 0, scale: 0.92, heightScale: 1 }],
  'rats-2': [{ cardId: 'E01', appearance: 'rat', x: -0.19, z: 0.02, scale: 0.44, heightScale: 1.75 }, { cardId: 'E03', appearance: 'large', x: 0.13, z: -0.02, scale: 0.63, heightScale: 2 }],
  'rats-3': [{ cardId: 'E01', appearance: 'rat', x: -0.22, z: 0.08, scale: 0.4, heightScale: 1.9 }, { cardId: 'E02', appearance: 'clumsy', x: 0.13, z: -0.08, scale: 0.49, heightScale: 2.1 }, { cardId: 'E04', appearance: 'biter', x: 0.12, z: 0.15, scale: 0.4, heightScale: 2.1 }],
}
