import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { CreatureCard, DuelState, GameSession } from '../engine/index.js'
import { baseMana, cardInstanceId, findHandCard, isDeckExhausted, n01ActivationAvailability, nextEchoSize, r01ActivationAvailability, sacrificeCandidates, surrenderAvailability } from '../engine/index.js'
import { CreatureTile, HandCard, N01ActivationButton, R01ActivationButton } from './CardViews.js'
import type { CardGrip } from './CardViews.js'
import { GameOverlay } from './CollectionOverlay.js'
import { GameNotice } from './GameNotice.js'
import { Icon } from './GameIcons.js'
import { attacksReady } from './encounterSummary.js'
import { BoardConnections } from './BoardConnections.js'
import { combatBoardLinks } from './boardLinks.js'
import { combatLayout, COMBAT_CARD_WIDTH } from './combatLayout.js'
import { activateOnce, preventRepeatedActivationKey } from './activation.js'
import { gestureFrame, gestureFrameChanged, gestureKindFor, gestureTarget, isGestureCancel, moveGesture, regionAt, resolveGesture, startGesture } from './combatGesture.js'
import type { Gesture, GestureCandidate, GestureDrop, GestureKind, GesturePoint, GestureRegion } from './combatGesture.js'
import type { CombatPending, PendingSummon } from './combatActions.js'

export interface CombatViewProps {
  duel: DuelState
  session: GameSession
  enemyName: string
  enemyMaxLife: number
  notice: string
  noticeRevision: number
  noticeExpiresAt?: number
  onClearNotice?: () => void
  selectedCardId: string | null
  sacrificeIds: string[]
  attackerIds: string[]
  targetChoices: Record<string, string>
  blockerChoices: Record<string, string[]>
  onSelectCard: (card: CreatureCard) => void
  onActivateR01?: (creatureId: string) => void
  pending?: CombatPending | null
  onActivateN01?: (creatureId: string) => void
  onChooseEffectTarget?: (creatureId: string) => void
  onConfirmRitual?: () => void
  onEditRitual?: () => void
  onSurrender?: () => void
  /** UI-2: a hand card released over your half (instance reference). */
  onDropHandCard: (cardId: string) => void
  onToggleSacrifice: (id: string) => void
  onSelectAttacker: (id: string) => void
  onCancelSummon: () => void
  onBeginCombat: () => void
  onDeclareAttacks: () => void
  onConfirmBlocks: () => void
  /** Called when a creature gesture crosses the drag threshold; false abandons the gesture. */
  onStartRelationDrag: (creatureId: string) => boolean
  onCancelRelationDrag: () => void
  onDropRelation: (drop: GestureDrop) => void
  presenting?: boolean
  onMoveBlocker: (id: string, direction: -1 | 1) => void
  onMoveAttacker: (id: string, direction: -1 | 1) => void
}

export function RitualConfirmation({ duel, pending, onConfirm, onEdit, onCancel }: {
  duel: DuelState; pending: PendingSummon; onConfirm: () => void; onEdit: () => void; onCancel: () => void
}) {
  const materials = pending.snapshot ?? []
  const x = materials.reduce((sum, unit) => sum + unit.health, 0)
  return <GameOverlay label="Confirmar ritual H04" className="ritual-confirmation" onClose={onCancel}>
    <p className="section-kicker">Ídolo de la Sombra · H04</p><h2>Confirmar ritual</h2>
    <p>Estos tres materiales se perderán de forma irreversible:</p>
    <ul>{materials.map((material) => <li key={material.id}><strong>{duel.players.player.creatures.find((unit) => unit.id === material.id)?.card.name}</strong><span>{material.copyId ?? material.id} · salud actual {material.health}</span></li>)}</ul>
    <p className="ritual-result">X = {x} · Resultado: <strong>{x}/{1 + x}</strong> ATQ/VID</p>
    <p>El bono dura este combate. Si sobrevive, vuelve a 0/1 con salud 1. Los materiales no regresan.</p>
    <div className="ritual-actions"><button type="button" onClick={(event) => activateOnce(event, onEdit)} onKeyDown={preventRepeatedActivationKey}>Editar materiales</button><button type="button" onClick={onCancel}>Cancelar ritual <kbd>Esc</kbd></button><button type="button" className="button button-primary" onClick={(event) => activateOnce(event, onConfirm)} onKeyDown={preventRepeatedActivationKey}>Confirmar ritual</button></div>
  </GameOverlay>
}

export function SurrenderConfirmation({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return <GameOverlay label="Confirmar rendición" className="surrender-confirmation" onClose={onCancel}>
    <p className="section-kicker">Rendirse</p><h2>¿Rendirte en este combate?</h2>
    <p>Cuenta como una derrota normal: ganas 1 de fatiga (máximo 1), conservas las heridas y bajas ya sufridas, y vuelves a la exploración. Puedes reintentar el encuentro.</p>
    <div className="ritual-actions"><button type="button" onClick={onCancel}>Seguir luchando <kbd>Esc</kbd></button><button type="button" className="button button-primary surrender-confirm" onClick={(event) => activateOnce(event, onConfirm)} onKeyDown={preventRepeatedActivationKey}>Confirmar rendición</button></div>
  </GameOverlay>
}

function InvokerIdentity({ name, life, maxLife, enemy = false }: { name: string; life: number; maxLife: number; enemy?: boolean }) {
  return <section className={`combat-invoker ${enemy ? 'enemy-invoker' : 'own-invoker'}`} aria-label={enemy ? 'Invocador enemigo' : 'Tu invocador'}>
    <span className="invoker-sigil"><Icon name={enemy ? 'skull' : 'shield'} /></span>
    <div><h2>{name}</h2><div className="invoker-life" aria-label={`Vida ${enemy ? 'enemiga' : 'propia'} ${Math.max(0, life)} de ${maxLife}`}><Icon name="heart" /><strong>{Math.max(0, life)}<small>/{maxLife}</small></strong></div></div>
  </section>
}


/** UI-2 fit: the table is laid out at a logical size and scaled down so the board never scrolls. */
interface BoardFit { scale: number; width: number; height: number; rowStep: number; rowsTop: number; slot: number }
const MIN_ROW_GAP = 40
const TABLE_PAD = 6
interface DragView { kind: GestureKind; sourceId: string; region: GestureRegion; targetId: string | null; line: { x1: number; y1: number; x2: number; y2: number } }
const pointOf = (event: { clientX: number; clientY: number }): GesturePoint => ({ x: event.clientX, y: event.clientY })
const centerOf = (rect: DOMRect): GesturePoint => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })

export function CombatView(props: CombatViewProps) {
  const { duel, session, enemyName, enemyMaxLife, selectedCardId, sacrificeIds, attackerIds, targetChoices, blockerChoices } = props
  const player = duel.players.player, enemy = duel.players.opponent
  const main = !props.presenting && duel.phase === 'main' && duel.activePlayer === 'player'
  const attack = !props.presenting && duel.phase === 'attackers' && duel.activePlayer === 'player'
  const defense = !props.presenting && duel.phase === 'blockers' && duel.activePlayer === 'opponent'
  const directed = duel.mode === 'skirmish' && attack
  const selectedCard = selectedCardId ? findHandCard(player.hand, selectedCardId, duel.collectionProfile === 'legacy') : undefined
  const pending = props.pending ?? null
  const choosingSacrifice = main && Boolean(selectedCard?.cost.sacrifices) && (!pending || pending.kind === 'summon' && pending.stage !== 'target')
  const choosingEffect = main && Boolean(pending?.targetIds)
  const healingChoice = pending?.kind === 'healing' || pending?.kind === 'summon' && selectedCard?.id === 'H03' && pending.stage === 'target'
  const effectTargets = choosingEffect ? pending?.targetIds ?? [] : []
  const interactionPending = Boolean(pending || selectedCardId)
  const healingSource = pending?.kind === 'healing' ? player.creatures.find((unit) => unit.id === pending.sourceId) : undefined
  const effectPrompt = pending?.kind === 'healing' ? `Sanación obligatoria · ${healingSource?.card.name} ${healingSource?.copyId ?? healingSource?.id} · ${(duel.mainHealing?.index ?? 0) + 1}/${duel.mainHealing?.sourceIds.length ?? 0}. Elige otra aliada herida: sana hasta 2.`
    : healingChoice ? 'Elige una aliada herida: sana 1 y roba 1 si sana.' : pending?.kind === 'destroy' ? 'Elige una criatura enemiga. La Urna se sacrifica al elegir; destruye e ignora escudos.' : 'Elige una criatura enemiga: recibe 1 de daño al entrar.'
  const board = useRef<HTMLDivElement>(null)
  const tableScroll = useRef<HTMLDivElement>(null)
  const handRow = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState<BoardFit>({ scale: 1, width: 0, height: 0, rowStep: 206, rowsTop: 0, slot: 166 })
  const [fitted, setFitted] = useState(false)
  const [handOverlap, setHandOverlap] = useState(0)
  const [drag, setDrag] = useState<DragView | null>(null)
  const [confirmingSurrender, setConfirmingSurrender] = useState(false)
  const gesture = useRef<Gesture | null>(null)
  const capture = useRef<HTMLElement | null>(null)
  const suppressClick = useRef(false)
  const canSurrender = !props.presenting && !interactionPending && surrenderAvailability(duel).allowed
  const exhausted = isDeckExhausted(duel)
  const choiceKey = pending ? `${pending.kind}:${pending.kind === 'summon' ? pending.cardId : pending.sourceId}:${pending.kind === 'summon' ? pending.stage : ''}` : ''
  useEffect(() => {
    if (!pending || pending.kind === 'summon' && pending.stage === 'confirm') return
    const ids = pending.targetIds ?? (pending.kind === 'summon' ? pending.sacrificeIds : [])
    const slot = Array.from(board.current?.querySelectorAll<HTMLElement>('[data-creature-id]') ?? []).find((element) => ids.includes(element.dataset.creatureId ?? ''))
    slot?.querySelector<HTMLButtonElement>('button.creature-tile')?.focus({ preventScroll: true })
  }, [choiceKey])
  const visualAttackers = props.presenting ? duel.attackers : attackerIds
  const visualTargets = props.presenting ? duel.targets : targetChoices
  const visualBlocks = props.presenting ? duel.blockers : blockerChoices
  const layout = useMemo(() => combatLayout(duel, visualAttackers, visualTargets, visualBlocks), [duel, visualAttackers, visualTargets, visualBlocks])
  const links = useMemo(() => combatBoardLinks(duel, visualAttackers, visualTargets, visualBlocks), [duel, visualAttackers, visualTargets, visualBlocks])

  // Measured sizes (slot and axis heights, container size) never depend on the fit itself, so this converges.
  const measure = useRef(() => {})
  measure.current = () => {
    const scroll = tableScroll.current
    if (scroll && scroll.clientWidth > 0 && scroll.clientHeight > 0) {
      const W = scroll.clientWidth, H = scroll.clientHeight
      let slot = 0
      scroll.querySelectorAll<HTMLElement>('.combat-creature-slot').forEach((element) => { slot = Math.max(slot, element.offsetHeight) })
      if (!slot) slot = 96
      const axis = scroll.querySelector<HTMLElement>('.combat-axis p')
      const gap = Math.max(MIN_ROW_GAP, (axis?.offsetHeight ?? 0) + 14)
      const rows = layout.rowCount, minStep = slot + gap
      const scale = Math.min(1, W / (layout.width + 2 * TABLE_PAD), H / (minStep * (rows - 1) + slot + 2 * TABLE_PAD))
      const width = W / scale, height = H / scale
      const rowStep = Math.min(minStep + 90, Math.max(minStep, (height - 2 * TABLE_PAD - slot) / Math.max(1, rows - 1)))
      const rowsTop = (height - (rowStep * (rows - 1) + slot)) / 2
      const round = (value: number) => Math.round(value * 2) / 2
      const next: BoardFit = { scale: Math.floor(scale * 1000) / 1000, width: round(width), height: round(height), rowStep: round(rowStep), rowsTop: round(rowsTop), slot }
      setFit((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next)
    }
    const row = handRow.current
    if (row) {
      const cards = Array.from(row.querySelectorAll<HTMLElement>('.hand-card'))
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0
      const total = cards.reduce((sum, card) => sum + card.offsetWidth, 0) + Math.max(0, cards.length - 1) * gap + 8
      const overlap = cards.length > 1 ? Math.ceil(Math.max(0, total - row.clientWidth) / (cards.length - 1)) : 0
      setHandOverlap((current) => current === overlap ? current : overlap)
    }
  }
  useLayoutEffect(() => { measure.current() })
  useLayoutEffect(() => {
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure.current())
    if (tableScroll.current) observer?.observe(tableScroll.current)
    if (handRow.current) observer?.observe(handRow.current)
    const frame = requestAnimationFrame(() => setFitted(true))
    return () => { observer?.disconnect(); cancelAnimationFrame(frame) }
  }, [main])

  // Gestures: one pointer, captured by the pressed card; every exit path clears it.
  const cancelGesture = useRef(() => {})
  cancelGesture.current = () => {
    const current = gesture.current
    if (!current) return
    gesture.current = null
    const element = capture.current
    capture.current = null
    setDrag(null)
    try { if (element?.hasPointerCapture(current.pointerId)) element.releasePointerCapture(current.pointerId) } catch { /* pointer already gone */ }
    if (current.dragging && current.kind !== 'hand') props.onCancelRelationDrag()
  }
  useEffect(() => { setConfirmingSurrender(false); cancelGesture.current() }, [duel.id, duel.turn, duel.phase, duel.activePlayer, props.presenting])
  useEffect(() => {
    const cancel = (event: Event) => {
      if (!gesture.current || !isGestureCancel({ type: event.type, key: (event as KeyboardEvent).key })) return
      if (event.type === 'keydown') { event.preventDefault(); event.stopPropagation() }
      cancelGesture.current()
    }
    const hidden = () => { if (document.visibilityState === 'hidden') cancelGesture.current() }
    window.addEventListener('keydown', cancel, true)
    window.addEventListener('blur', cancel)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('keydown', cancel, true)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', hidden)
      cancelGesture.current()
    }
  }, [])

  function gestureBoard(point: GesturePoint, kind: GestureKind) {
    const scroll = tableScroll.current
    if (!scroll) return { region: 'outside' as GestureRegion, candidates: [] as GestureCandidate[] }
    const rect = scroll.getBoundingClientRect()
    const axis = scroll.querySelector('.combat-axis')?.getBoundingClientRect()
    const region = regionAt(point, rect, axis ? axis.top + axis.height / 2 : rect.top + rect.height / 2)
    const valid = kind === 'block' ? duel.attackers : kind === 'directed' ? enemy.creatures.filter((unit) => unit.health > 0).map((unit) => unit.id) : []
    const candidates = Array.from(scroll.querySelectorAll<HTMLElement>('.enemy-field [data-creature-id]')).flatMap((slot) => {
      const id = slot.dataset.creatureId ?? ''
      return valid.includes(id) ? [{ id, center: centerOf((slot.querySelector('.creature-tile') ?? slot).getBoundingClientRect()) }] : []
    })
    return { region, candidates }
  }
  function publishDrag(current: Gesture) {
    const root = board.current?.getBoundingClientRect(), source = capture.current?.getBoundingClientRect()
    if (!root || !source) return
    const { region, candidates } = gestureBoard(current.point, current.kind)
    const targetId = gestureTarget(current, region, candidates)
    const end = candidates.find((candidate) => candidate.id === targetId)?.center ?? current.point
    setDrag({ kind: current.kind, sourceId: current.sourceId, region, targetId,
      line: { x1: source.left + source.width / 2 - root.left, y1: source.top - root.top, x2: end.x - root.left, y2: end.y - root.top } })
  }
  function gripFor(kind: GestureKind | null, sourceId: string): CardGrip | undefined {
    if (!kind) return undefined
    return {
      onPointerDown: (event) => {
        if (event.button !== 0 || !event.isPrimary || gesture.current) return
        suppressClick.current = false
        gesture.current = startGesture(kind, sourceId, event.pointerId, pointOf(event), gestureFrame(duel))
        capture.current = event.currentTarget
        try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* unsupported pointer */ }
      },
      onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => {
        const current = gesture.current
        if (!current || event.pointerId !== current.pointerId) return
        const next = moveGesture(current, event.pointerId, pointOf(event))
        if (next.dragging && !current.dragging && next.kind !== 'hand' && !props.onStartRelationDrag(next.sourceId)) {
          cancelGesture.current()
          return
        }
        gesture.current = next
        if (next.dragging) publishDrag(next)
      },
      onPointerUp: (event) => {
        const current = gesture.current
        if (!current || event.pointerId !== current.pointerId) return
        const next = moveGesture(current, event.pointerId, pointOf(event))
        if (!next.dragging) { gesture.current = null; capture.current = null; return }
        if (gestureFrameChanged(next, gestureFrame(duel))) { cancelGesture.current(); return }
        const { region, candidates } = gestureBoard(next.point, next.kind)
        gesture.current = null
        capture.current = null
        setDrag(null)
        // The click that follows this pointerup belongs to the drag, not to the card.
        suppressClick.current = true
        setTimeout(() => { suppressClick.current = false }, 0)
        const drop = resolveGesture(next, region, candidates)
        if (next.kind === 'hand') { if (drop.type === 'summon') props.onDropHandCard(next.sourceId) }
        else props.onDropRelation(drop)
      },
      onPointerCancel: () => cancelGesture.current(),
      onLostPointerCapture: () => cancelGesture.current(),
    }
  }
  const creatureGesture = gestureKindFor(duel, { source: 'creature', presenting: props.presenting })
  const handGesture = gestureKindFor(duel, { source: 'hand', presenting: props.presenting, interactionPending })

  const phase = main ? 'Invocación' : attack ? 'Ataque' : defense ? 'Defensa' : 'Resolución'
  // Arm the timing before Confirmar changes geometry; CSS timing changes do not retime a running transition.
  const previewTransition = duel.mode === 'duel' && duel.activePlayer === 'player' && (attack || props.presenting)
  const decision = props.presenting ? 'Resolviendo combate' : choosingEffect ? pending?.kind === 'healing' ? 'Sanación obligatoria' : 'Elige un objetivo' : defense ? 'Te toca bloquear' : attack ? 'Declara tus ataques' : main ? 'Puedes invocar' : 'Resolviendo combate'
  const rowTop = (row: number) => fit.rowsTop + fit.rowStep * row
  const axisTop = rowTop(layout.enemyRow + 1) - (fit.rowStep - fit.slot) / 2
  const slotStyle = (id: string) => ({ width: COMBAT_CARD_WIDTH,
    left: `calc(50% + ${(layout.positions[id] ?? 0) - layout.width / 2}px)`,
    transform: `translateY(${rowTop(layout.rows[id] ?? 0)}px)` })
  const dragging = drag && drag.kind !== 'hand' ? drag.sourceId : null
  const ownZone = drag && drag.region === 'own' ? drag.kind === 'hand' ? 'Suelta para invocar' : 'Suelta para retirar' : null
  const rivalZone = drag?.kind === 'declare' && drag.region === 'rival' ? 'Suelta para atacar' : null
  const nextEcho = nextEchoSize(duel)
  return <div ref={board} className={`combat-view turn-${duel.activePlayer}${main ? ' has-hand' : ''}${layout.contextual ? ' has-contextual-layout' : ''}${previewTransition ? ' uses-preview-transition' : ''}${props.presenting ? ' is-presenting' : ''}${defense ? ' is-defending' : ''}${choosingSacrifice ? ' is-sacrificing' : ''}${choosingEffect ? ' is-choosing-effect' : ''}${drag ? ' is-gesturing' : ''}${dragging ? ' is-dragging-blocker' : ''}`}
    aria-busy={Boolean(props.presenting)} data-board-link-count={links.length} aria-label={duel.mode === 'skirmish' ? 'Tablero de escaramuza' : 'Tablero de duelo'}
    onDragStart={(event) => event.preventDefault()}
    onClickCapture={(event) => { if (suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation() } }}>
    <div className="combat-stonework" aria-hidden="true" />
    <div className="combat-topline"><div className="combat-turn"><span>Turno {duel.turn}</span><strong>{duel.activePlayer === 'player' ? 'Tu turno' : 'Turno enemigo'}<small>{phase}</small><span className="combat-decision">{decision}</span></strong></div>
      {enemy.kind === 'invoker' ? <InvokerIdentity enemy name={enemyName} life={enemy.life} maxLife={enemyMaxLife} /> : <section className="combat-group" aria-label="Grupo enemigo"><span className="section-kicker">Escaramuza</span><h2>{enemyName}</h2><span>{enemy.creatures.length} criaturas</span></section>}
      <div className="combat-phase-track" aria-label={`Fase actual: ${phase}`}>
        {(['Invocación', 'Ataque', 'Defensa', 'Resolución'] as const).map((label, index) => <span key={label} className={phase === label ? 'is-current' : ''} aria-current={phase === label ? 'step' : undefined}><Icon name={index === 0 ? 'cards' : index === 1 ? 'sword' : index === 2 ? 'shield' : 'check'} /><small>{label}</small></span>)}
      </div>
    </div>

    <div ref={tableScroll} className="combat-table-scroll" aria-label="Campos de combate">
    <div className={`combat-table${layout.contextual ? ' is-contextual' : ''}${fitted ? ' is-fitted' : ''}`} style={{ width: fit.width || '100%', height: fit.height || '100%', transform: `scale(${fit.scale})` }} data-fit-scale={fit.scale}>
      {layout.groups.map((group) => <div key={group.id} className="combat-layout-group" style={{ width: group.width, height: fit.rowStep + fit.slot + 12, transform: `translate(${group.left - layout.width / 2}px, ${rowTop(layout.enemyRow) - 6}px)` }} aria-hidden="true" />)}
      {rivalZone && <div className="combat-gesture-zone is-rival" style={{ height: axisTop }} aria-hidden="true"><span>{rivalZone}</span></div>}
      {ownZone && <div className="combat-gesture-zone is-own" style={{ top: axisTop }} aria-hidden="true"><span>{ownZone}</span></div>}
    <section className="combat-field enemy-field" aria-label="Mesa enemiga"><div className="combat-creature-row">
      {enemy.creatures.length ? enemy.creatures.map((unit) => {
        const targetedBy = visualAttackers.filter((id) => visualTargets[id] === unit.id).length
        const blockers = duel.activePlayer === 'opponent' ? visualBlocks[unit.id]?.length ?? 0 : 0
        const attacking = duel.activePlayer === 'opponent' && duel.attackers.includes(unit.id)
        const enemyBlock = duel.activePlayer === 'player' ? Object.entries(visualBlocks).find(([, ids]) => ids.includes(unit.id)) : undefined
        const hint = attacking ? blockers ? blockers + ' bloqueos asignados' : 'Atacando' : targetedBy ? 'Objetivo de ' + targetedBy + ' atacantes' : enemyBlock ? 'Bloquea a ' + player.creatures.find((own) => own.id === enemyBlock[0])?.card.name : directed ? 'Destino de ataque' : undefined
        const validTarget = directed || (defense && attacking)
        return <div className={`combat-creature-slot${attacking ? ' enemy-attacker' : ''}${dragging && validTarget ? ' is-valid-drop-target' : ''}${drag?.targetId === unit.id ? ' is-block-drop-target' : ''}`} style={slotStyle(unit.id)} key={unit.id} data-creature-id={unit.id}>
          <CreatureTile creature={unit} selected={targetedBy > 0 || blockers > 0 || Boolean(enemyBlock)} hint={choosingEffect && !healingChoice && effectTargets.includes(unit.id) ? 'Elegir objetivo' : hint}
            onClick={choosingEffect && !healingChoice && effectTargets.includes(unit.id) ? () => props.onChooseEffectTarget?.(unit.id) : undefined} />
        </div>
      }) : <p className="combat-empty" style={{ top: rowTop(0) + fit.slot / 2 }}><Icon name="shield" /><span>El campo enemigo está vacío</span></p>}
    </div></section>
    <div className="combat-axis" style={{ top: axisTop }}><span /><Icon name={choosingSacrifice ? 'skull' : defense ? 'shield' : 'sword'} /><p aria-live="polite">{choosingEffect ? effectPrompt : choosingSacrifice ? <><strong>{selectedCard!.name} · {sacrificeIds.length}/{selectedCard!.cost.sacrifices} sacrificios</strong><span>{selectedCard!.id === 'H04' && duel.collectionProfile === 'v04b' ? 'Solo reales. Tras elegir tres, revisa y confirma el ritual. Puedes desmarcar materiales.' : 'Al elegir la última criatura, se invoca y los sacrificios se pierden permanentemente.'}</span></> : props.presenting ? 'Ataques y bloqueos declarados' : defense ? 'Arrastra hacia un atacante · suelta en tu lado para retirar' : directed ? 'Arrastra hacia un objetivo · suelta en tu lado para retirar' : attack ? 'Elige o arrastra tus atacantes hacia el rival' : 'Campo de invocaciones'}</p><span /></div>
    <section className={`combat-field own-field${main ? ' accepts-card-drop' : ''}`} aria-label={main ? 'Tu mesa; arrastra una carta aquí para invocarla' : 'Tu mesa'}><div className="combat-creature-row">
      {player.creatures.length ? player.creatures.map((unit) => {
        const assignment = duel.activePlayer === 'opponent' ? Object.entries(visualBlocks).find(([, ids]) => ids.includes(unit.id)) : undefined
        const blockedName = assignment ? enemy.creatures.find((target) => target.id === assignment[0])?.card.name : undefined
        const targetName = visualTargets[unit.id] ? enemy.creatures.find((target) => target.id === visualTargets[unit.id])?.card.name : undefined
        const selected = defense ? Boolean(assignment) : choosingSacrifice ? sacrificeIds.includes(unit.id) : visualAttackers.includes(unit.id)
        const hint = props.presenting ? visualAttackers.includes(unit.id) ? 'Atacando' : undefined : defense ? assignment ? (assignment[1].indexOf(unit.id) + 1) + ' · Bloquea ' + blockedName : 'Arrastra para bloquear'
          : choosingSacrifice ? selected ? 'Sacrificio elegido' : 'Elegir sacrificio' : attack ? selected ? targetName ? 'Ataca a ' + targetName : 'Atacante elegido' : directed ? 'Arrastra para atacar' : 'Elegir atacante' : undefined
        const validMaterial = selectedCard && sacrificeCandidates(player, selectedCard).some((candidate) => candidate.id === unit.id)
        const onClick = choosingEffect && healingChoice && effectTargets.includes(unit.id) ? () => props.onChooseEffectTarget?.(unit.id)
          : choosingSacrifice && validMaterial ? () => props.onToggleSacrifice(unit.id) : attack && !directed ? () => props.onSelectAttacker(unit.id) : undefined
        const blockOrder = assignment?.[1].indexOf(unit.id) ?? -1
        const attackGroup = directed && targetChoices[unit.id] ? attackerIds.filter((id) => targetChoices[id] === targetChoices[unit.id]) : []
        const attackOrder = attackGroup.indexOf(unit.id)
        const available = layout.contextual && layout.availableOwn.includes(unit.id)
        return <div className={`combat-creature-slot${(defense && assignment) || attackOrder >= 0 ? ' has-block-controls' : ''}${available ? ' is-available' : ''}${dragging === unit.id ? ' is-blocker-dragging' : ''}`} style={slotStyle(unit.id)} key={unit.id} data-creature-id={unit.id} data-combat-row={layout.rows[unit.id]}>
          {attackOrder >= 0 && <span className="combat-field-order" aria-label={`Prioridad de represalia ${attackOrder + 1}`} title="Prioridad de recepción de la represalia">{attackOrder + 1}</span>}
          {assignment && <span className="combat-block-order" aria-label={`Orden de bloqueo ${blockOrder + 1}`}>{blockOrder + 1}</span>}
          <CreatureTile creature={unit} selected={selected} onClick={onClick} hint={choosingEffect && healingChoice && effectTargets.includes(unit.id) ? 'Elegir objetivo de cura' : hint} grip={gripFor(creatureGesture, unit.id)} />
          {main && r01ActivationAvailability(duel, unit.id).allowed && <R01ActivationButton creature={unit} disabled={interactionPending} onActivate={props.onActivateR01} />}
          {main && n01ActivationAvailability(duel, unit.id).allowed && <N01ActivationButton creature={unit} disabled={interactionPending} onActivate={props.onActivateN01} />}
          {defense && assignment && <div className="combat-block-tools" role="group" aria-label={`Bloqueo de ${unit.card.name}`}><button type="button" aria-label={`Adelantar en daño a ${unit.card.name}`} title="Recibir daño antes" disabled={blockOrder === 0} onClick={() => props.onMoveBlocker(unit.id, -1)}>↑</button><button type="button" aria-label={`Retrasar en daño a ${unit.card.name}`} title="Recibir daño después" disabled={blockOrder === assignment[1].length - 1} onClick={() => props.onMoveBlocker(unit.id, 1)}>↓</button></div>}
          {attackOrder >= 0 && <div className="combat-block-tools combat-attack-tools" role="group" aria-label={`Prioridad de ataque de ${unit.card.name}`}><button type="button" aria-label={`Adelantar en represalia a ${unit.card.name}`} title="Recibir represalia antes" disabled={attackOrder === 0} onClick={() => props.onMoveAttacker(unit.id, -1)}>↑</button><button type="button" aria-label={`Retrasar en represalia a ${unit.card.name}`} title="Recibir represalia después" disabled={attackOrder === attackGroup.length - 1} onClick={() => props.onMoveAttacker(unit.id, 1)}>↓</button></div>}
        </div>
      }) : <p className="combat-empty" style={{ top: rowTop(layout.rowCount - 1) + fit.slot / 2 }}><Icon name="cards" /><span>{main ? 'Arrastra tus invocaciones a este campo' : 'No tienes criaturas en el campo'}</span></p>}
    </div></section>
    </div></div>

    <div className="combat-controls">
      <section className="combat-own-resources" aria-label="Recursos propios"><div className="combat-mana" title={player.temporaryMana ? `${player.temporaryMana} de maná temporal incluido; expira al terminar la fase principal.` : undefined}><Icon name="mana" /><strong>{player.mana}<small>/{baseMana(player, duel.collectionProfile)}</small></strong><span>Maná{Boolean(player.temporaryMana) && <small> · {player.temporaryMana} temporal</small>}</span></div><div className="combat-fatigue"><Icon name="skull" /><span>Fatiga <strong>{session.fatigue}</strong></span></div>
        {!main && <div className="combat-hand-indicator" aria-label={`Mano ${player.hand.length} · Mazo ${player.deck.length}`}><Icon name="cards" /><span>Mano <strong>{player.hand.length}</strong> · Mazo <strong>{player.deck.length}</strong></span>{exhausted && <small className="deck-exhausted" role="status" title={`Tu próximo mantenimiento invoca un Eco de la cripta ${nextEcho}/${nextEcho} rival`}><strong>Mazo agotado</strong></small>}</div>}
      </section>
      <InvokerIdentity name="Tu invocador" life={player.life} maxLife={session.invokerMaxLife} />
      <div className="combat-action" aria-label="Acción contextual del combate">
        {main && (choosingSacrifice || pending && pending.kind !== 'healing') && <button type="button" className="combat-cancel" onClick={props.onCancelSummon}>{choosingSacrifice ? 'Cancelar sacrificio' : 'Cancelar selección'} <kbd>Esc</kbd></button>}
        {main && !interactionPending && <button type="button" className="button button-primary" onClick={(event) => activateOnce(event, props.onBeginCombat)} onKeyDown={preventRepeatedActivationKey}>Ir al ataque<Icon name="arrow" /></button>}
        {attack && <><span>{attackerIds.length} atacante{attackerIds.length === 1 ? '' : 's'} elegido{attackerIds.length === 1 ? '' : 's'}</span><button type="button" className="button button-primary" disabled={!attacksReady(duel, attackerIds, targetChoices)} onClick={(event) => activateOnce(event, props.onDeclareAttacks)} onKeyDown={preventRepeatedActivationKey}>{attackerIds.length ? 'Confirmar ataques' : 'Pasar sin atacar'}<Icon name="sword" /></button></>}
        {defense && <><span>{Object.values(blockerChoices).flat().length} bloqueadores elegidos</span><button type="button" className="button button-primary" onClick={(event) => activateOnce(event, props.onConfirmBlocks)} onKeyDown={preventRepeatedActivationKey}>Resolver bloqueos<Icon name="shield" /></button></>}
        {canSurrender && (main || attack) && <button type="button" className="combat-surrender" onClick={() => setConfirmingSurrender(true)}>Rendirse</button>}
      </div>
    </div>

    {main && <section className="combat-hand" aria-label="Tu mano"><div className="combat-hand-label"><Icon name="cards" /><span>Tu mano <strong>{player.hand.length}</strong></span>{exhausted ? <small className="deck-exhausted" role="status"><strong>Mazo agotado</strong> · tu próximo mantenimiento invoca un Eco de la cripta {nextEcho}/{nextEcho} rival</small> : <small>{player.deck.length} en mazo</small>}</div><div ref={handRow} className="combat-hand-row" style={{ '--hand-overlap': `${handOverlap}px` } as CSSProperties}>
      {player.hand.length ? player.hand.map((card) => <HandCard key={cardInstanceId(card)} card={card} selected={selectedCard === card} unavailableReason={interactionPending ? 'Resuelve la selección pendiente' : ''} grip={gripFor(handGesture, cardInstanceId(card))} onClick={() => props.onSelectCard(card)} />) : <p className="combat-empty"><Icon name="cards" /><span>{player.deck.length ? 'Robarás en tu próximo turno' : 'No quedan cartas en mano o mazo'}</span></p>}
    </div></section>}
    {confirmingSurrender && canSurrender && <SurrenderConfirmation onConfirm={() => { setConfirmingSurrender(false); props.onSurrender?.() }} onCancel={() => setConfirmingSurrender(false)} />}
    <BoardConnections boardRef={board} links={links} />
    {drag && <svg className="combat-gesture-guide" aria-hidden="true" focusable="false"><line className={drag.targetId || (drag.kind === 'hand' ? drag.region === 'own' : drag.region === 'rival') ? 'is-targeting' : 'is-withdrawing'} x1={drag.line.x1} y1={drag.line.y1} x2={drag.line.x2} y2={drag.line.y2} /><circle cx={drag.line.x2} cy={drag.line.y2} r="5" /></svg>}
    {main && pending?.kind === 'summon' && pending.stage === 'confirm' && <RitualConfirmation duel={duel} pending={pending} onConfirm={() => props.onConfirmRitual?.()} onEdit={() => props.onEditRitual?.()} onCancel={props.onCancelSummon} />}
    <GameNotice message={props.notice} revision={props.noticeRevision} expiresAt={props.noticeExpiresAt} onClear={props.onClearNotice} />
  </div>
}
