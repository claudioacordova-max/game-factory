import { useLayoutEffect, useMemo, useRef } from 'react'
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, MeshStandardMaterial, SphereGeometry } from 'three'
import type { ReactNode } from 'react'
import type { MasonryBlock } from './cryptVisuals.js'

// Shared low-poly geometry/materials survive room changes; no per-frame allocations.
const box = new BoxGeometry(1, 1, 1)
const cylinder = new CylinderGeometry(1, 1, 1, 10)
const sphere = new SphereGeometry(1, 10, 7)
const rock = new IcosahedronGeometry(1, 0)
const materials = new Map<string, MeshStandardMaterial>()
export function cryptMaterial(color: string, metal = false): MeshStandardMaterial {
  const key = `${color}:${metal}`
  let material = materials.get(key)
  if (!material) {
    material = new MeshStandardMaterial({ color, roughness: metal ? 0.55 : 0.94, metalness: metal ? 0.5 : 0, flatShading: true })
    materials.set(key, material)
  }
  return material
}
/** Unlit shared materials for runes and mana light (V0.4B); batched like the other static pieces. */
const glowMaterials = new Map<string, MeshBasicMaterial>()
export function cryptGlowMaterial(color: string): MeshBasicMaterial {
  let material = glowMaterials.get(color)
  if (!material) {
    material = new MeshBasicMaterial({ color })
    glowMaterials.set(color, material)
  }
  return material
}
type V3 = [number, number, number]
interface PieceProps { at?: V3; size: V3; color: string; rotation?: V3; metal?: boolean; children?: ReactNode }
export function Block({ at, size, color, rotation, metal }: PieceProps) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={box} material={cryptMaterial(color, metal)} castShadow receiveShadow dispose={null} />
}
export function Round({ at, size, color, rotation, metal }: PieceProps) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={cylinder} material={cryptMaterial(color, metal)} castShadow receiveShadow dispose={null} />
}
export function Pebble({ at, size, color, rotation }: PieceProps) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={rock} material={cryptMaterial(color)} castShadow receiveShadow dispose={null} />
}
export function Orb({ at, size, color, rotation }: PieceProps) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={sphere} material={cryptMaterial(color)} castShadow dispose={null} />
}
/** Glowing rune stroke or mana inlay: shared box geometry, unlit shared material, no shadows. */
export function Glow({ at, size, color, rotation }: PieceProps) {
  return <mesh position={at} scale={size} rotation={rotation} geometry={box} material={cryptGlowMaterial(color)} dispose={null} />
}
export function Masonry({ blocks, color }: { blocks: readonly MasonryBlock[]; color: string }) {
  const ref = useRef<InstancedMesh>(null)
  const matrix = useMemo(() => new Matrix4(), [])
  const material = cryptMaterial(color)
  useLayoutEffect(() => {
    blocks.forEach((block, index) => {
      matrix.makeScale(block.width, block.height, block.depth).setPosition(block.x, block.y, block.z)
      ref.current!.setMatrixAt(index, matrix)
    })
    ref.current!.instanceMatrix.needsUpdate = true
    ref.current!.computeBoundingSphere()
    // R3F reconstructs the mesh when its material constructor argument changes.
    // Stable floor data must also be applied to that replacement instance.
  }, [blocks, matrix, material])
  return <instancedMesh ref={ref} args={[box, material, blocks.length]} castShadow receiveShadow dispose={null} />
}

/** A pointed, segmented funerary arch; local width and depth include every stone. */
export function GothicArch({ width = 1.3, height = 2, depth = 0.28, color = '#59616b', trim = '#a18c66' }: {
  width?: number; height?: number; depth?: number; color?: string; trim?: string
}) {
  const pier = width * 0.13, opening = width / 2 - pier
  return <group>
    {[-1, 1].map((side) => <group key={side}>
      <Block at={[side * (width - pier) / 2, height * 0.34 + 0.1, 0]} size={[pier, height * 0.68 - 0.2, depth]} color={color} />
      <Block at={[side * (width - pier) / 2, 0.1, 0]} size={[pier, 0.2, depth]} color={trim} />
      <Block at={[side * opening / 2, height * 0.81, 0]} size={[pier, Math.hypot(opening, height * 0.33), depth]}
        rotation={[0, 0, side * 0.73]} color={color} />
    </group>)}
    <Pebble at={[0, height, 0]} size={[pier * 0.8, pier, depth * 0.6]} color={trim} />
  </group>
}

export function FuneralSeal({ radius = 1, color = '#a18c66' }: { radius?: number; color?: string }) {
  return <group rotation={[-Math.PI / 2, 0, 0]}>
    <mesh><ringGeometry args={[radius * 0.91, radius, 48]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, 0, 0.001]}><ringGeometry args={[radius * 0.65, radius * 0.68, 32]} /><meshBasicMaterial color={color} /></mesh>
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <mesh key={i} position={[Math.sin(i * Math.PI / 4) * radius * 0.8, Math.cos(i * Math.PI / 4) * radius * 0.8, 0]} rotation={[0, 0, -i * Math.PI / 4]}>
      <planeGeometry args={[radius * 0.035, radius * 0.15]} /><meshBasicMaterial color={color} />
    </mesh>)}
  </group>
}

export function Flame({ color }: { color: string }) {
  return <mesh scale={[0.09, 0.23, 0.09]}><octahedronGeometry args={[1]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} /></mesh>
}
