import type { GameSession } from '../engine/index.js'
import { PLAYER_CARD_TYPES } from '../engine/content.js'
import { CardStats } from './CardViews.js'
import { CreaturePortrait, Icon } from './GameIcons.js'

type Props = { session: GameSession; onChangeDeck: (copyId: string, included: boolean) => void }

export function DeckPanel({ session, onChangeDeck }: Props) {
  return <section className="deck-panel stone-panel" aria-labelledby="deck-title">
    <header className="panel-heading"><div><p className="section-kicker">Preparación</p><h2 id="deck-title">Baraja activa <span>{session.activeDeckCopyIds.length}</span></h2></div><Icon name="cards" /></header>
    <p className="subtle">Las cartas se roban en este orden.</p>
    <ol className="deck-list">
      {session.activeDeckCopyIds.map((copyId, index) => {
        const copy = session.copies.find((entry) => entry.id === copyId)
        const card = copy && PLAYER_CARD_TYPES.find((entry) => entry.id === copy.cardId)
        return copy && card ? <li key={copyId} className={copy.health < card.maxHealth ? 'is-wounded' : ''}><span className="deck-index">{String(index + 1).padStart(2, '0')}</span><CreaturePortrait cardId={card.id} /><div><strong>{card.name}</strong><span>{card.attack} ATQ · {copy.health}/{card.maxHealth} VID{copy.health < card.maxHealth ? ' · Herida' : ''}</span></div><button className="remove-card" type="button" onClick={() => onChangeDeck(copyId, false)} aria-label={`Retirar ${card.name} de baraja`} title={`Retirar ${card.name}`}>×</button></li> : null
      })}
    </ol>
    {session.activeDeckCopyIds.length === 0 && <p className="empty-state">Baraja vacía. Puedes entrar a un duelo sin cartas o añadir copias desde la colección.</p>}
    <p className="deck-note"><Icon name="heart" />Las heridas se conservan entre duelos.</p>
  </section>
}
export function CollectionView({ session, onChangeDeck }: Props) {
  return <section className="collection-view stone-panel" aria-labelledby="collection-title">
    <header className="panel-heading"><div><p className="section-kicker">Tus invocaciones</p><h2 id="collection-title">Colección <span>{session.copies.length}</span></h2></div><span className="subtle">{session.unlockedCardIds.length} tipos desbloqueados</span></header>
    <p className="collection-help">Añadir una copia la coloca al final de la baraja. Retirarla conserva su lugar en la colección.</p>
    <div className="collection-grid">
      {session.unlockedCardIds.map((cardId) => {
        const card = PLAYER_CARD_TYPES.find((entry) => entry.id === cardId)
        if (!card) return null
        const copy = session.copies.find((entry) => entry.cardId === cardId)
        const inDeck = copy ? session.activeDeckCopyIds.includes(copy.id) : false
        return <article className={`collection-card${!copy ? ' is-lost' : ''}${copy && copy.health < card.maxHealth ? ' is-wounded' : ''}`} key={cardId}>
          <span className="collection-card-top"><span><Icon name="mana" />{card.cost.mana} maná</span>{card.cost.sacrifices > 0 && <span className="sacrifice-cost-inline"><Icon name="skull" />{card.cost.sacrifices} sacrificio</span>}</span>
          <CreaturePortrait cardId={card.id} />
          <h3>{card.name}</h3>
          <CardStats attack={card.attack} health={copy?.health ?? card.maxHealth} maxHealth={card.maxHealth} />
          <p className="ownership-state">{!copy ? 'Sin copia · desbloqueo conservado' : copy.health < card.maxHealth ? 'Herida persistente' : inDeck ? 'En tu baraja' : 'En reserva'}</p>
          {copy ? <button type="button" className={`button ${inDeck ? 'button-secondary' : 'button-primary'}`} onClick={() => onChangeDeck(copy.id, !inDeck)} aria-label={`${inDeck ? 'Retirar' : 'Añadir'} ${card.name} ${inDeck ? 'de' : 'a'} baraja`}>{inDeck ? 'Retirar de baraja' : 'Añadir a baraja'}</button> : <span className="lost-copy"><Icon name="skull" />Copia perdida</span>}
        </article>
      })}
    </div>
    {session.copies.length === 0 && <p className="empty-state">No quedan copias en la colección. El catálogo conserva tus descubrimientos.</p>}
    <footer className="collection-footnote"><Icon name="skull" />Una criatura muerta o sacrificada se pierde permanentemente.</footer>
  </section>
}
