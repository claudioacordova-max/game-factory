import { useState } from 'react'
import {
  createGameSession,
  declareAttackers,
  declareBlockers,
  endTurn,
  finishSessionDuel,
  resolveCombat,
  RuleViolation,
  startSessionDuel,
  startCombat,
  summonCreature,
} from './engine/index.js'
import { resolveEnemyBlocks, runEnemyTurn } from './engine/enemy.js'
import type { Creature, CreatureCard, DuelState, GameSession } from './engine/index.js'

const PLAYER_DECK: CreatureCard[] = [
  { id: 'player-squire', name: 'Escudero', attack: 2, maxHealth: 3, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-vanguard', name: 'Vanguardia', attack: 3, maxHealth: 4, cost: { mana: 1, sacrifices: 0 } },
  { id: 'player-imp', name: 'Diablillo', attack: 1, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-basilisk', name: 'Basilisco', attack: 4, maxHealth: 4, cost: { mana: 0, sacrifices: 1 } },
  { id: 'player-warden', name: 'Guardián', attack: 2, maxHealth: 6, cost: { mana: 1, sacrifices: 0 } },
  { id: 'player-hawk', name: 'Halcón', attack: 3, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-ogre', name: 'Ogro', attack: 5, maxHealth: 5, cost: { mana: 0, sacrifices: 1 } },
]

const ENEMY_DECK: CreatureCard[] = [
  { id: 'enemy-scout', name: 'Explorador sombrío', attack: 2, maxHealth: 3, cost: { mana: 0, sacrifices: 0 } },
  { id: 'enemy-raider', name: 'Saqueador', attack: 3, maxHealth: 3, cost: { mana: 1, sacrifices: 0 } },
  { id: 'enemy-cultist', name: 'Cultista', attack: 2, maxHealth: 2, cost: { mana: 0, sacrifices: 1 } },
  { id: 'enemy-boar', name: 'Jabalí acorazado', attack: 4, maxHealth: 5, cost: { mana: 1, sacrifices: 0 } },
  { id: 'enemy-bat', name: 'Murciélago', attack: 2, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } },
  { id: 'enemy-guard', name: 'Guardia de la cripta', attack: 2, maxHealth: 5, cost: { mana: 0, sacrifices: 0 } },
  { id: 'enemy-ogre', name: 'Ogro de piedra', attack: 4, maxHealth: 4, cost: { mana: 0, sacrifices: 1 } },
]

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
  const [duel, setDuel] = useState<DuelState>(() => startSessionDuel(session, PLAYER_DECK, ENEMY_DECK))
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [sacrificeIds, setSacrificeIds] = useState<string[]>([])
  const [attackerIds, setAttackerIds] = useState<string[]>([])
  const [blockerChoices, setBlockerChoices] = useState<Record<string, string[]>>({})
  const [notice, setNotice] = useState('Elige una carta para invocarla o comienza el combate.')

  const player = duel.players.player
  const enemy = duel.players.opponent
  const isPlayerMain = duel.phase === 'main' && duel.activePlayer === 'player'
  const selectedCard = player.hand.find((card) => card.id === selectedCardId)

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
  }

  function reject(error: unknown) {
    setNotice(error instanceof RuleViolation ? error.message : 'No se pudo completar esa acción.')
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
      else setDuel(result)
      setAttackerIds([])
      setNotice(result.winner === 'player'
        ? '¡Victoria! El enemigo se quedó sin vida.'
        : `${blocked} bloqueo(s) del enemigo. Se resolvió el combate.`)
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
        setNotice('Derrota. El invocador se quedó sin vida.')
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

  function startNextDuel() {
    setDuel(startSessionDuel(session, PLAYER_DECK, ENEMY_DECK))
    setSelectedCardId(null)
    setSacrificeIds([])
    setAttackerIds([])
    setBlockerChoices({})
    setNotice('Nuevo duelo: las heridas y pérdidas anteriores se mantienen.')
  }

  const phaseText = duel.phase === 'main' ? 'Fase principal'
    : duel.phase === 'attackers' ? 'Declarar atacantes'
      : duel.phase === 'blockers' ? (duel.activePlayer === 'player' ? 'Elegir bloqueos del enemigo' : 'Declarar tus bloqueos')
        : duel.phase === 'resolved' ? 'Combate resuelto'
          : duel.phase === 'resolve' ? 'Resolver combate' : 'Duelo terminado'
  const isEnemyAttacking = duel.phase === 'blockers' && duel.activePlayer === 'opponent'

  return (
    <main className="game-shell">
      <header className="game-header">
        <div>
          <p className="eyebrow">RPG de cartas · Prototipo</p>
          <h1>Duelo en la cripta</h1>
        </div>
        <div className="turn-summary" aria-live="polite">
          <span className="phase-pill">{phaseText}</span>
          <span>Turno {duel.turn} · {duel.activePlayer === 'player' ? 'Tuyo' : 'Enemigo'}</span>
        </div>
      </header>

      {duel.phase === 'finished' && (
        <section className={`result-banner${duel.winner === 'player' ? ' victory' : ' defeat'}`} role="status">
          <div>
            <strong>{duel.winner === 'player' ? '¡Victoria!' : 'Derrota'}</strong>
            <p>{duel.winner === 'player' ? 'Has vencido al guardián de la cripta.' : 'El guardián de la cripta te ha derrotado.'}</p>
          </div>
          <button className="button button-light" type="button" onClick={startNextDuel}>Iniciar siguiente duelo</button>
        </section>
      )}

      <p className="notice" aria-live="polite">{notice}</p>

      <section className="session-summary" aria-label="Estado persistente de la partida">
        <strong>Partida · Invocador {session.invokerLife}/20 VID · {session.copies.length} copia(s) disponibles</strong>
        <div className="session-copies">
          {session.copies.map((copy) => {
            const card = PLAYER_DECK.find((entry) => entry.id === copy.cardId)
            return <span key={copy.id}>{card?.name ?? copy.cardId} {copy.health}/{card?.maxHealth ?? '?'} VID</span>
          })}
          {session.copies.length === 0 && <span>Sin copias disponibles.</span>}
        </div>
      </section>

      <section className="duel-board" aria-label="Campo de batalla">
        <section className="side-panel enemy-panel" aria-label="Invocador enemigo">
          <div className="player-heading">
            <div><p className="section-kicker">Oponente</p><h2>Guardián de la cripta</h2></div>
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
            <div className="resources"><span className="life-value">♥ {Math.max(0, player.life)}</span><span>✦ {player.mana} / {player.level} maná</span></div>
          </div>
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
    </main>
  )
}
