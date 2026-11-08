import { V04B_CARD_TYPES } from '../src/engine/index.js'
import type { Creature, CreatureCard, DuelState, Invoker } from '../src/engine/index.js'
import type { DuelVariant } from './balance.js'

/** Simulation-only what-ifs for the M8c report. They rewrite a freshly created duel; the real content is never touched. */
export interface WhatIf { name: string; room: string; variant: DuelVariant }

const mapRival = (duel: DuelState, change: (rival: DuelState['players']['opponent']) => DuelState['players']['opponent']): DuelState =>
  ({ ...duel, players: { ...duel.players, opponent: change(duel.players.opponent) } })

/** Rival invoker life. */
export const rivalLife = (life: number): DuelVariant => (duel) => mapRival(duel, (rival) => ({ ...rival as Invoker, life }))

/** Player invoker starting life. */
export const playerLife = (life: number): DuelVariant => (duel) => ({ ...duel, players: { ...duel.players, player: { ...duel.players.player, life } } })

/** Replaces (or removes, with `to` null) a card type in the rival's hand, deck and field. Replacements keep the instance ID. */
export const swapRivalCard = (from: string, to: string | null): DuelVariant => (duel) => mapRival(duel, (rival) => {
  const definition = to ? V04B_CARD_TYPES.find((card) => card.id === to)! : null
  const swap = (cards: CreatureCard[]) => cards.flatMap((card) => card.id !== from ? [card] : definition ? [{ ...definition, cost: { ...definition.cost }, instanceId: card.instanceId, entityKind: 'real' as const }] : [])
  if (rival.kind !== 'invoker') return rival
  return { ...rival, hand: swap(rival.hand), deck: swap(rival.deck) }
})

/** Changes the printed ATK / max health of a rival card type everywhere it appears (hand, deck, field). */
export const rivalCardStats = (id: string, stats: { attack?: number; maxHealth?: number }): DuelVariant => (duel) => mapRival(duel, (rival) => {
  const patch = (card: CreatureCard): CreatureCard => card.id === id ? { ...card, ...stats } : card
  const patchUnit = (unit: Creature): Creature => unit.card.id !== id ? unit
    : { ...unit, card: patch(unit.card), health: Math.min(stats.maxHealth ?? unit.health, unit.health + (stats.maxHealth ?? unit.card.maxHealth) - unit.card.maxHealth) }
  if (rival.kind !== 'invoker') return { ...rival, creatures: rival.creatures.map(patchUnit) }
  return { ...rival, hand: rival.hand.map(patch), deck: rival.deck.map(patch), creatures: rival.creatures.map(patchUnit) }
})

/** Sets the shield charges of a pre-deployed rival creature type (skirmishes). */
export const fieldShield = (id: string, charges: number): DuelVariant => (duel) => mapRival(duel, (rival) => ({
  ...rival, creatures: rival.creatures.map((unit) => unit.card.id === id ? { ...unit, shieldCharges: charges } : unit),
}))

/** Skirmishes: replaces a pre-deployed creature type (health refilled; only R03/R04 keep their shield charges). */
export const swapFieldCard = (from: string, to: string): DuelVariant => (duel) => mapRival(duel, (rival) => {
  const definition = V04B_CARD_TYPES.find((card) => card.id === to)!
  return { ...rival, creatures: rival.creatures.map((unit) => {
    if (unit.card.id !== from) return unit
    const { shieldCharges: _removed, ...rest } = unit
    return { ...rest, card: { ...definition, cost: { ...definition.cost }, instanceId: unit.card.instanceId, entityKind: 'real' as const }, health: definition.maxHealth,
      ...(to === 'R03' ? { shieldCharges: 1 } : to === 'R04' ? { shieldCharges: 2 } : {}) }
  }) }
})

export const combine = (...variants: DuelVariant[]): DuelVariant => (duel) => variants.reduce((state, variant) => variant(state), duel)

export const WHAT_IFS: readonly WhatIf[] = [
  { name: 'P17-1 N04 4/3 → N02 2/2 en el grupo', room: '17', variant: swapFieldCard('N04', 'N02') },
  { name: 'P17-2 N04 4/3 → N07 2/3 en el grupo', room: '17', variant: swapFieldCard('N04', 'N07') },
  { name: 'P17-3 R03 3/3 escudo 1 → N07 2/3 en el grupo', room: '17', variant: swapFieldCard('R03', 'N07') },
  { name: 'P17-4 R03 sin escudo (3/3)', room: '17', variant: fieldShield('R03', 0) },
  { name: 'P17-5 N04 → N02 y R03 → N07', room: '17', variant: combine(swapFieldCard('N04', 'N02'), swapFieldCard('R03', 'N07')) },
  { name: 'P17-6 jugador con 25 de vida en la sala', room: '17', variant: playerLife(25) },
  { name: 'P06-1 vida del Prior 20 → 16', room: '06', variant: rivalLife(16) },
  { name: 'P06-2 vida del Prior 20 → 14', room: '06', variant: rivalLife(14) },
  { name: 'P06-3 vida del Prior 20 → 12', room: '06', variant: rivalLife(12) },
  { name: 'P06-4 H02 → N05 (sin sanación de inicio)', room: '06', variant: swapRivalCard('H02', 'N05') },
  { name: 'P06-5 H02 y H03 → N05 (sin curas)', room: '06', variant: combine(swapRivalCard('H02', 'N05'), swapRivalCard('H03', 'N05')) },
  { name: 'P06-6 vida 14 + H02 → N05', room: '06', variant: combine(rivalLife(14), swapRivalCard('H02', 'N05')) },
  { name: 'P06-7 vida 14 + H02 y H03 → N05', room: '06', variant: combine(rivalLife(14), swapRivalCard('H02', 'N05'), swapRivalCard('H03', 'N05')) },
  { name: 'P19-1 vida del Rey 28 → 22', room: '19', variant: rivalLife(22) },
  { name: 'P19-2 vida del Rey 28 → 18', room: '19', variant: rivalLife(18) },
  { name: 'P18-1 vida del Devoto 18 → 14', room: '18', variant: rivalLife(14) },
]
