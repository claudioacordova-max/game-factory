import {
  beginSessionDuel as beginSessionDuelWithRandom,
  createDuel as createDuelWithRandom,
  startSessionDuel as startSessionDuelWithRandom,
} from '../src/engine/index.js'
import type { DuelSetup, RandomSource } from '../src/engine/types.js'
import type { CreatureCard, GameSession } from '../src/engine/index.js'

/** Keeps pre-existing rule fixtures explicit and reproducible while preserving their authored card order. */
export const orderedFixtureRandom: RandomSource = () => 1 - Number.EPSILON

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

export function createDuel(setup: DuelSetup) {
  return createDuelWithRandom({ ...setup, random: setup.random ?? orderedFixtureRandom })
}

type SessionDuelOptions = NonNullable<Parameters<typeof startSessionDuelWithRandom>[3]>

export function startSessionDuel(session: GameSession, cardTypes: readonly CreatureCard[], opponentDeck: CreatureCard[], options: SessionDuelOptions = {}) {
  return startSessionDuelWithRandom(session, cardTypes, opponentDeck, { ...options, random: options.random ?? orderedFixtureRandom })
}

export function beginSessionDuel(session: GameSession, cardTypes: readonly CreatureCard[], opponentDeck: CreatureCard[], options: SessionDuelOptions = {}) {
  return beginSessionDuelWithRandom(session, cardTypes, opponentDeck, { ...options, random: options.random ?? orderedFixtureRandom })
}
