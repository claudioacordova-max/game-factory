import type { DOMAttributes, MouseEvent } from 'react'
import type { Creature, CreatureCard } from '../engine/index.js'
import { effectiveAttack, effectiveMaxHealth } from '../engine/index.js'
import { CreaturePortrait, Icon } from './GameIcons.js'
import { activateOnce, preventRepeatedActivationKey } from './activation.js'

export function RarityLabel({ card, compact = false }: { card: CreatureCard; compact?: boolean }) {
  if (card.entityKind === 'token') return <span className="card-rarity">Ficha temporal</span>
  if (!card.rarity) return card.maxCopies ? <span className="card-rarity" title={card.abilities?.map((ability) => ability.description).join(' ') || undefined}>{compact && card.copyId ? card.copyId : card.special ? 'Especial' : card.seed ? 'Semilla' : 'Normal'}{compact && card.abilities?.some((ability) => ability.implementation.startsWith('pending')) ? ' · Pendiente' : ''}</span> : null
  const label = card.rarity === 'epic' ? '◆ Épica' : card.rarity === 'rare' ? '◇ Rara' : '● Común'
  return <span className={`card-rarity rarity-${card.rarity}`}>{label}{card.seed ? ' · Semilla' : ''}{card.growth ? compact ? ` · +${card.growthProgress ?? 0}/${card.growthCap ?? 3} ${card.growth === 'attack' ? 'ATQ' : 'VID'}` : ` · ${card.growth === 'attack' ? 'ATQ' : 'VID'} +${card.growthProgress ?? 0}/${card.growthCap ?? 3} por victoria` : ''}</span>
}

export function PendingAbilities({ card }: { card: CreatureCard }) {
  const abilities = card.abilities ?? []
  if (!abilities.length) return null
  const pending = abilities.filter((ability) => ability.implementation.startsWith('pending'))
  return <span className="growth-note" title={abilities.map((ability) => ability.description).join('\n')}>{pending.length ? 'Habilidades pendientes' : 'Habilidades'}</span>
}

/** Kept separate from the creature tile so sacrifice selection never nests buttons. */
export function R01ActivationButton({ creature, disabled = false, onActivate }: {
  creature: Creature; disabled?: boolean; onActivate?: (creatureId: string) => void
}) {
  const reference = creature.copyId ?? creature.id
  return <button type="button" className="combat-r01-activation" disabled={disabled || !onActivate}
    aria-label={`Activar Runa inestable ${reference}`} data-activation-copy-id={reference}
    title={`Sacrifica ${reference}; esta copia se pierde. Obtienes +2 de maná temporal hasta terminar la fase principal.${disabled ? ' Completa o cancela la selección pendiente antes de activar.' : ''}`}
    onClick={(event) => { if (!disabled && onActivate) activateOnce(event, () => onActivate(creature.id)) }} onKeyDown={preventRepeatedActivationKey}>
    <span>Activar Runa inestable</span><small>Sacrifica {reference} · +2 maná temporal</small>
  </button>
}

export function CardStats({ attack, health, maxHealth }: { attack: number; health: number; maxHealth: number }) {
  return <span className="card-stats"><span title="Ataque"><Icon name="sword" />{attack}<small>ATQ</small></span><span className={health < maxHealth ? 'wounded-stat' : ''} title="Vida actual / máxima"><Icon name="heart" />{health}<small>/ {maxHealth} VID</small></span></span>
}
export function N01ActivationButton({ creature, disabled = false, onActivate }: {
  creature: Creature; disabled?: boolean; onActivate?: (creatureId: string) => void
}) {
  const reference = creature.copyId ?? creature.id
  return <button type="button" className="combat-n01-activation" disabled={disabled || !onActivate}
    aria-label={`Activar Urna maldita ${reference}`} data-activation-copy-id={reference}
    title={`Elige una criatura enemiga; al confirmar el objetivo, ${reference} se sacrifica y destruye esa criatura, ignorando escudos.`}
    onClick={(event) => { if (!disabled && onActivate) activateOnce(event, () => onActivate(creature.id)) }} onKeyDown={preventRepeatedActivationKey}>
    <span>Activar Urna maldita</span><small>Sacrifica {reference} · destruye una enemiga</small>
  </button>
}
/** UI-2: pointer-gesture handlers; the whole card is the grip (no native drag). */
export type CardGrip = Pick<DOMAttributes<HTMLButtonElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'>
export function CreatureTile({ creature, selected = false, onClick, hint, grip }: {
  creature: Creature; selected?: boolean; onClick?: (event: MouseEvent<HTMLButtonElement>) => void; hint?: string; grip?: CardGrip
}) {
  const wounded = creature.health < effectiveMaxHealth(creature)
  const content = <><CreaturePortrait cardId={creature.card.id} /><strong>{creature.card.name}</strong>{creature.echo ? <span className="card-rarity echo-label" title="Refuerzo rival por mazo agotado: no bloquea y no se sacrifica.">Refuerzo de la cripta</span> : <RarityLabel card={creature.card} compact />}<CardStats attack={effectiveAttack(creature)} health={creature.health} maxHealth={effectiveMaxHealth(creature)} />{creature.shieldCharges !== undefined && <span className="creature-shield" aria-label={`Escudo: ${creature.shieldCharges}`}><Icon name="shield" />Escudo: {creature.shieldCharges}</span>}<span className="tile-state">{selected ? '✓ ' : ''}{hint || (wounded ? 'Herida' : 'En mesa')}</span></>
  const className = `creature-tile${creature.echo ? ' is-echo' : ''}${selected ? ' is-selected' : ''}${wounded ? ' is-wounded' : ''}${grip ? ' is-grabbable' : ''}`
  return onClick || grip ? <button type="button" className={className} onClick={onClick ? (event) => activateOnce(event, () => onClick(event)) : undefined} onKeyDown={preventRepeatedActivationKey} aria-pressed={selected} draggable={false} {...grip}>{content}</button> : <article className={className} draggable={false}>{content}</article>
}
export function HandCard({ card, selected, unavailableReason, grip, onClick }: {
  card: CreatureCard
  selected: boolean
  unavailableReason: string
  grip?: CardGrip
  onClick: () => void
}) {
  const health = card.startingHealth ?? card.maxHealth
  return <button type="button" className={`hand-card${selected ? ' is-selected' : ''}${health < card.maxHealth ? ' is-wounded' : ''}${grip ? ' is-grabbable' : ''}`} disabled={Boolean(unavailableReason)} draggable={false} {...grip} onClick={(event) => activateOnce(event, onClick)} onKeyDown={preventRepeatedActivationKey} aria-pressed={selected}>
    <span className="card-cost" title={`${card.cost.mana} maná`}><Icon name="mana" />{card.cost.mana}<span className="sr-only">maná</span></span>
    {card.cost.sacrifices > 0 && <span className="sacrifice-cost"><Icon name="skull" />{card.cost.sacrifices}<span className="sr-only">sacrificio permanente</span></span>}
    <CreaturePortrait cardId={card.id} />
    <strong>{card.name}</strong>
    <RarityLabel card={card} compact />
    <CardStats attack={card.attack} health={health} maxHealth={card.maxHealth} />
    <span className="card-state">{unavailableReason || (selected ? 'Sacrificio pendiente' : 'Arrastra al campo o activa para invocar')}</span>
  </button>
}
