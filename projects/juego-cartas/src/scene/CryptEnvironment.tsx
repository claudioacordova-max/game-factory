import { useLayoutEffect, useMemo, useRef } from 'react'
import { Group } from 'three'
import type { RoomDefinition, SpatialObstacle } from '../engine/spatial.js'
import { Block, Flame, FuneralSeal, Glow, GothicArch, Masonry, Orb, Pebble, Round } from './CryptGeometry.js'
import { boundaryMasonry, cryptTheme } from './cryptVisuals.js'
import type { CryptTheme } from './cryptVisuals.js'
import { buildStaticCryptBatch, disposeStaticCryptBatch } from './staticCryptBatch.js'

function StoneFloor({ room, theme }: { room: RoomDefinition; theme: CryptTheme }) {
  const tiles = useMemo(() => Array.from({ length: 12 }, (_, row) => Array.from({ length: 14 }, (_, col) => ({
    x: col - 6.5, y: -0.035, z: row - 5.5, width: 0.97, height: 0.06, depth: 0.97,
  }))).flat(), [])
  return <group>
    <Block at={[0, -0.18, 0]} size={[room.width, 0.3, room.depth]} color={theme.inset} />
    {/* Exterior foundation carries recessed wall façades without entering the playable rectangle. */}
    <Block at={[0, -0.07, -room.depth / 2 - 0.6]} size={[room.width + 1.2, 0.14, 1.2]} color={theme.inset} />
    <Block at={[-room.width / 2 - 0.6, -0.07, 0]} size={[1.2, 0.14, room.depth]} color={theme.inset} />
    <Masonry blocks={tiles} color={theme.floor} />
    {/* Flush inlays suggest routes, never stairs or collision-free raised platforms. */}
    {!theme.wing && <>
      <Block at={[0, 0.003, 0]} size={[1.45, 0.003, 10.8]} color={theme.inset} />
      {[-0.78, 0.78].map((x) => <Block key={x} at={[x, 0.005, 0]} size={[0.025, 0.003, 10.8]} color={theme.trim} />)}
      {Array.from({ length: 9 }, (_, i) => <Block key={i} at={[0, 0.006, i - 4]} size={[0.15, 0.003, 0.15]} rotation={[0, Math.PI / 4, 0]} color={theme.trim} />)}
    </>}
    {theme.wing && Array.from({ length: theme.kind === 'infiltration' ? 7 : 13 }, (_, i) => <group key={i} position={[Math.sin(i * 3.7) * 5.8, 0.008, Math.cos(i * 2.9) * 4.6]}>
      <mesh rotation={[-Math.PI / 2, 0, i]} scale={[0.65 + i % 3 * 0.15, 0.4 + i % 2 * 0.15, 1]}><circleGeometry args={[1, 7]} /><meshStandardMaterial color={i % 2 ? '#62523a' : theme.inset} roughness={1} /></mesh>
      {[0, 1, 2].map((j) => <Block key={j} at={[j * 0.1, 0.003, 0.08 * j]} size={[0.018, 0.002, 0.19]} rotation={[0, 0.4, 0]} color={theme.trim} />)}
    </group>)}
    {(theme.kind === 'ceremony' || theme.kind === 'lair') && <group position={[room.anchors.enemy.x, 0.014, room.anchors.enemy.z]}>
      <FuneralSeal radius={theme.kind === 'lair' ? 1.6 : 2} color={theme.trim} />
    </group>}
    {theme.kind === 'runic' && <RunicFloor theme={theme} />}
    {theme.kind === 'catacombs' && [-4.7, 4.7].map((x) => <Block key={x} at={[x, 0.006, 0]} size={[0.04, 0.003, 10.5]} color={theme.trim} />)}
  </group>
}

function Sarcophagus({ obstacle, theme, index }: { obstacle: SpatialObstacle; theme: CryptTheme; index: number }) {
  const { width: w, depth: d } = obstacle, h = obstacle.height ?? 0.85
  // The whole occupied rectangle is visibly filled. Lids and detail stay inside that rectangle.
  return <group position={[obstacle.x, 0, obstacle.z]}>
    <Block at={[0, 0.18 + (h - 0.34) / 2, 0]} size={[w, h - 0.34, d]} color={theme.stone} />
    <Block at={[0, 0.09, 0]} size={[w, 0.18, d]} color={theme.inset} />
    <Block at={[0, h - 0.08, 0]} size={[w, 0.16, d]} color={theme.trim} />
    <Block at={[0, h + 0.02, 0]} size={[w * 0.8, 0.05, d * 0.85]} color={theme.stone} />
    {!theme.wing && <>
      <Block at={[0, h + 0.055, 0]} size={[w * 0.12, 0.02, d * 0.58]} color={theme.trim} />
      <Block at={[0, h + 0.055, -d * 0.14]} size={[w * 0.5, 0.02, d * 0.08]} color={theme.trim} />
      <Orb at={[0, h + 0.1, -d * 0.24]} size={[0.12, 0.05, 0.12]} color="#b4b2a5" />
    </>}
    {theme.wing && <>
      {/* Gnawed planks, dirt and nest remain on an existing solid tomb. */}
      {[0, 1, 2].map((i) => <Block key={i} at={[(i - 1) * w * 0.22, h + 0.065, 0]} size={[w * 0.15, 0.04, d * 0.78]} color={i % 2 ? '#6e5336' : '#8b7047'} rotation={[0, 0.08 * (i - 1), 0]} />)}
      {theme.kind !== 'infiltration' && <Nest width={w * 0.8} depth={d * 0.72} y={h + 0.13} />}
      <Block at={[w * 0.28, h * 0.48, d / 2 + 0.001]} size={[0.035, h * 0.7, 0.002]} color={theme.inset} rotation={[0, 0, 0.18 * (index ? 1 : -1)]} />
    </>}
  </group>
}

function Nest({ width, depth, y = 0 }: { width: number; depth: number; y?: number }) {
  return <group position={[0, y, 0]}>
    <Orb at={[0, 0, 0]} size={[width * 0.48, 0.09, depth * 0.46]} color="#4a3827" />
    {Array.from({ length: 10 }, (_, i) => {
      const angle = i * Math.PI / 5
      return <Block key={i} at={[Math.sin(angle) * width * 0.35, 0.04, Math.cos(angle) * depth * 0.35]}
        size={[width * 0.26, 0.04, 0.045]} rotation={[0, -angle, 0]} color={i % 2 ? '#a38955' : '#79623d'} />
    })}
  </group>
}

function Pillar({ theme, height = 2.7 }: { theme: CryptTheme; height?: number }) {
  return <group>
    <Block at={[0, 0.15, 0]} size={[0.68, 0.3, 0.68]} color={theme.inset} />
    <Block at={[0, height / 2, 0]} size={[0.48, height, 0.48]} color={theme.stone} />
    <Block at={[0, height - 0.17, 0]} size={[0.65, 0.23, 0.65]} color={theme.trim} />
    <Block at={[0.12, height * 0.55, 0.248]} size={[0.06, height * 0.6, 0.015]} color={theme.inset} />
  </group>
}

function Niche({ theme, size = 1 }: { theme: CryptTheme; size?: number }) {
  return <group scale={size}>
    <Block at={[0, 0.75, 0]} size={[1.15, 1.5, 0.35]} color={theme.inset} />
    <GothicArch width={1.2} height={1.65} depth={0.18} color={theme.stone} trim={theme.trim} />
    <Block at={[0, 0.25, 0.15]} size={[0.78, 0.12, 0.18]} color={theme.trim} />
    <Orb at={[0, 0.48, 0.14]} size={[0.16, 0.18, 0.12]} color="#aca99a" />
    {[-0.2, 0.2].map((x) => <Block key={x} at={[x, 0.3, 0.15]} size={[0.28, 0.07, 0.09]} color="#aca99a" rotation={[0, 0, x]} />)}
  </group>
}

function Burrow({ theme, large = false }: { theme: CryptTheme; large?: boolean }) {
  const s = large ? 1.7 : 1
  return <group scale={[s, s * 0.8, 1]}>
    <Orb at={[0, 0.6, 0]} size={[0.88, 0.73, 0.16]} color="#221e17" />
    {Array.from({ length: 7 }, (_, i) => {
      const a = i / 6 * Math.PI
      return <Pebble key={i} at={[Math.cos(a) * 0.9, 0.15 + Math.sin(a) * 1.05, 0.1]} size={[0.27, 0.3, 0.17]} color={i % 2 ? theme.stone : '#796648'} rotation={[0, 0, a]} />
    })}
    <Block at={[0, 0.04, 0.1]} size={[1.65, 0.08, 0.3]} color="#796648" />
  </group>
}

function Backdrop({ room, theme }: { room: RoomDefinition; theme: CryptTheme }) {
  const rearZ = -room.depth / 2 - 0.55, leftX = -room.width / 2 - 0.55
  return <group>
    {theme.kind === 'threshold' && <>
      {[-3.8, 3.8].map((x) => <group key={x} position={[x, 0, rearZ]}><Pillar theme={theme} height={3.4} /></group>)}
      <group position={[0, 0, rearZ]}><GothicArch width={3.2} height={3.6} depth={0.55} color={theme.stone} trim={theme.trim} /></group>
      {[-5.6, 5.6].map((x) => <group key={x} position={[x, 0.55, rearZ]}><Niche theme={theme} /></group>)}
      {theme.motif !== 'umbral' && <group position={[leftX, 0, 2.4]} rotation={[0, Math.PI / 2, 0]}><Burrow theme={cryptTheme('rats-1')} /></group>}
    </>}
    {theme.kind === 'catacombs' && <>
      {[-5.5, -3.5, 3.5, 5.5].map((x) => <group key={x} position={[x, 0.2, rearZ]}>
        <Niche theme={theme} /><group position={[0, 1.7, -0.04]}><Niche theme={theme} size={0.85} /></group>
      </group>)}
      {[-3.8, -0.8, 2.2, 4.7].map((z) => <group key={z} position={[leftX, 0.3, z]} rotation={[0, Math.PI / 2, 0]}><Niche theme={theme} /></group>)}
    </>}
    {theme.kind === 'ceremony' && <>
      {[-5.4, -2.5, 2.5, 5.4].map((x) => <group key={x} position={[x, 0, rearZ]}><Pillar theme={theme} height={3.5} /></group>)}
      <group position={[0, 0, rearZ]}>
        <Block at={[0, 0.3, -0.1]} size={[3, 0.6, 0.5]} color={theme.inset} />
        <GothicArch width={2.8} height={3.8} depth={0.4} color={theme.stone} trim={theme.trim} />
        <Block at={[0, 2.2, 0]} size={[0.2, 1.8, 0.18]} color={theme.trim} />
        <Block at={[0, 2.4, 0]} size={[1, 0.16, 0.18]} color={theme.trim} />
      </group>
      {[-3.8, -0.8, 2.2].map((z) => <group key={z} position={[leftX, 0, z]}><Pillar theme={theme} height={2.8} /></group>)}
      {theme.motif === 'throne' && <Throne theme={theme} z={rearZ + 0.05} />}
    </>}
    {(theme.kind === 'runic' || theme.kind === 'deep' || theme.kind === 'altar') && <V04BBackdrop theme={theme} rearZ={rearZ} leftX={leftX} />}
    {theme.wing && <>
      <group position={[-4.7, 0.2, rearZ]}><Niche theme={theme} /></group>
      {(theme.kind === 'infiltration' ? [3.8] : theme.kind === 'burrows' ? [-2.7, 1, 4.8] : [-3.1, 2.8]).map((x) => <group key={x} position={[x, 0, rearZ]}><Burrow theme={theme} large={theme.kind === 'burrows'} /></group>)}
      <group position={[leftX, 0, theme.kind === 'infiltration' ? -2.7 : -0.4]} rotation={[0, Math.PI / 2, 0]}><Burrow theme={theme} large={theme.kind !== 'infiltration'} /></group>
      {theme.kind === 'infiltration' && <group position={[2.4, 0, rearZ]}><Pillar theme={theme} height={1.7} /></group>}
      {theme.kind === 'burrows' && <group position={[3.2, 0, rearZ - 0.1]}>
        {[-1, 1].map((x) => <Block key={x} at={[x * 1.1, 0.9, 0]} size={[0.18, 1.8, 0.23]} rotation={[0, 0, x * 0.13]} color="#8b7047" />)}
        <Block at={[0, 1.72, 0]} size={[2.7, 0.18, 0.23]} rotation={[0, 0, 0.06]} color="#8b7047" />
      </group>}
      {(theme.kind === 'colony' || theme.kind === 'lair') && <>
        {[-4.2, 3.3, 5.5].map((x, index) => <group key={x} position={[x, 0, rearZ - 0.2]}>
          <Block at={[0, 0.5, 0]} size={[1.6, 1, 0.5]} color="#5b4531" />
          <Nest width={1.5} depth={0.42} y={1.1} />
          {[0, 1, 2].map((i) => <Block key={i} at={[(i - 1) * 0.35, 1.3 + index * 0.08, 0]} size={[0.1, 0.65, 0.1]} rotation={[0, 0, (i - 1) * 0.3]} color="#9c8050" />)}
        </group>)}
        <group position={[leftX - 0.1, 0, 3.7]} rotation={[0, Math.PI / 2, 0]}><Nest width={2.3} depth={0.45} y={0.2} /></group>
      </>}
      {theme.kind === 'lair' && <group position={[0, 0, rearZ - 0.1]}>
        <Burrow theme={theme} large />
        {[-1, 1].map((side) => <Block key={side} at={[side * 1.75, 1.4, 0]} size={[0.19, 2.8, 0.2]} rotation={[0, 0, side * -0.28]} color="#a18a5e" />)}
        <Block at={[0, 2.5, 0]} size={[3.2, 0.18, 0.22]} rotation={[0, 0, -0.07]} color="#7b5c3d" />
        {[-0.6, 0, 0.6].map((x) => <Pebble key={x} at={[x, 2.85 + (x === 0 ? 0.2 : 0), 0]} size={[0.2, 0.38, 0.12]} color={theme.trim} />)}
      </group>}
    </>}
  </group>
}

/** Flush mana inlays along the route; never raised or colliding. */
function RunicFloor({ theme }: { theme: CryptTheme }) {
  const glow = theme.glow ?? theme.light
  return <group>
    {Array.from({ length: 5 }, (_, i) => <Glow key={i} at={[0, 0.008, i * 2 - 4]} size={[0.2, 0.003, 0.2]} rotation={[0, Math.PI / 4, 0]} color={glow} />)}
    {theme.motif === 'core' && <group position={[0, 0.014, -1.4]}><FuneralSeal radius={1.7} color={glow} /></group>}
  </group>
}

function Throne({ theme, z }: { theme: CryptTheme; z: number }) {
  return <group position={[0, 0, z]}>
    <Block at={[0, 0.3, 0.1]} size={[1.5, 0.6, 0.85]} color={theme.inset} />
    <Block at={[0, 1.5, -0.25]} size={[1.5, 2.4, 0.25]} color={theme.stone} />
    {[-0.7, 0.7].map((x) => <Block key={x} at={[x, 0.85, 0.1]} size={[0.16, 0.5, 0.85]} color={theme.trim} />)}
    {[-0.45, 0, 0.45].map((x) => <Pebble key={x} at={[x, 2.85, -0.25]} size={[0.1, x ? 0.22 : 0.32, 0.1]} color={theme.trim} />)}
  </group>
}

const CHAIN_SPOTS: readonly (readonly [number, number, boolean])[] = [[-4.6, 0, false], [-1.6, 0, false], [1.6, 0, false], [4.6, 0, false], [0, -1.6, true], [0, 4, true]]

/** Runic chambers, deep crypt and the neutral altar (M6b). Everything stays outside the walkable rectangle. */
function V04BBackdrop({ theme, rearZ, leftX }: { theme: CryptTheme; rearZ: number; leftX: number }) {
  const glow = theme.glow ?? theme.light
  if (theme.kind === 'runic') return <group>
    {[-5.4, -2.6, 2.6, 5.4].map((x) => <group key={x} position={[x, 0, rearZ]}>
      <Pillar theme={theme} height={3.2} />
      <Glow at={[0, 1.75, 0.255]} size={[0.06, 1.3, 0.01]} color={glow} />
      {[1.25, 2.25].map((y) => <Glow key={y} at={[0, y, 0.255]} size={[0.24, 0.05, 0.01]} rotation={[0, 0, 0.6]} color={glow} />)}
    </group>)}
    {theme.motif === 'archive' && [-3.6, -0.4, 2.8].map((z) => <group key={z} position={[leftX + 0.05, 0, z]}>
      <Block at={[0, 1.1, 0]} size={[0.5, 2.2, 1.7]} color={theme.inset} />
      {[0.35, 1.05, 1.75].map((y) => <group key={y}>
        <Block at={[0.22, y, 0]} size={[0.12, 0.06, 1.6]} color={theme.trim} />
        {[-0.55, -0.3, -0.1, 0.2, 0.45].map((offset, i) => <Block key={offset} at={[0.2, y + 0.2, offset]} size={[0.16, 0.32 - i % 2 * 0.06, 0.14]} color={i % 3 ? theme.stone : '#6b5a48'} />)}
      </group>)}
    </group>)}
    {theme.motif === 'core' && <group position={[0, 0, rearZ]}>
      <Block at={[0, 0.3, 0]} size={[2.2, 0.6, 0.8]} color={theme.inset} />
      <Block at={[0, 0.66, 0]} size={[1.6, 0.12, 0.6]} color={theme.trim} />
      <Pebble at={[0, 1.6, 0]} size={[0.5, 0.85, 0.4]} color={theme.trim} />
      <Glow at={[0, 1.6, 0.2]} size={[0.22, 0.55, 0.22]} rotation={[0, Math.PI / 4, 0]} color={glow} />
    </group>}
    {theme.motif === 'titan' && <group position={[0, 0, rearZ - 0.05]}>
      <Block at={[0, 0.35, 0]} size={[3.2, 0.7, 0.9]} color={theme.inset} />
      {[-0.5, 0.5].map((x) => <Block key={x} at={[x, 1.1, 0.05]} size={[0.55, 0.9, 0.7]} color={theme.stone} />)}
      <Block at={[0, 2.35, -0.05]} size={[1.8, 1.7, 0.7]} color={theme.stone} />
      {[-1.15, 1.15].map((x) => <Block key={x} at={[x, 2.1, 0.05]} size={[0.45, 1.5, 0.55]} color={theme.stone} />)}
      <Block at={[0, 3.5, -0.05]} size={[0.75, 0.7, 0.6]} color={theme.stone} />
      {[-0.17, 0.17].map((x) => <Glow key={x} at={[x, 3.55, 0.26]} size={[0.12, 0.05, 0.02]} color={glow} />)}
      <Glow at={[0, 2.4, 0.31]} size={[0.08, 0.9, 0.02]} color={glow} />
      <Glow at={[0, 2.55, 0.31]} size={[0.6, 0.06, 0.02]} color={glow} />
    </group>}
  </group>
  if (theme.kind === 'altar') return <group>
    {[-3.8, 3.8].map((x) => <group key={x} position={[x, 0, rearZ]}><Pillar theme={theme} height={3.4} /></group>)}
    <group position={[0, 0, rearZ]}>
      <Block at={[0, 1.4, -0.15]} size={[2.4, 2.8, 0.3]} color={theme.inset} />
      <GothicArch width={3.2} height={3.6} depth={0.5} color={theme.stone} trim={theme.trim} />
      <Block at={[0, 2.6, 0.02]} size={[0.14, 0.9, 0.08]} color={theme.trim} />
      <Block at={[0, 2.75, 0.02]} size={[0.6, 0.1, 0.08]} color={theme.trim} />
    </group>
    {[-5.6, 5.6].map((x) => <group key={x} position={[x, 0.55, rearZ]}><Niche theme={theme} /></group>)}
    {[-2.2, 2.2].map((x) => <group key={x} position={[x, 0, rearZ + 0.1]}>
      <Round at={[0, 0.6, 0]} size={[0.07, 1.2, 0.07]} color={theme.trim} metal />
      <group position={[0, 1.32, 0]}><Flame color={theme.light} /></group>
    </group>)}
    {[-3.8, 4.4].map((z) => <group key={z} position={[leftX, 0, z]}><Pillar theme={theme} height={3} /></group>)}
  </group>
  // Deep crypt: broken columns, sealed niches and the room motif.
  return <group>
    {[-5.6, -3.2, 3.2, 5.6].map((x, i) => <group key={x} position={[x, 0, rearZ]}><Pillar theme={theme} height={[3.1, 1.3, 2.1, 3.1][i]} /></group>)}
    {[-3.8, 4.2].map((z) => <group key={z} position={[leftX, 0.2, z]} rotation={[0, Math.PI / 2, 0]}><Niche theme={theme} size={0.85} /></group>)}
    {[-4.4, -2.1, 4.3].map((x, i) => <Pebble key={x} at={[x, 0.12, rearZ + 0.25]} size={[0.28, 0.2, 0.22]} rotation={[0, i, 0]} color={theme.stone} />)}
    {theme.motif === 'antechamber' && [-1.6, 1.6].map((x) => <group key={x} position={[x, 0, rearZ + 0.1]}>
      <Block at={[0, 2.35, 0]} size={[0.75, 1.9, 0.04]} color="#3e3346" />
      <Block at={[0, 3.32, 0]} size={[0.9, 0.08, 0.08]} color={theme.trim} metal />
      <Glow at={[0, 2.4, 0.03]} size={[0.1, 0.5, 0.01]} color={glow} />
    </group>)}
    {theme.motif === 'pit' && <>
      {[-1.6, -0.9, 0.8, 1.7].map((x, i) => <Pebble key={x} at={[x, 0.16, rearZ + 0.2]} size={[0.32, 0.22 + i % 2 * 0.08, 0.2]} rotation={[0, i * 1.3, 0]} color={i % 2 ? '#cdc5ad' : '#a39b86'} />)}
      {[-1.25, 1.25].map((x) => <Orb key={x} at={[x, 0.45, rearZ + 0.1]} size={[0.16, 0.18, 0.15]} color="#cdc5ad" />)}
    </>}
    {theme.motif === 'chains' && CHAIN_SPOTS.map(([x, z, side]) => <group key={`${x}:${z}`} position={side ? [leftX + 0.15, 0, z] : [x, 0, rearZ + 0.15]} rotation={[0, side ? Math.PI / 2 : 0, 0]}>
      <Round at={[0, 2.2, 0]} size={[0.025, 1.6, 0.025]} color="#5f666e" metal />
      {[1.75, 2.05, 2.35, 2.65].map((y) => <Block key={y} at={[0, y, 0]} size={[0.07, 0.12, 0.03]} color="#6c737b" metal />)}
      <Block at={[0, 1.35, 0]} size={[0.24, 0.1, 0.06]} color="#6c737b" metal />
    </group>)}
    {theme.motif === 'sacrifice' && <group position={[0, 0, rearZ]}>
      <Block at={[0, 0.45, 0.05]} size={[2.4, 0.9, 0.9]} color={theme.inset} />
      <Block at={[0, 0.94, 0.05]} size={[2.6, 0.1, 1]} color={theme.trim} />
      {[-0.7, 0, 0.7].map((x) => <Glow key={x} at={[x, 0.5, 0.51]} size={[0.06, 0.45, 0.01]} color={glow} />)}
      <Glow at={[0, 2.2, -0.05]} size={[1.2, 0.06, 0.01]} color={glow} />
      <Glow at={[0, 2.2, -0.05]} size={[0.06, 1.2, 0.01]} color={glow} />
    </group>}
  </group>
}

function CryptRoomGeometry({ room }: { room: RoomDefinition }) {
  const theme = cryptTheme(room.id)
  const masonry = useMemo(() => boundaryMasonry(room), [room])
  return <group>
    <StoneFloor room={room} theme={theme} />
    <Masonry blocks={masonry} color={theme.stone} />
    <Backdrop room={room} theme={theme} />
    {room.obstacles.map((obstacle, index) => index < 2
      ? <Sarcophagus key={index} obstacle={obstacle} theme={theme} index={index} />
      : <group key={index} position={[obstacle.x, 0, obstacle.z]}>
        <Block at={[0, (obstacle.height ?? 1.8) / 2, 0]} size={[obstacle.width, (obstacle.height ?? 1.8) - 0.4, obstacle.depth]} color={theme.stone} />
        <Block at={[0, 0.1, 0]} size={[obstacle.width, 0.2, obstacle.depth]} color={theme.trim} />
        <Block at={[0, (obstacle.height ?? 1.8) - 0.1, 0]} size={[obstacle.width, 0.2, obstacle.depth]} color={theme.trim} />
        <group position={[0, 2, 0]}><Flame color={theme.light} /></group>
      </group>)}
    {/* Sconces are attached to the exterior wall, never freestanding in walkable corners. */}
    {[-4.7, 4.7].map((x) => <group key={x} position={[x, 0, -room.depth / 2 - 0.1]}>
      <Round at={[0, 1.4, 0]} size={[0.08, 0.6, 0.08]} color={theme.trim} metal />
      <group position={[0, 1.85, 0]}><Flame color={theme.light} /></group>
    </group>)}
  </group>
}

function StaticCryptRoom({ room }: { room: RoomDefinition }) {
  const source = useRef<Group>(null), rendered = useRef<Group>(null)
  useLayoutEffect(() => {
    const batch = buildStaticCryptBatch(source.current!)
    rendered.current!.add(batch)
    return () => disposeStaticCryptBatch(batch)
  }, [room])
  return <group>
    {/* Keep the declarative art as the source of truth; only its compiled batches are drawn. */}
    <group ref={source} name="crypt-static-source" visible={false}><CryptRoomGeometry room={room} /></group>
    <group ref={rendered} />
  </group>
}

export function CryptRoom({ room }: { room: RoomDefinition }) {
  // Each room owns its instance buffers, including when returning to an earlier room.
  return <StaticCryptRoom key={room.id} room={room} />
}

export function CryptLighting({ roomId }: { roomId: string }) {
  const theme = cryptTheme(roomId)
  return <>
    <color attach="background" args={[theme.background]} />
    <fog attach="fog" args={[theme.background, 22, 44]} />
    <ambientLight color={theme.wing ? '#d1cbb4' : '#b9c8df'} intensity={1.25} />
    <hemisphereLight args={[theme.wing ? '#d4ccb0' : '#c3d2e8', '#24232c', 0.8]} />
    <directionalLight position={[4, 10, 6]} intensity={2.25} color={theme.wing ? '#f2d6a5' : '#e1e4ee'} castShadow
      shadow-mapSize={[1024, 1024]} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={10} shadow-camera-bottom={-10} shadow-normalBias={0.035} />
    <pointLight position={[0, 3.5, -3]} color={theme.light} intensity={22} distance={12} decay={2} />
    <pointLight position={[-5, 2.5, 1.5]} color={theme.wing ? '#d1a763' : '#8bcbc6'} intensity={11} distance={9} decay={2} />
  </>
}
