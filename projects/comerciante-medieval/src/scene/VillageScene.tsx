import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { npcsForVillage, type VillageNpc } from './world.js'
import type { VillageId } from '../engine/model.js'

interface VillageSceneProps {
  villageId: VillageId
  onNearbyChange: (npc: VillageNpc | undefined) => void
  onInteract: (npc: VillageNpc) => void
}

const INTERACTION_DISTANCE = 1.85
const WALK_SPEED = 4.5

function House({ position, roofColor, business = false }: { position: readonly [number, number, number]; roofColor: string; business?: boolean }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={business ? [1.25, 1.4, 1.2] : [1.35, 1.4, 1.25]} />
        <meshStandardMaterial color={business ? '#b9a583' : '#d8c9a7'} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.05, 0.85, 4]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      <mesh position={[0, 0.48, 0.62]}>
        <boxGeometry args={[0.34, 0.72, 0.08]} />
        <meshStandardMaterial color="#594332" />
      </mesh>
      {business && <mesh position={[0.58, 0.9, 0.63]}><boxGeometry args={[0.3, 0.28, 0.08]} /><meshStandardMaterial color="#f3cf72" /></mesh>}
    </group>
  )
}

function Person({ npc, active }: { npc: VillageNpc; active: boolean }) {
  const color = active ? '#f4c95d' : '#6d4353'
  return (
    <group position={npc.position}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.32, 0.38, 0.18, 16]} />
        <meshStandardMaterial color={active ? '#e2b83f' : '#79654c'} />
      </mesh>
      <mesh position={[0, 0.88, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.55, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 10]} />
        <meshStandardMaterial color="#d9aa7a" />
      </mesh>
    </group>
  )
}

function VillageGround({ villageId }: { villageId: VillageId }) {
  const fieldVillage = villageId === 'village-a'
  const roof = fieldVillage ? '#814d3f' : '#4e5965'
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[22, 22]} />
        <meshStandardMaterial color={fieldVillage ? '#71804c' : '#77756e'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[3.2, 22]} />
        <meshStandardMaterial color={fieldVillage ? '#bba77c' : '#aaa397'} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={[22, 3.2]} />
        <meshStandardMaterial color={fieldVillage ? '#bba77c' : '#aaa397'} />
      </mesh>
      {fieldVillage ? (
        <>
          {[-8.5, 8.5].map(x => <group key={x} position={[x, 0, -7]}><mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.16, 0.24, 2.2]} /><meshStandardMaterial color="#61472f" /></mesh><mesh position={[0, 2.25, 0]}><sphereGeometry args={[0.9, 12, 10]} /><meshStandardMaterial color="#3e6942" /></mesh></group>)}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, 7]}><planeGeometry args={[3.5, 3]} /><meshStandardMaterial color="#899a54" /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8, 0.02, 7]}><planeGeometry args={[3.5, 3]} /><meshStandardMaterial color="#899a54" /></mesh>
        </>
      ) : (
        <>
          {[-8.6, 8.6].map(x => <mesh key={x} position={[x, 1.8, 0]}><coneGeometry args={[1.6, 4, 5]} /><meshStandardMaterial color="#555f63" /></mesh>)}
          <mesh position={[0, 0.25, -8.6]}><boxGeometry args={[22, 0.5, 1.2]} /><meshStandardMaterial color="#8b8880" /></mesh>
          {[-8.3, 8.3].map(x => <mesh key={x} position={[x, 0.55, 7]}><dodecahedronGeometry args={[1.2, 0]} /><meshStandardMaterial color="#676b70" /></mesh>)}
        </>
      )}
      {npcsForVillage(villageId).map(npc => <group key={npc.id}>
        <House position={npc.homePosition} roofColor={roof} />
        <House position={npc.businessPosition} roofColor={fieldVillage ? '#c39b49' : '#758b95'} business />
      </group>)}
    </>
  )
}

export default function VillageScene({ villageId, onNearbyChange, onInteract }: VillageSceneProps) {
  const playerRef = useRef<Group>(null)
  const keys = useRef(new Set<string>())
  const nearbyId = useRef<string | undefined>(undefined)
  const nearbyCallback = useRef(onNearbyChange)
  const interactCallback = useRef(onInteract)
  nearbyCallback.current = onNearbyChange
  interactCallback.current = onInteract
  const npcs = npcsForVillage(villageId)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) event.preventDefault()
      keys.current.add(key)
      if (key === 'e' && nearbyId.current) {
        const npc = npcs.find(candidate => candidate.id === nearbyId.current)
        if (npc) interactCallback.current(npc)
      }
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [npcs])

  useFrame((_, delta) => {
    const player = playerRef.current
    if (!player) return
    let x = Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft'))
    let z = Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup'))
    const length = Math.hypot(x, z)
    if (length > 0) {
      x /= length; z /= length
      player.position.x = Math.max(-9.3, Math.min(9.3, player.position.x + x * WALK_SPEED * delta))
      player.position.z = Math.max(-9.3, Math.min(9.3, player.position.z + z * WALK_SPEED * delta))
    }
    let closest: VillageNpc | undefined
    let closestDistance = INTERACTION_DISTANCE
    for (const npc of npcs) {
      const distance = Math.hypot(player.position.x - npc.position[0], player.position.z - npc.position[2])
      if (distance <= closestDistance) { closest = npc; closestDistance = distance }
    }
    if (closest?.id !== nearbyId.current) {
      nearbyId.current = closest?.id
      nearbyCallback.current(closest)
    }
  })

  const theme = villageId === 'village-a' ? '#e6c56a' : '#b7d0df'
  return (
    <>
      <VillageGround villageId={villageId} />
      {npcs.map(npc => <Person key={npc.id} npc={npc} active={npc.id === nearbyId.current} />)}
      <group ref={playerRef} position={[0, 0, 0]}>
        <mesh position={[0, 0.78, 0]} castShadow><capsuleGeometry args={[0.28, 0.65, 4, 8]} /><meshStandardMaterial color="#2f6472" /></mesh>
        <mesh position={[0, 1.35, 0]} castShadow><sphereGeometry args={[0.23, 12, 10]} /><meshStandardMaterial color="#e2b48b" /></mesh>
        <mesh position={[0, 1.58, 0]}><coneGeometry args={[0.3, 0.34, 8]} /><meshStandardMaterial color={theme} /></mesh>
      </group>
    </>
  )
}
