import type { DragEvent, MouseEvent } from 'react'
import type { Creature, CreatureCard } from '../engine/index.js'
import { CreaturePortrait, Icon } from './GameIcons.js'
import { activateOnce, preventRepeatedActivationKey } from './activation.js'

export function RarityLabel({ card, compact = false }: { card: CreatureCard; compact?: boolean }) {
  if (!card.rarity) return card.maxCopies ? <span className="card-rarity" title={card.abilities?.length ? `Efectos pendientes M2–M3: ${card.abilities.map((ability) => ability.description).join(' ')}` : undefined}>{compact && card.copyId ? card.copyId : card.special ? 'Especial' : card.seed ? 'Semilla' : 'Normal'}{compact && Boolean(card.abilities?.length) ? ' · Pendiente' : ''}</span> : null
  const label = card.rarity === 'epic' ? '◆ Épica' : card.rarity === 'rare' ? '◇ Rara' : '● Común'
  return <span className={`card-rarity rarity-${card.rarity}`}>{label}{card.seed ? ' · Semilla' : ''}{card.growth ? compact ? ` · +${card.growthProgress ?? 0}/${card.growthCap ?? 3} ${card.growth === 'attack' ? 'ATQ' : 'VID'}` : ` · ${card.growth === 'attack' ? 'ATQ' : 'VID'} +${card.growthProgress ?? 0}/${card.growthCap ?? 3} por victoria` : ''}</span>
}

export function PendingAbilities({ card }: { card: CreatureCard }) {
  return card.abilities?.length ? <span className="growth-note" title={card.abilities.map((ability) => `${ability.description} (Pendiente ${ability.implementation === 'pending-m2' ? 'M2' : 'M3'})`).join('\n')}>Efectos pendientes M2–M3</span> : null
}

export function CardStats({ attack, health, maxHealth }: { attack: number; health: number; maxHealth: number }) {
  return <span className="card-stats"><span title="Ataque"><Icon name="sword" />{attack}<small>ATQ</small></span><span className={health < maxHealth ? 'wounded-stat' : ''} title="Vida actual / máxima"><Icon name="heart" />{health}<small>/ {maxHealth} VID</small></span></span>
}
export function CreatureTile({ creature, selected = false, onClick, hint, draggable = false, onDragStart, onDragEnd }: {
  creature: Creature; selected?: boolean; onClick?: (event: MouseEvent<HTMLButtonElement>) => void; hint?: string
  draggable?: boolean; onDragStart?: (event: DragEvent<HTMLButtonElement>) => void; onDragEnd?: () => void
}) {
  const wounded = creature.health < creature.card.maxHealth
  const content = <><CreaturePortrait cardId={creature.card.id} /><strong>{creature.card.name}</strong><RarityLabel card={creature.card} compact /><CardStats attack={creature.card.attack} health={creature.health} maxHealth={creature.card.maxHealth} /><span className="tile-state">{selected ? '✓ ' : ''}{hint || (wounded ? 'Herida' : 'En mesa')}</span></>
  const className = `creature-tile${selected ? ' is-selected' : ''}${wounded ? ' is-wounded' : ''}`
  return onClick || draggable ? <button type="button" className={className} onClick={onClick} aria-pressed={selected} draggable={draggable} onDragStart={onDragStart} onDragEnd={onDragEnd}>{content}</button> : <article className={className}>{content}</article>
}
export function HandCard({ card, selected, unavailableReason, draggable, onDragStart, onClick }: {
  card: CreatureCard
  selected: boolean
  unavailableReason: string
  draggable: boolean
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void
  onClick: () => void
}) {
  const health = card.startingHealth ?? card.maxHealth
  return <button type="button" className={`hand-card${selected ? ' is-selected' : ''}${health < card.maxHealth ? ' is-wounded' : ''}`} disabled={Boolean(unavailableReason)} draggable={draggable} onDragStart={onDragStart} onClick={(event) => activateOnce(event, onClick)} onKeyDown={preventRepeatedActivationKey} aria-pressed={selected}>
    <span className="card-cost" title={`${card.cost.mana} maná`}><Icon name="mana" />{card.cost.mana}<span className="sr-only">maná</span></span>
    {card.cost.sacrifices > 0 && <span className="sacrifice-cost"><Icon name="skull" />{card.cost.sacrifices}<span className="sr-only">sacrificio permanente</span></span>}
    <CreaturePortrait cardId={card.id} />
    <strong>{card.name}</strong>
    <RarityLabel card={card} compact />
    <CardStats attack={card.attack} health={health} maxHealth={card.maxHealth} />
    <span className="card-state">{unavailableReason || (selected ? 'Sacrificio pendiente' : 'Arrastra al campo o activa para invocar')}</span>
  </button>
}
