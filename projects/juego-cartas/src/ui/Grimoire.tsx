import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, RefObject } from 'react'
import type { CreatureCard, GameSession } from '../engine/index.js'
import { discoveredCardIds, REINVOKE_ALL_MIN_MAX_LIFE, reinvokeAllStatus } from '../engine/index.js'
import { CardStats, PendingAbilities, RarityLabel } from './CardViews.js'
import { GameOverlay } from './CollectionOverlay.js'
import { CreaturePortrait, Icon } from './GameIcons.js'
import {
  activeFilterCount, deckGroups, directCopyChoice, filterLabel, isWoundedCopy, lostGroups, MANA_FILTERS, matchesFilters, NO_FILTERS,
  reserveGroups, SACRIFICE_FILTERS, toggleFilter, woundedLabel,
} from './grimoireModel.js'
import type { CopyGroup, GrimoireFilters } from './grimoireModel.js'

/** UI-1 V0.4B grimoire. */

export type GrimoireTab = 'collection' | 'reinvoke'
type ChangeDeck = (copyId: string, included: boolean) => void
type Choice = { group: CopyGroup; action: 'add' | 'remove' }

/**
 * After a group shrinks or disappears the focused control may vanish (focus would fall to <body>):
 * move it to the control now at the same position, or to a stable fallback.
 */
function useFocusRescue(container: RefObject<HTMLElement | null>, selector: string, fallback: RefObject<HTMLElement | null>, waiting: boolean) {
  const pending = useRef<number | null>(null)
  useEffect(() => {
    if (pending.current === null || waiting) return
    const index = pending.current
    pending.current = null
    const active = document.activeElement
    if (active && active !== document.body && active.isConnected) return
    const candidates = [...(container.current?.querySelectorAll<HTMLElement>(selector) ?? [])].filter((element) => !element.hasAttribute('disabled'))
    ;(candidates[Math.min(index, candidates.length - 1)] ?? fallback.current)?.focus({ preventScroll: true })
  })
  return (element: HTMLElement) => {
    const all = [...(container.current?.querySelectorAll<HTMLElement>(selector) ?? [])]
    pending.current = Math.max(0, all.indexOf(element))
  }
}

/** Mini window to pick which identity moves when the group has wounded copies (health visible). */
export function CopyChooser({ group, action, onChoose, onClose, fallbackFocus }: Choice & {
  onChoose: (copyId: string) => void; onClose: () => void; fallbackFocus?: () => HTMLElement | null | undefined
}) {
  const verb = action === 'add' ? 'Añadir' : 'Retirar'
  const name = group.type.name
  return <GameOverlay label={`${verb} una copia de ${name}`} className="grimoire-dialog copy-chooser" onClose={onClose} fallbackFocus={fallbackFocus}>
    <header className="grimoire-dialog-heading"><CreaturePortrait cardId={group.type.id} /><div><p className="section-kicker">{action === 'add' ? 'Añadir a la baraja' : 'Retirar de la baraja'}</p><h2>¿Qué copia de {name}?</h2></div></header>
    <p className="grimoire-dialog-help">{action === 'add' ? 'Las heridas se conservan en la baraja.' : 'La copia retirada vuelve a la Colección con su vida actual.'}</p>
    <ul className="copy-choice-list">
      {group.copies.map((copy) => {
        const wounded = isWoundedCopy(group.type, copy)
        const max = group.type.maxHealth + copy.bonusHealth
        return <li key={copy.id}><button type="button" className={`copy-choice${wounded ? ' is-wounded' : ''}`} onClick={() => onChoose(copy.id)}
          aria-label={`${verb} ${name} ${copy.id} (${copy.health}/${max} VID, ${wounded ? 'herida' : 'sana'})`}>
          <span className="copy-choice-id">{copy.id}</span>
          <span className="copy-choice-health"><Icon name="heart" />{copy.health}<small>/{max} VID</small></span>
          <span className="copy-choice-state">{wounded ? 'Herida' : 'Sana'}</span>
        </button></li>
      })}
    </ul>
    <footer className="grimoire-dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancelar <kbd>Esc</kbd></button></footer>
  </GameOverlay>
}

/** Confirmation with the total cost in max life and the resulting maximum. */
export function ReinvokeAllConfirm({ session, cardTypes, onConfirm, onClose, filtered, fallbackFocus }: {
  session: GameSession; cardTypes: readonly CreatureCard[]; onConfirm: () => void; onClose: () => void; filtered: boolean; fallbackFocus?: () => HTMLElement | null | undefined
}) {
  const status = reinvokeAllStatus(session, cardTypes)
  const groups = lostGroups(session, cardTypes)
  return <GameOverlay label="Confirmar reinvocar todas" className="grimoire-dialog reinvoke-all-confirm" onClose={onClose} fallbackFocus={fallbackFocus}>
    <header className="grimoire-dialog-heading"><span className="grimoire-dialog-seal"><Icon name="heart" /></span><div><p className="section-kicker">Reinvocar todas</p><h2>¿Reinvocar {status.cardIds.length} {status.cardIds.length === 1 ? 'copia perdida' : 'copias perdidas'}?</h2></div></header>
    <ul className="reinvoke-all-list">
      {groups.map((group) => <li key={group.type.id}><span>{group.type.name} <b>×{group.count}</b></span><span>{group.status.cost === 0 ? 'Gratis' : `${group.status.cost * group.count} vida máx.`}</span></li>)}
    </ul>
    <dl className="reinvoke-all-summary">
      <div><dt>Coste total</dt><dd>{status.cost === 0 ? 'Gratis' : `${status.cost} de vida máxima`}</dd></div>
      <div><dt>Vida máxima</dt><dd>{session.invokerMaxLife} → <strong>{status.resultingMaxLife}</strong></dd></div>
    </dl>
    <p className="grimoire-dialog-help">Las semillas se reinvocan gratis. Las copias vuelven sanas a la reserva (Colección).{filtered ? ' Incluye todas las copias perdidas, también las ocultas por los filtros.' : ''}</p>
    {!status.allowed && <p className="grimoire-reason" role="note">{status.reason}</p>}
    <footer className="grimoire-dialog-actions">
      <button type="button" className="button button-secondary" onClick={onClose}>Cancelar <kbd>Esc</kbd></button>
      <button type="button" className="button button-primary" disabled={!status.allowed} onClick={onConfirm}>Confirmar{status.cost > 0 ? ` · −${status.cost} vida máx.` : ''}</button>
    </footer>
  </GameOverlay>
}

export function V04BDeckPanel({ session, cardTypes, onChangeDeck }: { session: GameSession; cardTypes: readonly CreatureCard[]; onChangeDeck: ChangeDeck }) {
  const [choice, setChoice] = useState<Choice | null>(null)
  const list = useRef<HTMLUListElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const markForRescue = useFocusRescue(list, '.remove-card', heading, choice !== null)
  const groups = deckGroups(session, cardTypes)
  const locked = session.activeDuelId !== null
  function retire(group: CopyGroup, button: HTMLElement) {
    markForRescue(button)
    const direct = directCopyChoice(group, 'remove')
    if (direct) onChangeDeck(direct, false)
    else setChoice({ group, action: 'remove' })
  }
  return <section className="deck-panel stone-panel grimoire-deck" aria-labelledby="deck-title">
    <header className="panel-heading"><div><p className="section-kicker">Elegidas para el duelo</p><h2 id="deck-title" ref={heading} tabIndex={-1}>Baraja activa <span>{session.activeDeckCopyIds.length}</span></h2></div><Icon name="cards" /></header>
    <p className="subtle">El robo es aleatorio. Retira copias con ×.</p>
    <ul className="deck-list" ref={list}>
      {groups.map((group) => <li key={group.type.id} className={group.wounded ? 'is-wounded' : ''} data-card-id={group.type.id}>
        <CreaturePortrait cardId={group.type.id} />
        <div><strong>{group.type.name}{group.copies.length > 1 && <span className="group-count">×{group.copies.length}</span>}</strong>
          <span>{group.type.attack} ATQ · {group.type.maxHealth} VID{group.wounded ? ` · ${woundedLabel(group.wounded)}` : ''}</span></div>
        <button className="remove-card" type="button" disabled={locked} onClick={(event) => retire(group, event.currentTarget)} aria-haspopup={group.wounded ? 'dialog' : undefined}
          aria-label={group.wounded ? `Retirar una copia de ${group.type.name} de la baraja (elegir copia; ${woundedLabel(group.wounded)})` : `Retirar una copia de ${group.type.name} de la baraja`}>×</button>
      </li>)}
    </ul>
    {groups.length === 0 && <p className="empty-state">Baraja vacía. Añade copias desde Colección.</p>}
    <p className="deck-note"><Icon name="heart" />Las heridas se conservan entre duelos.</p>
    {choice && <CopyChooser {...choice} fallbackFocus={() => heading.current} onClose={() => setChoice(null)} onChoose={(copyId) => { setChoice(null); onChangeDeck(copyId, false) }} />}
  </section>
}

export function V04BGrimoire({ session, cardTypes, onChangeDeck, onReinvoke, onReinvokeAll, initialTab = 'collection', initialFilters = NO_FILTERS, initialFiltersOpen = false }: {
  session: GameSession; cardTypes: readonly CreatureCard[]; onChangeDeck: ChangeDeck; onReinvoke: (cardId: string) => void; onReinvokeAll?: () => void
  initialTab?: GrimoireTab; initialFilters?: GrimoireFilters; initialFiltersOpen?: boolean
}) {
  const [tab, setTab] = useState<GrimoireTab>(initialTab)
  const [filters, setFilters] = useState<GrimoireFilters>(initialFilters)
  const [filtersOpen, setFiltersOpen] = useState(initialFiltersOpen)
  const [choice, setChoice] = useState<Choice | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const collectionTab = useRef<HTMLButtonElement>(null)
  const reinvokeTab = useRef<HTMLButtonElement>(null)
  const filterButton = useRef<HTMLButtonElement>(null)
  const activeTab = tab === 'collection' ? collectionTab : reinvokeTab
  const markForRescue = useFocusRescue(panel, '[data-rescue]', activeTab, choice !== null || confirmAll)
  const locked = session.activeDuelId !== null
  const reserve = reserveGroups(session, cardTypes)
  const lost = lostGroups(session, cardTypes)
  const visibleReserve = reserve.filter((group) => matchesFilters(group.type, filters))
  const visibleLost = lost.filter((group) => matchesFilters(group.type, filters))
  const reserveCount = reserve.reduce((total, group) => total + group.copies.length, 0)
  const lostCount = lost.reduce((total, group) => total + group.count, 0)
  const all = reinvokeAllStatus(session, cardTypes)
  const filterCount = activeFilterCount(filters)

  function add(group: CopyGroup, tile: HTMLElement) {
    markForRescue(tile)
    const direct = directCopyChoice(group, 'add')
    if (direct) onChangeDeck(direct, true)
    else setChoice({ group, action: 'add' })
  }
  function closeFilters(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !filtersOpen) return
    // Closes only the dropdown: the keydown is consumed so the collection dialog stays open.
    event.preventDefault()
    event.stopPropagation()
    setFiltersOpen(false)
    filterButton.current?.focus()
  }
  const chips = [...filters.mana.map((value) => ({ category: 'mana' as const, value })), ...filters.sacrifices.map((value) => ({ category: 'sacrifices' as const, value }))]

  return <section className="collection-view grimoire stone-panel" aria-labelledby="collection-title">
    <h2 id="collection-title" className="sr-only">Colección</h2>
    <nav className="grimoire-bar" aria-label="Secciones del grimorio" onKeyDown={closeFilters}>
      <button type="button" ref={collectionTab} className="grimoire-tab" aria-pressed={tab === 'collection'} aria-controls="grimoire-panel" onClick={() => { setTab('collection'); setFiltersOpen(false) }}>
        <Icon name="cards" />Colección <span className="tab-count" aria-label={`${reserveCount} copias en reserva`}>{reserveCount}</span></button>
      <button type="button" ref={reinvokeTab} className="grimoire-tab" aria-pressed={tab === 'reinvoke'} aria-controls="grimoire-panel" onClick={() => { setTab('reinvoke'); setFiltersOpen(false) }}>
        <Icon name="heart" />Reinvocar <span className="tab-count" aria-label={`${lostCount} copias perdidas`}>{lostCount}</span></button>
      <div className="grimoire-filter-menu">
        <button type="button" ref={filterButton} className={`grimoire-tab grimoire-filter-toggle${filterCount ? ' has-filters' : ''}`} aria-expanded={filtersOpen} aria-controls="grimoire-filters"
          aria-label={filterCount ? `Filtros (${filterCount} activos)` : 'Filtros'} onClick={() => setFiltersOpen(!filtersOpen)}>
          Filtros{filterCount > 0 && <span className="tab-count">{filterCount}</span>}<span aria-hidden="true" className="grimoire-caret">▾</span></button>
        {filtersOpen && <div className="grimoire-filters" id="grimoire-filters" role="group" aria-label="Filtros de Colección y Reinvocar">
          <fieldset><legend><Icon name="mana" />Coste de maná</legend>{MANA_FILTERS.map((value) => <button type="button" key={value} className="filter-chip" aria-pressed={filters.mana.includes(value)} aria-label={`Filtrar por ${filterLabel('mana', value)}`} onClick={() => setFilters(toggleFilter(filters, 'mana', value))}>{value}</button>)}</fieldset>
          <fieldset><legend><Icon name="skull" />Sacrificios</legend>{SACRIFICE_FILTERS.map((value) => <button type="button" key={value} className="filter-chip" aria-pressed={filters.sacrifices.includes(value)} aria-label={`Filtrar por ${filterLabel('sacrifices', value)}`} onClick={() => setFilters(toggleFilter(filters, 'sacrifices', value))}>{value}</button>)}</fieldset>
          <p>Dentro de cada grupo basta una opción; entre grupos se cumplen ambas.</p>
          <button type="button" className="button button-secondary grimoire-clear" disabled={filterCount === 0} onClick={() => setFilters(NO_FILTERS)}>Limpiar filtros</button>
        </div>}
      </div>
      <span className="grimoire-types">{discoveredCardIds(session).length} tipos descubiertos</span>
    </nav>
    {chips.length > 0 && <div className="grimoire-active-filters" aria-label="Filtros activos">
      <span>Filtros activos:</span>
      {chips.map((chip) => <button type="button" key={`${chip.category}-${chip.value}`} className="active-filter" aria-label={`Quitar filtro ${filterLabel(chip.category, chip.value)}`}
        onClick={() => setFilters(toggleFilter(filters, chip.category, chip.value))}>{filterLabel(chip.category, chip.value)} <span aria-hidden="true">×</span></button>)}
      <button type="button" className="active-filter-clear" onClick={() => setFilters(NO_FILTERS)}>Limpiar filtros</button>
    </div>}
    <div id="grimoire-panel" ref={panel} className="grimoire-panel" aria-label={tab === 'collection' ? 'Colección: copias en reserva' : 'Reinvocar: copias perdidas'}>
      {tab === 'collection' ? <>
        <p className="collection-help">Copias que tienes fuera de la baraja. Pulsa una ficha para añadir una copia; si alguna está herida, eliges cuál. Habilidades disponibles: consulta la descripción de cada carta para sus efectos, objetivos y condiciones.</p>
        <div className="collection-grid">
          {visibleReserve.map((group) => <button type="button" key={group.type.id} data-rescue="" data-card-id={group.type.id} disabled={locked}
            className={`collection-card grimoire-card${group.wounded ? ' is-wounded' : ''}`} onClick={(event) => add(group, event.currentTarget)} aria-haspopup={group.wounded ? 'dialog' : undefined}
            aria-label={`Añadir ${group.type.name} a la baraja: ${group.copies.length} en reserva${group.wounded ? `, ${woundedLabel(group.wounded)}; elegir copia` : ''}`}>
            <CardTop type={group.type} count={group.copies.length} />
            <CreaturePortrait cardId={group.type.id} />
            <RarityLabel card={group.type} />
            <h3>{group.type.name}</h3>
            <PendingAbilities card={group.type} />
            <CardStats attack={group.type.attack} health={group.type.maxHealth} maxHealth={group.type.maxHealth} />
            <span className="ownership-state">{group.wounded ? `${woundedLabel(group.wounded)} · elige copia` : group.copies.length > 1 ? 'Copias sanas' : 'Copia sana'}</span>
            <span className="grimoire-card-action"><span aria-hidden="true">+</span> Añadir a baraja</span>
          </button>)}
        </div>
        {reserve.length === 0 && <p className="empty-state">No tienes copias fuera de la baraja.{lostCount ? ' Puedes recuperar las perdidas en Reinvocar.' : ''}</p>}
        {reserve.length > 0 && visibleReserve.length === 0 && <p className="empty-state">Ninguna copia en reserva coincide con los filtros.</p>}
      </> : <>
        <div className="reinvoke-all-bar">
          <div><strong>Vida máxima del invocador: {session.invokerMaxLife}</strong><span>Cada reinvocación cuesta vida máxima (mínimo 1); las semillas, gratis. Vuelven sanas a la reserva.</span></div>
          <div className="reinvoke-all-action">
            <button type="button" className="button button-primary" disabled={!all.allowed || !onReinvokeAll} aria-haspopup="dialog" onClick={() => setConfirmAll(true)}
              aria-describedby={all.allowed ? undefined : 'reinvoke-all-reason'}>Reinvocar todas{all.cardIds.length ? ` · ${all.cost === 0 ? 'gratis' : `−${all.cost} vida máx.`}` : ''}</button>
            {!all.allowed && <p id="reinvoke-all-reason" className="grimoire-reason">{all.reason}</p>}
            {all.allowed && <p className="grimoire-reason-ok">Máximo: {session.invokerMaxLife} → {all.resultingMaxLife} (umbral {REINVOKE_ALL_MIN_MAX_LIFE})</p>}
          </div>
        </div>
        <div className="collection-grid">
          {visibleLost.map((group) => <article key={group.type.id} data-card-id={group.type.id} className="collection-card grimoire-card is-lost">
            <CardTop type={group.type} count={group.count} countLabel="perdidas" />
            <CreaturePortrait cardId={group.type.id} />
            <RarityLabel card={group.type} />
            <h3>{group.type.name}</h3>
            <CardStats attack={group.type.attack} health={group.type.maxHealth} maxHealth={group.type.maxHealth} />
            <p className="recovery-cost">{group.status.cost === 0 ? 'Semilla: gratis' : `${group.status.cost} de vida máxima por copia`}<br />Máximo: {session.invokerMaxLife} → {group.status.resultingMaxLife}</p>
            <button type="button" data-rescue="" className="button button-primary" disabled={!group.status.allowed} onClick={(event) => { markForRescue(event.currentTarget); onReinvoke(group.type.id) }}
              aria-label={`Reinvocar una copia de ${group.type.name} (${group.status.cost === 0 ? 'gratis' : `${group.status.cost} de vida máxima`})`}>Reinvocar {group.status.cost === 0 ? 'gratis' : `· −${group.status.cost}`}</button>
            {group.status.reason && <p className="grimoire-reason">{group.status.reason}</p>}
          </article>)}
        </div>
        {lost.length === 0 && <p className="empty-state">No hay copias perdidas que recuperar.</p>}
        {lost.length > 0 && visibleLost.length === 0 && <p className="empty-state">Ninguna copia perdida coincide con los filtros.</p>}
      </>}
    </div>
    <footer className="collection-footnote"><Icon name="skull" />Morir o sacrificarse elimina la copia; su cupo se conserva y recuperarla cuesta vida máxima (las semillas, gratis).</footer>
    {choice && <CopyChooser {...choice} fallbackFocus={() => activeTab.current} onClose={() => setChoice(null)} onChoose={(copyId) => { setChoice(null); onChangeDeck(copyId, true) }} />}
    {confirmAll && onReinvokeAll && <ReinvokeAllConfirm session={session} cardTypes={cardTypes} filtered={filterCount > 0} fallbackFocus={() => reinvokeTab.current} onClose={() => setConfirmAll(false)} onConfirm={() => { setConfirmAll(false); onReinvokeAll() }} />}
  </section>
}

function CardTop({ type, count, countLabel }: { type: CreatureCard; count: number; countLabel?: string }) {
  return <span className="collection-card-top"><span><Icon name="mana" />{type.cost.mana} maná</span>{type.cost.sacrifices > 0 && <span className="sacrifice-cost-inline"><Icon name="skull" />{type.cost.sacrifices} sacrificio{type.cost.sacrifices > 1 ? 's' : ''}</span>}
    <span className="group-count" title={countLabel ? `${count} ${countLabel}` : `${count} en reserva`}>×{count}{countLabel ? <small> {countLabel}</small> : null}</span></span>
}
