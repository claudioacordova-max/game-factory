import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { GameSession } from '../engine/index.js'
import { CollectionView, DeckPanel } from './CollectionViews.js'
import { Icon } from './GameIcons.js'
import { GameNotice } from './GameNotice.js'

/** Native modal focus containment also makes the preserved world inert. */
export function GameOverlay({ children, label, className = '', onClose }: {
  children: ReactNode; label: string; className?: string; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={dialog} className={`game-overlay ${className}`} aria-label={label} onCancel={(event) => { event.preventDefault(); onClose() }}>
    {children}
  </dialog>
}

export function CollectionOverlay({ session, onClose, onChangeDeck, onReinvoke, notice, noticeRevision, noticeExpiresAt, onClearNotice }: {
  session: GameSession; onClose: () => void; onChangeDeck: (id: string, included: boolean) => void; onReinvoke: (id: string) => void
  notice: string; noticeRevision: number; noticeExpiresAt?: number; onClearNotice?: () => void
}) {
  return <GameOverlay label="Colección y baraja" className="collection-overlay" onClose={onClose}>
    <header className="overlay-heading"><div><p className="section-kicker">El grimorio del invocador</p><h1><Icon name="cards" />Tus invocaciones</h1></div><div className="collection-max-life"><Icon name="heart" /><strong>{session.invokerLife}/{session.invokerMaxLife}</strong><span>vida del invocador</span></div><button type="button" className="overlay-close" onClick={onClose} aria-label="Cerrar colección"><span aria-hidden="true">×</span><kbd>Esc / I</kbd></button></header>
    <div className="collection-workspace"><CollectionView session={session} onChangeDeck={onChangeDeck} onReinvoke={onReinvoke} /><DeckPanel session={session} onChangeDeck={onChangeDeck} /></div>
    <GameNotice message={notice} revision={noticeRevision} expiresAt={noticeExpiresAt} onClear={onClearNotice} />
  </GameOverlay>
}
