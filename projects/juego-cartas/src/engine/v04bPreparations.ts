import { createCopySlotSession } from './session.js'
import type { GameSession } from './session.js'
import { V04B_CARD_TYPES, V04B_INITIAL_CARD_IDS } from './content/v04b.js'

/** Independent M1 fixtures. Neither changes ACTIVE_CONTENT nor starts the new adventure. */
export function createV04BInitialSession(): GameSession {
  return createCopySlotSession(V04B_INITIAL_CARD_IDS.map((id) => V04B_CARD_TYPES.find((card) => card.id === id)!), V04B_CARD_TYPES)
}

export function createV04BCatalogSandbox(): GameSession {
  return createCopySlotSession(V04B_CARD_TYPES.flatMap((card) => Array.from({ length: card.maxCopies! }, () => card)), V04B_CARD_TYPES)
}
