import { createDuel, RuleViolation } from './rules.js'
import type { CreatureCard, DuelState } from './types.js'

export interface CreatureCopy {
  id: string
  cardId: string
  health: number
}

/** The single persistent source of truth for a browser play session. */
export interface GameSession {
  copies: CreatureCopy[]
  /** Permanently unlocked creature types, including types whose copy was lost. */
  unlockedCardIds: string[]
  /** Ordered references to collection copies selected for the next duel. */
  activeDeckCopyIds: string[]
  invokerLife: number
  nextCopyNumber: number
}

const INITIAL_LIFE = 20

export function createGameSession(cards: CreatureCard[]): GameSession {
  const uniqueCards = [...new Map(cards.map((card) => [card.id, card])).values()]
  const copies = uniqueCards.map((card, index) => ({ id: `copy-${index + 1}`, cardId: card.id, health: card.maxHealth }))
  return {
    copies,
    unlockedCardIds: uniqueCards.map((card) => card.id),
    activeDeckCopyIds: copies.map((copy) => copy.id),
    invokerLife: INITIAL_LIFE,
    nextCopyNumber: copies.length + 1,
  }
}

/** First-time unlocks add a permanent catalog entry and its single initial copy. */
export function unlockCreatureType(session: GameSession, card: CreatureCard): GameSession {
  if (session.unlockedCardIds.includes(card.id)) return session
  if (session.copies.some((copy) => copy.cardId === card.id)) {
    return { ...session, unlockedCardIds: [...session.unlockedCardIds, card.id] }
  }
  const copy: CreatureCopy = { id: `copy-${session.nextCopyNumber}`, cardId: card.id, health: card.maxHealth }
  return {
    ...session,
    copies: [...session.copies, copy],
    unlockedCardIds: [...session.unlockedCardIds, card.id],
    nextCopyNumber: session.nextCopyNumber + 1,
  }
}

export function addCopyToActiveDeck(session: GameSession, copyId: string): GameSession {
  if (!session.copies.some((copy) => copy.id === copyId)) {
    throw new RuleViolation('Solo puedes añadir a la baraja copias disponibles en la colección.')
  }
  if (session.activeDeckCopyIds.includes(copyId)) return session
  return { ...session, activeDeckCopyIds: [...session.activeDeckCopyIds, copyId] }
}

export function removeCopyFromActiveDeck(session: GameSession, copyId: string): GameSession {
  return { ...session, activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => id !== copyId) }
}

/** Starts a duel from exactly the selected copies, in active deck order. */
export function startSessionDuel(session: GameSession, cardTypes: CreatureCard[], opponentDeck: CreatureCard[]): DuelState {
  const cardsById = new Map(cardTypes.map((card) => [card.id, card]))
  const copiesById = new Map(session.copies.map((copy) => [copy.id, copy]))
  const playerDeck = session.activeDeckCopyIds.flatMap((copyId) => {
    const copy = copiesById.get(copyId)
    const card = copy ? cardsById.get(copy.cardId) : undefined
    if (!copy || !card) return []
    return [{ ...card, copyId: copy.id, startingHealth: copy.health }]
  })
  return createDuel({ playerDeck, opponentDeck })
}

/** Commits wounds and permanent losses only for copies selected into this duel. */
export function finishSessionDuel(session: GameSession, duel: DuelState): GameSession {
  if (duel.phase !== 'finished') throw new RuleViolation('Solo se puede cerrar una partida al terminar el duelo.')

  const participatingIds = new Set(session.activeDeckCopyIds)
  const remainingHealth = new Map(duel.players.player.creatures
    .filter((creature) => creature.copyId !== undefined)
    .map((creature) => [creature.copyId as string, creature.health]))
  const survivingIds = new Set<string>([
    ...duel.players.player.hand.map((card) => card.copyId).filter((id): id is string => id !== undefined),
    ...duel.players.player.deck.map((card) => card.copyId).filter((id): id is string => id !== undefined),
    ...remainingHealth.keys(),
  ])
  const lostIds = new Set([...participatingIds].filter((id) => !survivingIds.has(id)))

  return {
    ...session,
    copies: session.copies.flatMap((copy) => {
      if (lostIds.has(copy.id)) return []
      const health = remainingHealth.get(copy.id)
      return [{ ...copy, health: health ?? copy.health }]
    }),
    activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => !lostIds.has(id)),
    invokerLife: INITIAL_LIFE,
  }
}
