import { cardInstanceId, declareAttackers, declareBlockers, resolveCombat, RuleViolation, startCombat, summonCreature } from './rules.js'
import type { DuelState } from './types.js'

/** Plays every affordable card, choosing the first available creatures for sacrifice. */
export function playEnemyCards(state: DuelState): DuelState {
  if (state.phase !== 'main' || state.activePlayer !== 'opponent') {
    throw new RuleViolation('El enemigo solo puede jugar cartas durante su fase principal.')
  }

  let next = state
  while (true) {
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
  const available = [...state.players.opponent.creatures]
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
  let next = state.players.opponent.kind === 'group' ? state : startCombat(playEnemyCards(state))
  if (next.activePlayer !== 'opponent' || next.phase !== 'attackers') throw new RuleViolation('No es el turno de ataque enemigo.')
  next = declareAttackers(next, next.players.opponent.creatures.map((creature) => creature.id))
  return next
}

/** Resolves the enemy's deterministic blocks and combat after the player declares attackers. */
export function resolveEnemyBlocks(state: DuelState): DuelState {
  const assignments = chooseEnemyBlockers(state)
  return resolveCombat(declareBlockers(state, assignments))
}
