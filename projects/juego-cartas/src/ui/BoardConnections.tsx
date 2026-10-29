import { useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import type { RefObject } from 'react'
import { boardConnection } from './boardGeometry.js'
import type { BoardConnection, BoardLink } from './boardGeometry.js'

export type { BoardLink } from './boardGeometry.js'
interface MeasuredLink extends BoardLink { geometry: BoardConnection }
interface MeasuredBoard { width: number; height: number; links: MeasuredLink[] }

export function BoardConnections({ boardRef, links }: {
  boardRef: RefObject<HTMLDivElement | null>; links: BoardLink[]
}) {
  const [measured, setMeasured] = useState<MeasuredBoard>({ width: 0, height: 0, links: [] })
  useLayoutEffect(() => {
    const root = boardRef.current
    if (!root) return
    let frame: number | null = null
    const moving = new Set<string>()
    const measure = (animationFrame = false) => {
      frame = null
      const board = root.getBoundingClientRect()
      const cards = new Map(Array.from(root.querySelectorAll<HTMLElement>('.combat-creature-slot[data-creature-id]'))
        .map((card) => [card.dataset.creatureId!, card] as const))
      const visible: MeasuredLink[] = []
      for (const link of links) {
        const from = cards.get(link.from), to = cards.get(link.to)
        const ownRow = from?.closest('.combat-table-scroll') ?? from?.closest('.combat-creature-row'), enemyRow = to?.closest('.combat-table-scroll') ?? to?.closest('.combat-creature-row')
        if (!from || !to || !ownRow || !enemyRow) continue
        const fromCard = from.querySelector('.creature-tile') ?? from
        const toCard = to.querySelector('.creature-tile') ?? to
        const geometry = boardConnection(board, fromCard.getBoundingClientRect(), ownRow.getBoundingClientRect(), toCard.getBoundingClientRect(), enemyRow.getBoundingClientRect())
        if (geometry) visible.push({ ...link, geometry })
      }
      const next = { width: Number.isFinite(board.width) ? board.width : 0, height: Number.isFinite(board.height) ? board.height : 0, links: visible }
      const publish = () => setMeasured((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
      // CSS positions are sampled for this paint. Deferring React's SVG commit makes links trail by a frame.
      // The initial layout-effect measurement stays within React's normal synchronous layout cycle.
      if (animationFrame) flushSync(publish)
      else publish()
      if (moving.size) frame = requestAnimationFrame(() => measure(true))
    }
    const schedule = () => { if (frame === null) frame = requestAnimationFrame(() => measure(true)) }
    const transitionKey = (event: TransitionEvent) => {
      if (!['left', 'transform', 'top', 'margin-top'].includes(event.propertyName) || !(event.target instanceof HTMLElement) || !event.target.matches('.combat-creature-slot')) return null
      return `${event.target.dataset.creatureId}:${event.propertyName}`
    }
    const transitionStart = (event: TransitionEvent) => {
      const key = transitionKey(event)
      if (!key) return
      moving.add(key)
      schedule()
    }
    const transitionEnd = (event: TransitionEvent) => {
      const key = transitionKey(event)
      if (!key) return
      moving.delete(key)
      schedule()
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule)
    const observe = () => {
      observer?.disconnect()
      observer?.observe(root)
      root.querySelectorAll('.combat-creature-slot, .combat-creature-row').forEach((element) => observer?.observe(element))
    }
    const mutation = new MutationObserver((records) => {
      if (records.every((record) => record.target instanceof Element && record.target.closest('.board-connections'))) return
      observe()
      schedule()
    })
    observe()
    mutation.observe(root, { childList: true, subtree: true })
    root.addEventListener('scroll', schedule, true)
    root.addEventListener('transitionrun', transitionStart)
    root.addEventListener('transitionend', transitionEnd)
    root.addEventListener('transitioncancel', transitionEnd)
    window.addEventListener('resize', schedule)
    measure()
    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observer?.disconnect()
      mutation.disconnect()
      root.removeEventListener('scroll', schedule, true)
      root.removeEventListener('transitionrun', transitionStart)
      root.removeEventListener('transitionend', transitionEnd)
      root.removeEventListener('transitioncancel', transitionEnd)
      window.removeEventListener('resize', schedule)
    }
  }, [boardRef, links])

  if (measured.width <= 0 || measured.height <= 0) return null
  return <svg className="board-connections" viewBox={`0 0 ${measured.width} ${measured.height}`} aria-hidden="true" focusable="false"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: 4 }}>
    {measured.links.map(({ from, to, kind, order, geometry }) => {
      const badge = { x: geometry.from.x + (geometry.to.x - geometry.from.x) * .18, y: geometry.from.y + (geometry.to.y - geometry.from.y) * .18 }
      return <g className={`board-link board-link-${kind}`} key={`${kind}:${from}:${to}`}>
        <line x1={geometry.from.x} y1={geometry.from.y} x2={geometry.to.x} y2={geometry.to.y} stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={geometry.to.x} cy={geometry.to.y} r="3" fill="currentColor" />
        {kind === 'block' && typeof order === 'number' && Number.isInteger(order) && order > 0 && <g className="board-block-order"><circle cx={badge.x} cy={badge.y} r="10" fill="#13262d" stroke="currentColor" /><text x={badge.x} y={badge.y} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="11" fontWeight="700">{order}</text></g>}
      </g>
    })}
  </svg>
}
