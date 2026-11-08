import { renderToStaticMarkup } from 'react-dom/server'
import {
  activateOrb, activateR01, addCopyToActiveDeck, effectiveAttack, effectiveMaxHealth, hasLegalSummon, r01ActivationAvailability, ACTIVE_CONTENT, createV04BPlay, declareAttackers, declareBlockers, endTurn, healingCandidates, interactV04BObject,
  isChestOpened, isV04BExpeditionComplete, mainHealingSource, orbStatus, ratCycleStatus, reinvokeCreatureType, reinvokeStatus, requireInvoker,
  resolveCombat, resolveMainHealing, sacrificeCandidates, surrender, surrenderAvailability, startCombat, summonAvailability, summonCreature, v04bObjectsForRoom, v04bRoom,
  v04bSpatialRoom, V04B_CARD_TYPES, V04B_ENCOUNTERS, V04B_ROOMS, validateCombatIdentities,
} from '../src/engine/index.js'
import type { Creature, DuelState, GameSession, V04BInteraction, V04BPlayState, V04BRoomId } from '../src/engine/index.js'
import { chooseEnemyBlockers, runEnemyTurn } from '../src/engine/enemy.js'
import type { EnemyAiLevel } from '../src/engine/enemy.js'
import { closestInteractable, isWalkable, roomWithObjects } from '../src/engine/spatial.js'
import type { Point2, RoomDefinition, SpatialPose } from '../src/engine/spatial.js'
import { createExpeditionState } from '../src/engine/world.js'
import { expeditionModeFromSearch } from '../src/adventure/mode.js'
import { adventureForMode } from '../src/adventure/select.js'
import { LEGACY_ADVENTURE } from '../src/adventure/legacyAdventure.js'
import { V04B_ADVENTURE } from '../src/adventure/v04bAdventure.js'
import type { EncounterSummary } from '../src/ui/encounterSummary.js'
import { ExplorationHUD } from '../src/ui/ExplorationHUD.js'
import { CollectionView, DeckPanel } from '../src/ui/CollectionViews.js'
import { PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { unlockCreatureType } from '../src/engine/session.js'
import { seededRandom } from './duelFixtures.js'

export const m8bTests: { name: string; run: () => void | Promise<void> }[] = []
function test(name: string, run: () => void | Promise<void>) { m8bTests.push({ name: `M8b · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
const report = (line: string) => { if ((globalThis as { M8B_REPORT?: boolean }).M8B_REPORT) console.log(line) }

// ---------- Modo por defecto ----------
test('arranque: sin parámetro V0.4B; ?expedicion=legado arranca el legado; ?expedicion=v04b sigue en V0.4B', () => {
  equal(expeditionModeFromSearch(''), 'v04b')
  equal(expeditionModeFromSearch('?expedicion=v04b'), 'v04b')
  equal(expeditionModeFromSearch('?perf'), 'v04b')
  equal(expeditionModeFromSearch('?expedicion=legado'), 'legacy')
  equal(expeditionModeFromSearch('?perf&expedicion=legado'), 'legacy')
  equal(expeditionModeFromSearch('?expedicion=legado&perf=1'), 'legacy')
  ok(adventureForMode(expeditionModeFromSearch('')) === V04B_ADVENTURE, 'El arranque sin parámetro crea la expedición V0.4B')
  ok(adventureForMode(expeditionModeFromSearch('?expedicion=legado')) === LEGACY_ADVENTURE, 'El legado sigue accesible')
  // The legacy binding and its data are unchanged: same initial state and content facade.
  equal(LEGACY_ADVENTURE.create(), createExpeditionState())
  ok(ACTIVE_CONTENT.id === 'legacy-v1' && ACTIVE_CONTENT.playerCardTypes === LEGACY_ADVENTURE.reinvokeCardTypes, 'ACTIVE_CONTENT sigue siendo la fachada del legado')
  const start = V04B_ADVENTURE.create()
  equal(V04B_ADVENTURE.location(start), { roomName: 'Atrio de la Cripta', zoneName: 'El Umbral', complete: false })
  equal(V04B_ADVENTURE.session(start).copies.length, 8)
})

// ---------- Jugador automático (motor real) ----------
/** The approved level-1 heuristics (MIG-D07) mirrored for the player: no strategy beyond legality and simple order. */
const worth = (unit: Creature) => effectiveAttack(unit) + unit.health
function mostWounded(candidates: readonly Creature[]): Creature | undefined {
  let best: Creature | undefined
  for (const unit of candidates) if (!best || effectiveMaxHealth(unit) - unit.health > effectiveMaxHealth(best) - best.health) best = unit
  return best
}

/** Heals as required, summons every payable card (tokens, then weakest real creatures as sacrifices), activates R01 only
 * when it enables a card, then attacks with every creature that has ATQ (skirmish: all on the first real foe). */
export function playerTurn(start: DuelState, level: EnemyAiLevel = 1): DuelState {
  let d = start
  while (mainHealingSource(d)) d = resolveMainHealing(d, mostWounded(healingCandidates(d, mainHealingSource(d)!.id))!.id)
  while (d.phase === 'main') {
    const player = requireInvoker(d.players.player)
    const pick = player.hand.find((card) => summonAvailability(player, card.instanceId!).allowed)
    if (pick) {
      const pool = sacrificeCandidates(player, pick)
      const sacrifices = [...pool.filter((u) => u.entityKind === 'token'), ...pool.filter((u) => u.entityKind !== 'token').sort((a, b) => worth(a) - worth(b))]
        .slice(0, pick.cost.sacrifices).map((u) => u.id)
      const target = pick.id === 'H03' ? mostWounded(healingCandidates(d).filter((u) => !sacrifices.includes(u.id)))?.id
        : pick.id === 'A03' && d.mode === 'skirmish' ? d.players.opponent.creatures.find((u) => !u.echo)?.id : undefined
      d = summonCreature(d, pick.instanceId!, sacrifices, target)
      continue
    }
    const rune = player.creatures.find((unit) => {
      if (!r01ActivationAvailability(d, unit.id).allowed) return false
      return hasLegalSummon(requireInvoker(activateR01(d, unit.id).players.player))
    })
    if (!rune) break
    d = activateR01(d, rune.id)
  }
  if (d.phase === 'finished') return d
  const attackers = d.players.player.creatures.filter((unit) => effectiveAttack(unit) > 0).map((unit) => unit.id)
  const foes = d.players.opponent.creatures.filter((unit) => !unit.echo)
  d = declareAttackers(startCombat(d), attackers, d.mode === 'skirmish' ? Object.fromEntries(attackers.map((id) => [id, foes[0].id])) : {})
  return resolveCombat(d.mode === 'skirmish' ? d : declareBlockers(d, chooseEnemyBlockers(d, level)))
}

/** Blocks each rival attacker with a free creature that survives it; never chump-blocks. */
export function rivalTurn(start: DuelState, level: EnemyAiLevel = 1): DuelState {
  const d = runEnemyTurn(start, level)
  if (d.phase === 'finished') return d
  if (d.phase !== 'blockers') throw new Error(`Turno rival bloqueado en fase ${d.phase}`)
  const free = [...d.players.player.creatures]
  const blocks: Record<string, string[]> = {}
  const attackers = d.attackers.map((id) => d.players.opponent.creatures.find((unit) => unit.id === id)!)
  for (const attacker of attackers) {
    const index = free.findIndex((unit) => unit.health > effectiveAttack(attacker))
    if (index >= 0) { blocks[attacker.id] = [free[index].id]; free.splice(index, 1) }
  }
  return resolveCombat(declareBlockers(d, blocks))
}

/** M8c: the walk uses the level-1 rival by default so the integration test does not depend on balance; level 2 is measured by the balance simulation. */
export function playOut(start: DuelState, label: string, level: EnemyAiLevel = 1): DuelState {
  let d = start
  for (let step = 0; step < 200 && d.phase !== 'finished'; step += 1) {
    validateCombatIdentities(d)
    d = d.activePlayer === 'player' ? playerTurn(d, level) : rivalTurn(d, level)
    if (d.phase === 'finished') break
    d = endTurn(d)
  }
  ok(d.phase === 'finished' && d.winner, `${label}: el combate no terminó`)
  return d
}

// ---------- Recorrido por interacciones validadas por posición ----------
function reachable(definition: RoomDefinition, from: Point2): Point2[] {
  const step = 0.2, queue: Point2[] = [{ x: from.x, z: from.z }], seen = new Set(['0:0'])
  for (let i = 0; i < queue.length; i++) {
    const point = queue[i]
    for (const offset of [{ x: step, z: 0 }, { x: -step, z: 0 }, { x: 0, z: step }, { x: 0, z: -step }]) {
      const next = { x: point.x + offset.x, z: point.z + offset.z }
      const key = `${Math.round((next.x - from.x) / step)}:${Math.round((next.z - from.z) / step)}`
      if (!seen.has(key) && isWalkable(definition, next)) { seen.add(key); queue.push(next) }
    }
  }
  return queue
}

function poseNear(play: V04BPlayState, objectId: string, from: SpatialPose): SpatialPose {
  const room = v04bSpatialRoom(play.expedition.currentRoomId)
  const objects = v04bObjectsForRoom(play)
  ok(objects.some((object) => object.id === objectId), `Objeto inexistente: ${objectId}`)
  const point = reachable(roomWithObjects(room, objects), from).find((candidate) => closestInteractable(candidate, objects)?.id === objectId)
  ok(point, `${objectId} no es alcanzable desde ${JSON.stringify(from)}`)
  return { x: point.x, z: point.z, yaw: 0 }
}

export interface FightLog { room: V04BRoomId; attempts: number; summary: EncounterSummary; level: EnemyAiLevel }

/** Drives App's real adapter: pose-validated interactions, real combats played to the end and the adapter's settlement. */
export class Expedition {
  pose: SpatialPose
  fights: FightLog[] = []
  orbUses = 0
  recoveries = 0
  seed = 1
  /** Set when `fight` runs out of attempts. */
  blocked: { room: V04BRoomId; attempts: number }[] = []
  /** Balance data: continue against the level-1 rival when a level-2 room cannot be won. */
  fallback = false
  onFight?: (room: V04BRoomId, session: GameSession) => void
  constructor(public play: V04BPlayState = createV04BPlay(), public rivalLevel: EnemyAiLevel = 1) { this.pose = v04bSpatialRoom('01').spawn }
  get room() { return this.play.expedition.currentRoomId }
  get session() { return this.play.expedition.session }
  set session(session: GameSession) { this.play = V04B_ADVENTURE.withSession(this.play, session) }
  use(suffix: string): V04BInteraction {
    const id = `v04b-${this.room}:${suffix}`
    const pose = poseNear(this.play, id, this.pose)
    const result = interactV04BObject(this.play, id, pose)
    this.play = result.state
    this.pose = result.kind === 'travel' ? result.arrival : pose
    return result
  }
  go(...rooms: string[]) {
    for (const room of rooms) { const result = this.use(`exit:${room}`); ok(result.kind === 'travel' && result.to === room, `Viaje a ${room}`) }
    return this
  }
  /** Collection management as a player would do between combats: every reserve copy to the deck, free/affordable recoveries. */
  prepare() {
    for (const card of V04B_CARD_TYPES) {
      for (;;) {
        const status = reinvokeStatus(this.session, card.id, V04B_CARD_TYPES)
        if (!status.allowed || (status.cost > 0 && status.resultingMaxLife < 17)) break
        this.session = reinvokeCreatureType(this.session, card.id, V04B_CARD_TYPES)
        this.recoveries++
      }
    }
    for (const copy of this.session.copies) this.session = addCopyToActiveDeck(this.session, copy.id)
  }
  useOrbIfUseful() {
    if (!orbStatus(this.session).canActivate) return false
    this.session = activateOrb(this.session)
    this.orbUses++
    return true
  }
  private launch(seed: number) {
    const id = `v04b-${this.room}:enemy`
    const pose = poseNear(this.play, id, this.pose)
    const started = interactV04BObject(this.play, id, pose, seededRandom(seed))
    ok(started.kind === 'encounter', `${this.room}: el encuentro se lanza`)
    ok(started.state.expedition.session.activeDuelId === started.duel.id, `${this.room}: sesión bloqueada durante el combate`)
    return { started, pose }
  }
  /** Commits a finished duel through the adapter's real settlement, as App does when the duel ends. */
  private commit(started: { state: V04BPlayState }, pose: SpatialPose, finished: DuelState) {
    const room = this.room
    this.play = started.state
    this.pose = pose
    const settled = V04B_ADVENTURE.settle(this.play, finished, [])
    this.play = settled.state
    if (settled.returnPose) { equal(settled.returnPose.key, v04bSpatialRoom(room).id); this.pose = settled.returnPose.pose }
    ok(this.session.activeDuelId === null && this.session.settledDuelIds.includes(finished.id), `${room}: liquidación única`)
    return settled.summary
  }
  /** Real defeat by surrendering on the player's first turn (M8a): normal settlement, +1 fatigue, retry allowed. */
  surrender() {
    this.prepare()
    const { started, pose } = this.launch(this.seed++)
    let d = started.duel
    if (d.activePlayer === 'opponent') d = endTurn(rivalTurn(d, this.rivalLevel))
    ok(surrenderAvailability(d).allowed, 'Rendirse disponible en el turno propio')
    const summary = this.commit(started, pose, surrender(d))
    ok(!summary.won && this.session.fatigue === 1, 'La rendición liquida una derrota normal con fatiga 1')
    return this
  }
  /**
   * Real combat to victory. Each attempt plays a real duel from the current state with the automatic player; the
   * first won duel is committed through the real settlement. Lost attempts are discarded (pure state), so the run
   * does not depend on balance (M8c); committed defeats are exercised separately with surrender().
   */
  fight(maxAttempts = 60) {
    const room = this.room
    // A player restores before a boss duel when the orb has something to restore.
    if (V04B_ENCOUNTERS.find((entry) => entry.id === room)?.mode === 'duel') this.useOrbIfUseful()
    this.prepare()
    this.onFight?.(room, this.session)
    for (let level = this.rivalLevel; ; level = 1) {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { started, pose } = this.launch(this.seed++)
        const finished = playOut(started.duel, `${room}#${attempt}`, level)
        if (finished.winner !== 'player') continue
        const summary = this.commit(started, pose, finished)
        ok(summary.won, `${room}: victoria liquidada`)
        this.fights.push({ room, attempts: attempt, summary, level })
        return summary
      }
      // Balance data only (M8c): a level-2 room that cannot be won is replayed against the level-1 rival so the walk can go on.
      this.blocked.push({ room, attempts: maxAttempts })
      if (!this.fallback || level === 1) throw new Error(`${room}: sin victoria real en ${maxAttempts} intentos`)
    }
  }
  open() {
    const roomId = this.room
    const before = this.session.copies.length
    const id = `v04b-${roomId}:chest`
    const result = V04B_ADVENTURE.interact(this.play, id, poseNear(this.play, id, this.pose))
    this.play = result.state
    ok(result.reward && isChestOpened(this.play.expedition, roomId), `Cofre ${roomId} abierto`)
    equal(this.session.copies.length - before, v04bRoom(roomId).chest!.cardIds.length, `Cofre ${roomId}: copias concedidas`)
    return this
  }
}

const CHEST_ROOMS = V04B_ROOMS.filter((room) => room.chest).map((room) => room.id)
const chestEvents = (session: GameSession) => session.grantedCopyEventIds.filter((id) => id.startsWith('v04b-chest:'))

function finalChecks(run: Expedition) {
  const final = run.fights.at(-1)!
  equal(final.room, '19')
  ok(isV04BExpeditionComplete(run.play.expedition), 'B3 vencido completa la expedición')
  equal(final.summary.title, 'Demo completada')
  ok(final.summary.outcome.includes('Victoria contra El Rey Esqueleto') && final.summary.outcome.includes('Puedes seguir explorando'), final.summary.outcome)
  const location = V04B_ADVENTURE.location(run.play)
  equal(location, { roomName: 'Salón del Trono', zoneName: 'La Cripta Profunda', complete: true })
  const hud = renderToStaticMarkup(<ExplorationHUD life={20} maxLife={20} mana={1} fatigue={0} level={1} roomName={location.roomName} zoneName={location.zoneName} complete={location.complete} onCollection={() => {}} />)
  ok(hud.includes('Demo completada') && hud.includes('Salón del Trono'), 'El HUD indica el final de la expedición')
  // Exploration continues after the end: B3 stays defeated and its exits stay open.
  const enemy = v04bObjectsForRoom(run.play).find((object) => object.kind === 'enemy')
  equal(enemy?.status, 'completed', 'B3 no se reactiva')
  run.go('15')
  ok(V04B_ADVENTURE.location(run.play).complete, 'La expedición sigue completa al seguir explorando')
  run.go('19')
  ok(V04B_ADVENTURE.location(run.play).complete)
}

/** The scripted full walk 01→19 (11 chests, puzzle with a failure, wall, surrender and orb, second rat cycle, final fight). */
export function runFullWalk(run: Expedition) {
  equal(run.session.orb, { charges: 1, capacity: 1 }, 'Orbe inicial cargado')
  run.go('02'); run.fight()
  run.go('03').open().go('04').surrender()
  ok(run.useOrbIfUseful(), 'El orbe elimina la fatiga de la derrota')
  equal([run.session.fatigue, run.session.orb!.charges], [0, 0], 'Orbe gastado: fatiga 0')
  run.fight(); run.open()
  const inscription = run.go('11').use('inscription')
  ok(inscription.kind === 'inscription')
  run.go('12')
  const wrong = run.use('pedestal:mana')
  ok(wrong.kind === 'pedestal' && wrong.result.outcome === 'reset', 'Una runa errónea apaga los pedestales')
  for (const rune of ['hueso', 'sombra', 'mana']) run.use(`pedestal:${rune}`)
  ok(run.play.expedition.puzzle.solved, 'Puzle resuelto')
  run.open().go('05', '04', '03', '13').open().go('03')
  equal(run.session.orb!.charges, 0, 'Orbe gastado antes del circuito')
  run.go('07'); run.fight(); run.open().go('08'); run.fight(); run.go('09'); run.fight(); run.open().go('10')
  equal(ratCycleStatus(run.session).encounters, { '07': 'defeated', '08': 'defeated', '09': 'defeated' })
  const altar = run.use('altar')
  ok(altar.kind === 'altar' && altar.result.recharged, 'El altar recarga el orbe')
  equal(run.session.orb!.charges, 1)
  ok(ratCycleStatus(run.session).returnClosed, 'El regreso 10→09 queda cerrado')
  // Second cycle: leaving through 10→04 and re-entering from 03 reactivates the rats, never the chests.
  run.go('04', '03', '07')
  equal(v04bObjectsForRoom(run.play).find((object) => object.kind === 'enemy')?.status, 'available', '07 reactivada')
  equal(v04bObjectsForRoom(run.play).find((object) => object.kind === 'chest')?.status, 'completed', 'El cofre de 07 sigue abierto')
  run.fight()
  run.go('03', '04', '05', '06'); run.fight()
  run.go('14').open()
  const wall = run.use('wall')
  ok(wall.kind === 'wall' && wall.result.revealed, 'El muro abre 14↔18')
  run.go('18'); run.fight(); run.open().go('14', '16'); run.fight(); run.open().go('17'); run.fight(); run.open().go('15').open().go('19')
  run.fight()
}

test('recorrido completo 01→19 por el motor real: combates jugados, cofres, puzle, muro, orbe y ciclo de ratas', () => {
  const run = new Expedition()
  runFullWalk(run)
  equal(CHEST_ROOMS.filter((id) => isChestOpened(run.play.expedition, id)), CHEST_ROOMS, 'Los once cofres reclamados')
  equal(run.session.grantedCopyEventIds.length, 12, 'Preparación inicial + 11 cofres')
  finalChecks(run)
  report(`M8b recorrido completo: ${run.fights.map((f) => `${f.room}×${f.attempts}`).join(' ')} · orbe ${run.orbUses} · recuperaciones ${run.recoveries} · copias ${run.session.copies.length}`)
})

/** Minimal route without secrets: 01-02-03-04-05-06-14-15-19. */
export function runMinimalWalk(run: Expedition) {
  run.go('02'); run.fight()
  run.go('03', '04'); run.fight()
  run.go('05', '06'); run.fight()
  run.go('14', '15', '19'); run.fight()
}

test('sin secretos obligatorios: B3 alcanzable y vencible sin puzle 11/12, sin muro 14↔18 y sin cofres', () => {
  const run = new Expedition()
  runMinimalWalk(run)
  const expedition = run.play.expedition
  ok(!expedition.puzzle.solved && expedition.puzzle.progress === 0, 'Puzle sin tocar')
  ok(!expedition.wallExamined, 'Muro sin examinar')
  equal(chestEvents(run.session), [], 'Ningún cofre reclamado')
  ok(!expedition.visitedRoomIds.some((id) => ['07', '08', '09', '10', '11', '12', '13', '16', '17', '18'].includes(id)), 'Ninguna sala opcional visitada')
  finalChecks(run)
  report(`M8b sin secretos: ${run.fights.map((f) => `${f.room}×${f.attempts}`).join(' ')} · orbe ${run.orbUses} · recuperaciones ${run.recoveries}`)
})

// ---------- Textos de integración ----------
test('Colección: V0.4B sin textos de mejoras legadas; el legado conserva los suyos exactos', () => {
  const noop = () => {}
  const base = V04B_ADVENTURE.session(V04B_ADVENTURE.create())
  const wounded = { ...base, copies: base.copies.map((copy, index) => (index === 0 ? { ...copy, health: copy.health - 1 } : copy)) }
  const v04b = renderToStaticMarkup(<CollectionView session={wounded} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} />)
  for (const legacyText of ['Sin mejoras', 'sin mejoras', 'Mejoras:', 'Mejora por victoria', 'sus mejoras']) ok(!v04b.includes(legacyText), `V0.4B muestra «${legacyText}»`)
  // UI-1: the reserve is empty here (all initial copies are in the deck), so health states are checked on the
  // grouped deck panel and the recovery text on the Reinvocar tab.
  const deck = renderToStaticMarkup(<DeckPanel session={wounded} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} />)
  ok(deck.includes('1 herida'), 'Estado de salud de las copias')
  const reinvoke = renderToStaticMarkup(<CollectionView session={wounded} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialTab="reinvoke" />)
  for (const legacyText of ['Sin mejoras', 'sin mejoras', 'Mejoras:', 'Mejora por victoria', 'sus mejoras']) ok(!reinvoke.includes(legacyText) && !deck.includes(legacyText), `V0.4B muestra «${legacyText}»`)
  ok(reinvoke.includes('Vuelven sanas a la reserva.'), 'Recuperación V0.4B')
  ok(v04b.includes('Morir o sacrificarse elimina la copia; su cupo se conserva y recuperarla cuesta vida máxima (las semillas, gratis).'), 'Pie V0.4B')
  const legacySession = unlockCreatureType(createExpeditionState().session, PLAYER_CARD_TYPES.find((card) => card.growth)!)
  const legacy = renderToStaticMarkup(<CollectionView session={legacySession} onChangeDeck={noop} onReinvoke={noop} />)
  for (const text of [' · Sin mejoras', 'Copia básica, sin mejoras.', 'Mejora por victoria', 'Las bajas y sacrificios pierden su copia y sus mejoras. El tipo descubierto se conserva.']) ok(legacy.includes(text), `Legado sin «${text}»`)
  ok(!legacy.includes('Copia sana') && !legacy.includes('Vuelve sana'), 'El legado no recibe textos V0.4B')
})
