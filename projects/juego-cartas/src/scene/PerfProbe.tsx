import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { Ref, RefObject } from 'react'

/** Shape published on window.__gfPerf while ?perf is active (read by automated inspection). */
export interface GfPerfSnapshot {
  room: string
  /** Moving average over the last second of frames. */
  fps: number
  frameMs: number
  /** Monotonic frame counter and timestamp (ms) so a reader can compute its own window. */
  frames: number
  time: number
  calls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
}

declare global { interface Window { __gfPerf?: GfPerfSnapshot } }

const WINDOW_MS = 1000

/** Reads renderer.info of the previous frame (shadow passes included) and an FPS moving average. Diagnostics only. */
export function PerfProbe({ roomId, panel }: { roomId: string; panel: RefObject<HTMLDivElement | null> }) {
  const samples = useRef<number[]>([])
  const frames = useRef(0)
  const lastPanel = useRef(0)
  useEffect(() => () => { delete window.__gfPerf }, [])
  useFrame(({ gl }) => {
    const now = performance.now()
    const times = samples.current
    times.push(now)
    while (times.length > 1 && now - times[0] > WINDOW_MS) times.shift()
    frames.current++
    const span = times.length > 1 ? now - times[0] : 0
    const fps = span > 0 ? (times.length - 1) * 1000 / span : 0
    const info = gl.info
    const snapshot: GfPerfSnapshot = {
      room: roomId, fps, frameMs: fps ? 1000 / fps : 0, frames: frames.current, time: now,
      calls: info.render.calls, triangles: info.render.triangles,
      geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0,
    }
    window.__gfPerf = snapshot
    if (panel.current && now - lastPanel.current > 250) {
      lastPanel.current = now
      panel.current.textContent = `${fps.toFixed(0)} FPS · ${snapshot.frameMs.toFixed(1)} ms\n${snapshot.calls} draw calls · ${snapshot.triangles} tri\n${snapshot.geometries} geom · ${snapshot.textures} tex · ${snapshot.programs} prog\n${roomId}`
    }
  })
  return null
}

/** Small, non-interactive overlay; text is written by the probe without React rerenders. */
export function PerfPanel({ ref }: { ref: Ref<HTMLDivElement> }) {
  return <div ref={ref} className="exploration-perf" aria-hidden="true" />
}
