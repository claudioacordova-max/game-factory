import { activateR01, cardInstanceId, declareAttackers, declareBlockers, effectiveAttack, effectiveMaxHealth, hasLegalSummon, healingCandidates, mainHealingSource, r01ActivationAvailability, resolveCombat, resolveMainHealing, RuleViolation, sacrificeCandidates, startCombat, summonAvailability, summonCreature } from './rules.js'
import type { Creature, CreatureCard, DuelState } from './types.js'

/** Level 1 (MIG-D07): wounded ally with the most lost health, ties by field order. */
function mostWounded(candidates: readonly Creature[]): Creature | undefined {
  let best: Creature | undefined
  for (const unit of candidates) {
    if (!best || effectiveMaxHealth(unit) - unit.health > effectiveMaxHealth(best) - best.health) best = unit
  }
  return best
}

/** Tokens first, then real creatures by lowest current ATK+HP (ties by field order). H04 candidates are already real-only. */
function chooseSacrifices(state: DuelState, card: CreatureCard): string[] {
  const enemy = state.players.opponent
  if (enemy.kind !== 'invoker') return []
  const candidates = sacrificeCandidates(enemy, card)
  const worth = (unit: Creature) => effectiveAttack(unit) + unit.health
  const ordered = [
    ...candidates.filter((unit) => unit.entityKind === 'token'),
    ...candidates.map((unit, index) => ({ unit, index })).filter((entry) => entry.unit.entityKind !== 'token')
      .sort((a, b) => worth(a.unit) - worth(b.unit) || a.index - b.index).map((entry) => entry.unit),
  ]
  return ordered.slice(0, card.cost.sacrifices).map((unit) => unit.id)
}

/** Level 1 main phase for V0.4B rivals, built only on domain operations. */
function playEnemyCardsV04B(state: DuelState): DuelState {
  let next = state
  while (next.phase === 'main' && mainHealingSource(next)) {
    const source = mainHealingSource(next)!
    const target = mostWounded(healingCandidates(next, source.id))
    if (!target) break
    next = resolveMainHealing(next, target.id)
  }
  while (next.phase === 'main') {
    const enemy = next.players.opponent
    if (enemy.kind !== 'invoker') return next
    const playable = enemy.hand.find((card) => summonAvailability(enemy, cardInstanceId(card)).allowed)
    if (playable) {
      const sacrifices = chooseSacrifices(next, playable)
      const sacrificed = new Set(sacrifices)
      const target = playable.id === 'H03' ? mostWounded(healingCandidates(next).filter((unit) => !sacrificed.has(unit.id))) : undefined
      next = summonCreature(next, cardInstanceId(playable), sacrifices, target?.id)
      continue
    }
    // R01 only when its +2 temporary mana makes a card playable that was not playable before.
    const rune = enemy.creatures.find((unit) => {
      if (!r01ActivationAvailability(next, unit.id).allowed) return false
      const after = activateR01(next, unit.id).players.opponent
      return after.kind === 'invoker' && hasLegalSummon(after)
    })
    if (!rune) return next
    next = activateR01(next, rune.id)
  }
  return next
}

/** Plays every affordable card, choosing the first available creatures for sacrifice. */
export function playEnemyCards(state: DuelState): DuelState {
  if (state.phase !== 'main' || state.activePlayer !== 'opponent') {
    throw new RuleViolation('El enemigo solo puede jugar cartas durante su fase principal.')
  }

  if (state.collectionProfile === 'v04b') return playEnemyCardsV04B(state)
  let next = state
  while (true) {
    if (next.phase === 'finished') return next
    const enemy = next.players.opponent
    if (enemy.kind === 'group') return next
    const playable = enemy.hand.find((card) =>
      card.cost.mana <= enemy.mana && card.cost.sacrifices <= enemy.creatures.length,
    )
    if (!playable) return next

    const sacrifices = enemy.creatures.slice(0, playable.cost.sacrifices).map((creature) => creature.id)
    next = summonCreature(next, cardInstanceId(playable), sacrifices)
  }
}

/** Assigns at most one blocker to each attacker, preferring a blocker that can kill it. */
export function chooseEnemyBlockers(state: DuelState): Record<string, string[]> {
  if (state.phase !== 'blockers' || state.activePlayer !== 'player') {
    throw new RuleViolation('El enemigo solo elige bloqueos durante el combate del jugador.')
  }

  if (state.mode === 'skirmish') throw new RuleViolation('El grupo no declara bloqueadores.')
  const available = state.players.opponent.creatures.filter((creature) => !creature.echo)
  const assignments: Record<string, string[]> = {}
  for (const attackerId of state.attackers) {
    const attacker = state.players.player.creatures.find((creature) => creature.id === attackerId)
    if (!attacker || available.length === 0) continue

    const lethalIndex = available.findIndex((blocker) => blocker.card.attack >= attacker.health)
    const blockerIndex = lethalIndex >= 0 ? lethalIndex : 0
    const [blocker] = available.splice(blockerIndex, 1)
    assignments[attackerId] = [blocker.id]
  }
  return assignments
}

/** Runs the enemy's main phase and attack, leaving the player in control of blocks. */
export function runEnemyTurn(state: DuelState): DuelState {
  let next = state.players.opponent.kind === 'group' ? state : playEnemyCards(state)
  if (next.phase === 'finished') return next
  if (next.players.opponent.kind !== 'group') next = startCombat(next)
  if (next.activePlayer !== 'opponent' || next.phase !== 'attackers') throw new RuleViolation('No es el turno de ataque enemigo.')
  next = declareAttackers(next, next.players.opponent.creatures.map((creature) => creature.id))
  return next
}

/** Resolves the enemy's deterministic blocks and combat after the player declares attackers. */
export function resolveEnemyBlocks(state: DuelState): DuelState {
  const assignments = chooseEnemyBlockers(state)
  return resolveCombat(declareBlockers(state, assignments))
}
