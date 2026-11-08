import { activateR01, cardInstanceId, declareAttackers, declareBlockers, effectiveAttack, effectiveMaxHealth, hasLegalSummon, healingCandidates, mainHealingSource, r01ActivationAvailability, resolveCombat, resolveMainHealing, RuleViolation, sacrificeCandidates, startCombat, summonAvailability, summonCreature } from './rules.js'
import type { Creature, CreatureCard, DuelState } from './types.js'

/**
 * Rival AI level (MIG-D07). Level 2 (M8c) is the V0.4B default; level 1 is kept only as the reference strategy for the
 * balance simulation. The base (non-V0.4B) profile ignores the parameter; it only remains for rule fixtures.
 */
export type EnemyAiLevel = 1 | 2

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

// ---------- Level 2 heuristics (M8c). Simple and local: no search, no optimizer. ----------

/** Creature value: effective ATK + current health. */
const unitValue = (unit: Creature) => effectiveAttack(unit) + unit.health
/** Sacrifice material value: tokens are worth 0. */
const materialValue = (unit: Creature) => unit.entityKind === 'token' ? 0 : unitValue(unit)
/** A shield charge cancels all positive damage in one fight. */
const isShielded = (unit: Creature) => (unit.shieldCharges ?? 0) > 0
/** Predicts whether `striker` kills `target` in one fight (effective ATK and shields; nothing else). */
const kills = (striker: Creature, target: Creature) => effectiveAttack(striker) > 0 && !isShielded(target) && effectiveAttack(striker) >= target.health
/** Strongest first; the sort is stable, so ties keep field order. */
const byAttackDesc = (units: readonly Creature[]) => [...units].sort((a, b) => effectiveAttack(b) - effectiveAttack(a))
const lowestValue = (units: readonly Creature[]) => units.reduce<Creature | undefined>((best, unit) => !best || unitValue(unit) < unitValue(best) ? unit : best, undefined)

/** (1) Attack: all-in if lethal even when the player blocks the strongest; otherwise hold back doomed attackers and ATK 0. The echo always attacks. */
function chooseAttackersV2(state: DuelState): string[] {
  const armed = state.players.opponent.creatures.filter((unit) => effectiveAttack(unit) > 0)
  const player = state.players.player
  const unblocked = byAttackDesc(armed).slice(player.creatures.length)
  if (unblocked.reduce((sum, unit) => sum + effectiveAttack(unit), 0) >= player.life) return armed.map((unit) => unit.id)
  const doomed = (unit: Creature) => player.creatures.some((blocker) => kills(blocker, unit) && !kills(unit, blocker))
  return armed.filter((unit) => unit.echo || !doomed(unit)).map((unit) => unit.id)
}

/** (2) Block: a blocker that kills and survives, else an equal or favorable exchange; emergency blocks only against lethal damage. */
function chooseBlockersV2(state: DuelState): Record<string, string[]> {
  const rival = state.players.opponent
  if (rival.kind !== 'invoker') return {}
  const attackers = byAttackDesc(state.attackers.flatMap((id) => state.players.player.creatures.find((unit) => unit.id === id) ?? []))
  let free = rival.creatures.filter((unit) => !unit.echo && unit.health > 0)
  const assignments: Record<string, string[]> = {}
  const assign = (attacker: Creature, blocker: Creature) => { assignments[attacker.id] = [blocker.id]; free = free.filter((unit) => unit !== blocker) }
  for (const attacker of attackers) {
    const killers = free.filter((blocker) => kills(blocker, attacker))
    const blocker = lowestValue(killers.filter((candidate) => !kills(attacker, candidate)))
      ?? lowestValue(killers.filter((candidate) => unitValue(candidate) <= unitValue(attacker)))
    if (blocker) assign(attacker, blocker)
  }
  // Emergency: while the remaining damage is lethal, the lowest-value free creature blocks the strongest unblocked attacker.
  let incoming = attackers.filter((unit) => !assignments[unit.id]).reduce((sum, unit) => sum + effectiveAttack(unit), 0)
  for (const attacker of attackers) {
    const blocker = lowestValue(free)
    if (incoming < rival.life || !blocker) break
    if (assignments[attacker.id]) continue
    assign(attacker, blocker)
    incoming -= effectiveAttack(attacker)
  }
  return assignments
}

/** (3) Sacrifices: the real materials must not be worth more than the summoned card (H04 counts its ritual stats). */
function worthSummoning(state: DuelState, card: CreatureCard, sacrifices: readonly string[]): boolean {
  const enemy = state.players.opponent
  if (enemy.kind !== 'invoker') return false
  const materials = enemy.creatures.filter((unit) => sacrifices.includes(unit.id))
  const ritual = card.id === 'H04' ? 2 * materials.reduce((sum, unit) => sum + unit.health, 0) : 0
  return materials.reduce((sum, unit) => sum + materialValue(unit), 0) <= card.attack + card.maxHealth + ritual
}

interface SummonPlan { card: CreatureCard; sacrifices: string[] }

/** Next card to play, or none. Level 1: first payable in hand order. Level 2: highest total cost first (4), skipping cards that fail (3). */
function planSummon(state: DuelState, level: EnemyAiLevel): SummonPlan | undefined {
  const enemy = state.players.opponent
  if (enemy.kind !== 'invoker') return undefined
  const cost = (card: CreatureCard) => card.cost.mana + card.cost.sacrifices
  const payable = enemy.hand.filter((card) => summonAvailability(enemy, cardInstanceId(card)).allowed)
  const ordered = level === 2 ? [...payable].sort((a, b) => cost(b) - cost(a) || b.cost.mana - a.cost.mana) : payable
  for (const card of ordered) {
    const sacrifices = chooseSacrifices(state, card)
    if (level === 1 || worthSummoning(state, card, sacrifices)) return { card, sacrifices }
  }
  return undefined
}

/** V0.4B rival main phase. Healing, R01 and sacrifice order are level 1 in both levels (5). */
function playEnemyCardsV04B(state: DuelState, level: EnemyAiLevel): DuelState {
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
    const plan = planSummon(next, level)
    if (plan) {
      const sacrificed = new Set(plan.sacrifices)
      const target = plan.card.id === 'H03' ? mostWounded(healingCandidates(next).filter((unit) => !sacrificed.has(unit.id))) : undefined
      next = summonCreature(next, cardInstanceId(plan.card), plan.sacrifices, target?.id)
      continue
    }
    // R01 only when its +2 temporary mana makes a card playable (level 2: a card it would actually play).
    const rune = enemy.creatures.find((unit) => {
      if (!r01ActivationAvailability(next, unit.id).allowed) return false
      const after = activateR01(next, unit.id)
      const afterRival = after.players.opponent
      return level === 2 ? planSummon(after, level) !== undefined : afterRival.kind === 'invoker' && hasLegalSummon(afterRival)
    })
    if (!rune) return next
    next = activateR01(next, rune.id)
  }
  return next
}

/** Plays every affordable card, choosing the first available creatures for sacrifice. */
export function playEnemyCards(state: DuelState, level: EnemyAiLevel = 2): DuelState {
  if (state.phase !== 'main' || state.activePlayer !== 'opponent') {
    throw new RuleViolation('El enemigo solo puede jugar cartas durante su fase principal.')
  }

  if (state.collectionProfile === 'v04b') return playEnemyCardsV04B(state, level)
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
export function chooseEnemyBlockers(state: DuelState, level: EnemyAiLevel = 2): Record<string, string[]> {
  if (state.phase !== 'blockers' || state.activePlayer !== 'player') {
    throw new RuleViolation('El enemigo solo elige bloqueos durante el combate del jugador.')
  }

  if (state.mode === 'skirmish') throw new RuleViolation('El grupo no declara bloqueadores.')
  if (state.collectionProfile === 'v04b' && level === 2) return chooseBlockersV2(state)
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
export function runEnemyTurn(state: DuelState, level: EnemyAiLevel = 2): DuelState {
  let next = state.players.opponent.kind === 'group' ? state : playEnemyCards(state, level)
  if (next.phase === 'finished') return next
  if (next.players.opponent.kind !== 'group') next = startCombat(next)
  if (next.activePlayer !== 'opponent' || next.phase !== 'attackers') throw new RuleViolation('No es el turno de ataque enemigo.')
  const smart = next.collectionProfile === 'v04b' && level === 2 && next.players.opponent.kind === 'invoker'
  next = declareAttackers(next, smart ? chooseAttackersV2(next) : next.players.opponent.creatures.map((creature) => creature.id))
  return next
}

/** Resolves the enemy's deterministic blocks and combat after the player declares attackers. */
export function resolveEnemyBlocks(state: DuelState, level: EnemyAiLevel = 2): DuelState {
  const assignments = chooseEnemyBlockers(state, level)
  return resolveCombat(declareBlockers(state, assignments))
}
