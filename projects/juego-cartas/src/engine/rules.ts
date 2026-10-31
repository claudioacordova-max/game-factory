import type { CollectionProfile, Creature, CreatureCard, DuelSetup, DuelState, Invoker, PlayerId, CombatSide } from './types.js'

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

function makeInvoker(deck: CreatureCard[], fatigue = 0, life = INITIAL_LIFE, profile: CollectionProfile = 'legacy'): Invoker {
  const orderedDeck = [...deck]
  return {
    kind: 'invoker',
    level: INITIAL_LEVEL,
    fatigue: profile === 'v04b' ? Math.min(1, Math.max(0, fatigue)) : fatigue,
    life,
    mana: Math.max(0, INITIAL_LEVEL - (profile === 'v04b' ? Math.min(1, Math.max(0, fatigue)) : fatigue)),
    ...(profile === 'v04b' ? { temporaryMana: 0 } : {}),
    hand: orderedDeck.splice(0, INITIAL_HAND_SIZE),
    deck: orderedDeck,
    creatures: [],
  }
}

function shuffle(deck: CreatureCard[], random: () => number): CreatureCard[] {
  const shuffled = [...deck]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]]
  }
  return shuffled
}

/** UI keys and payloads use instance identity. The fallback supports authored legacy fixtures. */
export function cardInstanceId(card: CreatureCard): string {
  return card.instanceId ?? card.id
}

export function findHandCard(hand: readonly CreatureCard[], reference: string, allowLegacyType = true): CreatureCard | undefined {
  const instance = hand.find((card) => card.instanceId === reference)
  if (instance) return instance
  const byType = allowLegacyType ? hand.filter((card) => card.id === reference) : []
  return byType.length === 1 ? byType[0] : undefined
}

/** Reject ambiguous identities before actions or settlement can affect a different copy. */
export function validateCombatIdentities(state: DuelState): void {
  const creatures = [...state.players.player.creatures, ...state.players.opponent.creatures]
  const storedCards = [state.players.player, state.players.opponent].flatMap((side) => side.kind === 'invoker' ? [...side.hand, ...side.deck] : [])
  const cards = [state.players.player, state.players.opponent].flatMap((side) => [
    ...(side.kind === 'invoker' ? [...side.hand, ...side.deck] : []), ...side.creatures.map((unit) => unit.card),
  ])
  const instances = cards.flatMap((card) => card.instanceId ? [card.instanceId] : [])
  const copyIds = [...state.players.player.hand, ...state.players.player.deck, ...state.players.player.creatures.map((unit) => unit.card)]
    .flatMap((card) => card.copyId ? [card.copyId] : [])
  if (new Set(instances).size !== instances.length || new Set(creatures.map((unit) => unit.id)).size !== creatures.length
    || new Set(copyIds).size !== copyIds.length || new Set(state.participantCopyIds).size !== state.participantCopyIds.length
    || storedCards.some((card) => card.entityKind === 'token')
    || (state.collectionProfile === 'legacy' && cards.some((card) => card.entityKind === 'token'))
    || (state.collectionProfile === 'v04b' && cards.some((card) => !card.instanceId || !['real', 'token'].includes(card.entityKind ?? '')))
    || cards.some((card) => card.entityKind === 'token' && card.copyId !== undefined)
    || creatures.some((unit) => unit.copyId !== unit.card.copyId
      || (state.collectionProfile === 'v04b' && !['real', 'token'].includes(unit.entityKind ?? ''))
      || (unit.entityKind !== undefined && unit.card.entityKind !== undefined && unit.entityKind !== unit.card.entityKind))) {
    throw new RuleViolation('Las cartas y criaturas de combate requieren identidades únicas y coherentes.')
  }
}

export function createDuel(setup: DuelSetup): DuelState {
  const mode = setup.mode ?? 'duel'
  if ((setup.playerLife ?? INITIAL_LIFE) <= 0 || (mode === 'duel' && (setup.opponentLife ?? INITIAL_LIFE) <= 0)) throw new RuleViolation('Un invocador requiere vida positiva.')
  if (mode === 'skirmish' && (setup.opponentDeck.length || !setup.opponentInitialField?.length)) throw new RuleViolation('Una escaramuza requiere grupo inicial y ninguna baraja enemiga.')
  const firstPlayer = setup.firstPlayer ?? 'player'
  const collectionProfile = setup.collectionProfile ?? 'legacy'
  if (collectionProfile === 'v04b' && !Number.isInteger(setup.playerFatigue ?? 0)) throw new RuleViolation('La fatiga V0.4B requiere un valor entero finito.')
  const participantCopyIds = setup.playerDeck.flatMap((card) => card.copyId ? [card.copyId] : [])
  if (new Set(participantCopyIds).size !== participantCopyIds.length
    || (collectionProfile === 'legacy' && new Set(setup.playerDeck.map((card) => card.id)).size !== setup.playerDeck.length)) {
    throw new RuleViolation('La baraja propia no puede contener copias o tipos duplicados.')
  }
  if (collectionProfile === 'v04b' && setup.playerDeck.some((card) => !card.maxCopies
    || setup.playerDeck.filter((entry) => entry.id === card.id).length > card.maxCopies)) {
    throw new RuleViolation('La baraja propia supera el límite de copias del tipo o no pertenece al catálogo V0.4B.')
  }
  const initialField = setup.opponentInitialField ?? []
  const allCards = [...setup.playerDeck, ...setup.opponentDeck, ...initialField]
  const explicitIds = allCards.flatMap((card) => card.instanceId ? [card.instanceId] : [])
  if (new Set(explicitIds).size !== explicitIds.length || allCards.some((card) => card.instanceId === '' || card.entityKind === 'token')) {
    throw new RuleViolation('Las cartas requieren instancias únicas; las fichas no forman parte de los mazos ni del campo inicial.')
  }
  const duelId = `duel-${nextDuelNumber++}`
  const usedIds = new Set(explicitIds)
  let nextInstanceNumber = 1
  const instantiate = (card: CreatureCard): CreatureCard => {
    let instanceId = card.instanceId
    if (!instanceId) {
      do { instanceId = `${duelId}-card-${nextInstanceNumber++}` } while (usedIds.has(instanceId))
      usedIds.add(instanceId)
    }
    return { ...card, cost: { ...card.cost }, instanceId, entityKind: 'real' }
  }
  const playerDeck = shuffle(setup.playerDeck.map(instantiate), setup.random ?? Math.random)
  const opponentDeck = setup.opponentDeck.map((card) => instantiate({ ...card, copyId: undefined, startingHealth: undefined }))
  const opponentField = initialField.map((card) => instantiate({ ...card, copyId: undefined, startingHealth: undefined }))
  return {
    id: duelId,
    collectionProfile,
    mode,
    targets: {},
    participantCopyIds,
    encounterId: setup.encounterId,
    players: {
      player: makeInvoker(playerDeck, setup.playerFatigue ?? 0, setup.playerLife ?? INITIAL_LIFE, collectionProfile),
      opponent: {
        ...(mode === 'skirmish' ? { kind: 'group' as const } : makeInvoker(opponentDeck, 0, setup.opponentLife ?? INITIAL_LIFE, collectionProfile)),
        creatures: opponentField.map((card, index) => ({
          id: `creature-${index + 1}`, entityKind: 'real', card, owner: 'opponent', health: card.maxHealth, summonedTurn: 0,
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

export function baseMana(invoker: CombatSide, profile: CollectionProfile = 'legacy'): number {
  if (invoker.kind === 'group') return 0
  if (profile === 'v04b') return Math.max(0, 1 + invoker.creatures.filter((unit) => unit.entityKind === 'real' && unit.card.id === 'R02' && unit.health > 0).length - invoker.fatigue)
  return Math.max(0, invoker.level - invoker.fatigue)
}

/** Real enemies do not need a collection copyId; tokens are identified explicitly. */
export function sacrificeCandidates(invoker: Invoker, card: CreatureCard): Creature[] {
  return invoker.creatures.filter((unit) => unit.health > 0 && (card.id !== 'H04' || unit.entityKind === 'real'))
}

export function effectiveAttack(creature: Creature): number {
  return creature.card.attack + (creature.attackBonus ?? 0)
}

export interface SummonAvailability {
  allowed: boolean
  reason: string
}

/** Checks the two current summon costs without changing combat state. */
export function summonAvailability(invoker: Invoker, cardId: string): SummonAvailability {
  const card = findHandCard(invoker.hand, cardId)
  if (!card) return { allowed: false, reason: 'La carta no está en la mano del jugador activo.' }
  if (invoker.mana < card.cost.mana) return { allowed: false, reason: 'No hay maná suficiente.' }
  if (sacrificeCandidates(invoker, card).length < card.cost.sacrifices) return { allowed: false, reason: card.id === 'H04' ? 'Faltan criaturas reales para sacrificar.' : 'Faltan criaturas para sacrificar.' }
  return { allowed: true, reason: '' }
}

export function hasLegalSummon(invoker: Invoker): boolean {
  return invoker.hand.some((card) => summonAvailability(invoker, cardInstanceId(card)).allowed)
}

/** Legal activations currently consist only of R01; future effects add their own legality here. */
export function r01ActivationAvailability(state: DuelState, creatureId: string): SummonAvailability {
  if (state.collectionProfile !== 'v04b') return { allowed: false, reason: 'Esta activación pertenece al catálogo V0.4B.' }
  if (state.phase !== 'main' || state.winner !== null) return { allowed: false, reason: 'Activa la Runa inestable durante tu fase principal.' }
  const side = state.players[state.activePlayer]
  const source = side.creatures.find((unit) => unit.id === creatureId)
  if (side.kind !== 'invoker' || !source || source.owner !== state.activePlayer || source.entityKind !== 'real' || source.card.id !== 'R01' || source.health <= 0) {
    return { allowed: false, reason: 'Solo una Runa inestable propia y viva en campo puede activar esta habilidad.' }
  }
  return { allowed: true, reason: '' }
}

export function hasLegalActivation(state: DuelState): boolean {
  return state.players[state.activePlayer].creatures.some((unit) => r01ActivationAvailability(state, unit.id).allowed)
}

/** P5: strategic convenience never removes an otherwise legal voluntary action. */
export function hasLegalMainPhaseAction(state: DuelState): boolean {
  const side = state.players[state.activePlayer]
  return state.phase === 'main' && state.winner === null && side.kind === 'invoker'
    && (hasLegalSummon(side) || hasLegalActivation(state))
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
  validateCombatIdentities(state)
  const owner = state.activePlayer
  const invoker = requireInvoker(state.players[owner])
  const selected = findHandCard(invoker.hand, cardId, state.collectionProfile === 'legacy')
  const cardIndex = selected ? invoker.hand.indexOf(selected) : -1
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
  if (sacrifices.length !== sacrificeIds.length || sacrifices.some((unit) => unit.owner !== owner || !sacrificeCandidates(invoker, card).includes(unit))) {
    throw new RuleViolation('Solo puedes sacrificar criaturas propias que estén en juego.')
  }
  if (invoker.mana < card.cost.mana) throw new RuleViolation('No hay maná suficiente.')

  const creature: Creature = {
    id: `creature-${state.nextCreatureNumber}`,
    entityKind: card.entityKind ?? 'real',
    copyId: card.copyId,
    card,
    owner,
    health: card.startingHealth ?? card.maxHealth,
    summonedTurn: state.turn,
  }
  const temporarySpent = Math.min(invoker.temporaryMana ?? 0, card.cost.mana)
  const nextInvoker: Invoker = {
    ...invoker,
    mana: invoker.mana - card.cost.mana,
    ...(state.collectionProfile === 'v04b' ? { temporaryMana: (invoker.temporaryMana ?? 0) - temporarySpent } : {}),
    hand: invoker.hand.filter((_, index) => index !== cardIndex),
    creatures: [...invoker.creatures.filter((unit) => !sacrificeSet.has(unit.id)), creature],
  }
  let next = { ...updateSide(state, owner, nextInvoker), nextCreatureNumber: state.nextCreatureNumber + 1 }
  if (state.collectionProfile === 'v04b' && ['A02', 'A04'].includes(card.id)) next = createRatToken(next, owner)
  return next
}

/** Entry consequence called only after a successful summon, never by field preparation. */
function createRatToken(state: DuelState, owner: PlayerId): DuelState {
  const side = state.players[owner]
  const instanceIds = new Set([state.players.player, state.players.opponent].flatMap((entry) => [
    ...(entry.kind === 'invoker' ? [...entry.hand, ...entry.deck] : []), ...entry.creatures.map((unit) => unit.card),
  ]).map((card) => card.instanceId))
  let instanceId = `${state.id}-token-${state.nextCreatureNumber}`
  while (instanceIds.has(instanceId)) instanceId += '-new'
  const card: CreatureCard = { id: 'token-rat', name: 'Ficha de rata', attack: 1, maxHealth: 1,
    cost: { mana: 0, sacrifices: 0 }, entityKind: 'token', instanceId }
  const token: Creature = { id: `creature-${state.nextCreatureNumber}`, card, entityKind: 'token', owner, health: 1, summonedTurn: state.turn }
  return { ...updateSide(state, owner, { ...side, creatures: [...side.creatures, token] }), nextCreatureNumber: state.nextCreatureNumber + 1 }
}

/** Pure voluntary action; the controller handles pending UI choices and stale revisions. */
export function activateR01(state: DuelState, creatureId: string): DuelState {
  requirePhase(state, 'main')
  validateCombatIdentities(state)
  const availability = r01ActivationAvailability(state, creatureId)
  if (!availability.allowed) throw new RuleViolation(availability.reason)
  const owner = state.activePlayer
  const invoker = requireInvoker(state.players[owner])
  const source = invoker.creatures.find((unit) => unit.id === creatureId)!
  return updateSide(state, owner, { ...invoker, mana: invoker.mana + 2, temporaryMana: (invoker.temporaryMana ?? 0) + 2,
    creatures: invoker.creatures.filter((unit) => unit.id !== source.id) })
}

export function declareAttackers(state: DuelState, attackerIds: string[], targets: Record<string, string> = {}): DuelState {
  requirePhase(state, 'attackers')
  if (new Set(attackerIds).size !== attackerIds.length) throw new RuleViolation('Un atacante solo puede declararse una vez.')
  const units = state.players[state.activePlayer].creatures
  if (attackerIds.some((id) => !units.some((unit) => unit.id === id))) {
    throw new RuleViolation('Los atacantes deben ser criaturas propias en juego.')
  }
  const declared = state.collectionProfile === 'v04b' ? updateSide(state, state.activePlayer, {
    ...state.players[state.activePlayer], creatures: units.map((unit) => ({ ...unit,
      attackBonus: attackerIds.includes(unit.id) && unit.entityKind === 'real' && unit.card.id === 'A04' ? attackerIds.length - 1 : 0 })),
  }) : state
  if (state.mode === 'skirmish' && state.activePlayer === 'player') {
    const enemies = state.players.opponent.creatures
    if (Object.keys(targets).length !== attackerIds.length || Object.keys(targets).some((id) => !attackerIds.includes(id))
      || attackerIds.some((id) => !enemies.some((unit) => unit.id === targets[id]))) {
      throw new RuleViolation('Elige un objetivo enemigo válido para cada atacante, sin asignaciones adicionales.')
    }
    return { ...declared, attackers: [...attackerIds], targets: { ...targets }, blockers: {}, phase: 'resolve' }
  }
  // No criatura tiene mareo de invocación: las invocadas este turno también pueden atacar.
  return { ...declared, attackers: [...attackerIds], blockers: {}, phase: 'blockers' }
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
      const targeting = state.attackers.filter((id) => state.targets[id] === target.id)
        .flatMap((id) => attackers.find((unit) => unit.id === id) ?? [])
      if (!targeting.length) continue
      damageToUnits.set(target.id, targeting.reduce((sum, unit) => sum + effectiveAttack(unit), 0))
      distributeDamage(effectiveAttack(target), targeting, damageToUnits)
    }
  }
  for (const attackerId of directed ? [] : state.attackers) {
    const attacker = attackers.find((unit) => unit.id === attackerId)
    if (!attacker) continue
    const orderedBlockers = state.blockers[attackerId] ?? []
    if (orderedBlockers.length === 0) {
      damageToInvoker += effectiveAttack(attacker)
      continue
    }
    distributeDamage(effectiveAttack(attacker), orderedBlockers.flatMap((id) => {
      const unit = defenders.find((candidate) => candidate.id === id)
      return unit ? [unit] : []
    }), damageToUnits)
    // Daño del/los bloqueadores simultáneo; cada bloqueador asignado hace todo su ataque.
    for (const blockerId of orderedBlockers) {
      const blocker = defenders.find((unit) => unit.id === blockerId)
      if (blocker) damageToUnits.set(attackerId, (damageToUnits.get(attackerId) ?? 0) + effectiveAttack(blocker))
    }
  }

  const afterDamage = (unit: Creature): Creature => {
    const next = { ...unit, health: unit.health - (damageToUnits.get(unit.id) ?? 0) }
    delete next.attackBonus
    return next
  }
  const nextAttackers = attackers.map(afterDamage)
  const nextDefenders = defenders.map(afterDamage)
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
  const finished = winner ? removeFinishedTokens(updated) : updated
  return { ...finished, phase: winner ? 'finished' : 'resolved', winner }
}

function removeFinishedTokens(state: DuelState): DuelState {
  let next = state
  for (const owner of ['player', 'opponent'] as const) {
    const side = next.players[owner]
    next = updateSide(next, owner, { ...side, creatures: side.creatures.filter((unit) => unit.entityKind !== 'token') })
  }
  return next
}

/** Ends the resolved turn and starts the opponent's turn with maintenance applied. */
export function endTurn(state: DuelState): DuelState {
  requirePhase(state, 'resolved')
  const activePlayer = opponentOf(state.activePlayer)
  const current = state.players[activePlayer]
  const nextInvoker: CombatSide = current.kind === 'group' ? current : {
    ...current,
    mana: baseMana(current, state.collectionProfile),
    ...(state.collectionProfile === 'v04b' ? { temporaryMana: 0 } : {}),
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
  const side = state.players[state.activePlayer]
  const next = state.collectionProfile === 'v04b' && side.kind === 'invoker'
    ? updateSide(state, state.activePlayer, { ...side, mana: side.mana - (side.temporaryMana ?? 0), temporaryMana: 0 }) : state
  return { ...next, phase: 'attackers' }
}

/** Historical export name retained; P5 also preserves every legal V0.4B activation. */
export function advanceMainPhaseIfNoLegalSummons(state: DuelState, interactionPending = false): DuelState {
  if (state.phase !== 'main' || state.activePlayer !== 'player' || interactionPending || hasLegalMainPhaseAction(state)) {
    return state
  }
  return startCombat(state)
}
