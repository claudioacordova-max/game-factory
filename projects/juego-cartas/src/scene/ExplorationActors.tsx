import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { MutableRefObject } from 'react'
import { Group } from 'three'
import type { ExplorationObject } from '../engine/spatial.js'
import { Block, Flame, GothicArch, Orb, Pebble, Round } from './CryptGeometry.js'
import { cryptTheme } from './cryptVisuals.js'
import type { RatAppearance } from './cryptVisuals.js'

const COAT = '#20202b', EDGE = '#505063', IRON = '#525c68', BRONZE = '#b69a67', BONE = '#cdc5ad'

export function Avatar({ walking }: { walking: MutableRefObject<number> }) {
  const left = useRef<Group>(null), right = useRef<Group>(null), tails = useRef<Group>(null)
  useFrame(() => {
    const swing = Math.sin(walking.current) * 0.4
    if (left.current) left.current.rotation.x = swing
    if (right.current) right.current.rotation.x = -swing
    if (tails.current) tails.current.rotation.x = Math.abs(swing) * 0.13
  })
  return <group>
    {[-0.105, 0.105].map((x, index) => <group key={x} ref={index ? right : left} position={[x, 0.52, 0]}>
      <Block at={[0, -0.2, 0]} size={[0.12, 0.4, 0.14]} color="#292832" />
      <Block at={[0, -0.4, 0.045]} size={[0.15, 0.2, 0.24]} color="#171a21" />
      <Block at={[0, -0.35, 0.14]} size={[0.15, 0.04, 0.025]} color={IRON} metal />
    </group>)}
    <Block at={[0, 0.96, 0]} size={[0.34, 0.58, 0.24]} color={COAT} />
    <group ref={tails} position={[0, 0.82, 0]}>
      {[-1, 1].map((s) => <Block key={s} at={[s * 0.12, -0.25, -0.035]} size={[0.21, 0.55, 0.25]} rotation={[0, 0, s * 0.08]} color={COAT} />)}
      <Block at={[0, -0.24, -0.17]} size={[0.025, 0.5, 0.02]} color={EDGE} />
    </group>
    <Block at={[0, 1.05, 0.13]} size={[0.12, 0.38, 0.015]} color="#676376" />
    {[-1, 1].map((s) => <group key={s}>
      <Block at={[s * 0.105, 1.12, 0.142]} size={[0.09, 0.28, 0.025]} rotation={[0, 0, -s * 0.3]} color={EDGE} />
      <Block at={[s * 0.235, 0.99, 0]} size={[0.13, 0.46, 0.17]} rotation={[0, 0, s * 0.09]} color={COAT} />
      <Orb at={[s * 0.25, 0.74, 0.02]} size={[0.065, 0.075, 0.06]} color="#ccb7a6" />
    </group>)}
    <Block at={[0, 0.84, 0.14]} size={[0.35, 0.055, 0.025]} color="#151820" />
    <Block at={[0, 0.84, 0.16]} size={[0.07, 0.055, 0.02]} color={BRONZE} metal />
    <Orb at={[0, 1.43, 0]} size={[0.17, 0.205, 0.16]} color="#d2bdab" />
    <Orb at={[0, 1.52, -0.025]} size={[0.19, 0.17, 0.17]} color="#151720" />
    <Block at={[-0.075, 1.44, 0.135]} size={[0.16, 0.21, 0.04]} rotation={[0, 0, -0.24]} color="#151720" />
    <Block at={[0.075, 1.43, 0.154]} size={[0.035, 0.035, 0.015]} color="#282b35" />
    {/* The broad brim and long split coat define the silhouette from the elevated camera. */}
    <Round at={[0, 1.66, -0.01]} size={[0.39, 0.045, 0.34]} color="#171923" />
    <Round at={[0, 1.79, -0.015]} size={[0.205, 0.23, 0.18]} color={COAT} />
    <Round at={[0, 1.7, -0.015]} size={[0.21, 0.055, 0.185]} color="#696076" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}><ringGeometry args={[0.31, 0.36, 24]} /><meshBasicMaterial color="#8fd9d0" /></mesh>
  </group>
}

export function Sentinel() {
  return <group>
    {[-0.13, 0.13].map((x) => <Block key={x} at={[x, 0.35, 0]} size={[0.14, 0.58, 0.22]} color={IRON} />)}
    <Block at={[0, 1, 0]} size={[0.3, 0.72, 0.23]} color="#58666d" />
    <Block at={[0, 0.73, 0.02]} size={[0.34, 0.28, 0.25]} color="#433f49" />
    <Orb at={[0, 1.59, 0]} size={[0.19, 0.24, 0.18]} color={IRON} />
    <Block at={[0, 1.59, 0.17]} size={[0.27, 0.055, 0.025]} color="#171e27" />
    <Block at={[0, 1.63, 0.19]} size={[0.16, 0.02, 0.015]} color="#a4d6d0" />
    <Pebble at={[0, 1.9, -0.02]} size={[0.06, 0.22, 0.11]} color={BRONZE} />
    <Block at={[-0.26, 1, 0.08]} size={[0.18, 0.65, 0.2]} color={IRON} />
    <Pebble at={[-0.23, 0.94, 0.2]} size={[0.14, 0.38, 0.07]} color={BRONZE} />
    <Round at={[0.31, 1.1, 0]} size={[0.025, 1.95, 0.025]} color="#907c56" />
    <Pebble at={[0.31, 2.16, 0]} size={[0.06, 0.2, 0.04]} color="#bbc8cd" />
    <Block at={[0.22, 1.14, 0]} size={[0.16, 0.14, 0.16]} color={IRON} />
  </group>
}

export function Custodian() {
  return <group>
    <mesh position={[0, 0.76, 0]} castShadow><coneGeometry args={[0.31, 1.5, 7]} /><meshStandardMaterial color="#403b59" roughness={0.94} /></mesh>
    <Block at={[0, 0.73, 0.25]} size={[0.095, 1.1, 0.025]} color="#9c969f" />
    <Orb at={[0, 1.53, 0]} size={[0.25, 0.31, 0.23]} color="#545167" />
    <Orb at={[0, 1.52, 0.18]} size={[0.15, 0.2, 0.05]} color="#171d2b" />
    <Block at={[0, 1.47, 0.224]} size={[0.1, 0.1, 0.012]} color={BONE} />
    <Block at={[-0.24, 1.05, 0]} size={[0.16, 0.5, 0.22]} color="#403b59" rotation={[0, 0, -0.2]} />
    <Round at={[0.29, 0.95, 0]} size={[0.026, 1.75, 0.026]} color={BRONZE} />
    <mesh position={[0.29, 1.94, 0]}><torusGeometry args={[0.1, 0.025, 6, 12]} /><meshStandardMaterial color={BRONZE} metalness={0.4} /></mesh>
    <Orb at={[0.29, 1.94, 0]} size={[0.055, 0.055, 0.055]} color="#aedbe4" />
    <Block at={[0, 1.09, 0.26]} size={[0.17, 0.12, 0.035]} color={BRONZE} />
  </group>
}

export function Guardian() {
  return <group>
    {[-0.19, 0.19].map((x) => <group key={x}>
      <Block at={[x, 0.42, 0]} size={[0.24, 0.72, 0.29]} color={IRON} />
      <Block at={[x, 0.12, 0.035]} size={[0.26, 0.22, 0.36]} color="#353a49" />
      <Pebble at={[x * 1.3, 1.55, 0]} size={[0.12, 0.2, 0.24]} color={BRONZE} />
    </group>)}
    <Block at={[0, 1.18, 0]} size={[0.62, 0.78, 0.39]} color="#606477" />
    <Block at={[0, 1.2, 0.21]} size={[0.16, 0.58, 0.025]} color={BRONZE} />
    <Pebble at={[0, 1.4, 0.24]} size={[0.1, 0.13, 0.05]} color="#c3b5eb" />
    <Orb at={[0, 1.84, 0]} size={[0.25, 0.28, 0.22]} color="#606477" />
    <Block at={[0, 1.82, 0.21]} size={[0.29, 0.065, 0.025]} color="#222330" />
    <Block at={[0, 1.85, 0.23]} size={[0.17, 0.023, 0.012]} color="#d3bdea" />
    {[-0.16, 0, 0.16].map((x) => <Pebble key={x} at={[x, 2.14, 0]} size={[0.055, x === 0 ? 0.23 : 0.16, 0.075]} color={BRONZE} />)}
    <Block at={[-0.31, 1.03, 0]} size={[0.11, 0.68, 0.2]} color={IRON} />
    <Block at={[0.31, 0.75, 0.17]} size={[0.075, 1.2, 0.08]} color={BRONZE} />
    <Block at={[0.31, 0.25, 0.17]} size={[0.11, 0.64, 0.1]} color="#b8c0ca" />
  </group>
}

export function Rat({ appearance = 'rat' }: { appearance?: RatAppearance }) {
  const color = appearance === 'large' ? '#847261' : appearance === 'clumsy' ? '#9a927b' : appearance === 'biter' ? '#514d43' : '#796858'
  return <group>
    <Orb at={[0, 0.25, -0.04]} size={[appearance === 'clumsy' ? 0.27 : 0.23, appearance === 'large' ? 0.27 : 0.2, 0.22]} color={color} />
    <Orb at={[0, 0.36, 0.12]} size={[0.17, 0.17, 0.15]} color={color} />
    <Pebble at={[0, 0.31, 0.24]} size={[0.1, 0.08, 0.075]} color="#b69985" />
    <Orb at={[0, 0.33, 0.301]} size={[0.035, 0.035, 0.025]} color="#352b2b" />
    {[-1, 1].map((side) => <group key={side}>
      <Orb at={[side * 0.15, appearance === 'clumsy' && side < 0 ? 0.43 : 0.48, 0.1]} size={[0.09, 0.105, 0.045]} color={appearance === 'biter' ? '#c39d80' : '#c49b89'} />
      <Orb at={[side * 0.105, 0.4, 0.235]} size={[0.024, 0.027, 0.018]} color="#e0c690" />
      <Block at={[side * 0.17, 0.07, 0.02]} size={[0.1, 0.1, 0.18]} color="#b69985" />
      {appearance === 'biter' && <Block at={[side * 0.04, 0.26, 0.284]} size={[0.035, 0.09, 0.025]} color="#e1d7b7" />}
    </group>)}
    {appearance === 'large' && <Orb at={[0, 0.43, -0.07]} size={[0.14, 0.07, 0.16]} color="#49443b" />}
    <Round at={[0.1, 0.11, -0.26]} size={[0.023, 0.2, 0.023]} rotation={[Math.PI / 2, 0, -0.8]} color="#ac8577" />
  </group>
}

export function RatMatriarch() {
  return <group>
    <Orb at={[0, 0.5, -0.035]} size={[0.32, 0.44, 0.27]} color="#726458" />
    <Orb at={[0, 0.93, 0.035]} size={[0.245, 0.27, 0.22]} color="#978573" />
    <Pebble at={[0, 0.84, 0.23]} size={[0.13, 0.1, 0.09]} color="#bd9b88" />
    <Orb at={[0, 0.88, 0.3]} size={[0.045, 0.04, 0.025]} color="#3d2d2b" />
    {[-1, 1].map((s) => <group key={s}>
      <Orb at={[s * 0.22, 1.12, 0]} size={[0.11, 0.15, 0.055]} color="#b18b7e" />
      <Orb at={[s * 0.13, 0.99, 0.22]} size={[0.035, 0.04, 0.02]} color="#eac77c" />
      <Block at={[s * 0.22, 0.11, 0.1]} size={[0.18, 0.18, 0.26]} color="#aa8e7e" />
      <Orb at={[s * 0.25, 0.48, 0.17]} size={[0.08, 0.22, 0.08]} color="#978573" />
      <Block at={[s * 0.045, 0.78, 0.3]} size={[0.04, 0.1, 0.025]} color={BONE} />
    </group>)}
    <Round at={[0, 1.19, 0.02]} size={[0.19, 0.07, 0.17]} color={BRONZE} metal />
    {[-0.12, 0, 0.12].map((x) => <Pebble key={x} at={[x, 1.32, 0.055]} size={[0.055, x ? 0.14 : 0.2, 0.06]} color={BRONZE} />)}
    <Round at={[0, 0.75, 0]} size={[0.27, 0.065, 0.24]} color="#846176" />
    <Pebble at={[0, 0.72, 0.25]} size={[0.07, 0.1, 0.035]} color={BRONZE} />
    <Round at={[-0.15, 0.13, -0.21]} size={[0.035, 0.24, 0.035]} rotation={[Math.PI / 2, 0, 0.8]} color="#b18b7e" />
  </group>
}

export function WorldObject({ object, roomId, onInteract }: { object: ExplorationObject; roomId: string; onInteract: (id: string) => void }) {
  if (object.kind === 'enemy' && object.status === 'completed') return null
  const theme = cryptTheme(roomId)
  const available = object.status === 'available'
  const color = available ? '#8bd8ca' : object.status === 'locked' ? '#697780' : '#b49b70'
  return <group position={[object.position.x, 0, object.position.z]} onClick={(event) => { event.stopPropagation(); onInteract(object.id) }}>
    {/* Flat halo communicates interaction without suggesting a raised, traversable plinth. */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} scale={[1, object.kind === 'exit' ? 0.45 : 1, 1]}><ringGeometry args={[object.kind === 'exit' ? 0.68 : 0.43, object.kind === 'exit' ? 0.72 : 0.47, 32]} /><meshBasicMaterial color={color} /></mesh>
    {object.kind === 'chest' && <group>
      <Block at={[0, 0.28, 0]} size={[0.75, 0.5, 0.6]} color="#5f4738" />
      {[-0.24, 0.24].map((x) => <Block key={x} at={[x, 0.29, 0]} size={[0.07, 0.51, 0.62]} color={BRONZE} metal />)}
      <group position={[0, 0.52, -0.3]} rotation={[object.status === 'completed' ? -1.05 : 0, 0, 0]}>
        <Block at={[0, 0.045, 0.3]} size={[0.75, 0.13, 0.6]} color={BRONZE} metal />
        <Block at={[0, 0.12, 0.3]} size={[0.56, 0.025, 0.42]} color="#694f3e" />
      </group>
      <Block at={[0, 0.39, 0.31]} size={[0.13, 0.18, 0.025]} color={color} metal />
    </group>}
    {object.kind === 'shrine' && <group>
      <Block at={[0, 0.12, 0]} size={[0.75, 0.24, 0.65]} color={theme.inset} />
      <Round at={[0, 0.48, 0]} size={[0.25, 0.6, 0.25]} color={theme.stone} />
      <Block at={[0, 0.82, 0]} size={[0.6, 0.12, 0.55]} color={theme.trim} />
      <mesh position={[0, 1.13, 0]}><octahedronGeometry args={[0.22]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={available ? 0.9 : 0.03} /></mesh>
      {[-0.26, 0.26].map((x) => <group key={x} position={[x, 0.99, 0]}><Round size={[0.03, 0.24, 0.03]} color={BONE} />{available && <group position={[0, 0.16, 0]}><Flame color="#92ded2" /></group>}</group>)}
    </group>}
    {object.kind === 'exit' && <group>
      <GothicArch width={1.3} height={2.05} depth={0.28} color={theme.wing ? '#756849' : theme.stone} trim={theme.trim} />
      <Block at={[0, 0.055, 0]} size={[1.3, 0.11, 0.3]} color={theme.inset} />
      <mesh position={[0, 0.9, 0]}><planeGeometry args={[0.92, 1.6]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={available ? 0.3 : 0.01} transparent opacity={available ? 0.24 : 0.55} side={2} /></mesh>
      {/* A real barrier in both states matches the unchanged interaction-only portal occupancy. */}
      {[-0.3, 0, 0.3].map((x) => <Block key={x} at={[x, 0.85, 0]} size={[0.045, 1.5, 0.06]} color={available ? theme.trim : '#48515a'} />)}
      <Pebble at={[0, 1.76, 0.15]} size={[0.075, 0.11, 0.035]} color={color} />
    </group>}
    {object.status === 'locked' && <group position={[0, object.kind === 'exit' ? 1 : 0.75, 0.32]}>
      <Block size={[0.2, 0.2, 0.06]} color={BRONZE} metal />
      <mesh position={[0, 0.14, 0]}><torusGeometry args={[0.065, 0.02, 6, 12, Math.PI]} /><meshStandardMaterial color={BRONZE} metalness={0.5} /></mesh>
    </group>}
  </group>
}
