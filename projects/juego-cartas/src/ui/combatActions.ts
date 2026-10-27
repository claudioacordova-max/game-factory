import { advanceMainPhaseIfNoLegalSummons, declareAttackers, declareBlockers, endTurn, resolveCombat, RuleViolation, startCombat, summonAvailability, summonCreature } from '../engine/rules.js'
import { resolveEnemyBlocks, runEnemyTurn } from '../engine/enemy.js'
import type { DuelState } from '../engine/types.js'

export interface PendingSummon { cardId: string; sacrificeIds: string[] }
export interface CombatControls { duel: DuelState; pending: PendingSummon | null; revision: number }
export type CombatAction =
  | { type: 'summon'; cardId: string }
  | { type: 'sacrifice'; creatureId: string }
  | { type: 'cancel' }
  | { type: 'begin-attack' }
  | { type: 'attack'; attackerIds: string[]; targets: Record<string, string> }
  | { type: 'blocks'; choices: Record<string, string[]> }
  | { type: 'advance' }
export interface CombatActionResult { state: CombatControls; message: string; sacrificedCopyIds: string[] }

export function createCombatControls(duel: DuelState, revision = 0): CombatControls {
  return { duel, pending: null, revision }
}

export function cancelSummonShortcut(event: Pick<KeyboardEvent, 'key' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey'>, editing: boolean): boolean {
  return event.key === 'Escape' && !event.repeat && !event.ctrlKey && !event.altKey && !event.metaKey && !editing
}

/** Reuses domain phases, stopping before every real player decision. */
export function continueToPlayerDecision(duel: DuelState, pending = false): DuelState {
  let next = duel
  if (next.phase === 'finished') return next
  if (next.phase === 'resolved') {
    next = next.activePlayer === 'player' ? runEnemyTurn(endTurn(next)) : endTurn(next)
  }
  if (next.phase === 'blockers' && next.activePlayer === 'opponent' && next.attackers.length === 0) {
    next = resolveCombat(declareBlockers(next, {}))
    if (next.phase === 'finished') return next
    next = endTurn(next)
  }
  return advanceMainPhaseIfNoLegalSummons(next, pending)
}

function requirePlayerPhase(duel: DuelState, phase: 'main' | 'attackers' | 'blockers', active: 'player' | 'opponent' = 'player') {
  if (duel.phase !== phase || duel.activePlayer !== active) throw new RuleViolation('Esa acción ya no está disponible en esta fase.')
}

/** Pure transaction used by App. Revision rejects events from an obsolete render. */
export function applyCombatAction(current: CombatControls, action: CombatAction, expectedRevision: number): CombatActionResult {
  const unchanged = (message = ''): CombatActionResult => ({ state: current, message, sacrificedCopyIds: [] })
  if (expectedRevision !== current.revision) return unchanged()
  const { duel } = current
  let next = duel, pending = current.pending, message = ''
  let sacrificedCopyIds: string[] = []
  try {
    if (action.type === 'advance') {
      next = continueToPlayerDecision(duel, pending !== null)
    } else if (action.type === 'cancel') {
      if (!pending) return unchanged()
      pending = null
      message = 'Invocación cancelada; no se perdió ninguna criatura.'
      next = continueToPlayerDecision(duel)
    } else if (action.type === 'summon') {
      requirePlayerPhase(duel, 'main')
      if (pending) throw new RuleViolation('Completa o cancela el sacrificio pendiente antes de jugar otra carta.')
      const card = duel.players.player.hand.find((candidate) => candidate.id === action.cardId)
      const availability = summonAvailability(duel.players.player, action.cardId)
      if (!card || !availability.allowed) throw new RuleViolation(availability.reason)
      if (card.cost.sacrifices > 0) {
        pending = { cardId: card.id, sacrificeIds: [] }
        message = `Elige ${card.cost.sacrifices} criatura(s). La última selección ejecuta la invocación y su pérdida permanente.`
      } else {
        next = continueToPlayerDecision(summonCreature(duel, card.id))
        message = `${card.name} entra en juego.`
      }
    } else if (action.type === 'sacrifice') {
      requirePlayerPhase(duel, 'main')
      if (!pending) throw new RuleViolation('No hay un sacrificio pendiente.')
      const player = duel.players.player
      const card = player.hand.find((candidate) => candidate.id === pending!.cardId)
      if (!card) throw new RuleViolation('La carta ya no está en tu mano.')
      const availability = summonAvailability(player, card.id)
      if (!availability.allowed) throw new RuleViolation(availability.reason)
      if (!player.creatures.some((unit) => unit.id === action.creatureId) || pending.sacrificeIds.some((id) => !player.creatures.some((unit) => unit.id === id))) throw new RuleViolation('Solo puedes elegir criaturas propias que sigan en el campo.')
      const ids = pending.sacrificeIds.includes(action.creatureId) ? pending.sacrificeIds.filter((id) => id !== action.creatureId) : [...pending.sacrificeIds, action.creatureId]
      if (ids.length < card.cost.sacrifices) {
        pending = { ...pending, sacrificeIds: ids }
      } else {
        next = summonCreature(duel, card.id, ids)
        sacrificedCopyIds = player.creatures.filter((unit) => ids.includes(unit.id)).flatMap((unit) => unit.copyId ? [unit.copyId] : [])
        pending = null
        next = continueToPlayerDecision(next)
        message = `${card.name} entra en juego. Los sacrificios se perdieron permanentemente.`
      }
    } else if (action.type === 'begin-attack') {
      requirePlayerPhase(duel, 'main')
      if (pending) throw new RuleViolation('Completa o cancela el sacrificio antes de atacar.')
      next = startCombat(duel)
    } else if (action.type === 'attack') {
      requirePlayerPhase(duel, 'attackers')
      const declared = declareAttackers(duel, action.attackerIds, action.targets)
      next = continueToPlayerDecision(duel.mode === 'skirmish' ? resolveCombat(declared) : resolveEnemyBlocks(declared))
      message = next.phase === 'blockers' ? 'El enemigo ataca. Asigna tus bloqueos.' : next.phase === 'finished' ? '' : 'Comienza tu siguiente turno.'
    } else {
      requirePlayerPhase(duel, 'blockers', 'opponent')
      next = continueToPlayerDecision(resolveCombat(declareBlockers(duel, action.choices)))
      message = next.phase === 'finished' ? '' : 'Bloqueos resueltos. Comienza tu turno.'
    }
    if (next === duel && pending === current.pending) return unchanged(message)
    return { state: { duel: next, pending, revision: current.revision + 1 }, message, sacrificedCopyIds }
  } catch (error) {
    if (!(error instanceof RuleViolation)) throw error
    return unchanged(error.message)
  }
}
