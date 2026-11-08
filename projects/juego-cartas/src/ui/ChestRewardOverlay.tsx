import { useEffect, useRef } from 'react'
import type { ChestReward } from '../adventure/types.js'
import { RarityLabel } from './CardViews.js'
import { GameOverlay } from './CollectionOverlay.js'
import { CreaturePortrait, Icon } from './GameIcons.js'

/** V0.4B chest reward (M7): official card names; closes with E, Esc or the button and focus returns to the avatar. */
export function ChestRewardOverlay({ reward, onClose }: { reward: ChestReward; onClose: () => void }) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    // The opening press (possibly still dispatching) and a held E never close it; a fresh press does (Esc is the dialog's cancel).
    const mountedAt = performance.now()
    const key = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'e' || event.repeat || event.timeStamp < mountedAt || event.ctrlKey || event.altKey || event.metaKey) return
      event.preventDefault()
      close.current()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  return <GameOverlay label="Cartas obtenidas del cofre" className="encounter-result chest-reward" onClose={onClose}>
    <div className="chest-reward-body">
      <span className="result-seal"><Icon name="cards" /></span>
      <p className="section-kicker">Cofre abierto · {reward.source}</p>
      <h1>Cartas obtenidas</h1>
      <p className="result-outcome">{reward.cards.length === 1 ? 'Una copia sana pasa' : `${reward.cards.length} copias sanas pasan`} a tu reserva. Añádelas a la baraja desde Colección.</p>
      <ul className="chest-reward-cards">
        {reward.cards.map(({ copyId, card }) => <li key={copyId} className={`chest-reward-card rarity-border-${card.rarity ?? 'common'}`} data-copy-id={copyId}>
          <CreaturePortrait cardId={card.id} />
          <span><strong>{card.name}</strong><RarityLabel card={card} /><small>Copia {copyId} · En reserva</small></span>
        </li>)}
      </ul>
      <button type="button" className="button button-primary" onClick={onClose} autoFocus>Continuar explorando<kbd>E</kbd></button>
    </div>
  </GameOverlay>
}
