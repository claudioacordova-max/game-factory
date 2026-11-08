import type { CreatureCard, CreatureCopy, GameSession } from '../engine/index.js'
import { effectiveCopyCard, lostCopyCardIds, reinvokeStatus } from '../engine/index.js'
import type { ReinvokeStatus } from '../engine/index.js'

/** UI-1 V0.4B grimoire: pure grouping, choice and filter rules (no React). */

export interface CopyGroup { type: CreatureCard; copies: CreatureCopy[]; wounded: number }
export interface LostGroup { type: CreatureCard; count: number; status: ReinvokeStatus }

export function isWoundedCopy(type: CreatureCard, copy: CreatureCopy): boolean {
  return copy.health < effectiveCopyCard(type, copy).maxHealth
}

/** One group per type, in catalogue order; copies keep the order given (deck order or collection order). */
export function groupCopies(copies: readonly CreatureCopy[], cardTypes: readonly CreatureCard[]): CopyGroup[] {
  return cardTypes.flatMap((type) => {
    const own = copies.filter((copy) => copy.cardId === type.id)
    return own.length ? [{ type, copies: own, wounded: own.filter((copy) => isWoundedCopy(type, copy)).length }] : []
  })
}

export function deckGroups(session: GameSession, cardTypes: readonly CreatureCard[]): CopyGroup[] {
  const copies = session.activeDeckCopyIds.flatMap((id) => session.copies.filter((copy) => copy.id === id))
  return groupCopies(copies, cardTypes)
}

/** Colección shows only owned copies outside the active deck (the reserve). */
export function reserveGroups(session: GameSession, cardTypes: readonly CreatureCard[]): CopyGroup[] {
  return groupCopies(session.copies.filter((copy) => !session.activeDeckCopyIds.includes(copy.id)), cardTypes)
}

/** Lost copies (vacant obtained slots) per type with the existing individual recovery status. */
export function lostGroups(session: GameSession, cardTypes: readonly CreatureCard[]): LostGroup[] {
  const ids = lostCopyCardIds(session, cardTypes)
  return cardTypes.flatMap((type) => {
    const count = ids.filter((id) => id === type.id).length
    return count ? [{ type, count, status: reinvokeStatus(session, type.id, cardTypes) }] : []
  })
}

/**
 * Without wounded copies the group's copies are interchangeable, so one is moved directly
 * (adding takes the first, removing the last added); with any wounded copy the player chooses (null).
 */
export function directCopyChoice(group: CopyGroup, action: 'add' | 'remove'): string | null {
  if (group.wounded > 0) return null
  return (action === 'add' ? group.copies[0] : group.copies[group.copies.length - 1]).id
}

export type ManaFilter = '0' | '1' | '2' | '3+'
export type SacrificeFilter = '0' | '1' | '2+'
export interface GrimoireFilters { mana: ManaFilter[]; sacrifices: SacrificeFilter[] }
export const MANA_FILTERS: readonly ManaFilter[] = ['0', '1', '2', '3+']
export const SACRIFICE_FILTERS: readonly SacrificeFilter[] = ['0', '1', '2+']
export const NO_FILTERS: GrimoireFilters = { mana: [], sacrifices: [] }

export function manaBucket(card: CreatureCard): ManaFilter { return card.cost.mana >= 3 ? '3+' : String(card.cost.mana) as ManaFilter }
export function sacrificeBucket(card: CreatureCard): SacrificeFilter { return card.cost.sacrifices >= 2 ? '2+' : String(card.cost.sacrifices) as SacrificeFilter }

/** OR inside a category, AND between categories; an empty category does not filter. */
export function matchesFilters(card: CreatureCard, filters: GrimoireFilters): boolean {
  return (filters.mana.length === 0 || filters.mana.includes(manaBucket(card)))
    && (filters.sacrifices.length === 0 || filters.sacrifices.includes(sacrificeBucket(card)))
}

export function activeFilterCount(filters: GrimoireFilters): number { return filters.mana.length + filters.sacrifices.length }

export function toggleFilter(filters: GrimoireFilters, category: 'mana' | 'sacrifices', value: string): GrimoireFilters {
  const current = filters[category] as string[]
  const next = current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
  return { ...filters, [category]: next }
}

export function filterLabel(category: 'mana' | 'sacrifices', value: string): string {
  return category === 'mana' ? `${value} maná` : `${value} ${value === '1' ? 'sacrificio' : 'sacrificios'}`
}

export function woundedLabel(count: number): string { return count === 1 ? '1 herida' : `${count} heridas` }
