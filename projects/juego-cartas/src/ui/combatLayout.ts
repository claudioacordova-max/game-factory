import type { DuelState } from '../engine/types.js'

export const COMBAT_CARD_WIDTH = 146
const STEP = 162
const GROUP_GAP = 34
export interface CombatLayoutGroup { id: string; own: string[]; enemy: string[]; neutral: boolean; left: number; width: number }
export interface CombatLayout {
  groups: CombatLayoutGroup[]
  positions: Record<string, number>
  rows: Record<string, number>
  width: number
  contextual: boolean
  rowCount: number
  enemyRow: number
  availableOwn: string[]
  availableEnemy: string[]
}

/** Presentation only: the same card nodes move between contextual rows, never engine arrays. */
export function combatLayout(duel: DuelState, attackers: string[], targets: Record<string, string>, blocks: Record<string, string[]>): CombatLayout {
  const own = duel.players.player.creatures.map((unit) => unit.id)
  const enemy = duel.players.opponent.creatures.map((unit) => unit.id)
  const groups: CombatLayoutGroup[] = []
  const add = (id: string, a: string[], b: string[]) => {
    if (a.length || b.length) groups.push({ id, own: a, enemy: b, neutral: false, left: 0, width: 0 })
  }
  const directed = duel.mode === 'skirmish' && duel.activePlayer === 'player' && ['attackers', 'resolve'].includes(duel.phase)
  const defense = duel.activePlayer === 'opponent' && ['blockers', 'resolve'].includes(duel.phase) && duel.attackers.length > 0
  const preview = duel.mode === 'duel' && duel.activePlayer === 'player' && duel.phase === 'resolve' && attackers.length > 0
  const contextual = directed || defense || preview
  if (directed) {
    // All enemies remain destinations, including targets that have no attacker yet.
    for (const target of enemy) add(target, attackers.filter((id) => own.includes(id) && targets[id] === target), [target])
  } else if (defense) {
    for (const attacker of duel.attackers) if (enemy.includes(attacker)) add(attacker, (blocks[attacker] ?? []).filter((id) => own.includes(id)), [attacker])
  } else if (preview) {
    // Unblocked direct attacks are participants too: they retain their own group.
    for (const attacker of attackers) if (own.includes(attacker)) add(attacker, [attacker], (blocks[attacker] ?? []).filter((id) => enemy.includes(id)))
  }
  const usedOwn = new Set(groups.flatMap((group) => group.own)), usedEnemy = new Set(groups.flatMap((group) => group.enemy))
  const availableOwn = own.filter((id) => !usedOwn.has(id)), availableEnemy = enemy.filter((id) => !usedEnemy.has(id))
  const rowWidth = (ids: string[]) => ids.length ? ids.length * STEP - 16 + 24 : 0
  const activeWidth = groups.reduce((width, group, index) => {
    group.width = Math.max(group.own.length, group.enemy.length, 1) * STEP + 12
    return width + group.width + (index ? GROUP_GAP : 0)
  }, 24)
  // Available cards share the width, rather than being appended beside active groups.
  const width = Math.max(200, activeWidth, rowWidth(availableOwn), rowWidth(availableEnemy))
  const positions: Record<string, number> = {}, rows: Record<string, number> = {}
  const place = (ids: string[], row: number, left = 0, span = width) => ids.forEach((id, index) => {
    positions[id] = left + (span - (ids.length * STEP - 16)) / 2 + index * STEP
    rows[id] = row
  })
  const enemyRow = contextual && availableEnemy.length ? 1 : 0
  let cursor = (width - activeWidth + 24) / 2
  for (const group of groups) {
    group.left = cursor
    place(group.enemy, enemyRow, cursor, group.width)
    place(group.own, enemyRow + 1, cursor, group.width)
    cursor += group.width + GROUP_GAP
  }
  if (contextual) {
    place(availableEnemy, 0)
    place(availableOwn, enemyRow + 2)
  } else {
    place(enemy, 0)
    place(own, 1)
  }
  return { groups, positions, rows, width, contextual, enemyRow,
    rowCount: contextual ? enemyRow + (availableOwn.length ? 3 : 2) : 2,
    availableOwn, availableEnemy }
}
