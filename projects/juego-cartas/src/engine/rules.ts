import type { Creature, CreatureCard, DuelSetup, DuelState, Invoker, PlayerId, CombatSide } from './types.js'

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

function makeInvoker(deck: CreatureCard[], fatigue = 0, life = INITIAL_LIFE): Invoker {
  const orderedDeck = [...deck]
  return {
    kind: 'invoker',
    level: INITIAL_LEVEL,
    fatigue,
    life,
    mana: Math.max(0, INITIAL_LEVEL - fatigue),
    hand: orderedDeck.splice(0, INITIAL_HAND_SIZE),
    deck: orderedDeck,
    creatures: [],
  }
}

export function createDuel(setup: DuelSetup): DuelState {
  const mode = setup.mode ?? 'duel'
  if ((setup.playerLife ?? INITIAL_LIFE) <= 0 || (mode === 'duel' && (setup.opponentLife ?? INITIAL_LIFE) <= 0)) throw new RuleViolation('Un invocador requiere vida positiva.')
  if (mode === 'skirmish' && (setup.opponentDeck.length || !setup.opponentInitialField?.length)) throw new RuleViolation('Una escaramuza requiere grupo inicial y ninguna baraja enemiga.')
  const firstPlayer = setup.firstPlayer ?? 'player'
  const participantCopyIds = setup.playerDeck.flatMap((card) => card.copyId ? [card.copyId] : [])
  if (new Set(participantCopyIds).size !== participantCopyIds.length
    || new Set(setup.playerDeck.map((card) => card.id)).size !== setup.playerDeck.length) {
    throw new RuleViolation('La baraja propia no puede contener copias o tipos duplicados.')
  }
  const initialField = setup.opponentInitialField ?? []
  return {
    id: `duel-${nextDuelNumber++}`,
    mode,
    targets: {},
    participantCopyIds,
    encounterId: setup.encounterId,
    players: {
      player: makeInvoker(setup.playerDeck, setup.playerFatigue ?? 0, setup.playerLife ?? INITIAL_LIFE),
      opponent: {
        ...(mode === 'skirmish' ? { kind: 'group' as const } : makeInvoker(setup.opponentDeck, 0, setup.opponentLife ?? INITIAL_LIFE)),
        creatures: initialField.map((card, index) => ({
          id: `creature-${index + 1}`, card, owner: 'opponent', health: card.maxHealth, summonedTurn: 0,
        })),
      },
    },
    activePlayer: firstPlayer,
    turn: 1,
    phase: mode === 'skirmish' && firstPlayer === 'opponent' ? 'attackers' : 'main',
    attackers: [],
    blockers: {},
    winner: null,
    nextCreatureNumber: initialField.length + 1,
  }
}

export function requireInvoker(side: CombatSide): Invoker {
  if (side.kind !== 'invoker') throw new RuleViolation('El grupo no tiene recursos de invocador.')
  return side
}

export function baseMana(invoker: CombatSide): number {
  if (invoker.kind === 'group') return 0
  return Math.max(0, invoker.level - invoker.fatigue)
}

function requireOngoing(state: DuelState): void {
  if (state.phase === 'finished') throw new RuleViolation('El duelo ya terminó.')
}

function requirePhase(state: DuelState, phase: DuelState['phase']): void {
  requireOngoing(state)
  if (state.phase !== phase) throw new RuleViolation(`La acción requiere la fase ${phase}.`)
}

function updateSide(state: DuelState, player: PlayerId, side: CombatSide): DuelState {
  return player === 'player'
    ? { ...state, players: { ...state.players, player: requireInvoker(side) } }
    : { ...state, players: { ...state.players, opponent: side } }
}

export function summonCreature(state: DuelState, cardId: string, sacrificeIds: string[] = []): DuelState {
  requirePhase(state, 'main')
  const owner = state.activePlayer
  const invoker = requireInvoker(state.players[owner])
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
  return { ...updateSide(state, owner, nextInvoker), nextCreatureNumber: state.nextCreatureNumber + 1 }
}

export function declareAttackers(state: DuelState, attackerIds: string[], targets: Record<string, string> = {}): DuelState {
  requirePhase(state, 'attackers')
  if (new Set(attackerIds).size !== attackerIds.length) throw new RuleViolation('Un atacante solo puede declararse una vez.')
  const units = state.players[state.activePlayer].creatures
  if (attackerIds.some((id) => !units.some((unit) => unit.id === id))) {
    throw new RuleViolation('Los atacantes deben ser criaturas propias en juego.')
  }
  if (state.mode === 'skirmish' && state.activePlayer === 'player') {
    const enemies = state.players.opponent.creatures
    if (Object.keys(targets).length !== attackerIds.length || Object.keys(targets).some((id) => !attackerIds.includes(id))
      || attackerIds.some((id) => !enemies.some((unit) => unit.id === targets[id]))) {
      throw new RuleViolation('Elige un objetivo enemigo válido para cada atacante, sin asignaciones adicionales.')
    }
    const ordered = units.filter((unit) => attackerIds.includes(unit.id)).map((unit) => unit.id)
    return { ...state, attackers: ordered, targets: { ...targets }, blockers: {}, phase: 'resolve' }
  }
  // No criatura tiene mareo de invocación: las invocadas este turno también pueden atacar.
  return { ...state, attackers: [...attackerIds], blockers: {}, phase: 'blockers' }
}

export function declareBlockers(state: DuelState, assignments: Record<string, string[]>): DuelState {
  requirePhase(state, 'blockers')
  if (state.mode === 'skirmish' && state.activePlayer === 'player') throw new RuleViolation('El grupo no elige bloqueadores.')
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

/** Both combat formats use ordered lethal-first damage without excess to an invoker. */
function distributeDamage(attack: number, units: Creature[], damage: Map<string, number>): void {
  let remaining = attack
  for (const unit of units) {
    const assigned = Math.min(remaining, unit.health)
    damage.set(unit.id, (damage.get(unit.id) ?? 0) + assigned)
    remaining -= assigned
    if (remaining <= 0) break
  }
}

export function resolveCombat(state: DuelState): DuelState {
  requirePhase(state, 'resolve')
  const attackerPlayer = state.activePlayer
  const defenderPlayer = opponentOf(attackerPlayer)
  const attackers = state.players[attackerPlayer].creatures
  const defenders = state.players[defenderPlayer].creatures
  const damageToUnits = new Map<string, number>()
  let damageToInvoker = 0

  const directed = state.mode === 'skirmish' && attackerPlayer === 'player'
  if (directed) {
    if (Object.keys(state.targets).length !== state.attackers.length || state.attackers.some((id) =>
      !attackers.some((unit) => unit.id === id) || !defenders.some((unit) => unit.id === state.targets[id]))) {
      throw new RuleViolation('La selección de objetivos está incompleta o dejó de ser v?lida.')
    }
    for (const target of defenders) {
      const targeting = attackers.filter((unit) => state.attackers.includes(unit.id) && state.targets[unit.id] === target.id)
      if (!targeting.length) continue
      damageToUnits.set(target.id, targeting.reduce((sum, unit) => sum + unit.card.attack, 0))
      distributeDamage(target.card.attack, targeting, damageToUnits)
    }
  }
  for (const attackerId of directed ? [] : state.attackers) {
    const attacker = attackers.find((unit) => unit.id === attackerId)
    if (!attacker) continue
    const orderedBlockers = state.blockers[attackerId] ?? []
    if (orderedBlockers.length === 0) {
      damageToInvoker += attacker.card.attack
      continue
    }
    distributeDamage(attacker.card.attack, orderedBlockers.flatMap((id) => {
      const unit = defenders.find((candidate) => candidate.id === id)
      return unit ? [unit] : []
    }), damageToUnits)
    // Daño del/los bloqueadores simultáneo; cada bloqueador asignado hace todo su ataque.
    for (const blockerId of orderedBlockers) {
      const blocker = defenders.find((unit) => unit.id === blockerId)
      if (blocker) damageToUnits.set(attackerId, (damageToUnits.get(attackerId) ?? 0) + blocker.card.attack)
    }
  }

  const nextAttackers = attackers.map((unit) => ({ ...unit, health: unit.health - (damageToUnits.get(unit.id) ?? 0) }))
  const nextDefenders = defenders.map((unit) => ({ ...unit, health: unit.health - (damageToUnits.get(unit.id) ?? 0) }))
  const defender = state.players[defenderPlayer]
  const survivingDefenders = nextDefenders.filter((unit) => unit.health > 0)
  const nextDefender: CombatSide = defender.kind === 'invoker'
    ? { ...defender, life: defender.life - damageToInvoker, creatures: survivingDefenders }
    : { ...defender, creatures: survivingDefenders }
  const nextAttacker: CombatSide = { ...state.players[attackerPlayer], creatures: nextAttackers.filter((unit) => unit.health > 0) }
  const updated = updateSide(updateSide(state, attackerPlayer, nextAttacker), defenderPlayer, nextDefender)
  const winner = updated.players.player.life <= 0 ? 'opponent'
    : state.mode === 'skirmish' ? updated.players.opponent.creatures.length === 0 ? 'player' : null
      : nextDefender.kind === 'invoker' && nextDefender.life <= 0 ? attackerPlayer : null
  return { ...updated, phase: winner ? 'finished' : 'resolved', winner }
}

/** Ends the resolved turn and starts the opponent's turn with maintenance applied. */
export function endTurn(state: DuelState): DuelState {
  requirePhase(state, 'resolved')
  const activePlayer = opponentOf(state.activePlayer)
  const current = state.players[activePlayer]
  const nextInvoker: CombatSide = current.kind === 'group' ? current : {
    ...current,
    mana: baseMana(current),
    hand: current.deck.length > 0 ? [...current.hand, current.deck[0]] : current.hand,
    deck: current.deck.slice(current.deck.length > 0 ? 1 : 0),
  }
  const nextState = updateSide(state, activePlayer, nextInvoker)
  return {
    ...nextState,
    activePlayer,
    turn: state.turn + 1,
    phase: current.kind === 'group' ? 'attackers' : 'main',
    attackers: [],
    targets: {},
    blockers: {},
  }
}

export function startCombat(state: DuelState): DuelState {
  requirePhase(state, 'main')
  return { ...state, phase: 'attackers' }
}
