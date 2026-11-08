import type { ReactNode } from 'react'
import type { ExplorationObject } from '../engine/spatial.js'
import { Block, cryptMaterial, Flame, Glow, GothicArch, Orb, Pebble, Round } from './CryptGeometry.js'
import { Custodian, Guardian, Rat, RatMatriarch, Sentinel, WorldObject } from './ExplorationActors.js'
import { cryptTheme, RUNE_GLOW, V04B_FIGURE_GROUPS } from './cryptVisuals.js'
import type { V04BFigure } from './cryptVisuals.js'

/**
 * V0.4B object renderer (M6b). Bosses and rats reuse the approved models; El Devoto and skirmish creatures are
 * provisional low-poly figures from shared primitives (no final art). Doors in normal state reuse WorldObject.
 */
const BONE = '#cdc5ad', IRON = '#525c68', BRONZE = '#b69a67'
/** Robed body: its cone geometry belongs to the figure (released on unmount, like the approved Custodian). */
function Robe({ y, size, color }: { y: number; size: [number, number, number]; color: string }) {
  return <mesh position={[0, y, 0]} scale={size} material={cryptMaterial(color)} castShadow><coneGeometry args={[1, 1, 7]} /></mesh>
}

function Halo({ status, wide = false, size = 1 }: { status: ExplorationObject['status']; wide?: boolean; size?: number }) {
  const color = status === 'available' ? '#8bd8ca' : status === 'locked' ? '#697780' : '#b49b70'
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} scale={[size, wide ? 0.45 : size, 1]}>
    <ringGeometry args={[wide ? 0.68 : 0.43, wide ? 0.72 : 0.47, 32]} /><meshBasicMaterial color={color} />
  </mesh>
}

// ---------- Provisional figures ----------
function Risen() {
  return <group>
    <Robe y={0.62} size={[0.26, 1.2, 0.22]} color="#2c2a3a" />
    <Orb at={[0, 1.32, 0]} size={[0.15, 0.17, 0.14]} color="#3b374c" />
    {[-0.055, 0.055].map((x) => <Block key={x} at={[x, 1.34, 0.13]} size={[0.04, 0.02, 0.01]} color="#c9d4ff" />)}
    {[-1, 1].map((s) => <Block key={s} at={[s * 0.2, 0.95, 0.03]} size={[0.07, 0.5, 0.08]} rotation={[0, 0, s * 0.35]} color="#2c2a3a" />)}
  </group>
}

function Slime() {
  return <group>
    <Orb at={[0, 0.26, 0]} size={[0.36, 0.26, 0.32]} color="#7d8758" />
    <Orb at={[0.05, 0.45, 0.02]} size={[0.2, 0.15, 0.18]} color="#8e9a63" />
    {[[-0.22, 0.4, 0.6], [0.2, 0.35, -0.8], [0.02, 0.58, 0.2]].map(([x, y, r]) => <Block key={x} at={[x, y, 0.1]} size={[0.04, 0.28, 0.04]} rotation={[0, 0, r]} color={BONE} />)}
    <Orb at={[-0.12, 0.42, 0.22]} size={[0.08, 0.08, 0.07]} color={BONE} />
  </group>
}

function Skeleton() {
  return <group>
    {[-0.07, 0.07].map((x) => <Block key={x} at={[x, 0.32, 0]} size={[0.05, 0.62, 0.05]} color={BONE} />)}
    <Block at={[0, 0.66, 0]} size={[0.22, 0.07, 0.1]} color={BONE} />
    <Block at={[0, 0.9, 0]} size={[0.04, 0.45, 0.04]} color={BONE} />
    {[0.82, 0.93, 1.04].map((y) => <Block key={y} at={[0, y, 0.02]} size={[0.26 - (y - 0.82) * 0.3, 0.035, 0.14]} color={BONE} />)}
    {[-1, 1].map((s) => <Block key={s} at={[s * 0.17, 0.85, 0]} size={[0.04, 0.42, 0.04]} rotation={[0, 0, s * 0.18]} color={BONE} />)}
    <Orb at={[0, 1.27, 0]} size={[0.11, 0.12, 0.11]} color={BONE} />
    <Block at={[0, 1.24, 0.095]} size={[0.1, 0.03, 0.01]} color="#2a2622" />
  </group>
}

function Ghoul() {
  return <group>
    {[-0.09, 0.09].map((x) => <Block key={x} at={[x, 0.27, 0]} size={[0.09, 0.52, 0.1]} color="#55604f" />)}
    <Orb at={[0, 0.78, 0.05]} size={[0.23, 0.3, 0.2]} rotation={[0.45, 0, 0]} color="#6d7a63" />
    <Orb at={[0, 1.05, 0.2]} size={[0.13, 0.13, 0.13]} color="#7f8b72" />
    {[-0.045, 0.045].map((x) => <Block key={x} at={[x, 1.07, 0.32]} size={[0.03, 0.02, 0.01]} color="#e2d07a" />)}
    {[-1, 1].map((s) => <Block key={s} at={[s * 0.23, 0.6, 0.12]} size={[0.06, 0.62, 0.07]} rotation={[0.25, 0, s * 0.12]} color="#55604f" />)}
  </group>
}

function Spider() {
  return <group>
    <Orb at={[0, 0.3, -0.05]} size={[0.26, 0.17, 0.3]} color="#3b3433" />
    <Orb at={[0, 0.28, 0.24]} size={[0.13, 0.1, 0.12]} color="#4a403e" />
    {[-0.04, 0.04].map((x) => <Block key={x} at={[x, 0.32, 0.35]} size={[0.025, 0.025, 0.01]} color="#d24f3f" />)}
    {[-1, 1].flatMap((s) => [-0.5, -0.15, 0.15, 0.5].map((angle) => <Block key={`${s}:${angle}`} at={[s * 0.3, 0.2, angle * 0.35]} size={[0.38, 0.035, 0.035]} rotation={[0, angle * s, s * -0.45]} color="#2c2625" />))}
  </group>
}

function Knight() {
  return <group>
    {[-0.1, 0.1].map((x) => <Block key={x} at={[x, 0.33, 0]} size={[0.11, 0.58, 0.16]} color={IRON} />)}
    <Block at={[0, 0.92, 0]} size={[0.32, 0.62, 0.22]} color="#4f5560" />
    <Orb at={[0, 1.38, 0]} size={[0.15, 0.18, 0.15]} color={IRON} />
    <Block at={[0, 1.38, 0.14]} size={[0.18, 0.03, 0.02]} color="#9ab7c2" />
    <Block at={[0.26, 0.85, 0.12]} size={[0.05, 0.85, 0.03]} color="#b8c0ca" />
    <Block at={[-0.24, 0.9, 0.1]} size={[0.06, 0.45, 0.32]} color="#6b5a48" />
  </group>
}

function Golem({ glow }: { glow: string }) {
  return <group>
    {[-0.16, 0.16].map((x) => <Block key={x} at={[x, 0.27, 0]} size={[0.2, 0.52, 0.22]} color="#6c6b64" />)}
    <Block at={[0, 0.85, 0]} size={[0.56, 0.6, 0.36]} color="#7b7a72" />
    <Block at={[0, 1.3, 0.02]} size={[0.24, 0.22, 0.22]} color="#6c6b64" />
    {[-1, 1].map((s) => <Block key={s} at={[s * 0.38, 0.72, 0.02]} size={[0.18, 0.6, 0.2]} color="#6c6b64" />)}
    <Glow at={[0, 0.9, 0.185]} size={[0.12, 0.12, 0.01]} rotation={[0, 0, Math.PI / 4]} color={glow} />
  </group>
}

function Devoto() {
  return <group>
    <Robe y={0.72} size={[0.31, 1.45, 0.31]} color="#4a2f33" />
    <Orb at={[0, 1.48, 0]} size={[0.24, 0.29, 0.22]} color="#3d2a2e" />
    <Orb at={[0, 1.46, 0.17]} size={[0.14, 0.18, 0.05]} color="#170f12" />
    <Block at={[0, 1.02, 0.25]} size={[0.16, 0.1, 0.03]} color={BRONZE} />
    {/* Ritual brazier at its side. */}
    <group position={[0.52, 0, 0.12]}>
      {[0, 2.1, 4.2].map((a) => <Round key={a} at={[Math.sin(a) * 0.1, 0.32, Math.cos(a) * 0.1]} size={[0.018, 0.62, 0.018]} rotation={[Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2]} color={IRON} metal />)}
      <Round at={[0, 0.66, 0]} size={[0.17, 0.09, 0.17]} color={BRONZE} metal />
      <group position={[0, 0.82, 0]}><Flame color="#ef8a4c" /></group>
    </group>
  </group>
}

function Figure({ figure, glow }: { figure: V04BFigure; glow: string }) {
  switch (figure) {
    case 'rat': return <Rat />
    case 'scavenger': return <Rat appearance="large" />
    case 'risen': return <Risen />
    case 'slime': return <Slime />
    case 'skeleton': return <Skeleton />
    case 'ghoul': return <Ghoul />
    case 'spider': return <Spider />
    case 'knight': return <Knight />
    case 'golem': return <Golem glow={glow} />
  }
}

export function V04BEnemyModel({ roomId, glow }: { roomId: string; glow: string }) {
  if (roomId === '02') return <Sentinel />
  if (roomId === '06') return <Custodian />
  if (roomId === '19') return <Guardian />
  if (roomId === '09') return <RatMatriarch />
  if (roomId === '18') return <Devoto />
  return <group>{(V04B_FIGURE_GROUPS[roomId] ?? []).map((model, index) => <group key={index} position={[model.x, 0, model.z]} rotation={[0, model.yaw ?? 0, 0]}
    scale={[model.scale, model.scale * (model.heightScale ?? 1), model.scale]}><Figure figure={model.figure} glow={glow} /></group>)}</group>
}

// ---------- Interactive features ----------
function Altar({ ready, theme }: { ready: boolean; theme: ReturnType<typeof cryptTheme> }) {
  return <group>
    <Block at={[0, 0.1, 0]} size={[0.82, 0.2, 0.66]} color={theme.inset} />
    <Block at={[0, 0.45, 0]} size={[0.62, 0.5, 0.48]} color={theme.stone} />
    <Block at={[0, 0.75, 0]} size={[0.82, 0.1, 0.64]} color={theme.trim} />
    <Round at={[0, 0.83, 0]} size={[0.16, 0.06, 0.16]} color={BRONZE} metal />
    {ready ? <Glow at={[0, 1.02, 0]} size={[0.16, 0.16, 0.16]} rotation={[Math.PI / 4, 0, Math.PI / 4]} color={theme.glow ?? theme.light} />
      : <Orb at={[0, 0.95, 0]} size={[0.1, 0.1, 0.1]} color="#6f6d68" />}
    <Block at={[0, 0.45, 0.245]} size={[0.3, 0.05, 0.01]} color={theme.trim} />
  </group>
}

function Inscription({ theme }: { theme: ReturnType<typeof cryptTheme> }) {
  const glow = theme.glow ?? theme.light
  return <group>
    <Block at={[0, 0.1, 0]} size={[0.8, 0.2, 0.4]} color={theme.inset} />
    <Block at={[0, 0.85, 0]} size={[0.66, 1.3, 0.2]} color={theme.stone} />
    <Block at={[0, 1.55, 0]} size={[0.74, 0.1, 0.26]} color={theme.trim} />
    {[[-0.18, 1.2, 0.5], [0.05, 1.22, -0.4], [0.2, 0.95, 0], [-0.12, 0.85, -0.7], [0.08, 0.62, 0.9]].map(([x, y, r]) => <Glow key={`${x}:${y}`} at={[x, y, 0.105]} size={[0.035, 0.2, 0.01]} rotation={[0, 0, r]} color={glow} />)}
  </group>
}

function RuneMark({ rune, color }: { rune: string; color: string }) {
  if (rune === 'hueso') return <group><Glow size={[0.04, 0.22, 0.01]} color={color} /><Glow size={[0.16, 0.04, 0.01]} at={[0, 0.04, 0]} color={color} /></group>
  if (rune === 'sombra') return <group>{[-1, 1].map((s) => <Glow key={s} at={[s * 0.04, 0, 0]} size={[0.035, 0.2, 0.01]} rotation={[0, 0, s * 0.45]} color={color} />)}</group>
  return <Glow size={[0.12, 0.12, 0.01]} rotation={[0, 0, Math.PI / 4]} color={color} />
}

function Pedestal({ rune, lit, theme }: { rune: string; lit: boolean; theme: ReturnType<typeof cryptTheme> }) {
  const color = RUNE_GLOW[rune] ?? theme.light
  return <group scale={1.25}>
    <Block at={[0, 0.08, 0]} size={[0.56, 0.16, 0.5]} color={theme.inset} />
    <Round at={[0, 0.48, 0]} size={[0.18, 0.66, 0.18]} color={theme.stone} />
    <Block at={[0, 0.85, 0]} size={[0.5, 0.1, 0.46]} color={theme.trim} />
    <group position={[0, 0.5, 0.185]}><RuneMark rune={rune} color={lit ? color : '#4c5262'} /></group>
    {lit ? <Glow at={[0, 1.08, 0]} size={[0.15, 0.15, 0.15]} rotation={[Math.PI / 4, 0, Math.PI / 4]} color={color} />
      : <Block at={[0, 1.0, 0]} size={[0.13, 0.13, 0.13]} rotation={[Math.PI / 4, 0, Math.PI / 4]} color="#454b58" />}
  </group>
}

function CrackedWall({ theme }: { theme: ReturnType<typeof cryptTheme> }) {
  const glow = theme.glow ?? theme.light
  // Interaction point stays in the room; the cracked slab sits against the west masonry.
  return <group position={[-1.05, 0, 0]}>
    <Block at={[0, 1.15, 0]} size={[0.42, 2.3, 1.7]} color={theme.stone} />
    <Block at={[0.02, 0.1, 0]} size={[0.46, 0.2, 1.74]} color={theme.inset} />
    {[[0.35, 1.5, 0.55], [0.1, 1.05, -0.4], [-0.2, 0.7, 0.3], [0.25, 0.55, -0.7]].map(([z, y, r]) => <Block key={`${z}:${y}`} at={[0.215, y, z]} size={[0.01, 0.42, 0.035]} rotation={[r, 0, 0]} color="#16171c" />)}
    {[0, 1, 2, 3].map((i) => <Glow key={i} at={[0.22, 1.25 + Math.cos(i * Math.PI / 2) * 0.22, Math.sin(i * Math.PI / 2) * 0.22]} size={[0.01, 0.13, 0.04]} rotation={[i * Math.PI / 2, 0, 0]} color={glow} />)}
    {/* Faint light leaking through the crack, without adding a scene light. */}
    <mesh position={[0.23, 1.25, 0]} rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.42, 20]} /><meshBasicMaterial color={glow} transparent opacity={0.09} depthWrite={false} /></mesh>
    {[-0.5, 0.45, 0.1].map((z, i) => <Pebble key={z} at={[0.4 + i * 0.15, 0.09, z]} size={[0.14, 0.09, 0.12]} rotation={[0, i, 0]} color={theme.stone} />)}
  </group>
}

function TitanDoor({ status, theme }: { status: ExplorationObject['status']; theme: ReturnType<typeof cryptTheme> }) {
  const open = status === 'available'
  const glow = open ? '#8bd8ca' : theme.glow ?? '#a68cf2'
  return <group>
    <GothicArch width={1.9} height={2.7} depth={0.34} color={theme.stone} trim={theme.trim} />
    <Block at={[0, 0.055, 0]} size={[1.9, 0.11, 0.36]} color={theme.inset} />
    {[-1, 1].map((s) => <Glow key={s} at={[s * 0.82, 1.2, 0.18]} size={[0.04, 1.4, 0.01]} color={glow} />)}
    <Glow at={[0, 2.62, 0.18]} size={[0.16, 0.16, 0.01]} rotation={[0, 0, Math.PI / 4]} color={glow} />
    {open ? <mesh position={[0, 1.1, 0]}><planeGeometry args={[1.3, 2]} /><meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.3} transparent opacity={0.24} side={2} /></mesh>
      : <group>
        {[-0.34, 0.34].map((x) => <Block key={x} at={[x, 1.05, 0]} size={[0.66, 2, 0.12]} color={theme.inset} />)}
        {[[-0.34, 1.4], [0.34, 1.4], [-0.34, 0.7], [0.34, 0.7]].map(([x, y]) => <Glow key={`${x}:${y}`} at={[x, y, 0.065]} size={[0.16, 0.035, 0.01]} rotation={[0, 0, x > 0 ? 0.7 : -0.7]} color={glow} />)}
        <Round at={[0, 1.1, 0.08]} size={[0.26, 0.05, 0.26]} rotation={[Math.PI / 2, 0, 0]} color={BRONZE} metal />
        <Glow at={[0, 1.1, 0.11]} size={[0.12, 0.12, 0.01]} rotation={[0, 0, Math.PI / 4]} color={glow} />
      </group>}
  </group>
}

function Interactive({ object, onInteract, children, rotation = 0 }: { object: ExplorationObject; onInteract: (id: string) => void; children: ReactNode; rotation?: number }) {
  return <group position={[object.position.x, 0, object.position.z]} rotation={[0, rotation, 0]} onClick={(event) => { event.stopPropagation(); onInteract(object.id) }}>{children}</group>
}

/** Side-wall doors turn to sit along their wall, facing into the room (matches their rotated body). */
function SideAware({ object, children }: { object: ExplorationObject; children: ReactNode }) {
  if (!object.sideWall) return <>{children}</>
  return <group position={[object.position.x, 0, object.position.z]} rotation={[0, object.position.x < 0 ? Math.PI / 2 : -Math.PI / 2, 0]}>{children}</group>
}

export function V04BWorldObject({ object, roomId, onInteract }: { object: ExplorationObject; roomId: string; onInteract: (id: string) => void }) {
  if (object.kind === 'enemy' && object.status === 'completed') return null
  const theme = cryptTheme(roomId)
  const [kind, a, b] = (object.visual ?? '').split(':')
  if (object.kind === 'exit') {
    const rotation = object.sideWall ? object.position.x < 0 ? Math.PI / 2 : -Math.PI / 2 : 0
    if (a === 'titan') return <Interactive object={object} onInteract={onInteract} rotation={rotation}><Halo status={object.status} wide /><TitanDoor status={object.status} theme={theme} /></Interactive>
    const local = object.sideWall ? { ...object, position: { x: 0, z: 0 } } : object
    return <SideAware object={object}>
      <WorldObject object={local} roomId={roomId} onInteract={onInteract} />
      {a === 'breach' && <group position={[local.position.x, 0, local.position.z]}>{[-0.85, 0.8, -0.95].map((x, i) => <Pebble key={i} at={[x, 0.1, 0.2 - i * 0.1]} size={[0.16, 0.1, 0.13]} rotation={[0, i, 0]} color={theme.stone} />)}</group>}
    </SideAware>
  }
  return <Interactive object={object} onInteract={onInteract}>
    <Halo status={object.status} size={kind === 'pedestal' ? 1.45 : 1} />
    {kind === 'enemy' && <V04BEnemyModel roomId={a} glow={theme.glow ?? theme.light} />}
    {kind === 'altar' && <Altar ready={a === 'ready'} theme={theme} />}
    {kind === 'inscription' && <Inscription theme={theme} />}
    {kind === 'pedestal' && <Pedestal rune={a} lit={b === 'lit'} theme={theme} />}
    {kind === 'cracked-wall' && <CrackedWall theme={theme} />}
  </Interactive>
}
