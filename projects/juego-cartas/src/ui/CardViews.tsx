import type { Creature, CreatureCard } from '../engine/index.js'
import { CreaturePortrait, Icon } from './GameIcons.js'

export function CardStats({ attack, health, maxHealth }: { attack: number; health: number; maxHealth: number }) {
  return <span className="card-stats"><span title="Ataque"><Icon name="sword" />{attack}<small>ATQ</small></span><span className={health < maxHealth ? 'wounded-stat' : ''} title="Vida actual / máxima"><Icon name="heart" />{health}<small>/ {maxHealth} VID</small></span></span>
}
export function CreatureTile({ creature, selected = false, onClick, hint }: { creature: Creature; selected?: boolean; onClick?: () => void; hint?: string }) {
  const wounded = creature.health < creature.card.maxHealth
  const content = <><CreaturePortrait cardId={creature.card.id} /><strong>{creature.card.name}</strong><CardStats attack={creature.card.attack} health={creature.health} maxHealth={creature.card.maxHealth} /><span className="tile-state">{selected ? '✓ ' : ''}{hint || (wounded ? 'Herida' : 'En mesa')}</span></>
  const className = `creature-tile${selected ? ' is-selected' : ''}${wounded ? ' is-wounded' : ''}`
  return onClick ? <button type="button" className={className} onClick={onClick} aria-pressed={selected}>{content}</button> : <article className={className}>{content}</article>
}
export function HandCard({ card, selected, unavailableReason, onClick }: { card: CreatureCard; selected: boolean; unavailableReason: string; onClick: () => void }) {
  const health = card.startingHealth ?? card.maxHealth
  return <button type="button" className={`hand-card${selected ? ' is-selected' : ''}${health < card.maxHealth ? ' is-wounded' : ''}`} disabled={Boolean(unavailableReason)} onClick={onClick} aria-pressed={selected}>
    <span className="card-cost" title={`${card.cost.mana} maná`}><Icon name="mana" />{card.cost.mana}<span className="sr-only">maná</span></span>
    {card.cost.sacrifices > 0 && <span className="sacrifice-cost"><Icon name="skull" />{card.cost.sacrifices}<span className="sr-only">sacrificio permanente</span></span>}
    <CreaturePortrait cardId={card.id} />
    <strong>{card.name}</strong>
    <CardStats attack={card.attack} health={health} maxHealth={card.maxHealth} />
    <span className="card-state">{unavailableReason || (selected ? '✓ Seleccionada' : health < card.maxHealth ? 'Herida persistente' : card.cost.sacrifices ? 'Requiere sacrificio' : 'Lista para invocar')}</span>
  </button>
}
