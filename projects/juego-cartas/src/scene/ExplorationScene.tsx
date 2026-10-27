import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Group, Vector3 } from 'three'
import {
  cameraRelativeDirection, closestInteractable, INTERACTION_RANGE, isWalkable,
  movePose, roomWithObjects, safeExplorationPose,
} from '../engine/spatial.js'
import type { ExplorationObject, RoomDefinition, SpatialPose } from '../engine/spatial.js'
import './exploration.css'

export type { ExplorationObject, RoomDefinition, SpatialPose } from '../engine/spatial.js'
export interface ExplorationSceneProps {
  room: RoomDefinition
  initialPose: SpatialPose
  objects: readonly ExplorationObject[]
  onInteract: (objectId: string) => void
  onPoseChange: (pose: SpatialPose) => void
  disabled?: boolean
}

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
const ACTION_TEXT = { enemy: 'Desafiar', chest: 'Abrir cofre', shrine: 'Usar santuario', exit: 'Entrar' }
interface Runtime {
  pose: SpatialPose
  roomId: string
  keys: Set<string>
  focused: boolean
  dirty: boolean
  disabled: boolean
}

function Avatar({ walking }: { walking: MutableRefObject<number> }) {
  const leftLeg = useRef<Group>(null), rightLeg = useRef<Group>(null)
  useFrame(() => {
    const swing = Math.sin(walking.current) * 0.48
    if (leftLeg.current) leftLeg.current.rotation.x = swing
    if (rightLeg.current) rightLeg.current.rotation.x = -swing
  })
  return <group>
    <mesh position={[0, 0.68, 0]} castShadow><coneGeometry args={[0.31, 0.72, 8]} /><meshStandardMaterial color="#356b70" roughness={0.9} /></mesh>
    <mesh position={[0, 0.86, 0.18]}><boxGeometry args={[0.23, 0.31, 0.08]} /><meshStandardMaterial color="#bc995b" metalness={0.45} roughness={0.65} /></mesh>
    <mesh position={[0, 1.16, 0]} castShadow><sphereGeometry args={[0.19, 10, 8]} /><meshStandardMaterial color="#eee4cf" /></mesh>
    <mesh position={[0, 1.29, -0.035]} castShadow><sphereGeometry args={[0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#243c4b" /></mesh>
    {[-0.07, 0.07].map((x) => <mesh key={x} position={[x, 1.19, 0.177]}><boxGeometry args={[0.038, 0.046, 0.032]} /><meshStandardMaterial color="#101b22" /></mesh>)}
    <mesh position={[0, 1.12, 0.195]}><boxGeometry args={[0.06, 0.055, 0.05]} /><meshStandardMaterial color="#d4bea0" /></mesh>
    {[-0.1, 0.1].map((x, index) => <group key={x} ref={index === 0 ? leftLeg : rightLeg} position={[x, 0.42, 0]}>
      <mesh position={[0, -0.18, 0.025]} castShadow><boxGeometry args={[0.13, 0.35, 0.18]} /><meshStandardMaterial color="#263440" /></mesh>
      <mesh position={[0, -0.33, 0.07]}><boxGeometry args={[0.15, 0.13, 0.23]} /><meshStandardMaterial color="#8d7552" /></mesh>
    </group>)}
    <mesh position={[-0.29, 0.68, 0.02]} castShadow><boxGeometry args={[0.13, 0.4, 0.15]} /><meshStandardMaterial color="#356b70" /></mesh>
    <mesh position={[0.29, 0.68, 0.02]} castShadow><boxGeometry args={[0.13, 0.4, 0.15]} /><meshStandardMaterial color="#356b70" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}><ringGeometry args={[0.34, 0.4, 24]} /><meshBasicMaterial color="#71c5bc" /></mesh>
  </group>
}

function WorldObject({ object, onInteract }: { object: ExplorationObject; onInteract: (id: string) => void }) {
  const color = object.status === 'available' ? '#71c5bc' : object.status === 'locked' ? '#68757a' : '#bc995b'
  if (object.kind === 'enemy' && object.status === 'completed') return null
  return <group position={[object.position.x, 0, object.position.z]} onClick={(event) => { event.stopPropagation(); onInteract(object.id) }}>
    <mesh position={[0, 0.06, 0]} receiveShadow><cylinderGeometry args={[0.64, 0.7, 0.12, 8]} /><meshStandardMaterial color="#30424a" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}><ringGeometry args={[0.52, 0.57, 24]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} /></mesh>
    {object.kind === 'enemy' && <group>
      <mesh position={[0, 0.7, 0]} castShadow><coneGeometry args={[0.32, 1.1, 6]} /><meshStandardMaterial color="#7e5f53" /></mesh>
      <mesh position={[0, 1.35, 0]} castShadow><icosahedronGeometry args={[0.22, 0]} /><meshStandardMaterial color="#d6ccad" /></mesh>
      <mesh position={[0.4, 0.85, 0]} castShadow><boxGeometry args={[0.07, 1.1, 0.07]} /><meshStandardMaterial color="#bc995b" /></mesh>
      <mesh position={[0.4, 1.45, 0]}><octahedronGeometry args={[0.15]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.65} /></mesh>
    </group>}
    {object.kind === 'chest' && <group>
      <mesh position={[0, 0.35, 0]} castShadow><boxGeometry args={[0.77, 0.43, 0.57]} /><meshStandardMaterial color="#655342" roughness={0.9} /></mesh>
      <group position={[0, 0.55, -0.27]} rotation={[object.status === 'completed' ? -1.05 : 0, 0, 0]}>
        <mesh position={[0, 0.04, 0.27]} castShadow><boxGeometry args={[0.81, 0.15, 0.6]} /><meshStandardMaterial color="#bc995b" metalness={0.45} roughness={0.7} /></mesh>
      </group>
    </group>}
    {object.kind === 'shrine' && <group>
      <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.25, 0.4, 0.7, 6]} /><meshStandardMaterial color="#59676a" /></mesh>
      <mesh position={[0, 1.02, 0]}><octahedronGeometry args={[0.25]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={object.status === 'available' ? 0.9 : 0.05} /></mesh>
    </group>}
    {object.kind === 'exit' && <group>
      {[-0.65, 0.65].map((x) => <mesh key={x} position={[x, 0.85, 0]} castShadow><boxGeometry args={[0.28, 1.7, 0.43]} /><meshStandardMaterial color="#4b5d64" /></mesh>)}
      <mesh position={[0, 1.72, 0]} castShadow><boxGeometry args={[1.58, 0.28, 0.46]} /><meshStandardMaterial color="#bc995b" roughness={0.8} /></mesh>
      <mesh position={[0, 0.85, 0]}><boxGeometry args={[1, 1.55, 0.06]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={object.status === 'available' ? 0.3 : 0.02} transparent opacity={0.28} /></mesh>
    </group>}
    {object.status === 'locked' && <group position={[0, 0.85, 0.32]}>
      <mesh><boxGeometry args={[0.25, 0.25, 0.13]} /><meshStandardMaterial color="#bc995b" /></mesh>
      <mesh position={[0, 0.18, 0]}><torusGeometry args={[0.09, 0.03, 6, 12, Math.PI]} /><meshStandardMaterial color="#bc995b" /></mesh>
    </group>}
  </group>
}

function CryptRoom({ room }: { room: RoomDefinition }) {
  return <group>
    <mesh position={[0, -0.16, 0]} receiveShadow><boxGeometry args={[room.width, 0.3, room.depth]} /><meshStandardMaterial color="#263a43" roughness={1} /></mesh>
    {Array.from({ length: room.width - 1 }, (_, i) => i - room.width / 2 + 1).map((x) => <mesh key={`x${x}`} position={[x, 0, 0]}><boxGeometry args={[0.025, 0.012, room.depth]} /><meshStandardMaterial color="#1b2b32" /></mesh>)}
    {Array.from({ length: room.depth - 1 }, (_, i) => i - room.depth / 2 + 1).map((z) => <mesh key={`z${z}`} position={[0, 0, z]}><boxGeometry args={[room.width, 0.012, 0.025]} /><meshStandardMaterial color="#1b2b32" /></mesh>)}
    {/* Low boundaries keep both the avatar and nearby controls visible from the fixed camera. */}
    {[-1, 1].map((side) => <group key={side}>
      <mesh position={[side * room.width / 2, 0.2, 0]} castShadow><boxGeometry args={[0.3, 0.5, room.depth]} /><meshStandardMaterial color="#3b4c53" /></mesh>
      <mesh position={[0, 0.2, side * room.depth / 2]} castShadow><boxGeometry args={[room.width, 0.5, 0.3]} /><meshStandardMaterial color="#3b4c53" /></mesh>
    </group>)}
    {room.obstacles.map((obstacle, index) => <group key={index} position={[obstacle.x, 0, obstacle.z]}>
      <mesh position={[0, (obstacle.height ?? 0.85) / 2, 0]} castShadow receiveShadow><boxGeometry args={[obstacle.width, obstacle.height ?? 0.85, obstacle.depth]} /><meshStandardMaterial color="#3b4c53" roughness={0.95} /></mesh>
      <mesh position={[0, (obstacle.height ?? 0.85) + 0.04, 0]}><boxGeometry args={[obstacle.width + 0.12, 0.1, obstacle.depth + 0.12]} /><meshStandardMaterial color="#59676a" /></mesh>
    </group>)}
    {[-1, 1].flatMap((x) => [-1, 1].map((z) => <group key={`${x}:${z}`} position={[x * (room.width / 2 - 0.7), 0, z * (room.depth / 2 - 0.6)]}>
      <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[0.06, 0.12, 1.3, 6]} /><meshStandardMaterial color="#bc995b" /></mesh>
      <mesh position={[0, 1.4, 0]}><octahedronGeometry args={[0.17]} /><meshStandardMaterial color="#dfae62" emissive="#dfae62" emissiveIntensity={1.4} /></mesh>
      <pointLight position={[0, 1.6, 0]} color="#dfae62" intensity={5} distance={6} />
    </group>))}
  </group>
}

function MovingWorld({ room, objects, runtime, onInteract, onTick }: {
  room: RoomDefinition; objects: readonly ExplorationObject[]; runtime: MutableRefObject<Runtime>
  onInteract: (id: string) => void; onTick: (delta: number) => void
}) {
  const avatar = useRef<Group>(null), walking = useRef(0)
  const cameraRoom = useRef('')
  const cameraTarget = useRef(new Vector3())
  const collisionRoom = roomWithObjects(room, objects)
  useFrame(({ camera }, delta) => {
    const state = runtime.current
    if (!state.disabled && state.focused) {
      const key = (a: string, b: string) => Number(state.keys.has(a) || state.keys.has(b))
      const direction = cameraRelativeDirection(key('d', 'arrowright') - key('a', 'arrowleft'), key('s', 'arrowdown') - key('w', 'arrowup'))
      const next = movePose(collisionRoom, state.pose, direction, delta)
      const moved = Math.hypot(next.x - state.pose.x, next.z - state.pose.z) > 0.00001
      if (moved) walking.current += Math.min(delta, 0.05) * 11
      else walking.current = 0
      if (next !== state.pose) { state.pose = next; state.dirty = true }
    } else walking.current = 0
    if (avatar.current) {
      avatar.current.position.set(state.pose.x, 0, state.pose.z)
      avatar.current.rotation.y = state.pose.yaw
    }
    cameraTarget.current.set(state.pose.x + 9, 12, state.pose.z + 9)
    if (cameraRoom.current !== room.id) {
      camera.position.copy(cameraTarget.current)
      cameraRoom.current = room.id
    } else camera.position.lerp(cameraTarget.current, 1 - Math.exp(-7 * Math.min(delta, 0.05)))
    // Fixed translation/angle: the camera never rotates around the avatar while walking.
    camera.lookAt(camera.position.x - 9, 0, camera.position.z - 9)
    onTick(delta)
  })
  return <>
    <color attach="background" args={['#101b22']} />
    <ambientLight color="#bacbd1" intensity={1.5} />
    <directionalLight position={[4, 10, 6]} intensity={2.4} color="#eee4cf" castShadow shadow-mapSize={[1024, 1024]} />
    <pointLight position={[0, 3, -2]} color="#71c5bc" intensity={12} distance={10} />
    <CryptRoom room={room} />
    {objects.map((object) => <WorldObject key={object.id} object={object} onInteract={onInteract} />)}
    <group ref={avatar}><Avatar walking={walking} /></group>
  </>
}

/** initialPose is sampled at mount / room.id change, never on ordinary parent rerenders. */
export function ExplorationScene(props: ExplorationSceneProps) {
  const { room, objects, disabled = false } = props
  const callbacks = useRef(props)
  callbacks.current = props
  const viewport = useRef<HTMLDivElement>(null)
  const initial = safeExplorationPose(room, objects, props.initialPose)
  const runtime = useRef<Runtime>({ pose: initial, roomId: room.id, keys: new Set(), focused: false, dirty: initial !== props.initialPose, disabled })
  const previousRoomCallback = useRef(props.onPoseChange)
  const time = useRef(0)
  const [nearby, setNearby] = useState<ExplorationObject[]>([])
  const nearbyKey = useRef('')
  const [focused, setFocused] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const clearInput = useCallback(() => { runtime.current.keys.clear(); runtime.current.focused = false; setFocused(false) }, [])
  const reportPose = useCallback(() => {
    if (runtime.current.dirty) {
      runtime.current.dirty = false
      callbacks.current.onPoseChange({ ...runtime.current.pose })
    }
  }, [])
  runtime.current.disabled = disabled
  useLayoutEffect(() => {
    const state = runtime.current
    if (state.roomId !== room.id) {
      // Flush a final unsent movement to the previous room's callback before replacing it.
      const previousPose = state.dirty ? { ...state.pose } : undefined
      state.dirty = false
      if (previousPose) previousRoomCallback.current(previousPose)
      state.pose = safeExplorationPose(room, objects, props.initialPose)
      state.roomId = room.id
      state.keys.clear()
      state.dirty = state.pose !== props.initialPose
    } else {
      const corrected = safeExplorationPose(room, objects, state.pose)
      if (corrected !== state.pose) {
        state.pose = corrected
        state.keys.clear()
        state.dirty = true
      }
    }
    previousRoomCallback.current = props.onPoseChange
    reportPose()
  }, [room, objects, props.initialPose, props.onPoseChange, reportPose])
  useEffect(() => {
    if (disabled) { clearInput(); reportPose() }
  }, [disabled, clearInput, reportPose])
  useEffect(() => { viewport.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const blur = () => { clearInput(); reportPose() }
    const visibility = () => { if (document.hidden) blur() }
    window.addEventListener('blur', blur)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
      runtime.current.keys.clear()
      reportPose()
    }
  }, [clearInput, reportPose])
  const interact = useCallback((id?: string) => {
    const current = callbacks.current
    if (current.disabled) return
    const available = id ? current.objects.find((object) => object.id === id && object.status === 'available' &&
      Math.hypot(object.position.x - runtime.current.pose.x, object.position.z - runtime.current.pose.z) <= INTERACTION_RANGE) :
      closestInteractable(runtime.current.pose, current.objects)
    if (!available) return
    runtime.current.keys.clear()
    reportPose()
    current.onInteract(available.id)
  }, [reportPose])
  const tick = (delta: number) => {
    time.current += Math.min(delta, 0.05)
    if (time.current < 0.12) return
    time.current = 0
    reportPose()
    const close = objects.filter((object) => Math.hypot(object.position.x - runtime.current.pose.x, object.position.z - runtime.current.pose.z) <= INTERACTION_RANGE)
    const key = `${room.id}:${closestInteractable(runtime.current.pose, close)?.id ?? ''}:` + close.map((object) => `${object.id}:${object.status}:${object.label}`).join('|')
    if (key !== nearbyKey.current) { nearbyKey.current = key; setNearby(close) }
  }
  const contextualObject = closestInteractable(runtime.current.pose, nearby)
  return <section className="exploration-scene" aria-label={`Exploración: ${room.name}`}>
    <div className={`exploration-viewport${focused ? ' exploration-focused' : ''}`} ref={viewport} tabIndex={disabled ? -1 : 0}
      role="group" aria-label="Control del avatar" aria-describedby="exploration-help"
      onFocus={(event) => { if (event.target === event.currentTarget && !disabled) { runtime.current.focused = true; setFocused(true) } }}
      onBlur={() => { clearInput(); reportPose() }}
      onPointerDown={(event) => {
        if (!disabled && event.target instanceof HTMLCanvasElement) {
          viewport.current?.focus(); runtime.current.focused = true; setFocused(true)
        }
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || disabled) return
        runtime.current.focused = true
        setFocused(true)
        const key = event.key.toLowerCase()
        if (MOVEMENT_KEYS.has(key)) { event.preventDefault(); runtime.current.keys.add(key) }
        if (key === 'e') { event.preventDefault(); if (!event.repeat) interact() }
      }}
      onKeyUp={(event) => { runtime.current.keys.delete(event.key.toLowerCase()) }}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [9, 12, 12], fov: 43, near: 0.1, far: 60 }}>
        <MovingWorld room={room} objects={objects} runtime={runtime} onInteract={interact} onTick={tick} />
      </Canvas>
    </div>
    <p id="exploration-help" className="sr-only">WASD o flechas para caminar; E para interactuar con un objeto cercano; I para abrir Colección. Tab permite navegar los controles.</p>
    {!disabled && contextualObject && <div className="exploration-context" aria-live="polite"><button type="button" onClick={() => interact(contextualObject.id)}><kbd>E</kbd><span><strong>{ACTION_TEXT[contextualObject.kind]}</strong><small>{contextualObject.label}</small></span></button></div>}
    {!disabled && <button type="button" className="exploration-help-toggle" aria-label="Ayuda y controles de exploración" aria-expanded={showHelp} aria-controls="exploration-input-help" onClick={() => setShowHelp((current) => !current)}>?</button>}
    {!disabled && showHelp && <div className="exploration-input-help" id="exploration-input-help">
      <strong>Explorar la cripta</strong><p>WASD / flechas · Caminar<br/>E · Interactuar cerca<br/>I · Colección<br/>Tab · Navegar controles</p><small>La aventura dura esta sesión. Recargar inicia una partida nueva.</small>
      <div className="exploration-dpad" role="group" aria-label="Caminar con puntero">
        {([{ key: 'w', label: 'Arriba', text: '↑' }, { key: 'a', label: 'Izquierda', text: '←' }, { key: 's', label: 'Abajo', text: '↓' }, { key: 'd', label: 'Derecha', text: '→' }]).map((direction) =>
          <button type="button" key={direction.key} className={`exploration-direction-${direction.key}`} aria-label={`Caminar ${direction.label.toLowerCase()}`} disabled={disabled}
            onPointerDown={(event) => {
              event.preventDefault(); viewport.current?.focus(); runtime.current.focused = true; setFocused(true)
              event.currentTarget.setPointerCapture(event.pointerId)
              runtime.current.keys.add(direction.key)
            }}
            onPointerUp={(event) => { runtime.current.keys.delete(direction.key); event.currentTarget.releasePointerCapture(event.pointerId); reportPose() }}
            onPointerCancel={() => runtime.current.keys.clear()}
            onLostPointerCapture={() => runtime.current.keys.delete(direction.key)}
            onClick={(event) => {
              // Keyboard/switch activation gives one small step, without holding a key on a button.
              if (event.detail === 0 && !disabled) {
                const dx = direction.key === 'a' ? -1 : direction.key === 'd' ? 1 : 0
                const dz = direction.key === 'w' ? -1 : direction.key === 's' ? 1 : 0
                const next = movePose(roomWithObjects(room, objects), runtime.current.pose, cameraRelativeDirection(dx, dz), 0.05)
                if (isWalkable(room, next)) { runtime.current.pose = next; runtime.current.dirty = true; reportPose() }
              }
            }}>{direction.text}</button>)}
      </div>
    </div>
    }
  </section>
}

export default ExplorationScene
