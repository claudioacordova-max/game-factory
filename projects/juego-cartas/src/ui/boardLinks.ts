import type { DuelState } from '../engine/types.js'
import type { BoardLink } from './boardGeometry.js'

export function combatBoardLinks(duel: DuelState, attackers: string[], targets: Record<string, string>, blocks: Record<string, string[]>): BoardLink[] {
  const own = new Set(duel.players.player.creatures.map((unit) => unit.id))
  const enemy = new Set(duel.players.opponent.creatures.map((unit) => unit.id))
  if ((duel.phase === 'blockers' || duel.phase === 'resolve') && duel.activePlayer === 'opponent') {
    return Object.entries(blocks).filter(([to]) => duel.attackers.includes(to) && enemy.has(to)).flatMap(([to, ids]) => ids.flatMap((from, index) => own.has(from) ? [{ from, to, kind: 'block' as const, order: index + 1 }] : []))
  }
  if (duel.mode === 'skirmish' && (duel.phase === 'attackers' || duel.phase === 'resolve') && duel.activePlayer === 'player') {
    return attackers.flatMap((from) => own.has(from) && enemy.has(targets[from]) ? [{ from, to: targets[from], kind: 'target' as const }] : [])
  }
  if (duel.mode === 'duel' && duel.phase === 'resolve' && duel.activePlayer === 'player') {
    return attackers.flatMap((from) => own.has(from) ? (blocks[from] ?? []).flatMap((to, index) => enemy.has(to) ? [{ from, to, kind: 'block' as const, order: index + 1 }] : []) : [])
  }
  return []
}
