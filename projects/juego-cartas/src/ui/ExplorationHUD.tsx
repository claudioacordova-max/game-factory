import { orbStatus } from '../engine/index.js'
import type { GameSession } from '../engine/index.js'
import { Icon } from './GameIcons.js'

/** Restoration orb control. */
export interface OrbControl { charged: boolean; canActivate: boolean; reason: string; onActivate: () => void }

/** Undefined when the session has no orb. */
export function orbControlFor(session: GameSession, onActivate: () => void): OrbControl | undefined {
  const status = orbStatus(session)
  return session.collectionProfile === 'v04b' && status.present ? { charged: status.charged, canActivate: status.canActivate, reason: status.reason, onActivate } : undefined
}

/**
 * UI-1 orb focus fix. A pointer press on the orb must not take focus from the avatar viewport: with the
 * native `disabled` attribute, a second click on the spent orb moved focus to <body> and WASD/E stopped
 * until the scene was clicked. The orb is therefore aria-disabled (still announced as unavailable, with its
 * reason) and its mousedown default is prevented; keyboard activation still resumes exploration afterwards.
 */
export function keepAvatarFocus(event: { preventDefault: () => void }): void { event.preventDefault() }
export function activateOrbControl(orb: OrbControl): boolean {
  if (!orb.canActivate) return false
  orb.onActivate()
  return true
}

/** zoneName defaults to the «La cripta» heading. */
export function ExplorationHUD({ life, maxLife, mana, fatigue, level, roomName, zoneName, complete, onCollection, orb }: {
  life: number; maxLife: number; mana: number; fatigue: number; level: number
  roomName: string; zoneName?: string; complete: boolean; onCollection: () => void; orb?: OrbControl
}) {
  return <div className="exploration-hud">
    <section className="explorer-vitals" aria-label="Recursos del invocador">
      <div className="explorer-sigil"><Icon name="shield" /><span aria-label={`Nivel ${level}`}>{level}</span></div>
      <div className="explorer-health">
        <div><span>Invocador</span><strong><Icon name="heart" />{life}<small>/{maxLife}</small></strong></div>
        <div className="explorer-health-track" role="meter" aria-label="Vida" aria-valuemin={0} aria-valuemax={maxLife} aria-valuenow={life}><span style={{ width: `${Math.max(0, Math.min(100, life / maxLife * 100))}%` }} /></div>
        <div className="explorer-secondary"><span title="Maná utilizable"><Icon name="mana" />{mana}<small>maná</small></span><span title="Fatiga: bloquea maná utilizable"><Icon name="skull" />{fatigue}<small>fatiga</small></span></div>
      </div>
    </section>
    <div className="exploration-location"><Icon name={complete ? 'check' : 'gate'} /><div><span>{complete ? 'Demo completada' : zoneName ?? 'La cripta'}</span><strong>{roomName}</strong></div></div>
    {orb && <button className={`orb-launcher ${orb.charged ? 'charged' : 'empty'}`} type="button" aria-disabled={orb.canActivate ? undefined : true}
      onMouseDown={keepAvatarFocus} onClick={() => activateOrbControl(orb)}
      aria-label={orb.canActivate ? 'Activar orbe de restauración (cargado)' : `Orbe de restauración: ${orb.reason}`}>
      <span><Icon name="orb" /></span><div><strong>Orbe</strong><small>{orb.charged ? 'Cargado' : 'Vacío'}{orb.charged && orb.reason && !orb.canActivate ?` · ${orb.reason}` : ''}</small></div></button>}
    <button className="collection-launcher" type="button" onClick={onCollection} aria-haspopup="dialog" aria-keyshortcuts="i"><span><Icon name="cards" /></span><strong>Colección</strong><kbd>I</kbd></button>
  </div>
}
