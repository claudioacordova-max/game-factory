import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import type { CreatureCard, DuelState, GameSession } from '../engine/index.js'
import { baseMana, cardInstanceId, findHandCard } from '../engine/index.js'
import { CreatureTile, HandCard } from './CardViews.js'
import { GameNotice } from './GameNotice.js'
import { Icon } from './GameIcons.js'
import { attacksReady } from './encounterSummary.js'
import { BoardConnections } from './BoardConnections.js'
import { combatBoardLinks } from './boardLinks.js'
import { COMBAT_DRAG_MIME } from './blockDrag.js'
import { combatLayout, COMBAT_CARD_WIDTH } from './combatLayout.js'
import { activateOnce, preventRepeatedActivationKey } from './activation.js'
import { writeHandCardDrag } from './combatActions.js'

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
  onAllowFieldDrop: (event: DragEvent<HTMLElement>) => void
  onDropHandCard: (event: DragEvent<HTMLElement>) => void
  onToggleSacrifice: (id: string) => void
  onSelectAttacker: (id: string) => void
  onCancelSummon: () => void
  onBeginCombat: () => void
  onDeclareAttacks: () => void
  onConfirmBlocks: () => void
  onStartBlockDrag: (event: DragEvent<HTMLButtonElement>, blockerId: string) => boolean
  onEndBlockDrag: () => void
  onDropRelation: (event: DragEvent<HTMLElement>, targetId: string | null) => void
  presenting?: boolean
  onMoveBlocker: (id: string, direction: -1 | 1) => void
  onMoveAttacker: (id: string, direction: -1 | 1) => void
}

function InvokerIdentity({ name, life, maxLife, enemy = false }: { name: string; life: number; maxLife: number; enemy?: boolean }) {
  return <section className={`combat-invoker ${enemy ? 'enemy-invoker' : 'own-invoker'}`} aria-label={enemy ? 'Invocador enemigo' : 'Tu invocador'}>
    <span className="invoker-sigil"><Icon name={enemy ? 'skull' : 'shield'} /></span>
    <div><h2>{name}</h2><div className="invoker-life" aria-label={`Vida ${enemy ? 'enemiga' : 'propia'} ${Math.max(0, life)} de ${maxLife}`}><Icon name="heart" /><strong>{Math.max(0, life)}<small>/{maxLife}</small></strong></div></div>
  </section>
}

export function CombatView(props: CombatViewProps) {
  const { duel, session, enemyName, enemyMaxLife, selectedCardId, sacrificeIds, attackerIds, targetChoices, blockerChoices } = props
  const player = duel.players.player, enemy = duel.players.opponent
  const main = !props.presenting && duel.phase === 'main' && duel.activePlayer === 'player'
  const attack = !props.presenting && duel.phase === 'attackers' && duel.activePlayer === 'player'
  const defense = !props.presenting && duel.phase === 'blockers' && duel.activePlayer === 'opponent'
  const directed = duel.mode === 'skirmish' && attack
  const selectedCard = selectedCardId ? findHandCard(player.hand, selectedCardId, duel.collectionProfile === 'legacy') : undefined
  const choosingSacrifice = main && Boolean(selectedCard?.cost.sacrifices)
  const board = useRef<HTMLDivElement>(null)
  const tableScroll = useRef<HTMLDivElement>(null)
  const scrollDimensions = useRef<{ duelId: string; width: number; clientWidth: number } | null>(null)
  const [draggingBlocker, setDraggingBlocker] = useState<string | null>(null)
  const [hoveredAttacker, setHoveredAttacker] = useState<string | null>(null)
  const visualAttackers = props.presenting ? duel.attackers : attackerIds
  const visualTargets = props.presenting ? duel.targets : targetChoices
  const visualBlocks = props.presenting ? duel.blockers : blockerChoices
  const layout = useMemo(() => combatLayout(duel, visualAttackers, visualTargets, visualBlocks), [duel, visualAttackers, visualTargets, visualBlocks])
  const links = useMemo(() => combatBoardLinks(duel, visualAttackers, visualTargets, visualBlocks), [duel, visualAttackers, visualTargets, visualBlocks])
  useLayoutEffect(() => {
    const element = tableScroll.current
    if (!element) return
    const preserveCenter = () => {
      const width = element.scrollWidth, clientWidth = element.clientWidth
      const previous = scrollDimensions.current
      element.scrollLeft = !previous || previous.duelId !== duel.id
        ? (width - clientWidth) / 2
        : element.scrollLeft + (width - previous.width - clientWidth + previous.clientWidth) / 2
      scrollDimensions.current = { duelId: duel.id, width, clientWidth }
    }
    preserveCenter()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(preserveCenter)
    observer?.observe(element)
    return () => observer?.disconnect()
  }, [duel.id, layout.width])
  useEffect(() => { setDraggingBlocker(null); setHoveredAttacker(null) }, [duel.id, duel.turn, duel.phase, duel.activePlayer])
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape' && draggingBlocker) finishDrag() }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [draggingBlocker])
  function finishDrag() { setDraggingBlocker(null); setHoveredAttacker(null); props.onEndBlockDrag() }
  const phase = main ? 'Invocación' : attack ? 'Ataque' : defense ? 'Defensa' : 'Resolución'
  const relationPhase = directed || defense
  // Arm the timing before Confirmar changes geometry; CSS timing changes do not retime a running transition.
  const previewTransition = duel.mode === 'duel' && duel.activePlayer === 'player' && (attack || props.presenting)
  const decision = props.presenting ? 'Resolviendo combate' : defense ? 'Te toca bloquear' : attack ? 'Declara tus ataques' : main ? 'Puedes invocar' : 'Resolviendo combate'
  const slotStyle = (id: string) => ({ width: COMBAT_CARD_WIDTH,
    left: `calc(50% + ${(layout.positions[id] ?? 0) - layout.width / 2}px)`,
    transform: `translateY(${layout.contextual ? `calc(var(--combat-row-step) * ${layout.rows[id] ?? 0} + 4px)` : '0px'})` })
  function acceptDrag(event: DragEvent<HTMLElement>, valid: boolean, targetId: string | null) {
    if (!draggingBlocker || !Array.from(event.dataTransfer.types).includes(COMBAT_DRAG_MIME)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = valid ? 'move' : 'none'
    setHoveredAttacker(valid ? targetId : null)
  }
  return <div ref={board} className={`combat-view turn-${duel.activePlayer}${layout.contextual ? ' has-contextual-layout' : ''}${previewTransition ? ' uses-preview-transition' : ''}${props.presenting ? ' is-presenting' : ''}${defense ? ' is-defending' : ''}${choosingSacrifice ? ' is-sacrificing' : ''}${draggingBlocker ? ' is-dragging-blocker' : ''}`} aria-busy={Boolean(props.presenting)} data-board-link-count={links.length} aria-label={duel.mode === 'skirmish' ? 'Tablero de escaramuza' : 'Tablero de duelo'}>
    <div className="combat-stonework" aria-hidden="true" />
    <div className="combat-topline"><div className="combat-turn"><span>Turno {duel.turn}</span><strong>{duel.activePlayer === 'player' ? 'Tu turno' : 'Turno enemigo'}<small>{phase}</small><span className="combat-decision">{decision}</span></strong></div>
      {enemy.kind === 'invoker' ? <InvokerIdentity enemy name={enemyName} life={enemy.life} maxLife={enemyMaxLife} /> : <section className="combat-group" aria-label="Grupo enemigo"><span className="section-kicker">Escaramuza</span><h2>{enemyName}</h2><span>{enemy.creatures.length} criaturas</span></section>}
      <div className="combat-phase-track" aria-label={`Fase actual: ${phase}`}>
        {(['Invocación', 'Ataque', 'Defensa', 'Resolución'] as const).map((label, index) => <span key={label} className={phase === label ? 'is-current' : ''} aria-current={phase === label ? 'step' : undefined}><Icon name={index === 0 ? 'cards' : index === 1 ? 'sword' : index === 2 ? 'shield' : 'check'} /><small>{label}</small></span>)}
      </div>
    </div>


    <div ref={tableScroll} className="combat-table-scroll" aria-label="Campos de combate; desplazamiento compartido" tabIndex={0}>
    <div className={`combat-table${layout.contextual ? ' is-contextual' : ''}`} style={{ minWidth: layout.width, '--combat-row-count': layout.rowCount, '--combat-enemy-row': layout.enemyRow } as CSSProperties}>
      {layout.groups.map((group) => <div key={group.id} className="combat-layout-group" style={{ width: group.width, transform: `translate(${group.left - layout.width / 2}px, calc(var(--combat-row-step) * ${layout.enemyRow}))` }} aria-hidden="true" />)}
    <section className="combat-field enemy-field" aria-label="Mesa enemiga"><div className="combat-creature-row">
      {enemy.creatures.length ? enemy.creatures.map((unit) => {
        const targetedBy = visualAttackers.filter((id) => visualTargets[id] === unit.id).length
        const blockers = duel.activePlayer === 'opponent' ? visualBlocks[unit.id]?.length ?? 0 : 0
        const attacking = duel.activePlayer === 'opponent' && duel.attackers.includes(unit.id)
        const enemyBlock = duel.activePlayer === 'player' ? Object.entries(visualBlocks).find(([, ids]) => ids.includes(unit.id)) : undefined
        const hint = attacking ? blockers ? blockers + ' bloqueos asignados' : 'Atacando' : targetedBy ? 'Objetivo de ' + targetedBy + ' atacantes' : enemyBlock ? 'Bloquea a ' + player.creatures.find((own) => own.id === enemyBlock[0])?.card.name : directed ? 'Destino de ataque' : undefined
        const validTarget = directed || (defense && attacking)
        return <div className={`combat-creature-slot${attacking ? ' enemy-attacker' : ''}${draggingBlocker && validTarget ? ' is-valid-drop-target' : ''}${hoveredAttacker === unit.id ? ' is-block-drop-target' : ''}`} style={slotStyle(unit.id)} key={unit.id} data-creature-id={unit.id}
          onDragOver={relationPhase ? (event) => acceptDrag(event, validTarget, unit.id) : undefined}
          onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setHoveredAttacker(null) }}
          onDrop={relationPhase && validTarget ? (event) => { props.onDropRelation(event, unit.id); finishDrag() } : undefined}>
          <CreatureTile creature={unit} selected={targetedBy > 0 || blockers > 0 || Boolean(enemyBlock)} hint={hint} />
        </div>
      }) : <p className="combat-empty"><Icon name="shield" /><span>El campo enemigo está vacío</span></p>}
    </div></section>
    <div className="combat-axis"><span /><Icon name={choosingSacrifice ? 'skull' : defense ? 'shield' : 'sword'} /><p>{choosingSacrifice ? <><strong>{selectedCard!.name} · {sacrificeIds.length}/{selectedCard!.cost.sacrifices} sacrificios</strong><span>Al elegir la última criatura, se invoca y los sacrificios se pierden permanentemente.</span></> : props.presenting ? 'Ataques y bloqueos declarados' : defense ? 'Arrastra tus criaturas sobre los atacantes' : directed ? 'Arrastra tus criaturas sobre sus objetivos' : attack ? 'Elige tus atacantes' : 'Campo de invocaciones'}</p><span /></div>
    <section className={`combat-field own-field${main ? ' accepts-card-drop' : ''}`} aria-label={main ? 'Tu mesa; arrastra una carta aquí para invocarla' : 'Tu mesa'} onDragOver={props.onAllowFieldDrop} onDrop={props.onDropHandCard}><div className="combat-creature-row">
      {player.creatures.length ? player.creatures.map((unit) => {
        const assignment = duel.activePlayer === 'opponent' ? Object.entries(visualBlocks).find(([, ids]) => ids.includes(unit.id)) : undefined
        const blockedName = assignment ? enemy.creatures.find((target) => target.id === assignment[0])?.card.name : undefined
        const targetName = visualTargets[unit.id] ? enemy.creatures.find((target) => target.id === visualTargets[unit.id])?.card.name : undefined
        const selected = defense ? Boolean(assignment) : choosingSacrifice ? sacrificeIds.includes(unit.id) : visualAttackers.includes(unit.id)
        const hint = props.presenting ? visualAttackers.includes(unit.id) ? 'Atacando' : undefined : defense ? assignment ? (assignment[1].indexOf(unit.id) + 1) + ' · Bloquea ' + blockedName : 'Arrastra para bloquear'
          : choosingSacrifice ? selected ? 'Sacrificio elegido' : 'Elegir sacrificio' : attack ? selected ? targetName ? 'Ataca a ' + targetName : 'Atacante elegido' : directed ? 'Arrastra para atacar' : 'Elegir atacante' : undefined
        const onClick = choosingSacrifice ? () => props.onToggleSacrifice(unit.id) : attack && !directed ? () => props.onSelectAttacker(unit.id) : undefined
        const blockOrder = assignment?.[1].indexOf(unit.id) ?? -1
        const attackGroup = directed && targetChoices[unit.id] ? attackerIds.filter((id) => targetChoices[id] === targetChoices[unit.id]) : []
        const attackOrder = attackGroup.indexOf(unit.id)
        const available = layout.contextual && layout.availableOwn.includes(unit.id)
        return <div className={`combat-creature-slot${(defense && assignment) || attackOrder >= 0 ? ' has-block-controls' : ''}${available ? ' is-available' : ''}${draggingBlocker === unit.id ? ' is-blocker-dragging' : ''}`} style={slotStyle(unit.id)} key={unit.id} data-creature-id={unit.id} data-combat-row={layout.rows[unit.id]}>
          {attackOrder >= 0 && <span className="combat-field-order" aria-label={`Prioridad de represalia ${attackOrder + 1}`} title="Prioridad de recepción de la represalia">{attackOrder + 1}</span>}
          {assignment && <span className="combat-block-order" aria-label={`Orden de bloqueo ${blockOrder + 1}`}>{blockOrder + 1}</span>}
          <CreatureTile creature={unit} selected={selected} onClick={onClick} hint={hint} draggable={relationPhase}
            onDragStart={relationPhase ? (event) => { if (props.onStartBlockDrag(event, unit.id)) setDraggingBlocker(unit.id) } : undefined} onDragEnd={finishDrag} />
          {defense && assignment && <div className="combat-block-tools" role="group" aria-label={`Bloqueo de ${unit.card.name}`}><button type="button" aria-label={`Adelantar en daño a ${unit.card.name}`} title="Recibir daño antes" disabled={blockOrder === 0} onClick={() => props.onMoveBlocker(unit.id, -1)}>↑</button><button type="button" aria-label={`Retrasar en daño a ${unit.card.name}`} title="Recibir daño después" disabled={blockOrder === assignment[1].length - 1} onClick={() => props.onMoveBlocker(unit.id, 1)}>↓</button></div>}
          {attackOrder >= 0 && <div className="combat-block-tools combat-attack-tools" role="group" aria-label={`Prioridad de ataque de ${unit.card.name}`}><button type="button" aria-label={`Adelantar en represalia a ${unit.card.name}`} title="Recibir represalia antes" disabled={attackOrder === 0} onClick={() => props.onMoveAttacker(unit.id, -1)}>↑</button><button type="button" aria-label={`Retrasar en represalia a ${unit.card.name}`} title="Recibir represalia después" disabled={attackOrder === attackGroup.length - 1} onClick={() => props.onMoveAttacker(unit.id, 1)}>↓</button></div>}
        </div>
      }) : <p className="combat-empty"><Icon name="cards" /><span>{main ? 'Arrastra tus invocaciones a este campo' : 'No tienes criaturas en el campo'}</span></p>}
    </div></section>
    </div></div>
    {relationPhase && <div className={`combat-unassign-zone${draggingBlocker ? ' accepts-relation' : ''}${hoveredAttacker === 'unassigned' ? ' is-over' : ''}`} aria-label="Sin asignar; arrastra aquí para retirar el vínculo" onDragOver={(event) => acceptDrag(event, true, 'unassigned')} onDragLeave={() => setHoveredAttacker(null)} onDrop={(event) => { props.onDropRelation(event, null); finishDrag() }}>Sin asignar <small>arrastra aquí para retirar</small></div>}

    <div className="combat-controls">
      <section className="combat-own-resources" aria-label="Recursos propios"><div className="combat-mana"><Icon name="mana" /><strong>{player.mana}<small>/{baseMana(player)}</small></strong><span>Maná</span></div><div className="combat-fatigue"><Icon name="skull" /><span>Fatiga <strong>{session.fatigue}</strong></span></div></section>
      <InvokerIdentity name="Tu invocador" life={player.life} maxLife={session.invokerMaxLife} />
      <div className="combat-action" aria-label="Acción contextual del combate">
        {choosingSacrifice && <button type="button" className="combat-cancel" onClick={props.onCancelSummon}>Cancelar sacrificio <kbd>Esc</kbd></button>}
        {main && !selectedCard && <button type="button" className="button button-primary" onClick={(event) => activateOnce(event, props.onBeginCombat)} onKeyDown={preventRepeatedActivationKey}>Ir al ataque<Icon name="arrow" /></button>}
        {attack && <><span>{attackerIds.length} atacante{attackerIds.length === 1 ? '' : 's'} elegido{attackerIds.length === 1 ? '' : 's'}</span><button type="button" className="button button-primary" disabled={!attacksReady(duel, attackerIds, targetChoices)} onClick={(event) => activateOnce(event, props.onDeclareAttacks)} onKeyDown={preventRepeatedActivationKey}>{attackerIds.length ? 'Confirmar ataques' : 'Pasar sin atacar'}<Icon name="sword" /></button></>}
        {defense && <><span>{Object.values(blockerChoices).flat().length} bloqueadores elegidos</span><button type="button" className="button button-primary" onClick={(event) => activateOnce(event, props.onConfirmBlocks)} onKeyDown={preventRepeatedActivationKey}>Resolver bloqueos<Icon name="shield" /></button></>}
      </div>
    </div>

    <section className="combat-hand" aria-label="Tu mano"><div className="combat-hand-label"><Icon name="cards" /><span>Tu mano <strong>{player.hand.length}</strong></span><small>{player.deck.length} en mazo</small></div><div className="combat-hand-row">
      {player.hand.length ? player.hand.map((card) => <HandCard key={cardInstanceId(card)} card={card} selected={selectedCard === card} unavailableReason={main ? '' : 'Fuera de fase principal'} draggable={main} onDragStart={(event) => writeHandCardDrag(event.dataTransfer, card)} onClick={() => props.onSelectCard(card)} />) : <p className="combat-empty"><Icon name="cards" /><span>{player.deck.length ? 'Robarás en tu próximo turno' : 'No quedan cartas en mano o mazo'}</span></p>}
    </div></section>
    <BoardConnections boardRef={board} links={links} />
    <GameNotice message={props.notice} revision={props.noticeRevision} expiresAt={props.noticeExpiresAt} onClear={props.onClearNotice} />
  </div>
}
