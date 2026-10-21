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
import type { Creature, CreatureCard, DuelState, GameSession } from './engine/index.js'
import { DISCOVERY_CARD, DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES, PLAYER_DECK } from './engine/content.js'
import PrototypeScene from './scene/PrototypeScene.js'
import { encounterVictoryMessage } from './ui/explorationMessages.js'

function cardStats(card: CreatureCard): string {
  const cost = [card.cost.mana ? `${card.cost.mana} maná` : '', card.cost.sacrifices ? `${card.cost.sacrifices} sacrificio` : '']
    .filter(Boolean)
    .join(' + ') || 'gratis'
  return `${card.attack} ATQ · ${card.maxHealth} VID · ${cost}`
}

function CreatureTile({ creature, selected, onClick, disabled, hint }: {
  creature: Creature
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  hint?: string
}) {
  return (
    <button
      className={`creature-tile${selected ? ' is-selected' : ''}`}
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-pressed={selected}
    >
      <span className="creature-name">{creature.card.name}</span>
      <span className="creature-health">{creature.health}/{creature.card.maxHealth} VID</span>
      <span className="creature-stats">{creature.card.attack} ATQ{hint ? ` · ${hint}` : ''}</span>
    </button>
  )
}

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
      setNotice(`${selectedCard.name} entra en juego.`)
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

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">RPG de cartas · Prototipo</p>
          <h1>Exploración de la cripta</h1>
        </div>
        <div className="turn-summary" aria-live="polite">
          {isDuelActive
            ? <><span className="phase-pill">{phaseText}</span><span>Turno {duel.turn} · {duel.activePlayer === 'player' ? 'Tuyo' : 'Enemigo'}</span></>
            : <><span className="phase-pill">{dungeonComplete ? 'Mazmorra completada' : 'Exploración'}</span><span>{exploration.completedEncounterIds.length} de {DUNGEON_ENCOUNTERS.length} encuentros superados</span></>}
        </div>
      </header>

      {duel.phase === 'finished' && !isDuelActive && activeEncounterId && (
        <section className={`result-banner${duel.winner === 'player' ? ' victory' : ' defeat'}`} role="status">
          <div>
            <strong>{duel.winner === 'player' ? (dungeonComplete ? 'Mazmorra completada' : '¡Victoria!') : 'Derrota'}</strong>
            <p>{duel.winner === 'player'
              ? `Has vencido a ${DUNGEON_ENCOUNTERS.find((entry) => entry.id === activeEncounterId)?.enemyName ?? 'tu rival'}.${dungeonComplete ? ' Has superado los tres encuentros.' : ' El siguiente encuentro está disponible en el mapa.'}`
              : `${DUNGEON_ENCOUNTERS.find((entry) => entry.id === activeEncounterId)?.enemyName ?? 'Tu rival'} te venció. Puedes gestionar tu baraja y volver a intentarlo desde el mapa.`}</p>
          </div>
        </section>
      )}

      {dungeonComplete && !isDuelActive && (
        <section className="dungeon-complete" role="status">
          <strong>La mazmorra ha terminado</strong>
          <span>Los tres encuentros están completados. No hay más rivales disponibles.</span>
        </section>
      )}

      <section className="exploration-panel" aria-labelledby="exploration-title">
        <div className="section-heading">
          <div><p className="section-kicker">Mazmorra · ruta lineal</p><h2 id="exploration-title">Mapa de encuentros</h2></div>
          <span className="deck-count">{isDuelActive ? 'El duelo actual debe terminar antes de continuar.' : 'Selecciona el encuentro disponible.'}</span>
        </div>
        <PrototypeScene nodes={mapNodes} onSelectEncounter={enterEncounter} interactionDisabled={isDuelActive || dungeonComplete} />
      </section>

      <p className="notice" aria-live="polite">{notice}</p>

      <section className="management-panel" aria-label="Catálogo, colección y baraja">
        <div className="management-heading">
          <div><p className="section-kicker">Gestión entre duelos</p><h2>Catálogo y colección</h2></div>
          <span className="deck-count">Invocador {session.invokerLife}/20 VID · Fatiga {session.fatigue} · {session.copies.length} copia(s)</span>
        </div>
        <div className="management-grid">
          <section className="management-section" aria-labelledby="catalog-title">
            <h3 id="catalog-title">Catálogo desbloqueado <span>({session.unlockedCardIds.length})</span></h3>
            <div className="management-list">
              {session.unlockedCardIds.map((cardId) => {
                const card = PLAYER_CARD_TYPES.find((entry) => entry.id === cardId)
                const owned = session.copies.some((copy) => copy.cardId === cardId)
                return <div className="management-item" key={cardId}><strong>{card?.name ?? cardId}</strong><span>{owned ? 'Copia en colección' : 'Sin copias disponibles'}</span></div>
              })}
            </div>
          </section>

          <section className="management-section" aria-labelledby="collection-title">
            <h3 id="collection-title">Colección <span>({session.copies.length})</span></h3>
            <div className="management-list">
              {session.copies.map((copy) => {
                const card = PLAYER_CARD_TYPES.find((entry) => entry.id === copy.cardId)
                const inDeck = session.activeDeckCopyIds.includes(copy.id)
                if (!card) return null
                return (
                  <div className="management-item" key={copy.id}>
                    <div><strong>{card.name}</strong><span className="copy-detail">ID {copy.id} · {copy.health}/{card.maxHealth} VID{copy.health < card.maxHealth ? ' · Herida' : ''}</span></div>
                    <button className="button button-small" type="button" disabled={!canManageBetweenDuels} onClick={() => changeDeck(copy.id, !inDeck)}>{inDeck ? 'Retirar de baraja' : 'Añadir a baraja'}</button>
                  </div>
                )
              })}
              {session.copies.length === 0 && <p className="empty-row">No hay copias en la colección.</p>}
            </div>
          </section>

          <section className="management-section" aria-labelledby="active-deck-title">
            <h3 id="active-deck-title">Baraja activa <span>({session.activeDeckCopyIds.length})</span></h3>
            <p className="management-help">El orden de selección determina el orden de las cartas al iniciar el duelo. Se permite dejarla vacía.</p>
            <div className="management-list">
              {session.activeDeckCopyIds.map((copyId, index) => {
                const copy = session.copies.find((entry) => entry.id === copyId)
                const card = copy && PLAYER_CARD_TYPES.find((entry) => entry.id === copy.cardId)
                return copy && card ? <div className="management-item" key={copyId}><strong>{index + 1}. {card.name}</strong><button className="button button-small" type="button" disabled={!canManageBetweenDuels} onClick={() => changeDeck(copyId, false)}>Retirar</button></div> : null
              })}
              {session.activeDeckCopyIds.length === 0 && <p className="empty-row">Baraja vacía; el siguiente duelo empezará sin cartas.</p>}
            </div>
          </section>
        </div>
        {!canManageBetweenDuels && <p className="management-lock">La colección se consulta durante el duelo; la baraja se edita entre encuentros.</p>}
      </section>

      {isDuelActive && <>
      <section className="duel-board" aria-label="Campo de batalla">
        <section className="side-panel enemy-panel" aria-label="Invocador enemigo">
          <div className="player-heading">
            <div><p className="section-kicker">Oponente</p><h2>{DUNGEON_ENCOUNTERS.find((entry) => entry.id === activeEncounterId)?.enemyName}</h2></div>
            <div className="resources"><span className="life-value">♥ {Math.max(0, enemy.life)}</span><span>✦ {enemy.mana} maná</span></div>
          </div>
          <div className="battle-row">
            <div className="row-label"><strong>Mesa enemiga</strong><span>{enemy.creatures.length} criatura(s)</span></div>
            <div className="creature-row">
              {enemy.creatures.length ? enemy.creatures.map((unit) => (
                <CreatureTile key={unit.id} creature={unit} hint={duel.attackers.includes(unit.id) ? 'atacando' : undefined} />
              )) : <p className="empty-row">No hay criaturas en juego.</p>}
            </div>
          </div>
        </section>

        <div className="battle-divider"><span>⚔</span></div>

        <section className="side-panel player-panel" aria-label="Tu invocador">
          <div className="player-heading">
            <div><p className="section-kicker">Tu invocador · Nivel {player.level}</p><h2>Invocador</h2></div>
            <div className="resources"><span className="life-value">♥ {Math.max(0, player.life)}</span><span>✦ {shownMana} / {usableMana} maná utilizable</span></div>
          </div>
          <p className="fatigue-status">Fatiga {session.fatigue}: bloquea {Math.min(session.fatigue, player.level)} de {player.level} maná base.</p>
          <div className="battle-row">
            <div className="row-label"><strong>Tu mesa</strong><span>{player.creatures.length} criatura(s)</span></div>
            <div className="creature-row">
              {player.creatures.length ? player.creatures.map((unit) => {
                const inBlockMode = isEnemyAttacking
                const canSacrifice = isPlayerMain && selectedCard !== undefined && selectedCard.cost.sacrifices > 0
                const canAttack = duel.phase === 'attackers'
                const selected = inBlockMode
                  ? (blockerChoices[duel.attackers.find((id) => blockerChoices[id]?.includes(unit.id)) ?? ''] ?? []).includes(unit.id)
                  : canSacrifice ? sacrificeIds.includes(unit.id) : canAttack && attackerIds.includes(unit.id)
                let onClick: (() => void) | undefined
                if (canSacrifice) onClick = () => setSacrificeIds((current) => current.includes(unit.id) ? current.filter((id) => id !== unit.id) : [...current, unit.id])
                else if (canAttack) onClick = () => setAttackerIds((current) => current.includes(unit.id) ? current.filter((id) => id !== unit.id) : [...current, unit.id])
                return <CreatureTile key={unit.id} creature={unit} selected={selected} onClick={onClick} hint={duel.attackers.includes(unit.id) ? 'atacando' : undefined} />
              }) : <p className="empty-row">Aún no tienes criaturas. Invoca desde tu mano.</p>}
            </div>
          </div>
        </section>
      </section>

      {isPlayerMain && (
        <section className="hand-section" aria-labelledby="hand-title">
          <div className="section-heading"><div><p className="section-kicker">Preparación</p><h2 id="hand-title">Tu mano <span>({player.hand.length})</span></h2></div><span className="deck-count">Mazo: {player.deck.length}</span></div>
          <div className="hand-row">
            {player.hand.length ? player.hand.map((card) => {
              const playable = card.cost.mana <= player.mana && card.cost.sacrifices <= player.creatures.length
              return (
                <button key={card.id} type="button" className={`hand-card${selectedCardId === card.id ? ' is-selected' : ''}`} disabled={!playable} onClick={() => selectCard(card)} aria-pressed={selectedCardId === card.id}>
                  <span className="card-cost">{card.cost.mana}✦</span><strong>{card.name}</strong><span>{cardStats(card)}</span>
                </button>
              )
            }) : <p className="empty-row">No tienes cartas en la mano.</p>}
          </div>
          {selectedCard && (
            <div className="selection-panel">
              <p>{selectedCard.cost.sacrifices > 0 ? `Selecciona ${selectedCard.cost.sacrifices} criatura(s) para sacrificar (${sacrificeIds.length}/${selectedCard.cost.sacrifices}).` : `Invocar ${selectedCard.name} por ${cardStats(selectedCard)}.`}</p>
              <button type="button" className="button button-primary" disabled={sacrificeIds.length !== selectedCard.cost.sacrifices} onClick={summonSelected}>Invocar criatura</button>
            </div>
          )}
        </section>
      )}

      {isEnemyAttacking && (
        <section className="block-section" aria-labelledby="blocks-title">
          <div className="section-heading"><div><p className="section-kicker">Tu decisión</p><h2 id="blocks-title">Asigna tus bloqueadores</h2></div><span className="deck-count">Elige el orden para cada atacante</span></div>
          {duel.attackers.length === 0 ? <p className="empty-row">El enemigo no declaró atacantes.</p> : (
            <div className="attack-list">
              {duel.attackers.map((attackerId) => {
                const attacker = enemy.creatures.find((unit) => unit.id === attackerId)
                if (!attacker) return null
                return (
                  <div className="attack-assignment" key={attackerId}>
                    <div className="attacker-summary"><strong>{attacker.card.name}</strong><span>{attacker.card.attack} ATQ · {attacker.health} VID</span></div>
                    <div className="blocker-picker">
                      {player.creatures.length ? player.creatures.map((unit) => {
                        const assignedElsewhere = Object.entries(blockerChoices).some(([id, ids]) => id !== attackerId && ids.includes(unit.id))
                        const selected = (blockerChoices[attackerId] ?? []).includes(unit.id)
                        return <button key={unit.id} type="button" className={`blocker-option${selected ? ' is-selected' : ''}`} aria-pressed={selected} disabled={assignedElsewhere} onClick={() => toggleBlock(attackerId, unit.id)}>{unit.card.name} · {unit.card.attack} ATQ · {unit.health} VID</button>
                      }) : <span className="no-blockers">Sin criaturas para bloquear</span>}
                    </div>
                    <p className="assignment-order">Orden de daño: {(blockerChoices[attackerId] ?? []).map((id) => player.creatures.find((unit) => unit.id === id)?.card.name).filter(Boolean).join(' → ') || 'Sin bloqueo'}</p>
                  </div>
                )
              })}
            </div>
          )}
          <div className="action-row"><button className="button button-primary" type="button" onClick={confirmBlocks}>Confirmar bloqueos y resolver</button></div>
        </section>
      )}

      <section className="controls" aria-label="Acciones del duelo">
        {duel.phase === 'main' && duel.activePlayer === 'player' && <button type="button" className="button button-primary" onClick={beginCombat}>Pasar a declarar atacantes</button>}
        {duel.phase === 'attackers' && <><span className="control-help">Seleccionadas: {attackerIds.length} atacante(s)</span><button type="button" className="button button-primary" onClick={declarePlayerAttacks}>Declarar ataques</button></>}
        {duel.phase === 'resolved' && duel.activePlayer === 'player' && <button type="button" className="button button-primary" onClick={finishPlayerTurn}>Terminar turno</button>}
        {duel.phase !== 'finished' && <span className="control-help">Las fases y el daño se resuelven con el motor del duelo.</span>}
      </section>

      <footer className="game-footer"><span>{duel.phase === 'finished' ? 'Duelo finalizado · vida del invocador recuperada' : `Cartas en tu mazo: ${player.deck.length} · Cartas en el mazo enemigo: ${enemy.deck.length}`}</span></footer>
      </>}
    </main>
  )
}
