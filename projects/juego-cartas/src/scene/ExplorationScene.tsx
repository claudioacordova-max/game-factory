import { Canvas, useFrame } from '@react-three/fiber'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ComponentType, MutableRefObject } from 'react'
import { Group, Vector3 } from 'three'
import {
  cameraRelativeDirection, closestInteractable, INTERACTION_RANGE, isWalkable,
  movePose, roomWithObjects, safeExplorationPose,
} from '../engine/spatial.js'
import type { ExplorationObject, RoomDefinition, SpatialPose } from '../engine/spatial.js'
import { Avatar, WorldObject } from './ExplorationActors.js'
import { CryptLighting, CryptRoom } from './CryptEnvironment.js'
import { PerfPanel, PerfProbe } from './PerfProbe.js'
import './exploration.css'

export type { ExplorationObject, RoomDefinition, SpatialPose } from '../engine/spatial.js'
export interface ExplorationSceneProps {
  room: RoomDefinition
  initialPose: SpatialPose
  objects: readonly ExplorationObject[]
  onInteract: (objectId: string) => void
  onPoseChange: (pose: SpatialPose) => void
  disabled?: boolean
  resumeRevision?: number
  /** Alternative object renderer (V0.4B); defaults to the approved legacy WorldObject. */
  ObjectView?: WorldObjectView
  /** Mounts the performance probe and panel (?perf). Nothing is measured without it. */
  perf?: boolean
}
export type WorldObjectView = ComponentType<{ object: ExplorationObject; roomId: string; onInteract: (id: string) => void }>

const MOVEMENT_KEYS = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'])
const ACTION_TEXT = { enemy: 'Desafiar', chest: 'Abrir cofre', shrine: 'Usar santuario', exit: 'Entrar', feature: 'Examinar' }
interface Runtime {
  pose: SpatialPose
  roomId: string
  keys: Set<string>
  focused: boolean
  dirty: boolean
  disabled: boolean
}

function MovingWorld({ room, objects, runtime, onInteract, onTick, ObjectView = WorldObject }: {
  room: RoomDefinition; objects: readonly ExplorationObject[]; runtime: MutableRefObject<Runtime>
  onInteract: (id: string) => void; onTick: (delta: number) => void; ObjectView?: WorldObjectView
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
    <CryptLighting roomId={room.id} />
    <CryptRoom room={room} />
    {objects.map((object) => <ObjectView key={object.id} object={object} roomId={room.id} onInteract={onInteract} />)}
    <group ref={avatar}><Avatar walking={walking} /></group>
  </>
}

/** initialPose is sampled at mount / room.id change, never on ordinary parent rerenders. */
export function ExplorationScene(props: ExplorationSceneProps) {
  const { room, objects, disabled = false, resumeRevision = 0, perf = false } = props
  const perfPanel = useRef<HTMLDivElement>(null)
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
  const [helpResumeRevision, setHelpResumeRevision] = useState(0)
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
  useEffect(() => {
    if (disabled) return
    // Wait for dialog cleanup/native focus restoration, then resume the world once.
    const frame = requestAnimationFrame(() => {
      if (callbacks.current.disabled || document.querySelector('dialog[open]')) return
      runtime.current.keys.clear()
      viewport.current?.focus({ preventScroll: true })
      runtime.current.focused = document.activeElement === viewport.current
      setFocused(runtime.current.focused)
    })
    return () => cancelAnimationFrame(frame)
  }, [disabled, resumeRevision, helpResumeRevision])
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
    const key = `${room.id}:${closestInteractable(runtime.current.pose, close)?.id ?? ''}:` + close.map((object) => `${object.id}:${object.status}:${object.label}:${object.reason ?? ''}`).join('|')
    if (key !== nearbyKey.current) { nearbyKey.current = key; setNearby(close) }
  }
  const contextualObject = closestInteractable(runtime.current.pose, nearby)
  // Only objects that carry a reason (V0.4B exits) explain why they are closed; legacy locked objects stay silent.
  const lockedObject = contextualObject ? undefined : nearby
    .filter((object) => object.status === 'locked' && object.reason)
    .sort((a, b) => Math.hypot(a.position.x - runtime.current.pose.x, a.position.z - runtime.current.pose.z) - Math.hypot(b.position.x - runtime.current.pose.x, b.position.z - runtime.current.pose.z))[0]
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
        if (MOVEMENT_KEYS.has(key)) {
          event.preventDefault()
          // A key held across a modal/blur must be released before it can move again.
          if (!event.repeat || runtime.current.keys.has(key)) runtime.current.keys.add(key)
        }
        if (key === 'e') { event.preventDefault(); if (!event.repeat) interact() }
      }}
      onKeyUp={(event) => { runtime.current.keys.delete(event.key.toLowerCase()) }}>
      {/* One render pixel per CSS pixel avoids the measured supersampling cost; MSAA and shadows stay enabled. */}
      <Canvas shadows dpr={1} camera={{ position: [9, 12, 12], fov: 43, near: 0.1, far: 60 }}>
        <MovingWorld room={room} objects={objects} runtime={runtime} onInteract={interact} onTick={tick} ObjectView={props.ObjectView} />
        {perf && <PerfProbe roomId={room.id} panel={perfPanel} />}
      </Canvas>
    </div>
    {perf && <PerfPanel ref={perfPanel} />}
    <p id="exploration-help" className="sr-only">WASD o flechas para caminar; E para interactuar con un objeto cercano; I para abrir Colección. Tab permite navegar los controles.</p>
    {!disabled && contextualObject && <div className="exploration-context" aria-live="polite"><button type="button" onClick={() => interact(contextualObject.id)}><kbd>E</kbd><span><strong>{contextualObject.action ?? ACTION_TEXT[contextualObject.kind]}</strong><small>{contextualObject.label}</small></span></button></div>}
    {!disabled && lockedObject && <div className="exploration-context exploration-context-locked" aria-live="polite"><p><span className="exploration-lock" aria-hidden="true">✕</span><span><strong>{lockedObject.label}</strong><small>{lockedObject.reason}</small></span></p></div>}
    {!disabled && <button type="button" className="exploration-help-toggle" aria-label="Ayuda y controles de exploración" aria-expanded={showHelp} aria-controls="exploration-input-help" onClick={() => {
      if (callbacks.current.disabled) return
      if (showHelp) {
        clearInput()
        reportPose()
        setHelpResumeRevision((current) => current + 1)
      }
      setShowHelp(!showHelp)
    }}>?</button>}
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
