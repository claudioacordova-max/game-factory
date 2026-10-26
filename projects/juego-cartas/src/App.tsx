import { useState } from 'react'
import {
  createGameSession,
  addCopyToActiveDeck,
  baseMana,
  canEnterEncounter,
  declareAttackers,
  declareBlockers,
  endTurn,
  finishSessionDuel,
  resolveCombat,
  RuleViolation,
  startSessionDuel,
  startCombat,
  summonCreature,
  unlockCreatureType,
  removeCopyFromActiveDeck,
  createExplorationProgress,
  currentEncounterId,
  isDungeonComplete,
  recordEncounterVictory,
  recordEncounterDefeat,
  ExplorationViolation,
} from './engine/index.js'
import { resolveEnemyBlocks, runEnemyTurn } from './engine/enemy.js'
import type { CreatureCard, DuelState, GameSession } from './engine/index.js'
import { DISCOVERY_CARD, DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES, PLAYER_DECK } from './engine/content.js'
import PrototypeScene from './scene/PrototypeScene.js'
import { encounterVictoryMessage } from './ui/explorationMessages.js'

import { CreatureTile, HandCard } from './ui/CardViews.js'
import { CollectionView, DeckPanel } from './ui/CollectionViews.js'
import { CreaturePortrait, Icon } from './ui/GameIcons.js'

export default function App() {
  const [session, setSession] = useState<GameSession>(() => createGameSession(PLAYER_DECK))
  const [exploration, setExploration] = useState(() => createExplorationProgress())
  const [duel, setDuel] = useState<DuelState>(() => startSessionDuel(session, PLAYER_CARD_TYPES, DUNGEON_ENCOUNTERS[0].opponentDeck))
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null)
  const [isDuelActive, setIsDuelActive] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [sacrificeIds, setSacrificeIds] = useState<string[]>([])
  const [attackerIds, setAttackerIds] = useState<string[]>([])
  const [blockerChoices, setBlockerChoices] = useState<Record<string, string[]>>({})
  const [view, setView] = useState<'exploration' | 'collection'>('exploration')
  const [notice, setNotice] = useState('Elige el encuentro disponible en el mapa para entrar a la mazmorra.')

  const player = duel.players.player
  const enemy = duel.players.opponent
  const isPlayerMain = duel.phase === 'main' && duel.activePlayer === 'player'
  const selectedCard = player.hand.find((card) => card.id === selectedCardId)
  const canManageBetweenDuels = !isDuelActive
  const usableMana = canManageBetweenDuels ? Math.max(0, player.level - session.fatigue) : baseMana(player)
  const shownMana = canManageBetweenDuels ? usableMana : player.mana

  function closeDuel(result: DuelState) {
    const recovered = {
      ...result,
      players: {
        ...result.players,
        player: { ...result.players.player, life: 20 },
      },
    }
    setDuel(recovered)
    setSession((current) => finishSessionDuel(current, recovered))
    setIsDuelActive(false)
    setView('exploration')

    if (recovered.winner === 'player' && activeEncounterId) {
      const victory = recordEncounterVictory(exploration, activeEncounterId, recovered.id, DUNGEON_ENCOUNTERS)
      setExploration(victory.progress)
      if (victory.discoveredCardId === DISCOVERY_CARD.id) {
        setSession((current) => unlockCreatureType(current, DISCOVERY_CARD))
        setNotice('Victoria: Brote de musgo se descubrió y añadió a la colección. Puedes incluirlo en la baraja.')
        return
      }
      const enemyName = DUNGEON_ENCOUNTERS.find((entry) => entry.id === activeEncounterId)?.enemyName ?? 'el enemigo'
      setNotice(encounterVictoryMessage(enemyName, isDungeonComplete(victory.progress, DUNGEON_ENCOUNTERS)))
    } else if (recovered.winner === 'opponent' && activeEncounterId) {
      setExploration((current) => recordEncounterDefeat(current, activeEncounterId, recovered.id, DUNGEON_ENCOUNTERS))
      setNotice('Derrota. Las consecuencias se conservan; puedes ajustar la baraja y reintentar este encuentro.')
    }
  }

  function reject(error: unknown) {
    setNotice(error instanceof RuleViolation || error instanceof ExplorationViolation ? error.message : 'No se pudo completar esa acción.')
  }

  function selectCard(card: CreatureCard) {
    setSelectedCardId((current) => current === card.id ? null : card.id)
    setSacrificeIds([])
  }

  function summonSelected() {
    if (!selectedCard) return
    try {
      const next = summonCreature(duel, selectedCard.id, sacrificeIds)
      setDuel(next)
      setSelectedCardId(null)
      setSacrificeIds([])
      setNotice(`${selectedCard.name} entra en juego.${sacrificeIds.length ? ' Las criaturas sacrificadas se perdieron permanentemente.' : ''}`)
    } catch (error) {
      reject(error)
    }
  }

  function beginCombat() {
    try {
      setDuel(startCombat(duel))
      setAttackerIds([])
      setSelectedCardId(null)
      setNotice('Selecciona las criaturas que atacarán. Las recién invocadas también pueden atacar.')
    } catch (error) {
      reject(error)
    }
  }

  function declarePlayerAttacks() {
    try {
      const declared = declareAttackers(duel, attackerIds)
      const result = resolveEnemyBlocks(declared)
      const blocked = Object.values(result.blockers).flat().length
      if (result.phase === 'finished') closeDuel(result)
      else {
        setDuel(result)
        setNotice(`${blocked} bloqueo(s) del enemigo. Se resolvió el combate.`)
      }
      setAttackerIds([])
    } catch (error) {
      reject(error)
    }
  }

  function toggleBlock(attackerId: string, blockerId: string) {
    setBlockerChoices((current) => {
      const assignedElsewhere = Object.entries(current).some(([id, ids]) => id !== attackerId && ids.includes(blockerId))
      if (assignedElsewhere) return current
      const existing = current[attackerId] ?? []
      const nextIds = existing.includes(blockerId)
        ? existing.filter((id) => id !== blockerId)
        : [...existing, blockerId]
      return { ...current, [attackerId]: nextIds }
    })
  }

  function confirmBlocks() {
    try {
      const declared = declareBlockers(duel, blockerChoices)
      const result = resolveCombat(declared)
      if (result.phase === 'finished') {
        closeDuel(result)
      } else {
        const nextTurn = endTurn(result)
        setDuel(nextTurn)
        setNotice('Bloqueos resueltos. Comienza tu turno.')
      }
      setBlockerChoices({})
    } catch (error) {
      reject(error)
    }
  }

  function finishPlayerTurn() {
    try {
      const enemyMain = endTurn(duel)
      const enemyCombat = runEnemyTurn(enemyMain)
      const played = enemyMain.players.opponent.hand.length - enemyCombat.players.opponent.hand.length
      setDuel(enemyCombat)
      setBlockerChoices({})
      setNotice(`Turno del enemigo: invoca ${played} criatura(s) y declara sus ataques. Elige tus bloqueos.`)
    } catch (error) {
      reject(error)
    }
  }

  function enterEncounter(encounterId: string) {
    try {
      if (isDuelActive) throw new ExplorationViolation('Termina el duelo actual antes de entrar a otro encuentro.')
      const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === encounterId)
      if (!encounter || !canEnterEncounter(exploration, encounterId, DUNGEON_ENCOUNTERS)) {
        throw new ExplorationViolation('Ese encuentro todavía está bloqueado o ya se completó.')
      }
      setDuel(startSessionDuel(session, PLAYER_CARD_TYPES, encounter.opponentDeck))
      setActiveEncounterId(encounter.id)
      setIsDuelActive(true)
      setSelectedCardId(null)
      setSacrificeIds([])
      setAttackerIds([])
      setBlockerChoices({})
      setNotice(`Comienza el duelo contra ${encounter.enemyName}.`)
    } catch (error) {
      reject(error)
    }
  }

  function changeDeck(copyId: string, included: boolean) {
    if (isDuelActive) return
    setSession((current) => included
      ? addCopyToActiveDeck(current, copyId)
      : removeCopyFromActiveDeck(current, copyId))
    setNotice(included ? 'Copia añadida al final de la baraja activa.' : 'Copia retirada de la baraja; sigue en tu colección.')
  }

  const phaseText = duel.phase === 'main' ? 'Fase principal'
    : duel.phase === 'attackers' ? 'Declarar atacantes'
      : duel.phase === 'blockers' ? (duel.activePlayer === 'player' ? 'Elegir bloqueos del enemigo' : 'Declarar tus bloqueos')
        : duel.phase === 'resolved' ? 'Combate resuelto'
          : duel.phase === 'resolve' ? 'Resolver combate' : 'Duelo terminado'
  const isEnemyAttacking = isDuelActive && duel.phase === 'blockers' && duel.activePlayer === 'opponent'
  const nextEncounterId = currentEncounterId(exploration, DUNGEON_ENCOUNTERS)
  const dungeonComplete = isDungeonComplete(exploration, DUNGEON_ENCOUNTERS)
  const mapNodes = DUNGEON_ENCOUNTERS.map((encounter) => ({
    id: encounter.id,
    label: encounter.name,
    enemyName: encounter.enemyName,
    status: exploration.completedEncounterIds.includes(encounter.id) ? 'completed' as const
      : isDuelActive && activeEncounterId === encounter.id ? 'active' as const
        : nextEncounterId === encounter.id ? 'available' as const : 'locked' as const,
  }))

  const activeEncounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === activeEncounterId)
  const nextEncounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === nextEncounterId)
  const phaseIndex = isEnemyAttacking ? 2 : duel.phase === 'main' ? 0 : duel.phase === 'attackers' ? 1 : 3
  const resultVisible = duel.phase === 'finished' && !isDuelActive && activeEncounterId
  return (
    <main className={`game-shell ${isDuelActive ? 'mode-duel' : 'mode-exploration'}`}>
      <header className="game-header">
        <div className="game-brand"><span className="brand-mark"><Icon name="gate" /></span><div><p className="eyebrow">{isDuelActive ? 'Duelo de invocaciones' : 'RPG de invocaciones'}</p><h1>Duelo en la cripta</h1></div></div>
        {!isDuelActive && <nav className="view-navigation" aria-label="Vistas de la aventura"><button type="button" aria-pressed={view === 'exploration'} onClick={() => setView('exploration')}><Icon name="gate" />Explorar</button><button type="button" aria-pressed={view === 'collection'} onClick={() => setView('collection')}><Icon name="cards" />Colección <span>{session.copies.length}</span></button></nav>}
        <div className="hero-resources" aria-label="Recursos del invocador">
          <span className="life-resource" title="Vida del invocador"><Icon name="heart" /><strong>{isDuelActive ? Math.max(0, player.life) : session.invokerLife}<small>/20</small></strong><span>Vida</span></span>
          <span className="mana-resource" title="Maná actual / máximo utilizable"><Icon name="mana" /><strong>{shownMana}<small>/{usableMana}</small></strong><span>Maná</span></span>
          <span className="fatigue-resource" title={`La fatiga bloquea ${Math.min(session.fatigue, player.level)} de ${player.level} maná base.`}><Icon name="skull" /><strong>{session.fatigue}</strong><span>Fatiga</span></span>
        </div>
      </header>

      <p className="notice" role="status"><span className="notice-diamond" aria-hidden="true">◆</span>{notice}</p>

      {!isDuelActive ? <>
        {resultVisible && <section className={`result-banner ${duel.winner === 'player' ? 'victory' : 'defeat'}`} aria-label="Resultado del duelo">
          <span className="result-emblem"><Icon name={duel.winner === 'player' ? 'check' : 'skull'} /></span>
          <div><h2>{duel.winner === 'player' ? dungeonComplete ? 'Mazmorra completada' : 'Victoria' : 'Derrota'}</h2><p>{duel.winner === 'player' ? `Has vencido a ${activeEncounter?.enemyName}.${dungeonComplete ? ' Has superado los tres encuentros.' : ' El siguiente encuentro está disponible.'}` : `${activeEncounter?.enemyName} te venció. Reorganiza tu baraja y reintenta el encuentro.`}</p><span>Invocador recuperado · Heridas y pérdidas conservadas · Fatiga {session.fatigue}</span></div>
        </section>}
        <div className="adventure-layout">
          {view === 'exploration' ? <section className="exploration-panel stone-panel" aria-labelledby="exploration-title">
            <header className="panel-heading"><div><p className="section-kicker">La mazmorra</p><h2 id="exploration-title">Exploración de la cripta</h2></div><span className="progress-counter">{String(exploration.completedEncounterIds.length).padStart(2, '0')}<small> / {String(DUNGEON_ENCOUNTERS.length).padStart(2, '0')}</small><span>encuentros</span></span></header>
            <PrototypeScene nodes={mapNodes} onSelectEncounter={enterEncounter} interactionDisabled={dungeonComplete} />
            <footer className="map-caption"><span><Icon name={dungeonComplete ? 'check' : 'gate'} />{dungeonComplete ? 'Todos los encuentros superados. No quedan rivales en la cripta.' : 'Elige el portal iluminado o el encuentro disponible.'}</span><span>Heridas y pérdidas persistentes</span></footer>
          </section> : <CollectionView session={session} onChangeDeck={changeDeck} />}
          <aside className="preparation-sidebar">
            {view === 'exploration' && <section className="encounter-preview stone-panel"><p className="section-kicker">{dungeonComplete ? 'Ruta completada' : 'Próximo duelo'}</p><h2>{nextEncounter?.enemyName ?? 'La cripta está en silencio'}</h2><p>{dungeonComplete ? 'Tu colección conserva las consecuencias de la aventura.' : `${nextEncounter?.name} · Prepara tus invocaciones antes de entrar.`}</p>{!dungeonComplete && <span className="encounter-availability"><span aria-hidden="true">◆</span> Disponible</span>}</section>}
            <DeckPanel session={session} onChangeDeck={changeDeck} />
            <button type="button" className="button button-secondary library-link" onClick={() => setView(view === 'collection' ? 'exploration' : 'collection')}><Icon name={view === 'collection' ? 'gate' : 'cards'} />{view === 'collection' ? 'Volver a la mazmorra' : 'Preparar colección'}<Icon name="arrow" /></button>
          </aside>
        </div>
      </> : <div className="duel-layout">
        <div className="battle-stage">
          <section className="duel-board" aria-label="Campo de batalla">
            <section className="side-panel enemy-panel" aria-label="Invocador enemigo">
              <header className="player-heading"><div><p className="section-kicker">Oponente</p><h2>{activeEncounter?.enemyName}</h2></div><div className="resources"><span className="life-resource"><Icon name="heart" />{Math.max(0, enemy.life)}<small> / 20 VID</small></span><span><Icon name="mana" />{enemy.mana}<small>maná</small></span><span><Icon name="cards" />{enemy.deck.length}<small>mazo</small></span></div></header>
              <div className="creature-row" aria-label="Mesa enemiga">{enemy.creatures.length ? enemy.creatures.map((unit) => <CreatureTile key={unit.id} creature={unit} hint={duel.attackers.includes(unit.id) ? 'Atacando' : undefined} />) : <p className="empty-row"><Icon name="shield" />La mesa enemiga está vacía</p>}</div>
            </section>
            <div className="battle-divider"><span/><Icon name="sword" /><small>{isEnemyAttacking ? 'Defiende tu invocador' : duel.phase === 'attackers' ? 'Elige tus atacantes' : 'Campo de invocaciones'}</small><span/></div>
            <section className="side-panel player-panel" aria-label="Tu mesa">
              <div className="creature-row" aria-label="Criaturas propias">{player.creatures.length ? player.creatures.map((unit) => {
                const canSacrifice = isPlayerMain && Boolean(selectedCard?.cost.sacrifices)
                const canAttack = duel.phase === 'attackers'
                const blockTarget = Object.entries(blockerChoices).find(([, ids]) => ids.includes(unit.id))
                const selected = isEnemyAttacking ? Boolean(blockTarget) : canSacrifice ? sacrificeIds.includes(unit.id) : canAttack && attackerIds.includes(unit.id)
                let onClick: (() => void) | undefined
                if (canSacrifice) onClick = () => setSacrificeIds((current) => current.includes(unit.id) ? current.filter((id) => id !== unit.id) : [...current, unit.id])
                else if (canAttack) onClick = () => setAttackerIds((current) => current.includes(unit.id) ? current.filter((id) => id !== unit.id) : [...current, unit.id])
                return <CreatureTile key={unit.id} creature={unit} selected={selected} onClick={onClick} hint={selected ? isEnemyAttacking ? 'Bloqueando' : canSacrifice ? 'Sacrificio' : 'Atacará' : canSacrifice ? 'Elegir sacrificio' : canAttack ? 'Elegir atacante' : undefined} />
              }) : <p className="empty-row"><Icon name="shield" />Tu mesa está vacía{isPlayerMain ? ' · Invoca desde tu mano' : ''}</p>}</div>
              <footer className="player-table-label"><span><Icon name="shield" />Tu invocador <small>Nivel {player.level}</small></span><span>{player.creatures.length} en mesa · {player.deck.length} en el mazo</span></footer>
            </section>
          </section>

          <section className="hand-section" aria-labelledby="hand-title">
            <header className="hand-heading"><h2 id="hand-title">Tu mano <span>{player.hand.length}</span></h2><span>{isPlayerMain ? 'Selecciona una carta para invocar' : 'Las invocaciones estarán disponibles en tu fase principal'}</span></header>
            <div className="hand-row">{player.hand.length ? player.hand.map((card) => {
              const unavailableReason = !isPlayerMain ? 'Fuera de fase principal' : card.cost.mana > player.mana ? 'Sin maná suficiente' : card.cost.sacrifices > player.creatures.length ? 'Faltan criaturas para sacrificar' : ''
              return <HandCard key={card.id} card={card} selected={selectedCardId === card.id} unavailableReason={unavailableReason} onClick={() => selectCard(card)} />
            }) : <p className="empty-row"><Icon name="cards" />No tienes cartas en la mano.{player.deck.length ? ' Robarás en tu próximo turno.' : ' Tu mazo está vacío.'}</p>}</div>
          </section>
        </div>

        <aside className="phase-panel stone-panel" aria-label="Acciones del duelo">
          <header className="phase-heading"><p className="section-kicker">Turno {duel.turn} · {duel.activePlayer === 'player' ? 'Tu turno' : 'Enemigo'}</p><h2>{phaseText}</h2></header>
          <ol className="phase-track" aria-label="Fases del duelo">{['Invocar', 'Atacar', 'Bloquear', 'Resolver'].map((label, index) => <li key={label} className={phaseIndex === index ? 'is-current' : ''} aria-current={phaseIndex === index ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
          <div className="duel-mana"><Icon name="mana" /><strong>{shownMana}<span> / {usableMana}</span></strong><span>Maná utilizable</span></div>
          {session.fatigue > 0 && <p className="fatigue-warning">Fatiga {session.fatigue} · {Math.min(session.fatigue, player.level)} de {player.level} maná base bloqueado</p>}
          <div className="phase-context">
            {isPlayerMain && (selectedCard ? <section className="summon-selection" aria-label="Invocación seleccionada"><CreaturePortrait cardId={selectedCard.id} /><h3>{selectedCard.name}</h3><p>{selectedCard.cost.mana} maná{selectedCard.cost.sacrifices > 0 ? ` + ${selectedCard.cost.sacrifices} sacrificio` : ' · Sin sacrificios'}</p>{selectedCard.cost.sacrifices > 0 && <div className="sacrifice-warning"><Icon name="skull" /><p>Elige {selectedCard.cost.sacrifices} criatura de tu mesa.<strong>Se perderá permanentemente.</strong><span>{sacrificeIds.length}/{selectedCard.cost.sacrifices} seleccionadas{Boolean(sacrificeIds.length) && ` · ${player.creatures.filter((unit) => sacrificeIds.includes(unit.id)).map((unit) => unit.card.name).join(', ')}`}</span></p></div>}<button type="button" className="button button-primary summon-button" disabled={sacrificeIds.length !== selectedCard.cost.sacrifices} onClick={summonSelected}><Icon name="mana" />Invocar criatura</button></section> : <div className="phase-prompt"><Icon name="cards" /><h3>Prepara tu mesa</h3><p>Invoca desde tu mano o pasa al ataque.</p></div>)}
            {duel.phase === 'attackers' && <div className="phase-prompt"><Icon name="sword" /><h3>{attackerIds.length} atacante{attackerIds.length === 1 ? '' : 's'} seleccionado{attackerIds.length === 1 ? '' : 's'}</h3><p>Elige criaturas de tu mesa. Las recién invocadas también pueden atacar.</p><p>Puedes declarar el ataque sin seleccionar ninguna.</p></div>}
            {duel.phase === 'resolved' && <div className="phase-prompt"><Icon name="check" /><h3>Combate resuelto</h3><p>Al terminar tu turno, el enemigo invocará y atacará.</p></div>}
            {isEnemyAttacking && <section className="block-section" aria-labelledby="blocks-title"><h3 id="blocks-title">Asigna tus bloqueadores</h3><p className="block-help">El orden de selección determina el daño. Puedes dejar un ataque sin bloquear.</p>{duel.attackers.length ? <div className="attack-list">{duel.attackers.map((attackerId) => {
              const attacker = enemy.creatures.find((unit) => unit.id === attackerId)
              if (!attacker) return null
              const chosen = blockerChoices[attackerId] ?? []
              return <section className="attack-assignment" key={attackerId}><h4><Icon name="sword" />{attacker.card.name}</h4><p>{attacker.card.attack} ATQ · {attacker.health}/{attacker.card.maxHealth} VID</p><div className="blocker-picker">{player.creatures.length ? player.creatures.map((unit) => {
                const assignedElsewhere = Object.entries(blockerChoices).some(([id, ids]) => id !== attackerId && ids.includes(unit.id))
                const order = chosen.indexOf(unit.id)
                return <button key={unit.id} type="button" className={`blocker-option${order !== -1 ? ' is-selected' : ''}`} aria-pressed={order !== -1} disabled={assignedElsewhere} onClick={() => toggleBlock(attackerId, unit.id)}>{order !== -1 && <span className="block-order">{order + 1}</span>}{unit.card.name}<small>{unit.card.attack} ATQ · {unit.health} VID{assignedElsewhere ? ' · Ya asignada' : ''}</small></button>
              }) : <span className="subtle">Sin criaturas para bloquear</span>}</div><p className="assignment-order">{chosen.length ? `Orden: ${chosen.map((id) => player.creatures.find((unit) => unit.id === id)?.card.name).join(' → ')}` : 'Sin bloqueo'}</p></section>
            })}</div> : <p className="empty-state">El enemigo no declaró atacantes.</p>}</section>}
          </div>
          <div className="phase-action">
            {isPlayerMain && <button type="button" className="button button-primary" onClick={beginCombat}>Declarar atacantes<Icon name="arrow" /></button>}
            {duel.phase === 'attackers' && <button type="button" className="button button-primary" onClick={declarePlayerAttacks}>Declarar ataques<Icon name="sword" /></button>}
            {duel.phase === 'resolved' && duel.activePlayer === 'player' && <button type="button" className="button button-primary" onClick={finishPlayerTurn}>Terminar turno<Icon name="arrow" /></button>}
            {isEnemyAttacking && <button type="button" className="button button-primary" onClick={confirmBlocks}>Confirmar bloqueos y resolver<Icon name="shield" /></button>}
          </div>
        </aside>
      </div>}
      <footer className="game-footer"><span>DUELO<span className="footer-separator">◆</span>EN LA CRIPTA</span><span>{isDuelActive ? 'Las criaturas caídas se pierden permanentemente.' : 'La aventura se conserva durante esta sesión. Recargar inicia una nueva partida.'}</span></footer>
    </main>
  )
}
