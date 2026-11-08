import { useEffect, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import {
  activateOrb,
  restorationPreview,
  reinvokeCreatureType,
  reinvokeAllLostCopies,
  reinvokeAllStatus,
  addCopyToActiveDeck,
  baseMana,
  cardInstanceId,
  RuleViolation,
  removeCopyFromActiveDeck,
  ExplorationViolation,
} from './engine/index.js'
import type { CreatureCard, DuelState } from './engine/index.js'
import { ExplorationScene } from './scene/ExplorationScene.js'
import { V04BWorldObject } from './scene/V04BActors.js'
import type { SpatialPose } from './engine/spatial.js'
import type { EncounterSummary } from './ui/encounterSummary.js'
import type { AdventureAdapter, ChestReward } from './adventure/types.js'
import { ChestRewardOverlay } from './ui/ChestRewardOverlay.js'
import { expeditionModeFromSearch, perfEnabledFromSearch } from './adventure/mode.js'
import { adventureForMode } from './adventure/select.js'

import { CombatView } from './ui/CombatView.js'
import './ui/combat.css'
import { CollectionOverlay, GameOverlay } from './ui/CollectionOverlay.js'
import { ExplorationHUD, orbControlFor } from './ui/ExplorationHUD.js'
import { GameNotice } from './ui/GameNotice.js'
import { collectionShortcut } from './ui/explorationControls.js'
import { applyCombatAction, cancelSummonShortcut, createCombatControls } from './ui/combatActions.js'
import type { CombatAction, CombatControls } from './ui/combatActions.js'
import { movePlayerBlocker } from './ui/blockAssignments.js'
import { applyCombatBlockDrop, COMBAT_DRAG_MIME, createCombatDrag, readCombatDrag } from './ui/blockDrag.js'
import { Icon } from './ui/GameIcons.js'
import {
  assignDirectedAttacker,
  moveDirectedAttacker,
  togglePlayerAttacker,
} from './ui/combatSelection.js'

/** Without a parameter the V0.4B expedition starts; ?expedicion=legado creates the legacy game exactly as before; ?perf adds the probe. */
export default function App() {
  const [{ adapter, perf }] = useState(() => {
    const search = typeof window === 'undefined' ? '' : window.location.search
    return { adapter: adventureForMode(expeditionModeFromSearch(search)) as AdventureAdapter<unknown>, perf: perfEnabledFromSearch(search) }
  })
  return <GameApp adapter={adapter} perf={perf} />
}

function GameApp<S>({ adapter, perf }: { adapter: AdventureAdapter<S>; perf: boolean }) {
  const [adventure, setAdventure] = useState<S>(() => adapter.create())
  const session = adapter.session(adventure)
  const [duel, setDuelState] = useState<DuelState>(() => adapter.initialDuel(adventure))
  const controls = useRef(createCombatControls(duel))
  const renderedRevision = controls.current.revision
  const settledDuels = useRef(new Set<string>())
  const isDuelActive = session.activeDuelId !== null
  const poses = useRef<Partial<Record<string, SpatialPose>>>({})
  const sacrificedCopies = useRef<string[]>([])
  const [lastResult, setLastResult] = useState<EncounterSummary | null>(null)
  /** V0.4B chest reward panel; the legacy adapter never returns a reward. */
  const [chestReward, setChestReward] = useState<ChestReward | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [sacrificeIds, setSacrificeIds] = useState<string[]>([])
  const [attackerIds, setAttackerIds] = useState<string[]>([])
  const [targetChoices, setTargetChoices] = useState<Record<string, string>>({})
  const [blockerChoices, setBlockerChoicesState] = useState<Record<string, string[]>>({})
  const blockSelection = useRef({ choices: {} as Record<string, string[]>, revision: 0 })
  const [blockDragOrigin] = useState(() => crypto.randomUUID())
  const activeBlockDrag = useRef<string | null>(null)
  const relationRevision = useRef(0)
  const attackSelection = useRef({ attackerIds, targetChoices })
  attackSelection.current = { attackerIds, targetChoices }
  const presentationBusy = useRef(false)
  const [presenting, setPresenting] = useState(false)
  const presentationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [resumeRevision, setResumeRevision] = useState(0)
  function resumeExploration() { setResumeRevision((value) => value + 1) }
  function closeCollection() { setView('exploration'); resumeExploration() }
  function closeResult() { setLastResult(null); resumeExploration() }
  function closeChestReward() { setChestReward(null); resumeExploration() }
  useEffect(() => () => { if (presentationTimer.current !== null) clearTimeout(presentationTimer.current) }, [])
  const [view, setView] = useState<'exploration' | 'collection'>('exploration')
  const [notice, setNoticeText] = useState('')
  const [noticeRevision, setNoticeRevision] = useState(0)
  const [noticeExpiresAt, setNoticeExpiresAt] = useState(0)
  function clearNotice() { setNoticeText('') }
  function setNotice(message: string) {
    setNoticeText(message)
    setNoticeExpiresAt(Date.now() + 5200)
    setNoticeRevision((current) => current + 1)
  }

  const player = duel.players.player
  const isPlayerMain = duel.phase === 'main' && duel.activePlayer === 'player'
  const canManageBetweenDuels = !isDuelActive
  const usableMana = canManageBetweenDuels ? Math.max(0, player.level - session.fatigue) : baseMana(player, duel.collectionProfile)

  function publishControls(next: CombatControls) {
    const previous = controls.current.duel
    activeBlockDrag.current = null
    if (previous.id !== next.duel.id || previous.turn !== next.duel.turn || previous.phase !== next.duel.phase || previous.activePlayer !== next.duel.activePlayer) {
      setBlockerChoices({})
    }
    controls.current = next
    setDuelState(next.duel)
    setSelectedCardId(next.pending?.cardId ?? null)
    setSacrificeIds(next.pending?.sacrificeIds ?? [])
  }

  function setBlockerChoices(choices: Record<string, string[]>) {
    if (choices === blockSelection.current.choices) return
    blockSelection.current = { choices, revision: blockSelection.current.revision + 1 }
    setBlockerChoicesState(choices)
  }

  function setDuel(next: DuelState) {
    publishControls(createCombatControls(next, controls.current.revision + 1))
  }

  function dispatchCombat(action: CombatAction): boolean {
    if (presentationBusy.current) return false
    const result = applyCombatAction(controls.current, action, renderedRevision)
    if (result.state === controls.current) { if (result.message) setNotice(result.message); return false }
    const commit = () => {
      publishControls(result.state)
      if (result.message) setNotice(result.message)
      sacrificedCopies.current.push(...result.sacrificedCopyIds.filter((id) => !sacrificedCopies.current.includes(id)))
      if (result.state.duel.phase === 'finished') closeDuel(result.state.duel)
    }
    if (result.presentation) {
      // The transaction is already computed exactly once; only its visual publication waits.
      presentationBusy.current = true
      activeBlockDrag.current = null
      controls.current = result.state
      setPresenting(true)
      setDuelState(result.presentation)
      presentationTimer.current = setTimeout(() => {
        presentationTimer.current = null
        presentationBusy.current = false
        setPresenting(false)
        commit()
      }, 420)
    } else commit()
    return true
  }

  useEffect(() => {
    if (isDuelActive && !presentationBusy.current) dispatchCombat({ type: 'advance' })
  }, [duel, isDuelActive, selectedCardId, sacrificeIds.length])

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      const target = event.target
      const editing = target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null)
      if (!isDuelActive || !controls.current.pending || controls.current.pending.kind === 'healing' || !cancelSummonShortcut(event, editing)) return
      event.preventDefault()
      dispatchCombat({ type: 'cancel' })
    }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [isDuelActive, selectedCardId, renderedRevision])

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target
      const editing = target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null)
      const action = collectionShortcut(event, { inCombat: isDuelActive, resultOpen: lastResult !== null || chestReward !== null, collectionOpen: view === 'collection' }, editing)
      if (action) {
        event.preventDefault()
        if (action === 'open') setView('collection')
        else closeCollection()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [isDuelActive, lastResult, chestReward, view])

  function closeDuel(result: DuelState) {
    if (settledDuels.current.has(result.id)) return
    const { state: next, summary, returnPose } = adapter.settle(adventure, result, sacrificedCopies.current)
    settledDuels.current.add(result.id)
    if (returnPose) poses.current[returnPose.key] = returnPose.pose
    setAdventure(next)
    setDuel(result)
    setLastResult(summary)
    setView('exploration')
    setNotice(summary.outcome)
  }

  function reject(error: unknown) {
    setNotice(error instanceof RuleViolation || error instanceof ExplorationViolation ? error.message : 'No se pudo completar esa acción.')
  }

  function selectCard(card: CreatureCard) {
    dispatchCombat({ type: 'summon', cardId: cardInstanceId(card) })
  }

  function attemptSummonDrop(cardId: string) {
    dispatchCombat({ type: 'summon', cardId })
  }

  function allowFieldDrop(event: DragEvent<HTMLElement>) {
    if (!isPlayerMain) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function dropHandCard(event: DragEvent<HTMLElement>) {
    if (!isPlayerMain) return
    event.preventDefault()
    const cardId = event.dataTransfer.getData('text/plain')
    if (cardId) attemptSummonDrop(cardId)
  }

  function toggleSacrifice(creatureId: string) {
    dispatchCombat({ type: 'sacrifice', creatureId })
  }

  function activateRune(creatureId: string) {
    dispatchCombat({ type: 'activate-r01', creatureId })
  }

  function beginCombat() {
    if (!dispatchCombat({ type: 'begin-attack' })) return
    setAttackerIds([])
    setTargetChoices({})
  }

  function declarePlayerAttacks() {
    if (!dispatchCombat({ type: 'attack', attackerIds, targets: targetChoices })) return
    setAttackerIds([])
    setTargetChoices({})
    setBlockerChoices({})
  }

  function moveBlocker(blockerId: string, direction: -1 | 1) {
    if (presentationBusy.current) return
    try { relationRevision.current++; setBlockerChoices(movePlayerBlocker(controls.current.duel, blockSelection.current.choices, blockerId, direction)) } catch (error) { reject(error) }
  }

  function moveAttacker(attackerId: string, direction: -1 | 1) {
    if (presentationBusy.current) return
    try {
      const current = { ...attackSelection.current, focusedAttackerId: null }
      const selection = moveDirectedAttacker(controls.current.duel, current, attackerId, direction)
      if (selection === current) return
      activeBlockDrag.current = null
      relationRevision.current++
      attackSelection.current = selection
      setAttackerIds(selection.attackerIds)
    } catch (error) { reject(error) }
  }

  function blockDragContext() {
    const current = controls.current
    return { origin: blockDragOrigin, duelId: current.duel.id, turn: current.duel.turn, revision: current.revision, selectionRevision: relationRevision.current }
  }

  function startBlockDrag(event: DragEvent<HTMLButtonElement>, blockerId: string): boolean {
    try {
      if (presentationBusy.current || renderedRevision !== controls.current.revision) throw new RuleViolation('La decisión cambió. Vuelve a arrastrar la criatura.')
      const raw = createCombatDrag(controls.current.duel, blockDragContext(), blockerId)
      activeBlockDrag.current = raw
      event.dataTransfer.setData(COMBAT_DRAG_MIME, raw)
      event.dataTransfer.effectAllowed = 'move'
      return true
    } catch (error) { event.preventDefault(); reject(error); return false }
  }

  function endBlockDrag() { activeBlockDrag.current = null }

  function dropRelation(event: DragEvent<HTMLElement>, targetId: string | null) {
    event.preventDefault()
    event.stopPropagation()
    const raw = event.dataTransfer.getData(COMBAT_DRAG_MIME)
    const registered = activeBlockDrag.current
    activeBlockDrag.current = null
    if (presentationBusy.current) return
    try {
      if (!registered || registered !== raw) throw new RuleViolation('Arrastra una criatura propia de este tablero.')
      const current = controls.current.duel
      if (current.phase === 'blockers') {
        setBlockerChoices(applyCombatBlockDrop(current, blockSelection.current.choices, blockDragContext(), raw, targetId))
      } else {
        const id = readCombatDrag(current, blockDragContext(), raw)
        const selection = assignDirectedAttacker(current, { ...attackSelection.current, focusedAttackerId: null }, id, targetId)
        attackSelection.current = selection
        setAttackerIds(selection.attackerIds)
        setTargetChoices(selection.targetChoices)
      }
      relationRevision.current++
    } catch (error) { reject(error) }
  }

  function selectPlayerAttacker(unitId: string) {
    if (presentationBusy.current || controls.current.duel.mode !== 'duel' || controls.current.duel.phase !== 'attackers' || controls.current.duel.activePlayer !== 'player') return
    const selection = togglePlayerAttacker({ ...attackSelection.current, focusedAttackerId: null }, unitId)
    attackSelection.current = selection
    setAttackerIds(selection.attackerIds)
    setTargetChoices(selection.targetChoices)
  }

  function cancelSummon() {
    dispatchCombat({ type: 'cancel' })
  }

  function confirmBlocks() {
    if (!dispatchCombat({ type: 'blocks', choices: blockSelection.current.choices })) return
    setBlockerChoices({})
  }

  function interactNearby(objectId: string) {
    try {
      const result = adapter.interact(adventure, objectId, poses.current[adapter.roomKey(adventure)] ?? adapter.room(adventure).spawn)
      const message = result.message
      if (result.pose) poses.current[result.pose.key] = result.pose.pose
      setAdventure(result.state)
      setLastResult(null)
      if (result.reward) setChestReward(result.reward)
      if (result.duel) {
        setDuel(result.duel)
        sacrificedCopies.current = []
        setSelectedCardId(null)
        setSacrificeIds([])
        setAttackerIds([])
        setTargetChoices({})
        setBlockerChoices({})
      }
      setNotice(message)
    } catch (error) {
      reject(error)
    }
  }

  function changeDeck(copyId: string, included: boolean) {
    try {
      const next = included ? addCopyToActiveDeck(session, copyId) : removeCopyFromActiveDeck(session, copyId)
      setAdventure(adapter.withSession(adventure, next))
      setNotice(included ? 'Copia añadida a la baraja activa.' : 'Copia retirada de la baraja; sigue en tu colección.')
    } catch (error) { reject(error) }
  }

  function recoverType(cardId: string) {
    try {
      setAdventure(adapter.withSession(adventure, reinvokeCreatureType(session, cardId, adapter.reinvokeCardTypes)))
      setNotice('Nueva copia básica recuperada en reserva. Puedes añadirla a la baraja.')
    } catch (error) { reject(error) }
  }

  /** UI-1, V0.4B only: one atomic recovery of every lost copy (threshold checked by the domain). */
  function recoverAll() {
    try {
      const status = reinvokeAllStatus(session, adapter.reinvokeCardTypes)
      setAdventure(adapter.withSession(adventure, reinvokeAllLostCopies(session, adapter.reinvokeCardTypes)))
      setNotice(`${status.cardIds.length} copias reinvocadas en reserva ${status.cost === 0 ? 'gratis' : `por ${status.cost} de vida máxima`} (máximo ${status.resultingMaxLife}).`)
    } catch (error) { reject(error) }
  }

  /** V0.4B only; the normal game uses the legacy profile, so no orb control is shown there. */
  function activateSessionOrb() {
    try {
      const preview = restorationPreview(session)
      setAdventure(adapter.withSession(adventure, activateOrb(session)))
      setNotice(`Orbe activado: ${preview.healedCopies} copias sanadas, vida máxima +${preview.maxLifeRecovered}, fatiga ${preview.fatigueRemoved ? 'eliminada' : 'sin cambios'}.`)
    } catch (error) {
      setNotice(error instanceof RuleViolation ? error.message : 'No se pudo activar el orbe.')
    }
    resumeExploration()
  }
  const orbControl = orbControlFor(session, activateSessionOrb)
  const location = adapter.location(adventure)
  const objects = adapter.objects(adventure)
  const room = adapter.room(adventure)
  const roomKey = adapter.roomKey(adventure)
  const activeEncounter = adapter.encounter(duel)
  return (
    <main className={`game-shell ${isDuelActive ? 'mode-duel' : 'mode-exploration'}`}>
      {!isDuelActive ? <div className="exploration-world">
        <ExplorationScene room={room} initialPose={poses.current[roomKey] ?? room.spawn} objects={objects} resumeRevision={resumeRevision} disabled={view === 'collection' || lastResult !== null || chestReward !== null} onInteract={interactNearby} onPoseChange={(pose) => { poses.current[roomKey] = pose }}
          ObjectView={adapter.id === 'v04b' ? V04BWorldObject : undefined} perf={perf} />
        <div className="exploration-atmosphere" aria-hidden="true" />
        <ExplorationHUD life={session.invokerLife} maxLife={session.invokerMaxLife} mana={usableMana} fatigue={session.fatigue} level={player.level} roomName={location.roomName} zoneName={location.zoneName} complete={location.complete} onCollection={() => setView('collection')} orb={orbControl} />
        {view !== 'collection' && !lastResult && !chestReward && <GameNotice message={notice} revision={noticeRevision} expiresAt={noticeExpiresAt} onClear={clearNotice} onDismiss={resumeExploration} keepFocus={adapter.id === 'v04b'} />}
        {view === 'collection' && <CollectionOverlay session={session} cardTypes={adapter.collectionCardTypes} onClose={closeCollection} onChangeDeck={changeDeck} onReinvoke={recoverType} onReinvokeAll={adapter.id === 'v04b' ? recoverAll : undefined} notice={notice} noticeRevision={noticeRevision} noticeExpiresAt={noticeExpiresAt} onClearNotice={clearNotice} />}
        {lastResult && <GameOverlay label="Resultado del encuentro" className={`encounter-result ${lastResult.won ? 'victory' : 'defeat'}${adapter.id === 'v04b' ? ' encounter-result-fit' : ''}`} onClose={closeResult}>
          <span className="result-seal"><Icon name={lastResult.won ? 'check' : 'skull'} /></span>
          <p className="section-kicker">{lastResult.won ? 'Encuentro superado' : 'La aventura continúa'}</p><h1>{lastResult.title}</h1><p className="result-outcome">{lastResult.outcome}</p><p className="result-resources">{lastResult.resources}</p>
          <details open><summary>{adapter.id === 'v04b' ? 'Heridas, bajas y sacrificios' : 'Heridas, bajas, mejoras y descubrimientos'}</summary><ul>{lastResult.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></details>
          <button type="button" className="button button-primary" onClick={closeResult}>Continuar explorando<Icon name="arrow" /></button>
        </GameOverlay>}
        {chestReward && <ChestRewardOverlay reward={chestReward} onClose={closeChestReward} />}
      </div> : <CombatView duel={duel} session={session} enemyName={activeEncounter.name} enemyMaxLife={activeEncounter.maxLife}
        notice={notice} noticeRevision={noticeRevision} noticeExpiresAt={noticeExpiresAt} onClearNotice={clearNotice} selectedCardId={selectedCardId} sacrificeIds={sacrificeIds} attackerIds={attackerIds} targetChoices={targetChoices} blockerChoices={blockerChoices} presenting={presenting}
        pending={controls.current.pending} onActivateN01={(creatureId) => dispatchCombat({ type: 'activate-n01', creatureId })}
        onChooseEffectTarget={(creatureId) => dispatchCombat({ type: 'effect-target', creatureId })} onSurrender={() => dispatchCombat({ type: 'surrender' })} onConfirmRitual={() => dispatchCombat({ type: 'confirm-ritual' })} onEditRitual={() => dispatchCombat({ type: 'edit-ritual' })}
        onSelectCard={selectCard} onActivateR01={activateRune} onAllowFieldDrop={allowFieldDrop} onDropHandCard={dropHandCard} onToggleSacrifice={toggleSacrifice} onSelectAttacker={selectPlayerAttacker}
        onStartBlockDrag={startBlockDrag} onEndBlockDrag={endBlockDrag} onDropRelation={dropRelation} onMoveBlocker={moveBlocker} onMoveAttacker={moveAttacker}
        onCancelSummon={cancelSummon} onBeginCombat={beginCombat} onDeclareAttacks={declarePlayerAttacks} onConfirmBlocks={confirmBlocks} />}
    </main>
  )
}
