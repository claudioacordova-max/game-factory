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
  unlockedCardIds: string[]
  invokerLife: number
}

const INITIAL_LIFE = 20

export function createGameSession(cards: CreatureCard[]): GameSession {
  return {
    copies: cards.map((card, index) => ({ id: `copy-${index + 1}`, cardId: card.id, health: card.maxHealth })),
    unlockedCardIds: [...new Set(cards.map((card) => card.id))],
    invokerLife: INITIAL_LIFE,
  }
}

/** Starts a duel from the surviving copies without healing or recreating any copy. */
export function startSessionDuel(session: GameSession, cardTypes: CreatureCard[], opponentDeck: CreatureCard[]): DuelState {
  const cardsById = new Map(cardTypes.map((card) => [card.id, card]))
  const playerDeck = session.copies.flatMap((copy) => {
    const card = cardsById.get(copy.cardId)
    return card ? [{ ...card, copyId: copy.id, startingHealth: copy.health }] : []
  })
  return createDuel({ playerDeck, opponentDeck })
}

/** Commits this duel's wounds and permanent losses to the session at game over. */
export function finishSessionDuel(session: GameSession, duel: DuelState): GameSession {
  if (duel.phase !== 'finished') throw new RuleViolation('Solo se puede cerrar una partida al terminar el duelo.')

  const remainingHealth = new Map(duel.players.player.creatures
    .filter((creature) => creature.copyId !== undefined)
    .map((creature) => [creature.copyId as string, creature.health]))
  const stillOwned = new Set<string>([
    ...duel.players.player.hand.map((card) => card.copyId).filter((id): id is string => id !== undefined),
    ...duel.players.player.deck.map((card) => card.copyId).filter((id): id is string => id !== undefined),
    ...remainingHealth.keys(),
  ])

  return {
    ...session,
    copies: session.copies.flatMap((copy) => {
      if (!stillOwned.has(copy.id)) return []
      const health = remainingHealth.get(copy.id)
      return [{ ...copy, health: health ?? copy.health }]
    }),
    invokerLife: INITIAL_LIFE,
  }
}
