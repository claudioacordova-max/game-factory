import { activateN01, activateR01, advanceMainPhaseIfNoLegalSummons, cardInstanceId, findHandCard, declareAttackers, declareBlockers, endTurn, healingCandidates, mainHealingSource, n01ActivationAvailability, resolveMainHealing, resolveCombat, RuleViolation, sacrificeCandidates, startCombat, summonAvailability, summonCreature, surrender } from '../engine/rules.js'
import { chooseEnemyBlockers, runEnemyTurn } from '../engine/enemy.js'
import type { DuelState } from '../engine/types.js'

/** cardId is a combat instance reference, never a V04B type ID. */
export interface RitualMaterial { id: string; copyId?: string; instanceId: string; health: number }
export interface PendingSummon {
  kind: 'summon'; cardId: string; sacrificeIds: string[]; stage: 'materials' | 'target' | 'confirm'
  targetIds?: string[]; snapshot?: RitualMaterial[]; previewRevision?: number
}
export interface PendingDestroy { kind: 'destroy'; sourceId: string; targetIds: string[]; cardId?: undefined; sacrificeIds: string[] }
export interface PendingHealing { kind: 'healing'; sourceId: string; targetIds: string[]; cardId?: undefined; sacrificeIds: string[] }
export type CombatPending = PendingSummon | PendingDestroy | PendingHealing
export interface CombatControls { duel: DuelState; pending: CombatPending | null; revision: number }
export type CombatAction =
  | { type: 'summon'; cardId: string }
  | { type: 'sacrifice'; creatureId: string }
  | { type: 'activate-r01'; creatureId: string }
  | { type: 'activate-n01'; creatureId: string }
  | { type: 'effect-target'; creatureId: string }
  | { type: 'confirm-ritual' }
  | { type: 'edit-ritual' }
  | { type: 'cancel' }
  | { type: 'begin-attack' }
  | { type: 'surrender' }
  | { type: 'attack'; attackerIds: string[]; targets: Record<string, string> }
  | { type: 'blocks'; choices: Record<string, string[]> }
  | { type: 'advance' }
export interface CombatActionResult { state: CombatControls; message: string; sacrificedCopyIds: string[]; presentation?: DuelState }

export function createCombatControls(duel: DuelState, revision = 0): CombatControls {
  return { duel, pending: healingPending(duel), revision }
}

function healingPending(duel: DuelState): PendingHealing | null {
  const source = duel.phase === 'main' && duel.activePlayer === 'player' ? mainHealingSource(duel) : undefined
  return source ? { kind: 'healing', sourceId: source.id, targetIds: healingCandidates(duel, source.id).map((unit) => unit.id), sacrificeIds: [] } : null
}

function ritualSnapshot(duel: DuelState, ids: string[]): RitualMaterial[] {
  return ids.map((id) => {
    const unit = duel.players.player.creatures.find((candidate) => candidate.id === id)
    if (!unit || unit.entityKind !== 'real' || unit.health <= 0) throw new RuleViolation('Los materiales del ritual cambiaron. Edita la selección.')
    return { id, copyId: unit.copyId, instanceId: cardInstanceId(unit.card), health: unit.health }
  })
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
  let presentation: DuelState | undefined
  const paySummon = (selection: PendingSummon, targetId?: string) => {
    const player = duel.players.player
    const card = findHandCard(player.hand, selection.cardId, duel.collectionProfile === 'legacy')
    if (!card) throw new RuleViolation('La carta ya no está en tu mano.')
    next = summonCreature(duel, selection.cardId, selection.sacrificeIds, targetId)
    sacrificedCopyIds = player.creatures.filter((unit) => selection.sacrificeIds.includes(unit.id)).flatMap((unit) => unit.copyId ? [unit.copyId] : [])
    pending = null
    next = continueToPlayerDecision(next)
    message = `${card.name} entra en juego.${sacrificedCopyIds.length ? ' Los sacrificios se perdieron permanentemente.' : ''}`
  }
  try {
    if (duel.phase === 'finished') return unchanged()
    // Domain queue owns mandatory healing even before its first UI publication.
    if (mainHealingSource(duel) && !pending) pending = healingPending(duel)
    if (pending?.kind === 'healing' && action.type !== 'effect-target' && action.type !== 'advance') {
      throw new RuleViolation('Elige el destino de la sanación obligatoria; no se puede omitir.')
    }
    if (action.type === 'advance') {
      if (current.pending) return unchanged()
      next = continueToPlayerDecision(duel, pending !== null)
    } else if (action.type === 'cancel') {
      if (!pending) return unchanged()
      pending = null
      message = 'Selección cancelada; no se pagaron recursos ni se perdió ninguna criatura.'
      next = continueToPlayerDecision(duel)
    } else if (action.type === 'effect-target') {
      requirePlayerPhase(duel, 'main')
      if (!pending || !pending.targetIds?.includes(action.creatureId)) throw new RuleViolation('Ese objetivo no pertenece a la selección pendiente.')
      if (pending.kind === 'healing') {
        if (mainHealingSource(duel)?.id !== pending.sourceId) throw new RuleViolation('La fuente de sanación cambió.')
        next = continueToPlayerDecision(resolveMainHealing(duel, action.creatureId))
        pending = null
        message = 'Sanación de comienzo resuelta.'
      } else if (pending.kind === 'destroy') {
        const sourceId = pending.sourceId
        const source = duel.players.player.creatures.find((unit) => unit.id === sourceId)
        next = continueToPlayerDecision(activateN01(duel, pending.sourceId, action.creatureId))
        sacrificedCopyIds = source?.copyId ? [source.copyId] : []
        pending = null
        message = 'Urna maldita se sacrificó y destruyó el objetivo; ambas criaturas se pierden.'
      } else {
        if (pending.stage !== 'target') throw new RuleViolation('No hay un objetivo de entrada pendiente.')
        paySummon(pending, action.creatureId)
      }
    } else if (action.type === 'edit-ritual') {
      requirePlayerPhase(duel, 'main')
      if (pending?.kind !== 'summon' || pending.stage !== 'confirm') throw new RuleViolation('No hay una confirmación ritual pendiente.')
      pending = { kind: 'summon', cardId: pending.cardId, sacrificeIds: pending.sacrificeIds, stage: 'materials' }
    } else if (action.type === 'confirm-ritual') {
      requirePlayerPhase(duel, 'main')
      if (pending?.kind !== 'summon' || pending.stage !== 'confirm' || pending.previewRevision !== current.revision
        || !pending.snapshot || JSON.stringify(pending.snapshot) !== JSON.stringify(ritualSnapshot(duel, pending.sacrificeIds))) {
        throw new RuleViolation('La previsión del ritual cambió. Edita o cancela la selección antes de confirmar.')
      }
      const card = findHandCard(duel.players.player.hand, pending.cardId, duel.collectionProfile === 'legacy')
      if (duel.collectionProfile !== 'v04b' || card?.id !== 'H04') throw new RuleViolation('Solo H04 requiere esta confirmación.')
      paySummon(pending)
    } else if (action.type === 'activate-r01' || action.type === 'activate-n01') {
      requirePlayerPhase(duel, 'main')
      if (pending) throw new RuleViolation('Completa o cancela la selección pendiente antes de activar una criatura.')
      const source = duel.players.player.creatures.find((unit) => unit.id === action.creatureId)
      if (action.type === 'activate-n01') {
        const availability = n01ActivationAvailability(duel, action.creatureId)
        if (!availability.allowed) throw new RuleViolation(availability.reason)
        pending = { kind: 'destroy', sourceId: action.creatureId, targetIds: duel.players.opponent.creatures.filter((unit) => unit.health > 0).map((unit) => unit.id), sacrificeIds: [] }
        message = 'Elige una criatura enemiga. Solo entonces se sacrifica la Urna y se destruye el objetivo.'
      } else {
        next = continueToPlayerDecision(activateR01(duel, action.creatureId))
        sacrificedCopyIds = source?.copyId ? [source.copyId] : []
        message = next.phase === 'main'
          ? 'Runa inestable se sacrificó: +2 de maná temporal hasta terminar la fase principal.'
          : 'Runa inestable se sacrificó: +2 de maná temporal. El sobrante expiró al pasar al ataque.'
      }
    } else if (action.type === 'summon') {
      requirePlayerPhase(duel, 'main')
      if (pending) throw new RuleViolation('Completa o cancela la selección pendiente antes de jugar otra carta.')
      const card = findHandCard(duel.players.player.hand, action.cardId, duel.collectionProfile === 'legacy')
      if (!card) throw new RuleViolation('La instancia de carta ya no está en tu mano.')
      const availability = summonAvailability(duel.players.player, cardInstanceId(card))
      if (!availability.allowed) throw new RuleViolation(availability.reason)
      const selection: PendingSummon = { kind: 'summon', cardId: cardInstanceId(card), sacrificeIds: [], stage: 'materials' }
      if (duel.collectionProfile === 'v04b' && ((card.id === 'A03' && duel.mode === 'skirmish') || (card.id === 'H03' && healingCandidates(duel).length > 1))) {
        const candidates = card.id === 'H03' ? healingCandidates(duel) : duel.players.opponent.creatures.filter((unit) => unit.health > 0)
        if (!candidates.length) throw new RuleViolation('No hay un objetivo enemigo vivo.')
        pending = { ...selection, stage: 'target', targetIds: candidates.map((unit) => unit.id) }
        message = card.id === 'H03' ? 'Elige una aliada herida: sana 1 y, si sana, roba 1.' : 'Elige una enemiga: recibe 1 de daño al entrar.'
      } else if (card.cost.sacrifices > 0) {
        pending = selection
        message = card.id === 'H04' && duel.collectionProfile === 'v04b'
          ? 'Elige tres criaturas reales para previsualizar el ritual; aún no se paga nada.'
          : `Elige ${card.cost.sacrifices} criatura(s). La última selección ejecuta la invocación y su pérdida permanente.`
      } else paySummon(selection)
    } else if (action.type === 'sacrifice') {
      requirePlayerPhase(duel, 'main')
      if (pending?.kind !== 'summon' || pending.stage === 'target') throw new RuleViolation('No hay un sacrificio pendiente.')
      const player = duel.players.player
      const card = findHandCard(player.hand, pending.cardId, duel.collectionProfile === 'legacy')
      if (!card) throw new RuleViolation('La carta ya no está en tu mano.')
      const availability = summonAvailability(player, cardInstanceId(card))
      if (!availability.allowed) throw new RuleViolation(availability.reason)
      const candidates = sacrificeCandidates(player, card)
      if (!candidates.some((unit) => unit.id === action.creatureId) || pending.sacrificeIds.some((id) => !candidates.some((unit) => unit.id === id))) throw new RuleViolation('Solo puedes elegir materiales propios vivos y válidos que sigan en campo.')
      const ids = pending.sacrificeIds.includes(action.creatureId) ? pending.sacrificeIds.filter((id) => id !== action.creatureId) : [...pending.sacrificeIds, action.creatureId]
      if (ids.length > card.cost.sacrifices) throw new RuleViolation('Desmarca un material antes de elegir otro.')
      const selection: PendingSummon = { kind: 'summon', cardId: pending.cardId, sacrificeIds: ids, stage: 'materials' }
      if (ids.length < card.cost.sacrifices) pending = selection
      else if (duel.collectionProfile === 'v04b' && card.id === 'H04') {
        pending = { ...selection, stage: 'confirm', snapshot: ritualSnapshot(duel, ids), previewRevision: current.revision + 1 }
        message = 'Revisa los tres materiales y confirma el ritual. La pérdida será irreversible.'
      } else paySummon(selection)
    } else if (action.type === 'surrender') {
      if (pending) throw new RuleViolation('Completa o cancela la selección pendiente antes de rendirte.')
      next = surrender(duel)
      message = 'Te rendiste: derrota normal.'
    } else if (action.type === 'begin-attack') {
      requirePlayerPhase(duel, 'main')
      if (pending) throw new RuleViolation('Completa o cancela la selección antes de atacar.')
      next = startCombat(duel)
    } else if (action.type === 'attack') {
      requirePlayerPhase(duel, 'attackers')
      const declared = declareAttackers(duel, action.attackerIds, action.targets)
      const ready = duel.mode === 'skirmish' ? declared : declareBlockers(declared, chooseEnemyBlockers(declared))
      if (duel.mode === 'duel' && ready.attackers.length) presentation = ready
      next = continueToPlayerDecision(resolveCombat(ready))
      message = next.phase === 'blockers' ? 'El enemigo ataca. Asigna tus bloqueos.' : next.phase === 'finished' ? '' : 'Comienza tu siguiente turno.'
    } else {
      requirePlayerPhase(duel, 'blockers', 'opponent')
      next = continueToPlayerDecision(resolveCombat(declareBlockers(duel, action.choices)))
      message = next.phase === 'finished' ? '' : 'Bloqueos resueltos. Comienza tu turno.'
    }
    if (next.phase === 'finished') pending = null
    else if (!pending) pending = healingPending(next)
    if (next === duel && pending === current.pending) return unchanged(message)
    return { state: { duel: next, pending, revision: current.revision + 1 }, message, sacrificedCopyIds, presentation }
  } catch (error) {
    if (!(error instanceof RuleViolation)) throw error
    return unchanged(error.message)
  }
}
