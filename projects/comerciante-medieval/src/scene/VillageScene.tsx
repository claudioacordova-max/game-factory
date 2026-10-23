import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import { isBeyondNpcInteractionDistance, NPC_INTERACTION_DISTANCE, npcsForVillage, type ProfessionKey, type VillageNpc } from './world.js'
import { clampedMovementStep } from './playerOrientation.js'
import type { VillageId } from '../engine/model.js'

interface VillageSceneProps {
  villageId: VillageId
  onNearbyChange: (npc: VillageNpc | undefined) => void
  interactionPromptRef: { current: HTMLDivElement | null }
  playerFacingRef: { current: number }
  onInteract: (npc: VillageNpc) => void
  interactionNpcId?: string
  onInteractionOutOfRange: () => void
}

const WALK_SPEED = 4.5
const MOVEMENT_KEYS = ['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']

function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (
    target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  )
}

const PROFESSION_STYLE: Record<ProfessionKey, { color: string; trim: string }> = {
  farmer: { color: '#567347', trim: '#e8bd58' },
  woodcutter: { color: '#77523a', trim: '#b7c17b' },
  blacksmith: { color: '#9b4937', trim: '#edab58' },
  tailor: { color: '#675078', trim: '#e1c3db' },
  miner: { color: '#586c78', trim: '#efc65a' },
  carpenter: { color: '#39716f', trim: '#e3ad64' },
  jeweler: { color: '#594a78', trim: '#f0cf6c' },
}

function ProfessionMark({ profession, color }: { profession: ProfessionKey; color: string }) {
  const wood = '#68472f'
  switch (profession) {
    case 'farmer': return <group>
      <mesh position={[-0.09, -0.06, 0]} rotation={[0, 0, -0.12]}><cylinderGeometry args={[0.025, 0.035, 0.34, 5]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.07, -0.06, 0]} rotation={[0, 0, 0.1]}><cylinderGeometry args={[0.025, 0.035, 0.34, 5]} /><meshStandardMaterial color={color} /></mesh>
      {[-0.12, 0, 0.12].map(y => <mesh key={y} position={[-0.13, y, 0]} rotation={[0, 0, -0.4]}><sphereGeometry args={[0.07, 5, 4]} /><meshStandardMaterial color="#f0c45a" /></mesh>)}
      {[-0.12, 0, 0.12].map(y => <mesh key={y} position={[0.13, y, 0]} rotation={[0, 0, 0.4]}><sphereGeometry args={[0.07, 5, 4]} /><meshStandardMaterial color="#f0c45a" /></mesh>)}
    </group>
    case 'woodcutter': return <group>
      <mesh rotation={[0, 0, -0.55]}><cylinderGeometry args={[0.035, 0.035, 0.48, 6]} /><meshStandardMaterial color={wood} /></mesh>
      <mesh position={[0.14, 0.14, 0]} rotation={[0, 0, -0.55]}><boxGeometry args={[0.24, 0.12, 0.08]} /><meshStandardMaterial color={color} /></mesh>
    </group>
    case 'blacksmith': return <group>
      <mesh rotation={[0, 0, -0.28]}><cylinderGeometry args={[0.035, 0.035, 0.42, 6]} /><meshStandardMaterial color={wood} /></mesh>
      <mesh position={[0.1, 0.12, 0]}><boxGeometry args={[0.27, 0.14, 0.1]} /><meshStandardMaterial color={color} /></mesh>
    </group>
    case 'tailor': return <group>
      <mesh><cylinderGeometry args={[0.13, 0.13, 0.25, 8]} /><meshStandardMaterial color={color} /></mesh>
      <mesh><torusGeometry args={[0.14, 0.025, 5, 12]} /><meshStandardMaterial color="#f2d9a1" /></mesh>
      <mesh position={[0, 0.08, 0]}><torusGeometry args={[0.13, 0.022, 5, 12]} /><meshStandardMaterial color="#f2d9a1" /></mesh>
    </group>
    case 'miner': return <group>
      <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0.16, 0.1, 0.02]}><sphereGeometry args={[0.06, 6, 5]} /><meshStandardMaterial color="#fff2a2" emissive="#c88925" emissiveIntensity={0.4} /></mesh>
      <mesh position={[0, -0.04, 0]}><boxGeometry args={[0.42, 0.06, 0.1]} /><meshStandardMaterial color="#e7c456" /></mesh>
    </group>
    case 'carpenter': return <group>
      <mesh rotation={[0, 0, -0.58]}><boxGeometry args={[0.16, 0.42, 0.05]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[-0.13, -0.15, 0]} rotation={[0, 0, -0.58]}><boxGeometry args={[0.23, 0.12, 0.09]} /><meshStandardMaterial color={wood} /></mesh>
    </group>
    case 'jeweler': return <mesh rotation={[0, 0, Math.PI]}>
      <octahedronGeometry args={[0.23, 0]} /><meshStandardMaterial color={color} metalness={0.35} roughness={0.3} />
    </mesh>
  }
}

function ShopSign({ profession }: { profession: ProfessionKey }) {
  const style = PROFESSION_STYLE[profession]
  return <group position={[0.53, 1.12, 0.68]}>
    <mesh castShadow><boxGeometry args={[0.55, 0.58, 0.1]} /><meshStandardMaterial color="#f1dfb4" /></mesh>
    <mesh position={[0, 0, 0.06]}><boxGeometry args={[0.43, 0.46, 0.035]} /><meshStandardMaterial color={style.color} /></mesh>
    <group position={[0, 0, 0.1]} scale={0.78}><ProfessionMark profession={profession} color={style.trim} /></group>
  </group>
}

function House({ position, roofColor, business = false, profession }: { position: readonly [number, number, number]; roofColor: string; business?: boolean; profession?: ProfessionKey }) {
  const accent = profession ? PROFESSION_STYLE[profession].color : '#b9a583'
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={business ? [1.25, 1.4, 1.2] : [1.35, 1.4, 1.25]} />
        <meshStandardMaterial color={business ? '#d6c49d' : '#d8c9a7'} />
      </mesh>
      <mesh position={[0, 1.55, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.05, 0.85, 4]} />
        <meshStandardMaterial color={business ? accent : roofColor} />
      </mesh>
      <mesh position={[0, 0.48, 0.62]}>
        <boxGeometry args={[0.34, 0.72, 0.08]} />
        <meshStandardMaterial color="#594332" />
      </mesh>
      {business && <mesh position={[0.58, 0.9, 0.63]}><boxGeometry args={[0.3, 0.28, 0.08]} /><meshStandardMaterial color={profession ? PROFESSION_STYLE[profession].trim : '#f3cf72'} /></mesh>}
      {business && profession && <ShopSign profession={profession} />}
    </group>
  )
}

function NpcHair({ appearance, color }: { appearance: VillageNpc['appearance']; color: string }) {
  if (appearance === 'masculine') {
    return <mesh position={[0, 1.58, -0.03]}>
      <sphereGeometry args={[0.19, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} />
    </mesh>
  }

  return <group>
    <mesh position={[0, 1.5, -0.02]}>
      <sphereGeometry args={[0.245, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} />
    </mesh>
    <mesh position={[0, 1.34, -0.13]}>
      <capsuleGeometry args={[0.16, 0.34, 4, 6]} />
      <meshStandardMaterial color={color} />
    </mesh>
    {[-0.18, 0.18].map(x => <mesh key={x} position={[x, 1.29, 0.105]}>
      <capsuleGeometry args={[0.075, 0.34, 4, 6]} />
      <meshStandardMaterial color={color} />
    </mesh>)}
  </group>
}

function Person({ npc, active }: { npc: VillageNpc; active: boolean }) {
  const professionStyle = PROFESSION_STYLE[npc.professionKey]
  const shirtColor = active ? '#f4c95d' : professionStyle.color
  const skin = npc.professionKey === 'miner' ? '#bd8968' : npc.professionKey === 'jeweler' ? '#e0ae85' : '#d5a27b'
  const hair = npc.professionKey === 'farmer' ? '#5d3f2b' : npc.professionKey === 'woodcutter' ? '#674331' : npc.professionKey === 'blacksmith' ? '#393a43' : npc.professionKey === 'tailor' ? '#a75d3e' : npc.professionKey === 'miner' ? '#4e3530' : npc.professionKey === 'carpenter' ? '#76472f' : '#302a3c'
  return (
    <group position={npc.position}>
      <mesh position={[-0.11, 0.18, 0]}><cylinderGeometry args={[0.1, 0.11, 0.34, 6]} /><meshStandardMaterial color="#493e37" /></mesh>
      <mesh position={[0.11, 0.18, 0]}><cylinderGeometry args={[0.1, 0.11, 0.34, 6]} /><meshStandardMaterial color="#493e37" /></mesh>
      <mesh position={[0, 0.89, 0]} castShadow>
        <capsuleGeometry args={[npc.appearance === 'feminine' ? 0.23 : 0.27, npc.appearance === 'feminine' ? 0.56 : 0.52, 4, 8]} />
        <meshStandardMaterial color={shirtColor} />
      </mesh>
      {npc.appearance === 'feminine' && <mesh position={[0, 0.52, 0]}>
        <cylinderGeometry args={[0.18, 0.32, 0.46, 6]} />
        <meshStandardMaterial color={professionStyle.trim} />
      </mesh>}
      <mesh position={[0, 0.77, 0.25]}><boxGeometry args={[0.32, 0.34, 0.045]} /><meshStandardMaterial color={professionStyle.trim} /></mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <sphereGeometry args={[npc.appearance === 'feminine' ? 0.22 : 0.24, 10, 8]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      <NpcHair appearance={npc.appearance} color={hair} />
      {npc.professionKey === 'farmer' && <group position={[0, 1.72, 0]}>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.32, 0.32, 0.06, 8]} /><meshStandardMaterial color="#d5ae57" /></mesh>
        <mesh position={[0, 0.14, 0]}><coneGeometry args={[0.19, 0.24, 6]} /><meshStandardMaterial color="#d5ae57" /></mesh>
      </group>}
      {npc.professionKey === 'woodcutter' && <mesh position={[0.28, 1.13, 0.05]} rotation={[0, 0, 0.32]}><boxGeometry args={[0.12, 0.45, 0.08]} /><meshStandardMaterial color={professionStyle.trim} /></mesh>}
      {npc.professionKey === 'blacksmith' && <mesh position={[0.28, 1.05, 0.05]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.13, 0.38, 0.1]} /><meshStandardMaterial color="#514a49" /></mesh>}
      {npc.professionKey === 'tailor' && <mesh position={[0.24, 0.81, 0.07]}><cylinderGeometry args={[0.1, 0.1, 0.17, 8]} /><meshStandardMaterial color="#e9d3a6" /></mesh>}
      {npc.professionKey === 'miner' && <group position={[0, 1.68, 0]}>
        <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.48, 0.055, 0.32]} /><meshStandardMaterial color="#e4bd55" /></mesh>
        <mesh position={[0, 0.13, -0.03]}><sphereGeometry args={[0.19, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#6c7981" /></mesh>
        <mesh position={[0.18, 0.08, 0.12]}><sphereGeometry args={[0.055, 6, 5]} /><meshStandardMaterial color="#fff0a0" emissive="#d49b31" emissiveIntensity={0.45} /></mesh>
      </group>}
      {npc.professionKey === 'carpenter' && <mesh position={[-0.25, 1.1, 0.04]} rotation={[0, 0, 0.55]}><boxGeometry args={[0.12, 0.5, 0.05]} /><meshStandardMaterial color="#dfbb7c" /></mesh>}
      {npc.professionKey === 'jeweler' && <mesh position={[0, 0.53, 0.3]} rotation={[0, 0, Math.PI]}><octahedronGeometry args={[0.13, 0]} /><meshStandardMaterial color="#9d78c9" metalness={0.4} roughness={0.25} /></mesh>}
      {active && <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.38, 0.47, 16]} /><meshBasicMaterial color="#fff0a0" /></mesh>}
    </group>
  )
}

type DecorationPosition = readonly [number, number, number]

const VALLEY_TREE_POSITIONS: readonly { position: DecorationPosition; scale: number }[] = [
  { position: [-8.6, 0, -7.2], scale: 0.9 },
  { position: [7.6, 0, -7.5], scale: 0.95 },
  { position: [9.1, 0, -5.4], scale: 1.05 },
  { position: [8.7, 0, -9.4], scale: 0.8 },
  { position: [-9, 0, -3.8], scale: 0.82 },
  { position: [-9.2, 0, 3.3], scale: 0.88 },
  { position: [9.1, 0, 4.6], scale: 0.92 },
  { position: [-8.8, 0, 8.2], scale: 0.95 },
]

const STONE_FORMATIONS: readonly { position: DecorationPosition; scale: number }[] = [
  { position: [-9, 0, -7.6], scale: 1.05 },
  { position: [9, 0, -7.9], scale: 1.12 },
  { position: [-9.5, 0, 4.5], scale: 0.9 },
  { position: [9.4, 0, 4.8], scale: 1.0 },
]

function LowPolyTree({ position, scale = 1 }: { position: DecorationPosition; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.24, 2, 6]} />
        <meshStandardMaterial color="#62472f" />
      </mesh>
      <mesh position={[0, 2.05, 0]} castShadow>
        <dodecahedronGeometry args={[0.92, 0]} />
        <meshStandardMaterial color="#3d6844" />
      </mesh>
      <mesh position={[-0.34, 2.48, 0.02]} castShadow>
        <dodecahedronGeometry args={[0.66, 0]} />
        <meshStandardMaterial color="#4c774b" />
      </mesh>
      <mesh position={[0.34, 2.43, -0.02]} castShadow>
        <dodecahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#365d3d" />
      </mesh>
    </group>
  )
}

function RockFormation({ position, scale = 1 }: { position: DecorationPosition; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <dodecahedronGeometry args={[1.05, 0]} />
        <meshStandardMaterial color="#77766f" />
      </mesh>
      <mesh position={[-0.67, 0.52, 0.12]} castShadow>
        <dodecahedronGeometry args={[0.68, 0]} />
        <meshStandardMaterial color="#8a887e" />
      </mesh>
      <mesh position={[0.65, 0.46, -0.12]} castShadow>
        <dodecahedronGeometry args={[0.62, 0]} />
        <meshStandardMaterial color="#656760" />
      </mesh>
      <mesh position={[0.04, 1.35, -0.05]} castShadow>
        <coneGeometry args={[0.5, 1.4, 5]} />
        <meshStandardMaterial color="#77766f" />
      </mesh>
    </group>
  )
}

function Horizon({ fieldVillage }: { fieldVillage: boolean }) {
  const hillColor = fieldVillage ? '#78844f' : '#666963'
  return (
    <group>
      {[-28, -18, -8, 4, 16, 27].map((x, index) => (
        <mesh key={x} position={[x, 0.55 + (index % 2) * 0.18, -33]} scale={[1.08, 0.34, 0.72]}>
          <icosahedronGeometry args={[3.9, 0]} />
          <meshStandardMaterial color={hillColor} />
        </mesh>
      ))}
      {fieldVillage ? (
        <group>
          {[-25, -16, 16, 25].map((x, index) => <LowPolyTree key={x} position={[x, 0, -26]} scale={0.42 + (index % 2) * 0.08} />)}
        </group>
      ) : (
        <group>
          {[-25, -16, 16, 25].map((x, index) => <RockFormation key={x} position={[x, 0, -27]} scale={0.38 + (index % 2) * 0.07} />)}
        </group>
      )}
    </group>
  )
}

function VillageGround({ villageId }: { villageId: VillageId }) {
  const fieldVillage = villageId === 'village-a'
  const roof = fieldVillage ? '#814d3f' : '#4e5965'
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={fieldVillage ? '#71804c' : '#77756e'} />
      </mesh>
      <Horizon fieldVillage={fieldVillage} />
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
          {VALLEY_TREE_POSITIONS.map(tree => <LowPolyTree key={tree.position.join(',')} {...tree} />)}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0.02, 7]}><planeGeometry args={[3.5, 3]} /><meshStandardMaterial color="#899a54" /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8, 0.02, 7]}><planeGeometry args={[3.5, 3]} /><meshStandardMaterial color="#899a54" /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.3, 0.025, 6]}><planeGeometry args={[2.6, 1.2]} /><meshStandardMaterial color="#687a42" /></mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-7.3, 0.03, 6]}><boxGeometry args={[0.06, 0.08, 1]} /><meshStandardMaterial color="#a8a36b" /></mesh>
        </>
      ) : (
        <>
          {STONE_FORMATIONS.map(formation => <RockFormation key={formation.position.join(',')} {...formation} />)}
          <mesh position={[0, 0.25, -8.6]}><boxGeometry args={[22, 0.5, 1.2]} /><meshStandardMaterial color="#8b8880" /></mesh>
          {[-8.3, 8.3].map(x => <mesh key={x} position={[x, 0.55, 7]}><dodecahedronGeometry args={[1.2, 0]} /><meshStandardMaterial color="#676b70" /></mesh>)}
        </>
      )}
      {npcsForVillage(villageId).map(npc => <group key={npc.id}>
        <House position={npc.homePosition} roofColor={roof} />
        <House position={npc.businessPosition} roofColor={fieldVillage ? '#c39b49' : '#758b95'} business profession={npc.professionKey} />
      </group>)}
    </>
  )
}

function MerchantPlayer() {
  return (
    <group>
      <mesh position={[-0.11, 0.18, 0]}><cylinderGeometry args={[0.11, 0.13, 0.36, 7]} /><meshStandardMaterial color="#40352f" /></mesh>
      <mesh position={[0.11, 0.18, 0]}><cylinderGeometry args={[0.11, 0.13, 0.36, 7]} /><meshStandardMaterial color="#40352f" /></mesh>
      <mesh position={[0, 0.73, 0]} castShadow><capsuleGeometry args={[0.3, 0.62, 4, 8]} /><meshStandardMaterial color="#31596a" /></mesh>
      <mesh position={[0, 0.47, 0]}><cylinderGeometry args={[0.28, 0.35, 0.3, 8]} /><meshStandardMaterial color="#263f4b" /></mesh>
      <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[0.33, 0.34, 0.075, 8]} /><meshStandardMaterial color="#9a7040" /></mesh>
      <mesh position={[0, 0.8, 0.27]} rotation={[0, 0, 0.45]}><boxGeometry args={[0.1, 0.85, 0.055]} /><meshStandardMaterial color="#a77543" /></mesh>
      <mesh position={[0.27, 0.72, 0.34]} castShadow><boxGeometry args={[0.43, 0.4, 0.29]} /><meshStandardMaterial color="#93643b" /></mesh>
      <mesh position={[0.27, 0.93, 0.36]}><boxGeometry args={[0.4, 0.1, 0.31]} /><meshStandardMaterial color="#d0a66a" /></mesh>
      <mesh position={[0.27, 0.92, 0.525]}><boxGeometry args={[0.075, 0.075, 0.035]} /><meshStandardMaterial color="#e3c783" /></mesh>
      <mesh position={[-0.3, 0.62, 0.24]}><boxGeometry args={[0.25, 0.25, 0.19]} /><meshStandardMaterial color="#bd8c50" /></mesh>
      <mesh position={[0, 0.99, -0.27]} castShadow><boxGeometry args={[0.56, 0.62, 0.34]} /><meshStandardMaterial color="#8d6339" /></mesh>
      <mesh position={[0, 1.29, -0.43]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.15, 0.15, 0.82, 8]} /><meshStandardMaterial color="#c29559" /></mesh>
      <mesh position={[0, 1.36, 0]}><sphereGeometry args={[0.23, 10, 8]} /><meshStandardMaterial color="#e2b48b" /></mesh>
      <mesh position={[0, 1.56, 0]}><cylinderGeometry args={[0.36, 0.36, 0.075, 8]} /><meshStandardMaterial color="#4c392d" /></mesh>
      <mesh position={[0, 1.63, 0]}><coneGeometry args={[0.25, 0.27, 8]} /><meshStandardMaterial color="#ad8150" /></mesh>
      <mesh position={[0, 1.57, 0]}><cylinderGeometry args={[0.26, 0.26, 0.045, 8]} /><meshStandardMaterial color="#7f4939" /></mesh>
    </group>
  )
}

export default function VillageScene({ villageId, onNearbyChange, interactionPromptRef, playerFacingRef, onInteract, interactionNpcId, onInteractionOutOfRange }: VillageSceneProps) {
  const playerRef = useRef<Group>(null)
  const playerVisualRef = useRef<Group>(null)
  const promptPosition = useRef(new Vector3())
  const keys = useRef(new Set<string>())
  const nearbyId = useRef<string | undefined>(undefined)
  const nearbyCallback = useRef(onNearbyChange)
  const interactCallback = useRef(onInteract)
  const outOfRangeCallback = useRef(onInteractionOutOfRange)
  const interactionNpcIdRef = useRef(interactionNpcId)
  const closedInteractionNpcId = useRef<string | undefined>(undefined)
  const { camera, size } = useThree()
  nearbyCallback.current = onNearbyChange
  interactCallback.current = onInteract
  outOfRangeCallback.current = onInteractionOutOfRange
  interactionNpcIdRef.current = interactionNpcId
  const npcs = npcsForVillage(villageId)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (isEditableTarget(event.target)) {
        keys.current.clear()
        return
      }
      if (MOVEMENT_KEYS.includes(key)) event.preventDefault()
      keys.current.add(key)
      if (key === 'e' && nearbyId.current) {
        const npc = npcs.find(candidate => candidate.id === nearbyId.current)
        if (npc) interactCallback.current(npc)
      }
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase())
    const clearOnEditableFocus = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) keys.current.clear()
    }
    const clearOnWindowBlur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearOnWindowBlur)
    document.addEventListener('focusin', clearOnEditableFocus)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearOnWindowBlur)
      document.removeEventListener('focusin', clearOnEditableFocus)
    }
  }, [npcs])

  useFrame((_, delta) => {
    const player = playerRef.current
    if (!player) return
    const activeInteractionNpcId = interactionNpcIdRef.current
    if (closedInteractionNpcId.current !== activeInteractionNpcId) closedInteractionNpcId.current = undefined
    if (activeInteractionNpcId && closedInteractionNpcId.current !== activeInteractionNpcId) {
      const interactionNpc = npcs.find(candidate => candidate.id === activeInteractionNpcId)
      if (interactionNpc && isBeyondNpcInteractionDistance([player.position.x, player.position.y, player.position.z], interactionNpc)) {
        closedInteractionNpcId.current = activeInteractionNpcId
        outOfRangeCallback.current()
      }
    }
    let x = Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft'))
    let z = Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup'))
    const length = Math.hypot(x, z)
    if (length > 0) {
      x /= length; z /= length
      const movement = clampedMovementStep(
        player.position.x,
        player.position.z,
        x * WALK_SPEED * delta,
        z * WALK_SPEED * delta,
      )
      player.position.x = movement.x
      player.position.z = movement.z
      if (movement.yaw !== undefined) {
        playerFacingRef.current = movement.yaw
        if (playerVisualRef.current) playerVisualRef.current.rotation.y = movement.yaw
      }
    }
    let closest: VillageNpc | undefined
    let closestDistance = NPC_INTERACTION_DISTANCE
    for (const npc of npcs) {
      const distance = Math.hypot(player.position.x - npc.position[0], player.position.z - npc.position[2])
      if (distance <= closestDistance) { closest = npc; closestDistance = distance }
    }
    if (closest?.id !== nearbyId.current) {
      nearbyId.current = closest?.id
      nearbyCallback.current(closest)
    }

    const prompt = interactionPromptRef.current
    if (prompt && nearbyId.current) {
      const position = promptPosition.current
        .set(player.position.x, player.position.y + 2.05, player.position.z)
        .project(camera)
      const left = Math.max(12, Math.min(size.width - 12, (position.x * 0.5 + 0.5) * size.width))
      const top = Math.max(12, Math.min(size.height - 12, (-position.y * 0.5 + 0.5) * size.height))
      prompt.style.left = `${left}px`
      prompt.style.top = `${top}px`
    }
  })

  return (
    <>
      <VillageGround villageId={villageId} />
      {npcs.map(npc => <Person key={npc.id} npc={npc} active={npc.id === nearbyId.current} />)}
      <group ref={playerRef} position={[0, 0, 0]}>
        <group ref={playerVisualRef} rotation={[0, playerFacingRef.current, 0]}>
          <MerchantPlayer />
        </group>
      </group>
    </>
  )
}
