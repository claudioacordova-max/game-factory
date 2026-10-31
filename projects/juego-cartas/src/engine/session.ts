import { createDuel, RuleViolation, validateCombatIdentities } from './rules.js'
import type { CollectionProfile, CreatureCard, DuelSetup, DuelState } from './types.js'
import { V04B_CARD_TYPES } from './content/v04b.js'

export interface CreatureCopy {
  id: string
  cardId: string
  health: number
  bonusAttack: number
  bonusHealth: number
}

/** Persistent state for this loaded page; combat representations reference these IDs. */
export interface GameSession {
  collectionProfile: CollectionProfile
  copies: CreatureCopy[]
  /** Legacy compatibility projection; V04B discovery is derived from unlockedCopySlots. */
  unlockedCardIds: string[]
  unlockedCopySlots: Record<string, number>
  grantedCopyEventIds: string[]
  activeDeckCopyIds: string[]
  invokerLife: number
  invokerMaxLife: number
  fatigue: number
  activeDuelId: string | null
  activeEncounterId: string | null
  settledDuelIds: string[]
  nextCopyNumber: number
}

export const NORMAL_INVOKER_MAX_LIFE = 20

export function requireOutsideCombat(session: GameSession): void {
  if (session.activeDuelId !== null) throw new RuleViolation('Esta acción solo está disponible fuera de combate.')
}

export function discoveredCardIds(session: GameSession): string[] {
  return session.collectionProfile === 'v04b'
    ? Object.keys(session.unlockedCopySlots).filter((id) => session.unlockedCopySlots[id] > 0)
    : session.unlockedCardIds
}

export function unlockedSlotsForType(session: GameSession, cardId: string): number {
  return session.collectionProfile === 'v04b' ? session.unlockedCopySlots[cardId] ?? 0
    : session.unlockedCardIds.includes(cardId) ? 1 : 0
}

/** Guard every management boundary; type limits are checked when a catalogue is available. */
export function validateSessionCopies(session: GameSession, cardTypes?: readonly CreatureCard[]): void {
  const catalogue = cardTypes ?? (session.collectionProfile === 'v04b' ? V04B_CARD_TYPES : undefined)
  if (new Set(session.copies.map((copy) => copy.id)).size !== session.copies.length
    || session.copies.some((copy) => !copy.id || copy.health <= 0)
    || new Set(session.activeDeckCopyIds).size !== session.activeDeckCopyIds.length
    || session.activeDeckCopyIds.some((id) => !session.copies.some((copy) => copy.id === id))) {
    throw new RuleViolation('La colección y la baraja requieren identidades únicas y copias válidas.')
  }
  const knownIds = discoveredCardIds(session)
  if (new Set(knownIds).size !== knownIds.length || new Set(session.grantedCopyEventIds).size !== session.grantedCopyEventIds.length
    || !Number.isInteger(session.nextCopyNumber) || session.nextCopyNumber < 1
    || session.copies.some((copy) => copy.id === `copy-${session.nextCopyNumber}`)) {
    throw new RuleViolation('El registro de copias y descubrimientos no es válido.')
  }
  for (const id of new Set([...knownIds, ...session.copies.map((copy) => copy.cardId), ...Object.keys(session.unlockedCopySlots)])) {
    const slots = unlockedSlotsForType(session, id)
    const type = catalogue?.find((card) => card.id === id)
    const limit = session.collectionProfile === 'legacy' ? 1 : type?.maxCopies ?? 2
    if (!Number.isInteger(slots) || slots < 0 || slots > limit
      || session.copies.filter((copy) => copy.cardId === id).length > slots
      || (catalogue && !type)) throw new RuleViolation('Las copias deben respetar los cupos obtenidos y el límite del tipo.')
  }
}

function basicCopy(card: CreatureCard, number: number): CreatureCopy {
  return { id: `copy-${number}`, cardId: card.id, health: card.maxHealth, bonusAttack: 0, bonusHealth: 0 }
}

export function effectiveCopyCard(card: CreatureCard, copy: CreatureCopy): CreatureCard {
  return {
    ...card,
    attack: card.attack + copy.bonusAttack,
    maxHealth: card.maxHealth + copy.bonusHealth,
    ...(card.growth ? { growthProgress: card.growth === 'attack' ? copy.bonusAttack : copy.bonusHealth } : {}),
  }
}

export function createGameSession(cards: CreatureCard[]): GameSession {
  const uniqueCards = [...new Map(cards.map((card) => [card.id, card])).values()]
  const copies = uniqueCards.map((card, index) => basicCopy(card, index + 1))
  return {
    collectionProfile: 'legacy',
    copies,
    unlockedCardIds: uniqueCards.map((card) => card.id),
    unlockedCopySlots: Object.fromEntries(uniqueCards.map((card) => [card.id, 1])),
    grantedCopyEventIds: [],
    activeDeckCopyIds: copies.map((copy) => copy.id),
    invokerLife: NORMAL_INVOKER_MAX_LIFE,
    invokerMaxLife: NORMAL_INVOKER_MAX_LIFE,
    fatigue: 0,
    activeDuelId: null,
    activeEncounterId: null,
    settledDuelIds: [],
    nextCopyNumber: copies.length + 1,
  }
}

/** A first discovery grants a healthy basic copy in reserve. Repeated claims never replace losses. */
export function unlockCreatureType(session: GameSession, card: CreatureCard): GameSession {
  requireOutsideCombat(session)
  if (session.collectionProfile !== 'legacy') throw new RuleViolation('Usa una concesión de cupos para el catálogo V0.4B.')
  validateSessionCopies(session)
  if (session.unlockedCardIds.includes(card.id)) return session
  const unlockedCardIds = [...session.unlockedCardIds, card.id]
  return {
    ...session,
    copies: [...session.copies, basicCopy(card, session.nextCopyNumber)],
    unlockedCardIds,
    unlockedCopySlots: { ...session.unlockedCopySlots, [card.id]: 1 },
    nextCopyNumber: session.nextCopyNumber + 1,
  }
}

/** Unique domain event: validates all grants before adding any slots or healthy reserve copies. */
export function grantCreatureCopies(session: GameSession, eventId: string, cardIds: readonly string[], cardTypes: readonly CreatureCard[]): GameSession {
  requireOutsideCombat(session)
  if (session.collectionProfile !== 'v04b') throw new RuleViolation('La concesión por cupos requiere el catálogo V0.4B.')
  validateSessionCopies(session, cardTypes)
  if (!eventId.trim() || cardIds.length === 0) throw new RuleViolation('La concesión requiere un evento y cartas válidos.')
  if (session.grantedCopyEventIds.includes(eventId)) return session
  const unlockedCopySlots = { ...session.unlockedCopySlots }
  const copies = [...session.copies]
  let nextCopyNumber = session.nextCopyNumber
  for (const id of cardIds) {
    const card = cardTypes.find((entry) => entry.id === id)
    if (!card || !card.maxCopies) throw new RuleViolation('Tipo de carta no válido para la concesión.')
    const slots = (unlockedCopySlots[id] ?? 0) + 1
    if (slots > card.maxCopies) throw new RuleViolation('La concesión supera el límite de copias del tipo.')
    unlockedCopySlots[id] = slots
    copies.push(basicCopy(card, nextCopyNumber++))
  }
  const result: GameSession = { ...session, copies, unlockedCopySlots, nextCopyNumber,
    unlockedCardIds: Object.keys(unlockedCopySlots).filter((id) => unlockedCopySlots[id] > 0),
    grantedCopyEventIds: [...session.grantedCopyEventIds, eventId] }
  validateSessionCopies(result, cardTypes)
  return result
}

/** Isolated M1 preparation, not a new adventure bootstrap. Duplicates mean obtained slots. */
export function createCopySlotSession(cards: readonly CreatureCard[], cardTypes: readonly CreatureCard[]): GameSession {
  const empty: GameSession = { ...createGameSession([]), collectionProfile: 'v04b' }
  if (cards.length === 0) return empty
  const granted = grantCreatureCopies(empty, 'initial-preparation', cards.map((card) => card.id), cardTypes)
  return { ...granted, activeDeckCopyIds: granted.copies.map((copy) => copy.id) }
}

export interface ReinvokeStatus { allowed: boolean; cost: number; resultingMaxLife: number; reason: string }
export function reinvokeStatus(session: GameSession, cardId: string, cardTypes: readonly CreatureCard[]): ReinvokeStatus {
  const card = cardTypes.find((candidate) => candidate.id === cardId)
  const cost = card?.reinvokeCost ?? (card?.seed ? 0 : card?.rarity === 'epic' ? 3 : card?.rarity === 'rare' ? 2 : 1)
  const resultingMaxLife = session.invokerMaxLife - cost
  const reason = session.activeDuelId !== null ? 'Solo fuera de combate'
    : !card || unlockedSlotsForType(session, cardId) === 0 ? 'Tipo no descubierto'
      : session.copies.filter((copy) => copy.cardId === cardId).length >= unlockedSlotsForType(session, cardId) ? session.collectionProfile === 'legacy' ? 'Ya posees una copia de este tipo' : 'No hay cupos obtenidos vacantes para este tipo'
        : resultingMaxLife < 1 ? 'La vida máxima debe quedar al menos en 1' : ''
  return { allowed: !reason, cost, resultingMaxLife, reason }
}

export function reinvokeCreatureType(session: GameSession, cardId: string, cardTypes: readonly CreatureCard[]): GameSession {
  validateSessionCopies(session, cardTypes)
  const status = reinvokeStatus(session, cardId, cardTypes)
  if (!status.allowed) throw new RuleViolation(status.reason)
  const card = cardTypes.find((candidate) => candidate.id === cardId)!
  return {
    ...session,
    copies: [...session.copies, basicCopy(card, session.nextCopyNumber)],
    nextCopyNumber: session.nextCopyNumber + 1,
    invokerMaxLife: status.resultingMaxLife,
    invokerLife: Math.min(session.invokerLife, status.resultingMaxLife),
  }
}

export function addCopyToActiveDeck(session: GameSession, copyId: string): GameSession {
  requireOutsideCombat(session)
  validateSessionCopies(session)
  if (!session.copies.some((copy) => copy.id === copyId)) throw new RuleViolation('Solo puedes añadir copias disponibles en la colección.')
  if (session.activeDeckCopyIds.includes(copyId)) return session
  return { ...session, activeDeckCopyIds: [...session.activeDeckCopyIds, copyId] }
}

export function removeCopyFromActiveDeck(session: GameSession, copyId: string): GameSession {
  requireOutsideCombat(session)
  validateSessionCopies(session)
  if (!session.copies.some((copy) => copy.id === copyId)) throw new RuleViolation('La copia no existe en tu colección.')
  return { ...session, activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => id !== copyId) }
}

export function moveActiveDeckCopy(session: GameSession, copyId: string, direction: -1 | 1): GameSession {
  requireOutsideCombat(session)
  validateSessionCopies(session)
  const index = session.activeDeckCopyIds.indexOf(copyId)
  if (index < 0) throw new RuleViolation('La copia no está en la baraja activa.')
  const target = index + direction
  if (target < 0 || target >= session.activeDeckCopyIds.length) return session
  const ids = [...session.activeDeckCopyIds]
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  return { ...session, activeDeckCopyIds: ids }
}

type SessionDuelOptions = Pick<DuelSetup, 'opponentLife' | 'opponentInitialField' | 'encounterId' | 'random'> & { mode?: 'duel' | 'skirmish' }

/** Pure construction helper for engine fixtures. Live play must use beginSessionDuel to lock management. */
export function startSessionDuel(session: GameSession, cardTypes: readonly CreatureCard[], opponentDeck: CreatureCard[], options: SessionDuelOptions = {}): DuelState {
  requireOutsideCombat(session)
  validateSessionCopies(session, cardTypes)
  const playerDeck = session.activeDeckCopyIds.map((copyId) => {
    const copy = session.copies.find((candidate) => candidate.id === copyId)
    const card = copy && cardTypes.find((candidate) => candidate.id === copy.cardId)
    if (!copy || !card || copy.health <= 0) throw new RuleViolation('La baraja contiene una copia inválida.')
    return { ...effectiveCopyCard(card, copy), copyId: copy.id, startingHealth: copy.health }
  })
  return createDuel({ playerDeck, opponentDeck, playerFatigue: session.fatigue, playerLife: session.invokerMaxLife, ...options, collectionProfile: session.collectionProfile })
}

export function beginSessionDuel(session: GameSession, cardTypes: readonly CreatureCard[], opponentDeck: CreatureCard[], options: SessionDuelOptions = {}): { session: GameSession; duel: DuelState } {
  const duel = startSessionDuel(session, cardTypes, opponentDeck, options)
  return { session: { ...session, invokerLife: session.invokerMaxLife, activeDuelId: duel.id, activeEncounterId: duel.encounterId ?? null }, duel }
}

export interface EncounterReward { rewardMaxLife: number | 'restore'; reducesFatigue: boolean }

/** Commits one attempt. Participants come from its initial deck, never the mutable next-deck selection. */
export function finishSessionDuel(session: GameSession, duel: DuelState, reward?: EncounterReward): GameSession {
  if (session.collectionProfile !== duel.collectionProfile) throw new RuleViolation('El resultado no pertenece al perfil de colección de esta sesión.')
  if (session.settledDuelIds.includes(duel.id)) return session
  if (duel.phase !== 'finished' || !duel.winner) throw new RuleViolation('Solo se puede cerrar un combate terminado.')
  if (session.activeDuelId !== null && session.activeDuelId !== duel.id) throw new RuleViolation('El resultado no pertenece al combate activo.')
  validateSessionCopies(session)
  validateCombatIdentities(duel)
  if (new Set(duel.participantCopyIds).size !== duel.participantCopyIds.length
    || duel.participantCopyIds.some((id) => !session.copies.some((copy) => copy.id === id))) throw new RuleViolation('Los participantes requieren identidades persistentes únicas y existentes.')
  const participatingIds = new Set(duel.participantCopyIds)
  // There are no returns from the field: a living owned field copy proves it was summoned.
  const remainingCreatures = new Map(duel.players.player.creatures
    .filter((creature) => creature.owner === 'player' && creature.copyId !== undefined && creature.health > 0)
    .map((creature) => [creature.copyId as string, creature]))
  const survivingIds = new Set<string>([
    ...duel.players.player.hand.flatMap((card) => card.copyId ? [card.copyId] : []),
    ...duel.players.player.deck.flatMap((card) => card.copyId ? [card.copyId] : []),
    ...remainingCreatures.keys(),
  ])
  const lostIds = new Set([...participatingIds].filter((id) => !survivingIds.has(id)))
  const won = duel.winner === 'player'
  const invokerMaxLife = won && reward
    ? reward.rewardMaxLife === 'restore' ? NORMAL_INVOKER_MAX_LIFE : Math.min(NORMAL_INVOKER_MAX_LIFE, session.invokerMaxLife + reward.rewardMaxLife)
    : session.invokerMaxLife
  return {
    ...session,
    copies: session.copies.flatMap((copy) => {
      if (!participatingIds.has(copy.id)) return [copy]
      if (lostIds.has(copy.id)) return []
      const creature = remainingCreatures.get(copy.id)
      const survived = { ...copy, health: creature?.health ?? copy.health }
      if (!won || !creature || creature.card.rarity !== 'epic' || !creature.card.growth) return [survived]
      const cap = Math.min(3, creature.card.growthCap ?? 3)
      if (creature.card.growth === 'attack' && copy.bonusAttack < cap) {
        return [{ ...survived, bonusAttack: copy.bonusAttack + 1 }]
      }
      if (creature.card.growth === 'health' && copy.bonusHealth < cap) {
        return [{ ...survived, bonusHealth: copy.bonusHealth + 1, health: survived.health + 1 }]
      }
      return [survived]
    }),
    activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => !lostIds.has(id)),
    invokerMaxLife,
    invokerLife: invokerMaxLife,
    fatigue: !won ? session.fatigue + 1 : reward?.reducesFatigue === true ? 0 : reward?.reducesFatigue === false ? session.fatigue : Math.max(0, session.fatigue - 1),
    activeDuelId: null,
    activeEncounterId: null,
    settledDuelIds: [...session.settledDuelIds, duel.id],
  }
}
