import { Icon } from './GameIcons.js'

export function ExplorationHUD({ life, maxLife, mana, fatigue, level, roomName, complete, onCollection }: {
  life: number; maxLife: number; mana: number; fatigue: number; level: number
  roomName: string; complete: boolean; onCollection: () => void
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
    <div className="exploration-location"><Icon name={complete ? 'check' : 'gate'} /><div><span>{complete ? 'Demo completada' : 'La cripta'}</span><strong>{roomName}</strong></div></div>
    <button className="collection-launcher" type="button" onClick={onCollection} aria-haspopup="dialog" aria-keyshortcuts="i"><span><Icon name="cards" /></span><strong>Colección</strong><kbd>I</kbd></button>
  </div>
}
