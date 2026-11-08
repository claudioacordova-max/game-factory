import type { RoomDefinition } from '../engine/spatial.js'

/** Presentation data only. Never used to decide availability, occupancy or rewards. */
export interface CryptTheme {
  stone: string; trim: string; floor: string; inset: string; light: string; background: string
  kind: 'threshold' | 'catacombs' | 'ceremony' | 'infiltration' | 'burrows' | 'colony' | 'lair' | 'runic' | 'deep' | 'altar'
  wing: boolean
  /** V0.4B only: rune/mana glow colour and room motif. */
  glow?: string
  motif?: 'umbral' | 'archive' | 'core' | 'titan' | 'antechamber' | 'pit' | 'chains' | 'sacrifice' | 'throne'
  /** V0.4B only: false closes the central rear opening when the room has no north exit. */
  rearOpening?: boolean
}

const SECTOR_1: CryptTheme = { kind: 'threshold', stone: '#59616b', trim: '#a18c66', floor: '#39434c', inset: '#26313b', light: '#efc88a', background: '#101923', wing: false }
const SECTOR_2: CryptTheme = { kind: 'catacombs', stone: '#485362', trim: '#89939e', floor: '#303b49', inset: '#1e2936', light: '#93c9df', background: '#0e1724', wing: false }
const SECTOR_3: CryptTheme = { kind: 'ceremony', stone: '#535565', trim: '#b69a67', floor: '#383b4b', inset: '#242332', light: '#bdabe9', background: '#151321', wing: false }
const RATS_1: CryptTheme = { kind: 'infiltration', stone: '#626052', trim: '#9c8b60', floor: '#45483c', inset: '#30372d', light: '#d5c38b', background: '#191d17', wing: true }
const RATS_3: CryptTheme = { kind: 'colony', stone: '#555c48', trim: '#9e9162', floor: '#414534', inset: '#292f23', light: '#bfd09a', background: '#161d15', wing: true }
const RATS_4: CryptTheme = { kind: 'lair', stone: '#655547', trim: '#be9e61', floor: '#4e4036', inset: '#352920', light: '#e2ad77', background: '#241a19', wing: true }

const RUNIC = { kind: 'runic', stone: '#4c5466', trim: '#8c9bbd', floor: '#2e3446', inset: '#1c2132', light: '#86b8f2', background: '#0d1221', wing: false, glow: '#7fc4ff' } as const
const DEEP = { kind: 'deep', stone: '#474a53', trim: '#837867', floor: '#2b2d34', inset: '#1a1c22', light: '#9fb4cc', background: '#0c0e14', wing: false, glow: '#9b86c9' } as const
/** V0.4B rooms (M6b): zone ambience reusing approved palettes; new themes only for runic, deep and altar rooms. */
export const V04B_CRYPT_THEMES: Record<string, CryptTheme> = {
  // Same threshold art without the rat-wing burrow hint (V0.4B 01/02 have no rat access).
  'v04b-01': { ...SECTOR_1, motif: 'umbral' },
  'v04b-02': { ...SECTOR_1, motif: 'umbral' },
  // 03 keeps the catacombs look; the Titan's runic door is its focal exit object.
  'v04b-03': { ...SECTOR_2, glow: '#a68cf2' },
  'v04b-04': { ...SECTOR_2 },
  'v04b-05': { ...SECTOR_2 },
  'v04b-06': { ...SECTOR_2 },
  'v04b-07': { ...RATS_1 },
  'v04b-08': { ...RATS_3 },
  'v04b-09': { ...RATS_4 },
  // Neutral and solemn: no rat motifs.
  'v04b-10': { kind: 'altar', stone: '#5b5c62', trim: '#aa9b7b', floor: '#393a40', inset: '#26272d', light: '#ead7ad', background: '#131317', wing: false, glow: '#e9dcb8', rearOpening: false },
  'v04b-11': { ...RUNIC, motif: 'archive' },
  'v04b-12': { ...RUNIC, motif: 'core', rearOpening: false },
  'v04b-13': { ...RUNIC, motif: 'titan', light: '#a996f0', glow: '#b39cff', rearOpening: false },
  'v04b-14': { ...DEEP },
  'v04b-15': { ...DEEP, motif: 'antechamber' },
  'v04b-16': { ...DEEP, motif: 'pit' },
  'v04b-17': { ...DEEP, motif: 'chains', rearOpening: false },
  'v04b-18': { ...DEEP, motif: 'sacrifice', light: '#d98b66', glow: '#e0734f', rearOpening: false },
  'v04b-19': { ...SECTOR_3, stone: '#4b4c5a', floor: '#2f3140', inset: '#1d1d2a', background: '#100f1a', motif: 'throne' },
}

export function cryptTheme(roomId: string): CryptTheme {
  return V04B_CRYPT_THEMES[roomId] ?? SECTOR_1
}

export interface MasonryBlock { x: number; y: number; z: number; width: number; height: number; depth: number }

/** All masonry is outside the room bounds, including the low camera-facing cutaway. */
export function boundaryMasonry(room: RoomDefinition): MasonryBlock[] {
  const blocks: MasonryBlock[] = []
  const theme = cryptTheme(room.id)
  const wing = theme.wing, rearOpening = theme.rearOpening !== false
  for (let course = 0; course < 3; course++) {
    const count = 10, width = room.width / count
    for (let i = 0; i < count; i++) {
      // The broken wing wall has a stepped silhouette; the central opening frames the real forward exit.
      if ((i === 4 || i === 5) && course < 2 && rearOpening) continue
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

/** V0.4B provisional figures (M6b): one simple low-poly figure per creature, no final art. */
export type V04BFigure = 'rat' | 'scavenger' | 'risen' | 'slime' | 'skeleton' | 'ghoul' | 'spider' | 'knight' | 'golem'
export interface V04BFigurePlacement { cardId: string; figure: V04BFigure; x: number; z: number; scale: number; heightScale?: number; yaw?: number }
/** IDs correspond to each skirmish's real initial field (rats 07/08 reuse the approved rat model). */
export const V04B_FIGURE_GROUPS: Record<string, readonly V04BFigurePlacement[]> = {
  '07': [{ cardId: 'A02', figure: 'rat', x: -0.18, z: 0.03, scale: 0.44, heightScale: 1.75 }, { cardId: 'A02', figure: 'rat', x: 0.17, z: -0.04, scale: 0.44, heightScale: 1.75, yaw: -0.3 }],
  '08': [{ cardId: 'A02', figure: 'rat', x: -0.19, z: 0.02, scale: 0.44, heightScale: 1.75 }, { cardId: 'N03', figure: 'scavenger', x: 0.13, z: -0.02, scale: 0.63, heightScale: 2 }],
  '04': [{ cardId: 'H01', figure: 'risen', x: -0.4, z: 0.02, scale: 0.92 }, { cardId: 'N02', figure: 'slime', x: 0.02, z: 0.08, scale: 0.85 }, { cardId: 'N05', figure: 'skeleton', x: 0.4, z: -0.04, scale: 0.92 }],
  '16': [{ cardId: 'N05', figure: 'skeleton', x: -0.4, z: 0.02, scale: 0.92 }, { cardId: 'N06', figure: 'ghoul', x: 0, z: -0.06, scale: 0.92 }, { cardId: 'N07', figure: 'spider', x: 0.4, z: 0.06, scale: 0.8 }],
  '17': [{ cardId: 'H01', figure: 'risen', x: -0.4, z: 0.02, scale: 0.92 }, { cardId: 'N04', figure: 'knight', x: 0, z: -0.05, scale: 0.95 }, { cardId: 'R03', figure: 'golem', x: 0.4, z: 0.04, scale: 0.85 }],
}

/** Lit pedestal colours (Hueso, Sombra, Maná). */
export const RUNE_GLOW: Record<string, string> = { hueso: '#efe4c4', sombra: '#ad8cf5', mana: '#7fc4ff' }
