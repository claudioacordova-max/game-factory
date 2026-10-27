import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, MouseEvent } from 'react'
import type { CreatureCard, DuelState, GameSession } from '../engine/index.js'
import { baseMana } from '../engine/index.js'
import { CreatureTile, HandCard } from './CardViews.js'
import { GameNotice } from './GameNotice.js'
import { Icon } from './GameIcons.js'
import { attacksReady } from './encounterSummary.js'
import { BoardConnections } from './BoardConnections.js'
import { combatBoardLinks } from './boardLinks.js'
import { BLOCK_DRAG_MIME } from './blockDrag.js'
import { activateOnce, preventRepeatedActivationKey } from './activation.js'

export interface CombatViewProps {
  duel: DuelState
  session: GameSession
  enemyName: string
  enemyMaxLife: number
  notice: string
  noticeRevision: number
  selectedCardId: string | null
  sacrificeIds: string[]
  attackerIds: string[]
  targetChoices: Record<string, string>
  blockerChoices: Record<string, string[]>
  focusedBlockerAttackerId: string | null
  focusedAttackerId: string | null
  onFocusAttacker: (id: string) => void
  onSelectCard: (card: CreatureCard) => void
  onAllowFieldDrop: (event: DragEvent<HTMLElement>) => void
  onDropHandCard: (event: DragEvent<HTMLElement>) => void
  onToggleSacrifice: (id: string) => void
  onSelectEnemy: (id: string) => void
  onSelectAttacker: (id: string) => void
  onSelectBlocker: (id: string) => void
  onChooseTarget: (attackerId: string, targetId: string) => void
  onCancelSummon: () => void
  onBeginCombat: () => void
  onDeclareAttacks: () => void
  onConfirmBlocks: () => void
  onStartBlockDrag: (event: DragEvent<HTMLButtonElement>, blockerId: string) => boolean
  onEndBlockDrag: () => void
  onDropBlocker: (event: DragEvent<HTMLElement>, attackerId: string) => void
  onRemoveBlocker: (id: string) => void
  onMoveBlocker: (id: string, direction: -1 | 1) => void
}

function InvokerIdentity({ name, life, maxLife, enemy = false }: { name: string; life: number; maxLife: number; enemy?: boolean }) {
  return <section className={`combat-invoker ${enemy ? 'enemy-invoker' : 'own-invoker'}`} aria-label={enemy ? 'Invocador enemigo' : 'Tu invocador'}>
    <span className="invoker-sigil"><Icon name={enemy ? 'skull' : 'shield'} /></span>
    <div><h2>{name}</h2><div className="invoker-life" aria-label={`Vida ${enemy ? 'enemiga' : 'propia'} ${Math.max(0, life)} de ${maxLife}`}><Icon name="heart" /><strong>{Math.max(0, life)}<small>/{maxLife}</small></strong></div></div>
  </section>
}

export function CombatView(props: CombatViewProps) {
  const { duel, session, enemyName, enemyMaxLife, selectedCardId, sacrificeIds, attackerIds, targetChoices, blockerChoices, focusedBlockerAttackerId } = props
  const player = duel.players.player, enemy = duel.players.opponent
  const main = duel.phase === 'main' && duel.activePlayer === 'player'
  const attack = duel.phase === 'attackers' && duel.activePlayer === 'player'
  const defense = duel.phase === 'blockers' && duel.activePlayer === 'opponent'
  const directed = duel.mode === 'skirmish' && attack
  const selectedCard = player.hand.find((card) => card.id === selectedCardId)
  const choosingSacrifice = main && Boolean(selectedCard?.cost.sacrifices)
  const board = useRef<HTMLDivElement>(null)
  const [draggingBlocker, setDraggingBlocker] = useState<string | null>(null)
  const [hoveredAttacker, setHoveredAttacker] = useState<string | null>(null)
  const draggedClick = useRef<{ id: string; until: number } | null>(null)
  const links = useMemo(() => combatBoardLinks(duel, attackerIds, targetChoices, blockerChoices), [duel, attackerIds, targetChoices, blockerChoices])
  useEffect(() => {
    setDraggingBlocker(null)
    setHoveredAttacker(null)
    draggedClick.current = null
  }, [duel.id, duel.turn, duel.phase, duel.activePlayer])

  function finishDrag() {
    if (draggedClick.current) draggedClick.current.until = Date.now() + 250
    setDraggingBlocker(null)
    setHoveredAttacker(null)
    props.onEndBlockDrag()
  }
  const focusedAttacker = player.creatures.find((unit) => unit.id === props.focusedAttackerId)
  const phase = main ? 'Invocación' : attack ? 'Ataque' : defense ? 'Defensa' : 'Resolución'
  return <div ref={board} className={`combat-view${defense ? ' is-defending' : ''}${choosingSacrifice ? ' is-sacrificing' : ''}${draggingBlocker ? ' is-dragging-blocker' : ''}`} data-board-link-count={links.length} aria-label={duel.mode === 'skirmish' ? 'Tablero de escaramuza' : 'Tablero de duelo'}>
    <div className="combat-stonework" aria-hidden="true" />
    <div className="combat-topline"><div className="combat-turn"><span>Turno {duel.turn}</span><strong>{duel.activePlayer === 'player' ? 'Tu turno' : 'Turno enemigo'}<small>{phase}</small></strong></div>
      {enemy.kind === 'invoker' ? <InvokerIdentity enemy name={enemyName} life={enemy.life} maxLife={enemyMaxLife} /> : <section className="combat-group" aria-label="Grupo enemigo"><span className="section-kicker">Escaramuza</span><h2>{enemyName}</h2><span>{enemy.creatures.length} criaturas</span></section>}
    </div>

    <section className="combat-field enemy-field" aria-label="Mesa enemiga"><div className="combat-creature-row">
      {enemy.creatures.length ? enemy.creatures.map((unit) => {
        const targetedBy = Object.values(targetChoices).filter((target) => target === unit.id).length
        const blockers = blockerChoices[unit.id]?.length ?? 0
        const focused = defense && focusedBlockerAttackerId === unit.id
        const hint = defense && duel.attackers.includes(unit.id) ? blockers ? `${blockers} bloqueo${blockers === 1 ? '' : 's'} asignado${blockers === 1 ? '' : 's'}` : focused ? 'Elige tus bloqueadores' : 'Atacando'
          : targetedBy ? `Objetivo de ${targetedBy} atacante${targetedBy === 1 ? '' : 's'}` : directed ? 'Elegir objetivo' : undefined
        const attacking = defense && duel.attackers.includes(unit.id)
        return <div className={`combat-creature-slot${attacking ? ' enemy-attacker' : ''}${hoveredAttacker === unit.id && attacking ? ' is-block-drop-target' : ''}`} key={unit.id} data-creature-id={unit.id}
          onDragOver={defense ? (event) => { if (!Array.from(event.dataTransfer.types).includes(BLOCK_DRAG_MIME)) return; event.preventDefault(); event.dataTransfer.dropEffect = attacking ? 'move' : 'none'; setHoveredAttacker(attacking ? unit.id : null) } : undefined}
          onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setHoveredAttacker(null) }}
          onDrop={defense ? (event) => { props.onDropBlocker(event, unit.id); setHoveredAttacker(null); setDraggingBlocker(null) } : undefined}>
          <CreatureTile creature={unit} selected={focused || targetedBy > 0 || blockers > 0} onClick={attacking || directed ? () => props.onSelectEnemy(unit.id) : undefined} hint={hint} />
        </div>
      }) : <p className="combat-empty"><Icon name="shield" /><span>El campo enemigo está vacío</span></p>}
    </div></section>

    <div className="combat-axis"><span /><Icon name={choosingSacrifice ? 'skull' : defense ? 'shield' : 'sword'} /><p>{choosingSacrifice ? <><strong>{selectedCard!.name} · {sacrificeIds.length}/{selectedCard!.cost.sacrifices} sacrificios</strong><span>Al elegir la última criatura, se invoca y los sacrificios se pierden permanentemente.</span></> : defense ? draggingBlocker ? 'Suelta sobre un atacante enemigo' : 'Arrastra tus criaturas sobre los atacantes' : attack ? directed ? focusedAttacker ? `Elige objetivo para ${focusedAttacker.card.name}` : 'Elige atacantes y sus objetivos' : 'Elige tus atacantes' : 'Campo de invocaciones'}</p><span /></div>

    <section className={`combat-field own-field${main ? ' accepts-card-drop' : ''}`} aria-label={main ? 'Tu mesa; arrastra una carta aquí para invocarla' : 'Tu mesa'} onDragOver={props.onAllowFieldDrop} onDrop={props.onDropHandCard}><div className="combat-creature-row">
      {player.creatures.length ? player.creatures.map((unit, index) => {
        const assignment = Object.entries(blockerChoices).find(([, ids]) => ids.includes(unit.id))
        const blockedName = assignment ? enemy.creatures.find((target) => target.id === assignment[0])?.card.name : undefined
        const targetName = targetChoices[unit.id] ? enemy.creatures.find((target) => target.id === targetChoices[unit.id])?.card.name : undefined
        const selected = defense ? Boolean(assignment) : choosingSacrifice ? sacrificeIds.includes(unit.id) : attack && attackerIds.includes(unit.id)
        const hint = defense ? assignment ? `${assignment[1].indexOf(unit.id) + 1} · Bloquea ${blockedName}` : focusedBlockerAttackerId ? 'Elegir bloqueador' : 'Arrastra para bloquear'
          : choosingSacrifice ? selected ? 'Sacrificio elegido' : 'Elegir sacrificio' : attack ? selected ? targetName ? `Ataca a ${targetName}` : directed ? 'Elige objetivo' : 'Atacante elegido' : 'Elegir atacante' : undefined
        const onClick = choosingSacrifice ? () => props.onToggleSacrifice(unit.id) : defense ? (event: MouseEvent<HTMLButtonElement>) => {
          if (event.detail > 0 && draggedClick.current?.id === unit.id && Date.now() < draggedClick.current.until) { draggedClick.current = null; return }
          props.onSelectBlocker(unit.id)
        } : attack ? () => props.onSelectAttacker(unit.id) : undefined
        const targetFocused = directed && selected && props.focusedAttackerId === unit.id
        const blockOrder = assignment?.[1].indexOf(unit.id) ?? -1
        return <div className={`combat-creature-slot${targetFocused ? ' has-directed-focus' : ''}${defense && assignment ? ' has-block-controls' : ''}${draggingBlocker === unit.id ? ' is-blocker-dragging' : ''}`} key={unit.id} data-creature-id={unit.id}>
          {directed && <span className="combat-field-order" title="Orden de recepción de la represalia">{index + 1}</span>}
          {defense && assignment && <span className="combat-block-order" aria-label={`Orden de bloqueo ${blockOrder + 1}`}>{blockOrder + 1}</span>}
          <CreatureTile creature={unit} selected={selected} onClick={onClick} hint={hint} draggable={defense}
            onDragStart={defense ? (event) => { if (props.onStartBlockDrag(event, unit.id)) { draggedClick.current = { id: unit.id, until: Infinity }; setDraggingBlocker(unit.id) } } : undefined}
            onDragEnd={finishDrag} />
          {defense && assignment && <div className="combat-block-tools" role="group" aria-label={`Bloqueo de ${unit.card.name}`}><button type="button" aria-label={`Adelantar en daño a ${unit.card.name}`} title="Recibir daño antes" disabled={blockOrder === 0} onClick={() => props.onMoveBlocker(unit.id, -1)}>↑</button><button type="button" aria-label={`Retrasar en daño a ${unit.card.name}`} title="Recibir daño después" disabled={blockOrder === assignment[1].length - 1} onClick={() => props.onMoveBlocker(unit.id, 1)}>↓</button><button type="button" aria-label={`Retirar bloqueo de ${unit.card.name}`} title="Retirar bloqueo" onClick={() => props.onRemoveBlocker(unit.id)}>×</button></div>}
          {directed && selected && <><button type="button" className="combat-focus-target" aria-label={`Elegir objetivo en el campo para ${unit.card.name}`} aria-pressed={targetFocused} title="Elegir objetivo en el campo" onClick={() => props.onFocusAttacker(unit.id)}><Icon name="sword" /></button><select className="combat-target" aria-label={`Objetivo de ${unit.card.name}`} value={targetChoices[unit.id] ?? ''} onFocus={() => props.onFocusAttacker(unit.id)} onChange={(event) => props.onChooseTarget(unit.id, event.target.value)}><option value="">Elegir objetivo…</option>{enemy.creatures.map((target) => <option key={target.id} value={target.id}>{target.card.name}</option>)}</select></>}
        </div>
      }) : <p className="combat-empty"><Icon name="cards" /><span>{main ? 'Arrastra tus invocaciones a este campo' : 'No tienes criaturas en el campo'}</span></p>}
    </div></section>

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
      {player.hand.length ? player.hand.map((card) => <HandCard key={card.id} card={card} selected={selectedCardId === card.id} unavailableReason={main ? '' : 'Fuera de fase principal'} draggable={main} onDragStart={(event) => { event.dataTransfer.setData('text/plain', card.id); event.dataTransfer.effectAllowed = 'move' }} onClick={() => props.onSelectCard(card)} />) : <p className="combat-empty"><Icon name="cards" /><span>{player.deck.length ? 'Robarás en tu próximo turno' : 'No quedan cartas en mano o mazo'}</span></p>}
    </div></section>
    <BoardConnections boardRef={board} links={links} />
    <GameNotice message={props.notice} revision={props.noticeRevision} />
  </div>
}
