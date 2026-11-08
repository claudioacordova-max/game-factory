import { act, StrictMode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ACTIVE_CONTENT, addCopyToActiveDeck, createV04BEncounterDuel, createV04BExpedition, createV04BInitialSession, createV04BPlay, ExplorationViolation,
  interactV04BObject, isEncounterDefeated, isV04BExpeditionComplete, litRunes, recordRoomVictory, roomExits, RuleViolation, settleV04BEncounter, travel,
  v04bArrivalPose, v04bNeighbours, v04bObjectsForRoom, v04bRoom, v04bSpatialRoom, V04B_CARD_TYPES, V04B_ENCOUNTERS, V04B_INSCRIPTION_TEXT,
  V04B_ONE_WAY_EDGES, V04B_ROOMS, V04B_SPATIAL_ROOMS, WALL_EXITS,
} from '../src/engine/index.js'
import type { DuelState, V04BExpedition, V04BInteraction, V04BPlayState, V04BRoomId } from '../src/engine/index.js'
import {
  closestInteractable, INTERACTION_RANGE, isWalkable, ROOMS, roomWithObjects,
} from '../src/engine/spatial.js'
import type { ExplorationObject, Point2, RoomDefinition, SpatialPose } from '../src/engine/spatial.js'
import { createExpeditionState, objectsForRoom } from '../src/engine/world.js'
import { expeditionModeFromSearch, perfEnabledFromSearch } from '../src/adventure/mode.js'
import { adventureForMode } from '../src/adventure/select.js'
import { LEGACY_ADVENTURE } from '../src/adventure/legacyAdventure.js'
import { V04B_ADVENTURE } from '../src/adventure/v04bAdventure.js'
import { ExplorationHUD, orbControlFor } from '../src/ui/ExplorationHUD.js'
import { v04bEncounterSummary, v04bInteractionMessage } from '../src/ui/v04bMessages.js'
import { boundaryMasonry, CRYPT_THEMES, cryptTheme, V04B_CRYPT_THEMES, V04B_FIGURE_GROUPS } from '../src/scene/cryptVisuals.js'
import { CryptRoom } from '../src/scene/CryptEnvironment.js'
import { WorldObject } from '../src/scene/ExplorationActors.js'
import { V04BWorldObject } from '../src/scene/V04BActors.js'

export const m6bTests: { name: string; run: () => void | Promise<void> }[] = []
function test(name: string, run: () => void | Promise<void>) { m6bTests.push({ name: `M6b · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof ExplorationViolation || error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}

const ROOM_IDS = V04B_ROOMS.map((room) => room.id)
const incoming = (id: V04BRoomId) => ROOM_IDS.filter((other) => v04bNeighbours(other).includes(id))

/** Grid flood fill from a pose, as tests/spatial.ts does for the legacy rooms. */
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

/** Every exit and feature of a room present at once (worst case for occupancy). */
function allObjects(roomId: V04BRoomId): ExplorationObject[] {
  const room = v04bSpatialRoom(roomId)
  const objects: ExplorationObject[] = Object.entries(room.exits).map(([to, exit]) => ({ id: `exit:${to}`, label: to, kind: 'exit', position: exit!.position, status: 'available',
    ...(exit!.side === 'west' || exit!.side === 'east' ? { sideWall: true } : {}) }))
  const f = room.features
  const feature = (id: string, position: Point2, kind: ExplorationObject['kind'] = 'feature'): ExplorationObject => ({ id, label: id, kind, position, status: 'available' })
  if (f.encounter) objects.push(feature('enemy', f.encounter, 'enemy'))
  if (f.altar) objects.push(feature('altar', f.altar))
  if (f.inscription) objects.push(feature('inscription', f.inscription))
  if (f.pedestals) for (const [rune, position] of Object.entries(f.pedestals)) objects.push(feature(`pedestal:${rune}`, position))
  if (f.crackedWall) objects.push(feature('wall', f.crackedWall))
  return objects
}

/** A reachable pose from which `objectId` is the closest available interaction. */
function poseNear(play: V04BPlayState, objectId: string, from: SpatialPose): SpatialPose {
  const room = v04bSpatialRoom(play.expedition.currentRoomId)
  const objects = v04bObjectsForRoom(play)
  const target = objects.find((object) => object.id === objectId)
  ok(target, `Objeto inexistente: ${objectId}`)
  const points = reachable(roomWithObjects(room, objects), from)
  const point = points.find((candidate) => closestInteractable(candidate, objects)?.id === objectId)
  ok(point, `${objectId} no es alcanzable desde ${JSON.stringify(from)}`)
  return { x: point.x, z: point.z, yaw: 0 }
}

/** Drives the real interaction API (pose-validated), like App does. */
class Walker {
  pose: SpatialPose
  constructor(public play: V04BPlayState = createV04BPlay()) { this.pose = v04bSpatialRoom('01').spawn }
  get room() { return this.play.expedition.currentRoomId }
  use(suffix: string): V04BInteraction {
    const id = `v04b-${this.room}:${suffix}`
    const pose = poseNear(this.play, id, this.pose)
    const result = interactV04BObject(this.play, id, pose)
    this.play = result.state
    this.pose = result.kind === 'travel' ? result.arrival : pose
    return result
  }
  go(...rooms: string[]) { for (const room of rooms) { const result = this.use(`exit:${room}`); ok(result.kind === 'travel' && result.to === room) } return this }
  fight(winner: 'player' | 'opponent') {
    const result = this.use('enemy')
    ok(result.kind === 'encounter', 'El objeto de encuentro lanza un combate')
    ok(this.play.expedition.session.activeDuelId === result.duel.id, 'La sesión queda bloqueada durante el combate')
    const finished: DuelState = { ...result.duel, phase: 'finished', winner }
    const settlement = settleV04BEncounter(this.play, finished)
    this.play = settlement.state
    if (settlement.state.returnPoint) this.pose = settlement.state.returnPoint.pose
    return { duel: finished, settlement }
  }
  win() { const { settlement } = this.fight('player'); ok(settlement.won); return this }
}

// ---------- Acceso por parámetro ----------
test('acceso: solo ?expedicion=v04b crea la expedición V0.4B; sin parámetro el juego legado es idéntico', () => {
  equal(expeditionModeFromSearch(''), 'legacy')
  equal(expeditionModeFromSearch('?expedicion=otra'), 'legacy')
  equal(expeditionModeFromSearch('?v04b'), 'legacy')
  equal(expeditionModeFromSearch('?expedicion=v04b'), 'v04b')
  equal(expeditionModeFromSearch('?perf&expedicion=v04b'), 'v04b')
  ok(adventureForMode('legacy') === LEGACY_ADVENTURE && adventureForMode('v04b') === V04B_ADVENTURE)
  const legacy = LEGACY_ADVENTURE.create()
  equal(legacy, createExpeditionState())
  equal(LEGACY_ADVENTURE.room(legacy), ROOMS['sector-1'])
  equal(LEGACY_ADVENTURE.objects(legacy), objectsForRoom(legacy))
  equal(LEGACY_ADVENTURE.session(legacy).collectionProfile, 'legacy')
  equal(LEGACY_ADVENTURE.location(legacy), { roomName: ROOMS['sector-1'].name, complete: false })
  ok(LEGACY_ADVENTURE.collectionCardTypes === undefined, 'El legado conserva el catálogo por defecto de Colección')
  ok(ACTIVE_CONTENT.id === 'legacy-v1' && ACTIVE_CONTENT.playerCardTypes === LEGACY_ADVENTURE.reinvokeCardTypes, 'El contenido activo sigue siendo el legado')
  const v04b = V04B_ADVENTURE.create()
  equal(v04b.expedition, createV04BExpedition(v04b.expedition.session))
  equal(V04B_ADVENTURE.session(v04b).collectionProfile, 'v04b')
  ok(V04B_ADVENTURE.session(v04b).activeDuelId === null, 'El combate de reserva no queda activo')
  equal(V04B_ADVENTURE.roomKey(v04b), 'v04b-01')
})

test('rendimiento: ?perf es combinable y solo se activa con el parámetro', () => {
  ok(!perfEnabledFromSearch('') && !perfEnabledFromSearch('?expedicion=v04b'))
  ok(perfEnabledFromSearch('?perf') && perfEnabledFromSearch('?expedicion=v04b&perf') && perfEnabledFromSearch('?perf=1'))
})

// ---------- Salas 3D ----------
test('salas: 19 definiciones con nombre oficial, tamaño legado compacto y salidas exactas del grafo', () => {
  equal(Object.keys(V04B_SPATIAL_ROOMS).sort(), ROOM_IDS)
  for (const id of ROOM_IDS) {
    const room = v04bSpatialRoom(id)
    equal(room.name, v04bRoom(id).name)
    equal([room.width, room.depth], [ROOMS['sector-1'].width, ROOMS['sector-1'].depth], id)
    equal(Object.keys(room.exits).sort(), [...v04bNeighbours(id)].sort(), `Salidas de ${id}`)
    ok(Object.keys(room.exits).length <= 4, `${id}: hasta cuatro salidas`)
    const sides = Object.values(room.exits).map((exit) => exit!.side)
    ok(new Set(sides).size === sides.length, `${id}: una salida por muro`)
    for (const exit of Object.values(room.exits)) equal(exit!.position, WALL_EXITS[exit!.side], `${id}: ancla en su muro`)
    const expectedArrivals = [...new Set([...incoming(id), ...V04B_ONE_WAY_EDGES.filter(([, to]) => to === id).map(([from]) => from)])].sort()
    equal(Object.keys(room.arrivals).sort(), expectedArrivals, `Llegadas de ${id}`)
  }
  equal(Object.keys(v04bSpatialRoom('04').exits).sort(), ['03', '05', '11'], '04 no tiene salida hacia 10')
  ok(v04bSpatialRoom('04').arrivals['10'], '04 tiene aparición al llegar desde 10')
  for (const id of ['03', '14'] as const) equal(Object.keys(v04bSpatialRoom(id).exits).length, 4)
})

test('salas: apariciones válidas por arista, frente a su salida y fuera de su alcance; todo alcanzable sin bloqueos', () => {
  for (const id of ROOM_IDS) {
    const room = v04bSpatialRoom(id)
    const furnished = roomWithObjects(room, allObjects(id))
    const starts: [string, SpatialPose][] = [['spawn', room.spawn], ...Object.entries(room.arrivals).map(([from, pose]): [string, SpatialPose] => [`desde ${from}`, pose!])]
    for (const [label, pose] of starts) {
      ok(isWalkable(furnished, pose) && Number.isFinite(pose.yaw), `${id}: aparición ${label} válida con todos los objetos`)
      const points = reachable(furnished, pose)
      for (const object of allObjects(id)) {
        ok(points.some((point) => Math.hypot(point.x - object.position.x, point.z - object.position.z) < INTERACTION_RANGE), `${id}: ${object.id} alcanzable ${label}`)
      }
      for (const [to, exit] of Object.entries(room.exits)) {
        ok(Math.hypot(exit!.position.x - pose.x, exit!.position.z - pose.z) > INTERACTION_RANGE, `${id}: aparición ${label} no queda junto a la salida a ${to}`)
      }
    }
    for (const [from, pose] of Object.entries(room.arrivals)) {
      const back = room.exits[from as V04BRoomId] ?? (id === '04' && from === '10' ? { position: { x: 5.8, z: 1.4 } } : undefined)
      ok(back, `${id}: la llegada desde ${from} corresponde a un muro`)
      ok(Math.hypot(back.position.x - pose!.x, back.position.z - pose!.z) < 2.2, `${id}: llegada desde ${from} frente a su muro`)
    }
    for (const block of boundaryMasonry(room)) {
      const outsideX = block.x + block.width / 2 <= -room.width / 2 || block.x - block.width / 2 >= room.width / 2
      const outsideZ = block.z + block.depth / 2 <= -room.depth / 2 || block.z - block.depth / 2 >= room.depth / 2
      ok(outsideX || outsideZ, `Mampostería invadiendo ${id}`)
    }
  }
})

test('salas: temas por zona; 03 catacumbas, Altar neutro sin ratas, rúnicas y cripta profunda nuevas; legado intacto', () => {
  for (const id of ROOM_IDS) ok(V04B_CRYPT_THEMES[`v04b-${id}`] && cryptTheme(`v04b-${id}`) === V04B_CRYPT_THEMES[`v04b-${id}`], `Falta tema de ${id}`)
  equal(cryptTheme('v04b-03').kind, 'catacombs')
  const altar = cryptTheme('v04b-10')
  ok(altar.kind === 'altar' && !altar.wing, 'El Altar es neutro y no usa estética de ratas')
  for (const id of ['11', '12', '13']) equal(cryptTheme(`v04b-${id}`).kind, 'runic')
  for (const id of ['14', '15', '16', '17', '18']) equal(cryptTheme(`v04b-${id}`).kind, 'deep')
  for (const id of ['07', '08', '09']) ok(cryptTheme(`v04b-${id}`).wing, `${id} pertenece a las madrigueras`)
  for (const id of ROOM_IDS) {
    const hasNorth = Object.values(v04bSpatialRoom(id).exits).some((exit) => exit!.side === 'north')
    if (cryptTheme(`v04b-${id}`).rearOpening === false) ok(!hasNorth, `${id}: el muro trasero cerrado no tapa una salida`)
    // 19 keeps the approved ceremonial arch framing the rear opening, as the legacy final chamber.
    else ok(hasNorth || id === '19', `${id}: sin salida norte el muro trasero se cierra`)
  }
  equal(Object.keys(CRYPT_THEMES), ['sector-1', 'sector-2', 'sector-3', 'rats-1', 'rats-2', 'rats-3', 'rats-4'])
  for (const room of Object.values(ROOMS)) ok(cryptTheme(room.id) === CRYPT_THEMES[room.id])
})

test('enemigos: figuras de escaramuza y ratas corresponden al campo real de cada encuentro', () => {
  for (const [roomId, figures] of Object.entries(V04B_FIGURE_GROUPS)) {
    const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === roomId)
    ok(encounter?.mode === 'skirmish', `${roomId} es una escaramuza`)
    equal(figures.map((figure) => figure.cardId), encounter.fieldIds, `Figuras de ${roomId}`)
    for (const figure of figures) ok(Math.abs(figure.x) <= 0.4 && Math.abs(figure.z) <= 0.1, `Figura dentro del cuerpo del encuentro en ${roomId}`)
  }
  equal(Object.keys(V04B_FIGURE_GROUPS).sort(), V04B_ENCOUNTERS.filter((entry) => entry.mode === 'skirmish').map((entry) => entry.id).sort())
})

// ---------- Objetos y salidas ----------
const go = (s: V04BExpedition, ...path: string[]) => path.reduce((acc, room) => travel(acc, room), s)
const win = (s: V04BExpedition, room: string) => recordRoomVictory(s, room)
const at03 = () => go(win(go(createV04BExpedition(), '02'), '02'), '03')
const objectsAt = (expedition: V04BExpedition) => v04bObjectsForRoom({ expedition, returnPoint: null })
const exitObject = (expedition: V04BExpedition, to: string) => objectsAt(expedition).find((object) => object.id === `v04b-${expedition.currentRoomId}:exit:${to}`)

test('salidas: estado visible y motivo coherentes con roomExits en todas las salas; cofres solo donde hay cofre (M7)', () => {
  const states = [createV04BExpedition(), go(createV04BExpedition(), '02'), at03(), go(at03(), '04')]
  for (const state of states) for (const id of ROOM_IDS) {
    const here = { ...state, currentRoomId: id }
    const exits = roomExits(here)
    const objects = objectsAt(here)
    // M7 replaces the M6b expectation "chests hidden": one chest object exactly in rooms with chest data.
    equal(objects.filter((object) => object.kind === 'chest').length, v04bRoom(id).chest ? 1 : 0, `Cofres de ${id}`)
    for (const exit of exits) {
      const object = objects.find((candidate) => candidate.id === `v04b-${id}:exit:${exit.to}`)
      if (exit.status === 'hidden') { ok(!object, `${id}→${exit.to} oculta no se muestra`); continue }
      ok(object, `${id}→${exit.to} visible`)
      equal(object.status, exit.status === 'open' ? 'available' : 'locked', `${id}→${exit.to}`)
      equal(object.reason ?? '', exit.reason)
      ok(object.visual?.endsWith(`:${exit.status}`), 'La presentación conoce el estado de la salida')
      const side = v04bSpatialRoom(id).exits[exit.to]!.side
      equal(Boolean(object.sideWall), side === 'west' || side === 'east', `${id}→${exit.to}: puerta alineada con su muro`)
    }
  }
  const blocked = exitObject(go(createV04BExpedition(), '02'), '03')!
  ok(blocked.status === 'locked' && blocked.reason === 'Vence el encuentro de Sala del Centinela para avanzar' && blocked.visual === 'exit:door:blocked')
})

test('salidas: 03→13 oculta antes de B1, sellada con motivo tras B1 y abierta al resolver el puzle', () => {
  const before = { ...createV04BExpedition(), currentRoomId: '03' as const }
  ok(!exitObject(before, '13'), 'Sin puerta visible antes de B1')
  const sealed = exitObject(at03(), '13')!
  ok(sealed.status === 'locked' && sealed.visual === 'exit:titan:sealed' && /puzle/.test(sealed.reason ?? ''), 'Puerta rúnica sellada con motivo')
  const solved = { ...at03(), puzzle: { progress: 3, solved: true } }
  const open = exitObject(solved, '13')!
  ok(open.status === 'available' && open.visual === 'exit:titan:open')
})

test('salidas: 14↔18 oculta muestra solo el muro agrietado; al examinarlo aparece la salida', () => {
  const at14 = { ...at03(), currentRoomId: '14' as const }
  const objects = objectsAt(at14)
  ok(!objects.some((object) => object.id.endsWith('exit:18')), 'No se muestra la puerta')
  const wall = objects.find((object) => object.id === 'v04b-14:wall')!
  ok(wall && wall.action === 'Examinar el muro agrietado' && wall.visual === 'cracked-wall' && wall.status === 'available')
  const examined = objectsAt({ ...at14, wallExamined: true })
  ok(!examined.some((object) => object.id === 'v04b-14:wall') && exitObject({ ...at14, wallExamined: true }, '18')?.visual === 'exit:breach:open')
})

// ---------- Flujo jugable y combates ----------
test('flujo: 01→19 por la ruta principal con interacciones validadas por posición y combates reales', () => {
  const w = new Walker()
  equal(w.room, '01')
  w.go('02')
  rejects(() => interactV04BObject(w.play, 'v04b-02:exit:03', poseNear(w.play, 'v04b-02:exit:01', w.pose)))
  w.win().go('03', '04').win().go('05', '06').win().go('14', '15', '19').win()
  ok(isV04BExpeditionComplete(w.play.expedition), 'Vencer al Rey Esqueleto completa la demo')
  equal(V04B_ADVENTURE.location(w.play), { roomName: 'Salón del Trono', zoneName: 'La Cripta Profunda', complete: true })
  equal(w.play.expedition.session.copies.length >= 1, true)
})

test('combate: inicia con la sesión V0.4B, bloquea gestión y vuelve a la sala con la pose segura', () => {
  const w = new Walker().go('02')
  const before = w.pose
  const result = w.use('enemy')
  ok(result.kind === 'encounter' && result.duel.collectionProfile === 'v04b' && result.duel.encounterId === '02')
  equal(V04B_ADVENTURE.encounter(result.duel), { name: 'El Centinela', maxLife: 12 })
  rejects(() => addCopyToActiveDeck(w.play.expedition.session, w.play.expedition.session.copies[0].id))
  rejects(() => interactV04BObject(w.play, 'v04b-02:exit:01', before))
  ok(w.play.returnPoint?.roomId === '02' && isWalkable(roomWithObjects(v04bSpatialRoom('02'), v04bObjectsForRoom(w.play)), w.play.returnPoint.pose))
})

test('combate: derrota aplica fatiga 0–1, conserva el encuentro y permite reintentar; victoria desbloquea y B1 restaura', () => {
  const w = new Walker().go('02')
  const first = w.fight('opponent')
  ok(!first.settlement.won && w.play.expedition.session.fatigue === 1 && w.play.expedition.session.activeDuelId === null)
  ok(!isEncounterDefeated(w.play.expedition, '02'))
  equal(v04bObjectsForRoom(w.play).find((object) => object.kind === 'enemy')?.status, 'available', 'El encuentro sigue intacto')
  const summary = v04bEncounterSummary(first.settlement.state.expedition.session, first.settlement, first.duel)
  ok(!summary.won && /reintentar/.test(summary.outcome))
  w.fight('opponent')
  equal(w.play.expedition.session.fatigue, 1, 'La fatiga no supera 1')
  const before = w.play.expedition.session
  const victory = w.fight('player')
  ok(victory.settlement.won && victory.settlement.restored)
  equal([w.play.expedition.session.fatigue, w.play.expedition.session.invokerMaxLife, w.play.expedition.session.orb], [0, 20, { charges: 1, capacity: 1 }])
  equal(roomExits(w.play.expedition).find((exit) => exit.to === '03')?.status, 'open')
  equal(v04bObjectsForRoom(w.play).find((object) => object.kind === 'enemy')?.status, 'completed', 'La figura vencida se retira')
  const text = v04bEncounterSummary(before, victory.settlement, victory.duel)
  ok(text.won && /Restauración gratuita/.test(text.outcome) && /Fatiga 1 → 0/.test(text.resources))
  equal(w.play.expedition.session.copies.length, before.copies.length, 'Sin premios de cartas')
  const again = settleV04BEncounter(w.play, victory.duel)
  ok(again.state === w.play, 'La liquidación es idempotente')
})

test('combate: B2 restaura heridas y fatiga; una escaramuza vencida no restaura; las ratas registran el ciclo', () => {
  const w = new Walker().go('02').win().go('03', '04')
  w.fight('opponent')
  equal(w.play.expedition.session.fatigue, 1)
  w.win()
  equal(w.play.expedition.session.fatigue, 1, 'Vencer 04 no restaura')
  const hurt = { ...w.play.expedition.session, copies: w.play.expedition.session.copies.map((copy, i) => i === 0 ? { ...copy, health: 1 } : copy), invokerMaxLife: 18, invokerLife: 18 }
  w.play = { ...w.play, expedition: { ...w.play.expedition, session: hurt } }
  w.go('05', '06').win()
  const s = w.play.expedition.session
  ok(s.fatigue === 0 && s.invokerMaxLife === 20 && s.copies.every((copy) => copy.health === V04B_CARD_TYPES.find((card) => card.id === copy.cardId)!.maxHealth + copy.bonusHealth))
  const rats = new Walker().go('02').win().go('03', '07').win().go('08').win().go('09').win()
  equal(rats.play.expedition.session.ratCycle?.defeated, ['07', '08', '09'])
})

// ---------- Objetos 10/11/12/14 ----------
test('altar 10: con el orbe cargado responde con el motivo; tras gastarlo y vencer las ratas recarga y cierra 10→09', () => {
  const w = new Walker().go('02').win().go('03', '07').win().go('08').win().go('09').win().go('10')
  const idle = w.use('altar')
  ok(idle.kind === 'altar' && !idle.result.recharged && idle.result.reason === 'El orbe ya está cargado')
  equal(v04bInteractionMessage(idle), 'El altar no responde: El orbe ya está cargado.')
  w.play = { ...w.play, expedition: { ...w.play.expedition, session: { ...w.play.expedition.session, orb: { charges: 0, capacity: 1 } } } }
  equal(v04bObjectsForRoom(w.play).find((object) => object.id === 'v04b-10:altar')?.visual, 'altar:ready')
  const used = w.use('altar')
  ok(used.kind === 'altar' && used.result.recharged && w.play.expedition.session.orb?.charges === 1)
  const back = exitObject(w.play.expedition, '09')!
  ok(back.status === 'locked' && /sal por 04/.test(back.reason ?? ''))
  w.go('04')
  equal(w.pose, v04bArrivalPose('04', '10'), 'Aparición de 10→04')
})

test('inscripción 11 y pedestales 12: texto, encendido, reinicio sin penalización, resolución y sello liberado', () => {
  const w = new Walker().go('02').win().go('03', '04').win().go('11')
  const read = w.use('inscription')
  ok(read.kind === 'inscription' && read.text === V04B_INSCRIPTION_TEXT && v04bInteractionMessage(read).includes(V04B_INSCRIPTION_TEXT))
  w.go('12')
  const wrong = w.use('pedestal:mana')
  ok(wrong.kind === 'pedestal' && wrong.result.outcome === 'reset' && /sin penalización/.test(v04bInteractionMessage(wrong)))
  const first = w.use('pedestal:hueso')
  ok(first.kind === 'pedestal' && first.result.outcome === 'advanced')
  equal(litRunes(w.play.expedition), ['hueso'])
  equal(v04bObjectsForRoom(w.play).filter((object) => object.visual?.endsWith(':lit')).map((object) => object.id), ['v04b-12:pedestal:hueso'])
  const reset = w.use('pedestal:mana')
  ok(reset.kind === 'pedestal' && reset.result.outcome === 'reset' && litRunes(w.play.expedition).length === 0)
  w.use('pedestal:hueso'); w.use('pedestal:sombra')
  const solved = w.use('pedestal:mana')
  ok(solved.kind === 'pedestal' && solved.result.outcome === 'solved' && /sello/.test(v04bInteractionMessage(solved)))
  ok(v04bObjectsForRoom(w.play).filter((object) => object.id.includes('pedestal')).every((object) => object.status === 'completed' && object.visual?.endsWith(':lit')))
  equal(w.play.expedition.session.copies.length, 8, 'El cofre de 12 no se concede (M7)')
  w.go('05', '04', '03')
  equal(exitObject(w.play.expedition, '13')?.status, 'available')
  w.go('13')
  equal(w.pose, v04bArrivalPose('13', '03'))
})

test('muro 14: «Examinar el muro agrietado» abre 14↔18 para el resto de la expedición; 18 es un duelo real', () => {
  const w = new Walker().go('02').win().go('03', '04').win().go('05', '06').win().go('14')
  const examined = w.use('wall')
  ok(examined.kind === 'wall' && examined.result.revealed && /paso oculto/.test(v04bInteractionMessage(examined)))
  w.go('18')
  const duel = w.use('enemy')
  ok(duel.kind === 'encounter' && duel.duel.encounterId === '18')
  equal(V04B_ADVENTURE.encounter(duel.duel).name, 'El Devoto')
  settleV04BEncounter(w.play, { ...duel.duel, phase: 'finished', winner: 'player' })
})

// ---------- HUD ----------
test('HUD V0.4B: zona y nombre oficial de la sala, vitales y orbe; HUD legado sin cambios', () => {
  const play = V04B_ADVENTURE.create()
  const location = V04B_ADVENTURE.location(play)
  equal(location, { roomName: 'Atrio de la Cripta', zoneName: 'El Umbral', complete: false })
  for (const id of ROOM_IDS) {
    const here = { ...play, expedition: { ...play.expedition, currentRoomId: id } }
    equal(V04B_ADVENTURE.location(here).roomName, v04bRoom(id).name)
    equal(V04B_ADVENTURE.location(here).zoneName, v04bRoom(id).zone)
  }
  const session = V04B_ADVENTURE.session(play)
  const markup = renderToStaticMarkup(<ExplorationHUD life={20} maxLife={20} mana={1} fatigue={0} level={1} roomName={location.roomName} zoneName={location.zoneName} complete={false} onCollection={() => {}} orb={orbControlFor(session, () => {})} />)
  ok(markup.includes('Atrio de la Cripta') && markup.includes('El Umbral') && markup.includes('orb-launcher') && markup.includes('Invocador'))
  const legacy = renderToStaticMarkup(<ExplorationHUD life={20} maxLife={20} mana={1} fatigue={0} level={1} roomName="Sector 1 · El umbral" complete={false} onCollection={() => {}} orb={orbControlFor(createExpeditionState().session, () => {})} />)
  ok(legacy.includes('La cripta') && !legacy.includes('orb-launcher'))
})

// ---------- Presupuesto estático y liberación de recursos ----------
extend(THREE as unknown as Parameters<typeof extend>[0])
async function withRoot(run: (root: ReturnType<typeof createRoot>) => Promise<void>) {
  const globals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  const previous = globals.IS_REACT_ACT_ENVIRONMENT
  globals.IS_REACT_ACT_ENVIRONMENT = true
  const canvas = { width: 100, height: 100, style: {}, addEventListener() {}, removeEventListener() {} }
  const gl = {
    render() {}, setPixelRatio() {}, setSize() {}, getSize(out: THREE.Vector2) { return out.set(100, 100) },
    domElement: canvas, shadowMap: { enabled: false }, outputColorSpace: '', toneMapping: 0,
  } as unknown as THREE.WebGLRenderer
  const root = createRoot(canvas as unknown as HTMLCanvasElement)
  try {
    await root.configure({ gl, frameloop: 'never', dpr: 1, size: { width: 100, height: 100, top: 0, left: 0 } })
    await run(root)
  } finally {
    await act(async () => { root.unmount() })
    if (previous === undefined) delete globals.IS_REACT_ACT_ENVIRONMENT
    else globals.IS_REACT_ACT_ENVIRONMENT = previous
  }
}

interface Budget { submissions: number; triangles: number }
function budget(scene: THREE.Object3D): Budget {
  let submissions = 0, triangles = 0
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return
    let hidden = false
    for (let parent = object.parent; parent; parent = parent.parent) if (!parent.visible) hidden = true
    if (hidden) return
    const geometry = object.geometry as THREE.BufferGeometry
    const count = geometry.index ? geometry.index.count / 3 : (geometry.getAttribute('position')?.count ?? 0) / 3
    submissions += object.castShadow ? 2 : 1
    triangles += count * (object instanceof THREE.InstancedMesh ? object.count : 1)
  })
  return { submissions, triangles }
}

/** Legacy objects per room: every encounter, chest, shrine and exit of the room present. */
function legacyObjects(roomId: keyof typeof ROOMS): ExplorationObject[] {
  return objectsForRoom({ ...createExpeditionState(), roomId })
}

test('presupuesto estático: ninguna sala V0.4B supera el 125 % del máximo legado en envíos y triángulos', async () => {
  await withRoot(async (root) => {
    const measure = async (room: RoomDefinition, objects: ExplorationObject[], v04b: boolean) => {
      let store!: ReturnType<typeof root.render>
      await act(async () => {
        store = root.render(<group><CryptRoom room={room} />{objects.map((object) => v04b
          ? <V04BWorldObject key={object.id} object={object} roomId={room.id} onInteract={() => {}} />
          : <WorldObject key={object.id} object={object} roomId={room.id} onInteract={() => {}} />)}</group>)
      })
      return budget(store.getState().scene)
    }
    const legacy: Budget[] = []
    for (const roomId of Object.keys(ROOMS) as (keyof typeof ROOMS)[]) legacy.push(await measure(ROOMS[roomId], legacyObjects(roomId), false))
    const maxLegacy = { submissions: Math.max(...legacy.map((b) => b.submissions)), triangles: Math.max(...legacy.map((b) => b.triangles)) }
    for (const id of ROOM_IDS) {
      const objects = allObjects(id).map((object): ExplorationObject => object.kind === 'enemy' ? { ...object, id: `v04b-${id}:enemy`, visual: `enemy:${id}` }
        : object.kind === 'exit' ? { ...object, visual: id === '03' && object.id === 'exit:13' ? 'exit:titan:sealed' : 'exit:door:open' }
          : { ...object, visual: object.id === 'wall' ? 'cracked-wall' : object.id.startsWith('pedestal') ? `${object.id}:lit` : object.id === 'altar' ? 'altar:ready' : object.id })
      const result = await measure(v04bSpatialRoom(id), objects, true)
      ok(result.submissions <= maxLegacy.submissions * 1.25, `${id}: ${result.submissions} envíos > 125 % de ${maxLegacy.submissions}`)
      ok(result.triangles <= maxLegacy.triangles * 1.25, `${id}: ${result.triangles} triángulos > 125 % de ${maxLegacy.triangles}`)
    }
  })
})

test('recursos: recorrer las 19 salas mantiene un solo batch, libera sus instancias y deja la escena vacía', async () => {
  await withRoot(async (root) => {
    let store!: ReturnType<typeof root.render>
    let created = 0, disposed = 0
    let previous: THREE.Object3D | undefined
    for (const id of [...ROOM_IDS, '01'] as V04BRoomId[]) {
      await act(async () => { store = root.render(<StrictMode><CryptRoom room={v04bSpatialRoom(id)} /></StrictMode>) })
      const scene = store.getState().scene
      const batches: THREE.Object3D[] = []
      scene.traverse((object) => { if (object.name === 'crypt-static-batches') batches.push(object) })
      ok(batches.length === 1, `${id}: un solo batch`)
      if (batches[0] !== previous) batches[0].traverse((object) => {
        if (object instanceof THREE.InstancedMesh) { created++; object.addEventListener('dispose', () => { disposed++ }) }
      })
      previous = batches[0]
    }
    await act(async () => { root.render(null) })
    ok(created > 0 && disposed === created, `Instancias liberadas ${disposed}/${created}`)
    ok(store.getState().scene.children.length === 0, 'Sin restos en la escena')
  })
})

test('preparación V0.4B: el combate de reserva del adaptador no bloquea la sesión inicial', () => {
  const session = createV04BInitialSession()
  const placeholder = V04B_ADVENTURE.initialDuel({ expedition: createV04BExpedition(session), returnPoint: null })
  ok(placeholder.collectionProfile === 'v04b' && session.activeDuelId === null)
  ok(createV04BEncounterDuel(session, '02').session.activeDuelId !== null)
})
