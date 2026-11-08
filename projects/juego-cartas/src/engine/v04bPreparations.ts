import { RuleViolation } from './rules.js'
import { beginSessionDuel, createCopySlotSession } from './session.js'
import type { GameSession } from './session.js'
import type { CreatureCard, DuelState, RandomSource, PlayerId } from './types.js'
import { V04B_CARD_TYPES, V04B_INITIAL_CARD_IDS } from './content/v04b.js'
import { V04B_ENCOUNTERS } from './content/v04bEncounters.js'

/** Independent M1 fixtures. Neither changes ACTIVE_CONTENT nor starts the new adventure. */
/** MIG-D06: the orb starts charged, capacity 1. The rat cycle starts with no rooms defeated. */
function withOrbAndRats(session: GameSession): GameSession {
  return { ...session, orb: { charges: 1, capacity: 1 }, ratCycle: { defeated: [], returnClosed: false, leftAltarVia04: false } }
}

export function createV04BInitialSession(): GameSession {
  return withOrbAndRats(createCopySlotSession(V04B_INITIAL_CARD_IDS.map((id) => V04B_CARD_TYPES.find((card) => card.id === id)!), V04B_CARD_TYPES))
}

export function createV04BCatalogSandbox(): GameSession {
  return withOrbAndRats(createCopySlotSession(V04B_CARD_TYPES.flatMap((card) => Array.from({ length: card.maxCopies! }, () => card)), V04B_CARD_TYPES))
}

export interface V04BEncounterOptions { random?: RandomSource; firstPlayer?: PlayerId }

/**
 * M4 isolated preparation: builds the V0.4B combat of one encounter on a V0.4B session.
 * It connects no world, map or rewards; the caller keeps the returned session to lock management.
 */
export function createV04BEncounterDuel(session: GameSession, roomId: string, options: V04BEncounterOptions = {}): { session: GameSession; duel: DuelState } {
  if (session.collectionProfile !== 'v04b') throw new RuleViolation('Los encuentros V0.4B requieren una sesión V0.4B.')
  const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === roomId)
  if (!encounter) throw new RuleViolation(`Encuentro V0.4B desconocido: ${roomId}.`)
  const cards = (ids: readonly string[]): CreatureCard[] => ids.map((id) => {
    const type = V04B_CARD_TYPES.find((card) => card.id === id)
    if (!type) throw new RuleViolation(`Carta V0.4B desconocida: ${id}.`)
    return type
  })
  return beginSessionDuel(session, V04B_CARD_TYPES, cards(encounter.deckIds), {
    mode: encounter.mode, encounterId: encounter.id, opponentLife: encounter.opponentLife,
    opponentInitialField: cards(encounter.fieldIds), ...options,
  })
}
