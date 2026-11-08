import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { CreatureCard, GameSession } from '../engine/index.js'
import { CollectionView, DeckPanel } from './CollectionViews.js'
import { Icon } from './GameIcons.js'
import { GameNotice } from './GameNotice.js'

/** Native modal focus containment also makes the preserved world inert. */
export function GameOverlay({ children, label, className = '', onClose, fallbackFocus }: {
  children: ReactNode; label: string; className?: string; onClose: () => void
  /** UI-1: where focus goes on close when the opener no longer exists (e.g. its group was emptied). */
  fallbackFocus?: () => HTMLElement | null | undefined
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const fallback = useRef(fallbackFocus)
  fallback.current = fallbackFocus
  useEffect(() => {
    const previous = document.activeElement
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true })
      // Only overlays that declare a fallback use it (opener removed or now disabled); others behave as before.
      if (fallback.current && document.activeElement !== previous) fallback.current()?.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={dialog} className={`game-overlay ${className}`} aria-label={label} onCancel={(event) => {
    // React propagates the synthetic cancel through nested dialogs (UI-1 windows): only the dialog that received it closes.
    if (event.target !== event.currentTarget) return
    event.preventDefault(); onClose()
  }}>
    {children}
  </dialog>
}

export function CollectionOverlay({ session, cardTypes, onClose, onChangeDeck, onReinvoke, onReinvokeAll, notice, noticeRevision, noticeExpiresAt, onClearNotice }: {
  session: GameSession; onClose: () => void; onChangeDeck: (id: string, included: boolean) => void; onReinvoke: (id: string) => void
  /** V0.4B only (UI-1); the legacy grimoire never offers it. */
  onReinvokeAll?: () => void
  cardTypes?: readonly CreatureCard[]
  notice: string; noticeRevision: number; noticeExpiresAt?: number; onClearNotice?: () => void
}) {
  return <GameOverlay label="Colección y baraja" className="collection-overlay" onClose={onClose}>
    <header className="overlay-heading"><div><p className="section-kicker">El grimorio del invocador</p><h1><Icon name="cards" />Tus invocaciones</h1></div><div className="collection-max-life"><Icon name="heart" /><strong>{session.invokerLife}/{session.invokerMaxLife}</strong><span>vida del invocador</span></div><button type="button" className="overlay-close" onClick={onClose} aria-label="Cerrar colección"><span aria-hidden="true">×</span><kbd>Esc / I</kbd></button></header>
    <div className="collection-workspace"><CollectionView session={session} cardTypes={cardTypes} onChangeDeck={onChangeDeck} onReinvoke={onReinvoke} onReinvokeAll={onReinvokeAll} /><DeckPanel session={session} cardTypes={cardTypes} onChangeDeck={onChangeDeck} /></div>
    <GameNotice message={notice} revision={noticeRevision} expiresAt={noticeExpiresAt} onClear={onClearNotice} />
  </GameOverlay>
}
