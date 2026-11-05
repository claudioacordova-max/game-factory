import type { CreatureCard, GameSession } from '../engine/index.js'
import { discoveredCardIds, effectiveCopyCard, reinvokeStatus, unlockedSlotsForType } from '../engine/index.js'
import { PLAYER_CARD_TYPES } from '../engine/content.js'
import { CardStats, PendingAbilities, RarityLabel } from './CardViews.js'
import { CreaturePortrait, Icon } from './GameIcons.js'

type Props = { session: GameSession; cardTypes?: readonly CreatureCard[]; onChangeDeck: (copyId: string, included: boolean) => void }

export function DeckPanel({ session, cardTypes = PLAYER_CARD_TYPES, onChangeDeck }: Props) {
  return <section className="deck-panel stone-panel" aria-labelledby="deck-title">
    <header className="panel-heading"><div><p className="section-kicker">Elegidas para el duelo</p><h2 id="deck-title">Baraja activa <span>{session.activeDeckCopyIds.length}</span></h2></div><Icon name="cards" /></header>
    <p className="subtle">El robo es aleatorio. Elige tus criaturas.</p>
    <ul className="deck-list">
      {session.activeDeckCopyIds.map((copyId) => {
        const copy = session.copies.find((entry) => entry.id === copyId)
        const type = copy && cardTypes.find((entry) => entry.id === copy.cardId)
        const card = copy && type && effectiveCopyCard(type, copy)
        return copy && card ? <li key={copyId} className={copy.health < card.maxHealth ? 'is-wounded' : ''}><CreaturePortrait cardId={card.id} /><div><strong>{card.name}</strong><span>{session.collectionProfile === 'v04b' ? `${copy.id} · ` : ''}{card.attack} ATQ · {copy.health}/{card.maxHealth} VID{copy.health < card.maxHealth ? ' · Herida' : ''}</span></div><button className="remove-card" type="button" disabled={session.activeDuelId !== null} onClick={() => onChangeDeck(copyId, false)} aria-label={`Retirar ${card.name}${session.collectionProfile === 'v04b' ? ` ${copy.id}` : ''} de baraja`}>×</button></li> : null
      })}
    </ul>
    {session.activeDeckCopyIds.length === 0 && <p className="empty-state">Baraja vacía. Recupera copias y añádelas desde Colección.</p>}
    <p className="deck-note"><Icon name="heart" />Las heridas se conservan entre duelos.</p>
  </section>
}
export function CollectionView({ session, cardTypes = PLAYER_CARD_TYPES, onChangeDeck, onReinvoke }: Props & { onReinvoke: (cardId: string) => void }) {
  return <section className="collection-view stone-panel" aria-labelledby="collection-title">
    <header className="panel-heading"><div><p className="section-kicker">Tus invocaciones</p><h2 id="collection-title">Colección <span>{session.copies.length}</span></h2></div><span className="subtle">{discoveredCardIds(session).length} tipos descubiertos</span></header>
    <p className="collection-help">{session.collectionProfile === 'v04b' ? 'Cada copia tiene identidad y salud propias. Solo puedes recuperar cupos ya obtenidos; perder una copia conserva su cupo. ' : 'Una copia por tipo, incluida la reserva. '}Reinvocar una perdida crea una copia básica en reserva y consume vida máxima del invocador (mínimo 1). Las semillas se recuperan gratis.</p>
    {session.collectionProfile === 'v04b' && <p className="collection-help">Habilidades disponibles: consulta la descripción de cada carta para sus efectos, objetivos y condiciones.</p>}
    <div className="collection-grid">
      {discoveredCardIds(session).flatMap((cardId) => {
        const type = cardTypes.find((entry) => entry.id === cardId)
        if (!type) return null
        const copies = session.copies.filter((entry) => entry.cardId === cardId)
        const slots = unlockedSlotsForType(session, cardId)
        return Array.from({ length: slots }, (_, slot) => {
          const copy = copies[slot]
          const card = copy ? effectiveCopyCard(type, copy) : type
          const inDeck = copy ? session.activeDeckCopyIds.includes(copy.id) : false
          const recovery = reinvokeStatus(session, cardId, cardTypes)
          const identityLabel = session.collectionProfile === 'v04b' ? ` ${copy?.id ?? `cupo ${slot + 1}`}` : ''
          return <article className={`collection-card rarity-border-${card.rarity ?? 'common'}${!copy ? ' is-lost' : ''}${copy && copy.health < card.maxHealth ? ' is-wounded' : ''}`} key={copy?.id ?? `${cardId}-vacant-${slot}`} data-copy-id={copy?.id}>
            <span className="collection-card-top"><span><Icon name="mana" />{card.cost.mana} maná</span>{card.cost.sacrifices > 0 && <span className="sacrifice-cost-inline"><Icon name="skull" />{card.cost.sacrifices} sacrificio</span>}</span>
            <CreaturePortrait cardId={card.id} />
            <RarityLabel card={card} />
            <h3>{card.name}</h3>
            {session.collectionProfile === 'v04b' && <p className="copy-base-stats">{copy ? `Copia ${copy.id}` : `Cupo ${slot + 1} vacante`} · {copies.length}/{slots} poseídas / cupos obtenidos · límite {type.maxCopies}</p>}
            <PendingAbilities card={card} />
            <CardStats attack={card.attack} health={copy?.health ?? card.maxHealth} maxHealth={card.maxHealth} />
            <p className="copy-base-stats">Base: {type.attack} ATQ · {type.maxHealth} VID{copy && (copy.bonusAttack > 0 || copy.bonusHealth > 0) ? ` · Mejoras: +${copy.bonusAttack} ATQ / +${copy.bonusHealth} VID` : ' · Sin mejoras'}</p>
            {card.growth && <p className="growth-note">Mejora por victoria · {card.growth === 'attack' ? 'ATQ' : 'VID'} +{copy ? card.growth === 'attack' ? copy.bonusAttack : copy.bonusHealth : 0}/{card.growthCap}</p>}
            <p className="ownership-state">{!copy ? 'Sin copia · tipo descubierto' : copy.health < card.maxHealth ? `Herida · ${inDeck ? 'En baraja' : 'En reserva'}` : inDeck ? 'En tu baraja' : 'En reserva'}</p>
            {copy && <p className="recovery-cost">Si se pierde: reinvocar {recovery.cost === 0 ? 'gratis' : `cuesta ${recovery.cost} de vida máxima`}. Copia básica, sin mejoras.</p>}
            {copy ? <button type="button" className={`button ${inDeck ? 'button-secondary' : 'button-primary'}`} disabled={session.activeDuelId !== null} onClick={() => onChangeDeck(copy.id, !inDeck)} aria-label={`${inDeck ? 'Retirar' : 'Añadir'} ${card.name}${identityLabel} ${inDeck ? 'de' : 'a'} baraja`}>{inDeck ? 'Retirar de baraja' : 'Añadir a baraja'}</button> : <div className="reinvoke-action"><p>Recuperar: {recovery.cost} vida máxima<br/>Máximo: {session.invokerMaxLife} → {recovery.resultingMaxLife}</p><button type="button" className="button button-primary" disabled={!recovery.allowed} onClick={() => onReinvoke(card.id)} aria-label={`Reinvocar ${card.name}${identityLabel}`}>Reinvocar {card.seed ? 'gratis' : ''}</button>{recovery.reason && <p>{recovery.reason}</p>}</div>}
          </article>
        })
      })}
    </div>
    {session.copies.length === 0 && <p className="empty-state">No quedan copias. Recupera semillas gratis para preparar otra baraja.</p>}
    <footer className="collection-footnote"><Icon name="skull" />Las bajas y sacrificios pierden su copia y sus mejoras. El tipo descubierto se conserva.</footer>
  </section>
}
