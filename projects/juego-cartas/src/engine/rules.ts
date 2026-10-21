import type { Creature, CreatureCard, DuelSetup, DuelState, Invoker, PlayerId } from './types.js'

export class RuleViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RuleViolation'
  }
}

const INITIAL_LIFE = 20
const INITIAL_LEVEL = 1
const INITIAL_HAND_SIZE = 3
let nextDuelNumber = 1

function opponentOf(player: PlayerId): PlayerId {
  return player === 'player' ? 'opponent' : 'player'
}

function makeInvoker(deck: CreatureCard[], fatigue = 0): Invoker {
  const orderedDeck = [...deck]
  return {
    level: INITIAL_LEVEL,
    fatigue,
    life: INITIAL_LIFE,
    mana: Math.max(0, INITIAL_LEVEL - fatigue),
    hand: orderedDeck.splice(0, INITIAL_HAND_SIZE),
    deck: orderedDeck,
    creatures: [],
  }
}

export function createDuel(setup: DuelSetup): DuelState {
  const firstPlayer = setup.firstPlayer ?? 'player'
  return {
    id: `duel-${nextDuelNumber++}`,
    players: {
      player: makeInvoker(setup.playerDeck, setup.playerFatigue ?? 0),
      opponent: makeInvoker(setup.opponentDeck),
    },
    activePlayer: firstPlayer,
    turn: 1,
    phase: 'main',
    attackers: [],
    blockers: {},
    winner: null,
    nextCreatureNumber: 1,
  }
}

export function baseMana(invoker: Invoker): number {
  return Math.max(0, invoker.level - invoker.fatigue)
}

function requireOngoing(state: DuelState): void {
  if (state.phase === 'finished') throw new RuleViolation('El duelo ya terminó.')
}

function requirePhase(state: DuelState, phase: DuelState['phase']): void {
  requireOngoing(state)
  if (state.phase !== phase) throw new RuleViolation(`La acción requiere la fase ${phase}.`)
}

function updateInvoker(state: DuelState, player: PlayerId, invoker: Invoker): DuelState {
  return { ...state, players: { ...state.players, [player]: invoker } }
}

export function summonCreature(state: DuelState, cardId: string, sacrificeIds: string[] = []): DuelState {
  requirePhase(state, 'main')
  const owner = state.activePlayer
  const invoker = state.players[owner]
  const cardIndex = invoker.hand.findIndex((card) => card.id === cardId)
  if (cardIndex < 0) throw new RuleViolation('La carta no está en la mano del jugador activo.')
  const card = invoker.hand[cardIndex]
  if (sacrificeIds.length !== card.cost.sacrifices) {
    throw new RuleViolation('Debes sacrificar exactamente la cantidad indicada por el coste.')
  }
  if (new Set(sacrificeIds).size !== sacrificeIds.length) {
    throw new RuleViolation('No puedes sacrificar la misma criatura más de una vez.')
  }
  const sacrificeSet = new Set(sacrificeIds)
  const sacrifices = invoker.creatures.filter((creature) => sacrificeSet.has(creature.id))
  if (sacrifices.length !== sacrificeIds.length) {
    throw new RuleViolation('Solo puedes sacrificar criaturas propias que estén en juego.')
  }
  if (invoker.mana < card.cost.mana) throw new RuleViolation('No hay maná suficiente.')

  const creature: Creature = {
    id: `creature-${state.nextCreatureNumber}`,
    copyId: card.copyId,
    card,
    owner,
    health: card.startingHealth ?? card.maxHealth,
    summonedTurn: state.turn,
  }
  const nextInvoker: Invoker = {
    ...invoker,
    mana: invoker.mana - card.cost.mana,
    hand: invoker.hand.filter((_, index) => index !== cardIndex),
    creatures: [...invoker.creatures.filter((unit) => !sacrificeSet.has(unit.id)), creature],
  }
  return { ...updateInvoker(state, owner, nextInvoker), nextCreatureNumber: state.nextCreatureNumber + 1 }
}

export function declareAttackers(state: DuelState, attackerIds: string[]): DuelState {
  requirePhase(state, 'attackers')
  if (new Set(attackerIds).size !== attackerIds.length) throw new RuleViolation('Un atacante solo puede declararse una vez.')
  const units = state.players[state.activePlayer].creatures
  if (attackerIds.some((id) => !units.some((unit) => unit.id === id))) {
    throw new RuleViolation('Los atacantes deben ser criaturas propias en juego.')
  }
  // No criatura tiene mareo de invocación: las invocadas este turno también pueden atacar.
  return { ...state, attackers: [...attackerIds], blockers: {}, phase: 'blockers' }
}

export function declareBlockers(state: DuelState, assignments: Record<string, string[]>): DuelState {
  requirePhase(state, 'blockers')
  const defender = opponentOf(state.activePlayer)
  const defenderUnits = state.players[defender].creatures
  const usedBlockers = new Set<string>()
  for (const [attackerId, blockerIds] of Object.entries(assignments)) {
    if (!state.attackers.includes(attackerId)) throw new RuleViolation('Solo se puede bloquear a un atacante declarado.')
    if (new Set(blockerIds).size !== blockerIds.length) throw new RuleViolation('Un bloqueador no puede asignarse dos veces al mismo atacante.')
    for (const blockerId of blockerIds) {
      if (usedBlockers.has(blockerId)) throw new RuleViolation('Cada criatura solo puede bloquear a un atacante.')
      if (!defenderUnits.some((unit) => unit.id === blockerId)) throw new RuleViolation('Los bloqueadores deben ser criaturas defensoras en juego.')
      usedBlockers.add(blockerId)
    }
  }
  return { ...state, blockers: Object.fromEntries(Object.entries(assignments).map(([id, ids]) => [id, [...ids]])), phase: 'resolve' }
}

export function resolveCombat(state: DuelState): DuelState {
  requirePhase(state, 'resolve')
  const attackerPlayer = state.activePlayer
  const defenderPlayer = opponentOf(attackerPlayer)
  const attackers = state.players[attackerPlayer].creatures
  const defenders = state.players[defenderPlayer].creatures
  const damageToUnits = new Map<string, number>()
  let damageToInvoker = 0

  for (const attackerId of state.attackers) {
    const attacker = attackers.find((unit) => unit.id === attackerId)
    if (!attacker) continue
    const orderedBlockers = state.blockers[attackerId] ?? []
    if (orderedBlockers.length === 0) {
      damageToInvoker += attacker.card.attack
      continue
    }
    let remainingDamage = attacker.card.attack
    for (const blockerId of orderedBlockers) {
      if (remainingDamage <= 0) break
      const blocker = defenders.find((unit) => unit.id === blockerId)
      if (!blocker) continue
      const lethalDamage = blocker.health
      const assigned = Math.min(remainingDamage, lethalDamage)
      damageToUnits.set(blockerId, (damageToUnits.get(blockerId) ?? 0) + assigned)
      remainingDamage -= assigned
    }
    // Daño del/los bloqueadores simultáneo; cada bloqueador asignado hace todo su ataque.
    for (const blockerId of orderedBlockers) {
      const blocker = defenders.find((unit) => unit.id === blockerId)
      if (blocker) damageToUnits.set(attackerId, (damageToUnits.get(attackerId) ?? 0) + blocker.card.attack)
    }
  }

  const nextAttackers = attackers.map((unit) => ({ ...unit, health: unit.health - (damageToUnits.get(unit.id) ?? 0) }))
  const nextDefenders = defenders.map((unit) => ({ ...unit, health: unit.health - (damageToUnits.get(unit.id) ?? 0) }))
  const defender = state.players[defenderPlayer]
  const nextDefender: Invoker = { ...defender, life: defender.life - damageToInvoker, creatures: nextDefenders.filter((unit) => unit.health > 0) }
  const nextAttacker: Invoker = { ...state.players[attackerPlayer], creatures: nextAttackers.filter((unit) => unit.health > 0) }
  const updated = updateInvoker(updateInvoker(state, attackerPlayer, nextAttacker), defenderPlayer, nextDefender)
  const winner = nextDefender.life <= 0 ? attackerPlayer : null
  return { ...updated, phase: winner ? 'finished' : 'resolved', winner }
}

/** Ends the resolved turn and starts the opponent's turn with maintenance applied. */
export function endTurn(state: DuelState): DuelState {
  requirePhase(state, 'resolved')
  const activePlayer = opponentOf(state.activePlayer)
  const current = state.players[activePlayer]
  const nextInvoker: Invoker = {
    ...current,
    mana: baseMana(current),
    hand: current.deck.length > 0 ? [...current.hand, current.deck[0]] : current.hand,
    deck: current.deck.slice(current.deck.length > 0 ? 1 : 0),
  }
  const nextState = updateInvoker(state, activePlayer, nextInvoker)
  return {
    ...nextState,
    activePlayer,
    turn: state.turn + 1,
    phase: 'main',
    attackers: [],
    blockers: {},
  }
}

export function startCombat(state: DuelState): DuelState {
  requirePhase(state, 'main')
  return { ...state, phase: 'attackers' }
}
