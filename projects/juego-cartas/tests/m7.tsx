import { act, StrictMode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import {
  ACTIVE_CONTENT, chestAvailability, chestEventId, createV04BEncounterDuel, createV04BExpedition, createV04BInitialSession, createV04BPlay,
  ExplorationViolation, interactV04BObject, isChestOpened, openChest, reinvokeStatus, RuleViolation, settleV04BEncounter, unlockedSlotsForType,
  v04bObjectsForRoom, v04bRoom, v04bSpatialRoom, V04B_CARD_TYPES, V04B_CHEST_ANCHOR, V04B_INITIAL_CARD_IDS, V04B_ROOMS,
} from '../src/engine/index.js'
import type { DuelState, V04BExpedition, V04BInteraction, V04BPlayState, V04BRoomId } from '../src/engine/index.js'
import { closestInteractable, INTERACTION_RANGE, isWalkable, ROOMS, roomWithObjects } from '../src/engine/spatial.js'
import type { ExplorationObject, Point2, RoomDefinition, SpatialObstacle, SpatialPose } from '../src/engine/spatial.js'
import { createExpeditionState, objectsForRoom } from '../src/engine/world.js'
import { LEGACY_ADVENTURE } from '../src/adventure/legacyAdventure.js'
import { V04B_ADVENTURE } from '../src/adventure/v04bAdventure.js'
import { v04bInteractionMessage } from '../src/ui/v04bMessages.js'
import { ChestRewardOverlay } from '../src/ui/ChestRewardOverlay.js'
import { CollectionView } from '../src/ui/CollectionViews.js'
import { CryptRoom } from '../src/scene/CryptEnvironment.js'
import { WorldObject } from '../src/scene/ExplorationActors.js'
import { V04BWorldObject } from '../src/scene/V04BActors.js'

export const m7Tests: { name: string; run: () => void | Promise<void> }[] = []
function test(name: string, run: () => void | Promise<void>) { m7Tests.push({ name: `M7 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown, pattern?: RegExp) {
  try { run() } catch (error) {
    if (error instanceof ExplorationViolation || error instanceof RuleViolation) { if (pattern) ok(pattern.test(error.message), `Motivo inesperado: ${error.message}`); return }
    throw error
  }
  throw new Error('Se esperaba rechazo de dominio')
}

const CHEST_ROOMS = V04B_ROOMS.filter((room) => room.chest).map((room) => room.id)
const chestId = (roomId: string) => `v04b-${roomId}:chest`
const chestObject = (play: V04BPlayState) => v04bObjectsForRoom(play).find((object) => object.kind === 'chest')
const at = (expedition: V04BExpedition, roomId: V04BRoomId): V04BPlayState => ({ expedition: { ...expedition, currentRoomId: roomId }, returnPoint: null })
const countBy = (ids: readonly string[]) => ids.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {})

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

/** Real, pose-validated interactions (as App), like the M6b walker. */
class Walker {
  pose: SpatialPose
  constructor(public play: V04BPlayState = createV04BPlay()) { this.pose = v04bSpatialRoom('01').spawn }
  get room() { return this.play.expedition.currentRoomId }
  get session() { return this.play.expedition.session }
  use(suffix: string): V04BInteraction {
    const id = `v04b-${this.room}:${suffix}`
    const pose = poseNear(this.play, id, this.pose)
    const result = interactV04BObject(this.play, id, pose)
    this.play = result.state
    this.pose = result.kind === 'travel' ? result.arrival : pose
    return result
  }
  go(...rooms: string[]) { for (const room of rooms) { const result = this.use(`exit:${room}`); ok(result.kind === 'travel' && result.to === room) } return this }
  win() {
    const started = this.use('enemy')
    ok(started.kind === 'encounter')
    const settlement = settleV04BEncounter(this.play, { ...started.duel, phase: 'finished', winner: 'player' } as DuelState)
    ok(settlement.won)
    this.play = settlement.state
    if (settlement.state.returnPoint) this.pose = settlement.state.returnPoint.pose
    return this
  }
  /** Opens the chest of the current room through the adapter (as App) and checks the exact grant. */
  open() {
    const roomId = this.room
    const before = this.session
    const pose = poseNear(this.play, chestId(roomId), this.pose)
    const result = V04B_ADVENTURE.interact(this.play, chestId(roomId), pose)
    this.play = result.state
    this.pose = pose
    const cardIds = v04bRoom(roomId).chest!.cardIds
    const added = this.session.copies.filter((copy) => !before.copies.some((entry) => entry.id === copy.id))
    equal(added.map((copy) => copy.cardId), cardIds, `Cofre ${roomId}: cartas exactas`)
    ok(added.every((copy) => copy.health === V04B_CARD_TYPES.find((card) => card.id === copy.cardId)!.maxHealth && copy.bonusAttack === 0 && copy.bonusHealth === 0), 'Copias sanas y básicas')
    ok(added.every((copy) => !this.session.activeDeckCopyIds.includes(copy.id)), 'Las copias van a la reserva')
    equal(this.session.activeDeckCopyIds, before.activeDeckCopyIds, 'La baraja no cambia')
    ok(result.reward, 'El adaptador devuelve el panel de premios')
    equal(result.reward.source, v04bRoom(roomId).name)
    equal(result.reward.cards.map((entry) => [entry.copyId, entry.card.name]), added.map((copy) => [copy.id, V04B_CARD_TYPES.find((card) => card.id === copy.cardId)!.name]))
    ok(result.message.includes(v04bRoom(roomId).name) && /reserva/.test(result.message), result.message)
    equal(chestObject(this.play)?.status, 'completed', `Cofre ${roomId} abierto`)
    ok(isChestOpened(this.play.expedition, roomId))
    return this
  }
}

/** Route that claims all 11 chests with pose-validated interactions. */
function claimAll(): Walker {
  const w = new Walker().go('02').win().go('03').open().go('04').win().open()
  w.go('11', '12'); for (const rune of ['hueso', 'sombra', 'mana']) w.use(`pedestal:${rune}`)
  w.open().go('05', '04', '03', '13').open().go('03', '07').win().open().go('08').win().go('09').win().open()
  w.go('10', '04', '05', '06').win().go('14').open()
  w.use('wall')
  w.go('18').win().open().go('14', '16').win().open().go('17').win().open().go('15').open()
  return w
}

// ---------- Datos ----------
test('datos: 11 cofres, 31 premios; 8 iniciales + 31 = cupos máximos exactos de los 21 tipos (sin excedentes)', () => {
  equal(CHEST_ROOMS, ['03', '04', '07', '09', '12', '13', '14', '15', '16', '17', '18'])
  const prizes = V04B_ROOMS.flatMap((room) => room.chest?.cardIds ?? [])
  equal(prizes.length, 31)
  const total = countBy([...V04B_INITIAL_CARD_IDS, ...prizes])
  equal(V04B_CARD_TYPES.length, 21)
  for (const card of V04B_CARD_TYPES) equal(total[card.id] ?? 0, card.maxCopies, `${card.id}`)
  equal(new Set(CHEST_ROOMS.map((id) => chestEventId(id))).size, 11, 'Un evento estable y distinto por cofre')
})

// ---------- Disponibilidad ----------
test('disponibilidad: cada requisito M6a abre solo su cofre; los no disponibles se ven cerrados con motivo', () => {
  const base = createV04BExpedition()
  const status = (expedition: V04BExpedition, roomId: V04BRoomId) => chestObject(at(expedition, roomId))
  const expected: Record<string, string> = {
    '03': 'Vence a El Centinela', '14': 'Vence a El Prior', '12': 'Resuelve el puzle de las runas', '13': 'Llega a la sala', '15': 'Llega a la sala',
  }
  for (const id of CHEST_ROOMS) {
    const object = status(base, id)
    ok(object && object.status === 'locked' && object.visual === 'chest:locked', `${id}: cerrado`)
    equal(object.reason, expected[id] ?? 'Vence el encuentro de la sala', `${id}: motivo`)
    equal(object.position, V04B_CHEST_ANCHOR)
  }
  const unlocks: [string, V04BExpedition, V04BRoomId[]][] = [
    ['B1', { ...base, everDefeatedRoomIds: ['02'] }, ['03']],
    ['B2', { ...base, everDefeatedRoomIds: ['06'] }, ['14']],
    ['puzle', { ...base, puzzle: { progress: 3, solved: true } }, ['12']],
    ['llegada 13', { ...base, visitedRoomIds: ['01', '13'] }, ['13']],
    ['llegada 15', { ...base, visitedRoomIds: ['01', '15'] }, ['15']],
    ...(['04', '07', '09', '16', '17', '18'] as V04BRoomId[]).map((id): [string, V04BExpedition, V04BRoomId[]] => [`victoria ${id}`, { ...base, everDefeatedRoomIds: [id] }, [id]]),
  ]
  for (const [label, expedition, rooms] of unlocks) {
    const open = CHEST_ROOMS.filter((id) => status(expedition, id)?.status === 'available')
    equal(open, rooms, label)
    for (const id of rooms) ok(!status(expedition, id)?.reason && status(expedition, id)?.visual === 'chest:available', `${label}: sin motivo`)
  }
  for (const id of V04B_ROOMS.map((room) => room.id).filter((id) => !CHEST_ROOMS.includes(id))) ok(!status(base, id), `${id}: sin cofre`)
})

test('disponibilidad: recorrido real, el cofre bloqueado explica el motivo y no concede; 13/15 al llegar', () => {
  const w = new Walker().go('02').win().go('03', '04')
  const locked = chestObject(w.play)!
  ok(locked.status === 'locked' && locked.reason === 'Vence el encuentro de la sala')
  rejects(() => interactV04BObject(w.play, chestId('04'), { x: V04B_CHEST_ANCHOR.x, z: V04B_CHEST_ANCHOR.z - 1, yaw: 0 }), /Vence el encuentro/)
  const world = openChest(w.play.expedition, '04')
  ok(!world.opened && world.state === w.play.expedition && world.reason === 'Vence el encuentro de la sala', 'Interacción legítima sin efecto devuelve motivo')
  equal(w.session.copies.length, 8)
  w.win()
  equal(chestObject(w.play)?.status, 'available')
})

// ---------- Concesión ----------
test('concesión: cada cofre concede exactamente sus cartas una vez; los 11 llevan a 39 copias / 21 tipos con cupos = máximos', () => {
  const w = claimAll()
  const s = w.session
  equal(s.copies.length, 39)
  equal(new Set(s.copies.map((copy) => copy.cardId)).size, 21)
  for (const card of V04B_CARD_TYPES) {
    equal(unlockedSlotsForType(s, card.id), card.maxCopies, `Cupos ${card.id}`)
    equal(s.copies.filter((copy) => copy.cardId === card.id).length, card.maxCopies, `Copias ${card.id}`)
  }
  equal(new Set(s.copies.map((copy) => copy.id)).size, 39, 'Identidades únicas')
  for (const id of CHEST_ROOMS) ok(s.grantedCopyEventIds.includes(chestEventId(id)), `Evento ${id}`)
  equal(s.activeDeckCopyIds, createV04BInitialSession().activeDeckCopyIds, 'Solo la reserva recibe premios')
  ok(chestAvailability(w.play.expedition).every((chest) => chest.opened))
})

test('unicidad: un cofre abierto no se reabre; el mismo evento es idempotente y no supera cupos', () => {
  const w = new Walker().go('02').win().go('03').open()
  const before = w.session
  rejects(() => interactV04BObject(w.play, chestId('03'), w.pose), /no está disponible/)
  const again = openChest(w.play.expedition, '03')
  ok(!again.opened && again.state === w.play.expedition && again.reason === 'El cofre ya está abierto')
  equal(w.session, before)
  equal(v04bInteractionMessage({ kind: 'chest', roomId: '03', result: again, state: w.play }), 'El cofre ya está abierto.')
  // Leaving and coming back keeps it open.
  w.go('02', '03')
  equal(chestObject(w.play)?.status, 'completed')
  equal(chestObject(w.play)?.label, 'Cofre abierto')
})

test('MIG-D01: una copia perdida antes no impide reclamar; el cupo nuevo queda vacante para recuperar', () => {
  const base = createV04BExpedition()
  const lost = base.session.copies.find((copy) => copy.cardId === 'A02')!
  const session = { ...base.session, copies: base.session.copies.filter((copy) => copy.id !== lost.id), activeDeckCopyIds: base.session.activeDeckCopyIds.filter((id) => id !== lost.id) }
  const expedition: V04BExpedition = { ...base, session, currentRoomId: '07', everDefeatedRoomIds: ['07'] }
  const result = openChest(expedition, '07')
  ok(result.opened)
  equal(unlockedSlotsForType(result.state.session, 'A02'), 2)
  equal(result.state.session.copies.filter((copy) => copy.cardId === 'A02').length, 1)
  ok(reinvokeStatus(result.state.session, 'A02', V04B_CARD_TYPES).allowed, 'La vacante se puede recuperar')
  equal(result.copyIds.length, 2)
})

test('combate: no se puede abrir un cofre durante un combate', () => {
  const base: V04BExpedition = { ...createV04BExpedition(), currentRoomId: '13', visitedRoomIds: ['01', '13'] }
  const locked = { ...base, session: createV04BEncounterDuel(base.session, '04').session }
  rejects(() => openChest(locked, '13'))
  rejects(() => interactV04BObject({ expedition: locked, returnPoint: null }, chestId('13'), poseNear({ expedition: base, returnPoint: null }, chestId('13'), v04bSpatialRoom('13').spawn)))
  equal(locked.session.copies.length, 8)
})

test('ciclo de ratas: recargar y volver a vencer 07/09 no reactiva sus cofres ni concede de nuevo', () => {
  const w = new Walker().go('02').win().go('03', '07').win().open().go('08').win().go('09').win().open().go('10')
  w.play = { ...w.play, expedition: { ...w.play.expedition, session: { ...w.session, orb: { charges: 0, capacity: 1 } } } }
  const used = w.use('altar')
  ok(used.kind === 'altar' && used.result.recharged)
  const copies = w.session.copies.length
  w.go('04', '03', '07')
  equal(chestObject(w.play)?.status, 'completed', '07 sigue abierto tras la recarga')
  w.win()
  equal(chestObject(w.play)?.status, 'completed', '07 sigue abierto tras la nueva victoria')
  w.go('08').win().go('09').win()
  equal(chestObject(w.play)?.status, 'completed')
  equal(w.session.copies.length, copies, 'Sin concesiones repetidas')
})

test('eventos incoherentes lanzan: otra sala, sala sin cofre, objeto lejano', () => {
  const base = createV04BExpedition()
  rejects(() => openChest(base, '03'), /sala 03/)
  rejects(() => openChest({ ...base, currentRoomId: '05' }, '05'), /no tiene cofre/)
  const play = at({ ...base, visitedRoomIds: ['01', '13'] }, '13')
  rejects(() => interactV04BObject(play, chestId('13'), v04bSpatialRoom('13').spawn), /Acércate/)
})

// ---------- Interfaz ----------
test('panel y Colección: nombres oficiales, copias en reserva y cierre con E/Esc; el legado no devuelve premios', () => {
  const w = new Walker().go('02').win().go('03')
  const pose = poseNear(w.play, chestId('03'), w.pose)
  const result = V04B_ADVENTURE.interact(w.play, chestId('03'), pose)
  ok(result.reward)
  const markup = renderToStaticMarkup(<ChestRewardOverlay reward={result.reward} onClose={() => {}} />)
  for (const id of v04bRoom('03').chest!.cardIds) ok(markup.includes(V04B_CARD_TYPES.find((card) => card.id === id)!.name), `Nombre de ${id}`)
  ok(markup.includes('Cruce de los Sellos') && markup.includes('En reserva') && markup.includes('<kbd>E</kbd>'))
  const collection = renderToStaticMarkup(<CollectionView session={result.state.expedition.session} cardTypes={V04B_CARD_TYPES} onChangeDeck={() => {}} onReinvoke={() => {}} />)
  // UI-1: Colección groups the reserve by type (×N) instead of one tile per copy identity.
  const rewardSession = result.state.expedition.session
  for (const entry of result.reward.cards) {
    ok(!rewardSession.activeDeckCopyIds.includes(entry.copyId), `${entry.copyId} queda en reserva`)
    ok(collection.includes(`data-card-id="${rewardSession.copies.find((copy) => copy.id === entry.copyId)!.cardId}"`), `Colección muestra ${entry.copyId}`)
  }
  ok(collection.includes('aria-label="4 copias en reserva"'), 'Las cuatro copias nuevas aparecen en reserva')
  const legacy = LEGACY_ADVENTURE.create()
  equal(LEGACY_ADVENTURE.objects(legacy), objectsForRoom(createExpeditionState()))
  ok(ACTIVE_CONTENT.id === 'legacy-v1')
})

// ---------- Espacio ----------
const footprint = (object: ExplorationObject): SpatialObstacle => roomWithObjects({ ...v04bSpatialRoom('01'), obstacles: [] }, [object]).obstacles[0]
const overlaps = (a: SpatialObstacle, b: SpatialObstacle, margin = 0) =>
  Math.abs(a.x - b.x) < (a.width + b.width) / 2 + margin && Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 + margin

/** Every exit and feature of a chest room plus its chest (worst case for occupancy). */
function furnishedObjects(roomId: V04BRoomId): ExplorationObject[] {
  const room = v04bSpatialRoom(roomId)
  const objects: ExplorationObject[] = Object.entries(room.exits).map(([to, exit]) => ({ id: `exit:${to}`, label: to, kind: 'exit', position: exit!.position, status: 'available',
    ...(exit!.side === 'west' || exit!.side === 'east' ? { sideWall: true } : {}) }))
  const f = room.features
  const add = (id: string, position: Point2 | undefined, kind: ExplorationObject['kind'] = 'feature') => { if (position) objects.push({ id, label: id, kind, position, status: 'available' }) }
  add('enemy', f.encounter, 'enemy'); add('altar', f.altar); add('inscription', f.inscription); add('wall', f.crackedWall)
  for (const [rune, position] of Object.entries(f.pedestals ?? {})) add(`pedestal:${rune}`, position)
  add('chest', f.chest, 'chest')
  return objects
}

test('espacio: cofres alcanzables, sin solaparse con salidas, obstáculos ni objetos y lejos de salidas y apariciones', () => {
  for (const id of CHEST_ROOMS) {
    const room = v04bSpatialRoom(id)
    ok(room.features.chest, `${id}: ancla de cofre`)
    const objects = furnishedObjects(id)
    const chest = objects.find((object) => object.kind === 'chest')!
    const body = footprint(chest)
    for (const obstacle of room.obstacles) ok(!overlaps(body, obstacle, 0.6), `${id}: el cofre deja paso junto al mobiliario`)
    for (const other of objects.filter((object) => object !== chest)) {
      ok(!overlaps(body, footprint(other), 0.6), `${id}: cofre separado de ${other.id}`)
      if (other.kind === 'exit') ok(Math.hypot(other.position.x - chest.position.x, other.position.z - chest.position.z) > INTERACTION_RANGE * 1.5, `${id}: cofre lejos de ${other.id}`)
    }
    const furnished = roomWithObjects(room, objects)
    const starts: [string, SpatialPose][] = [['spawn', room.spawn], ...Object.entries(room.arrivals).map(([from, pose]): [string, SpatialPose] => [`desde ${from}`, pose!])]
    for (const [label, pose] of starts) {
      ok(isWalkable(furnished, pose), `${id}: aparición ${label} libre con el cofre`)
      ok(Math.hypot(pose.x - chest.position.x, pose.z - chest.position.z) > INTERACTION_RANGE, `${id}: aparición ${label} fuera del alcance del cofre`)
      const points = reachable(furnished, pose)
      for (const object of objects) ok(points.some((point) => Math.hypot(point.x - object.position.x, point.z - object.position.z) < INTERACTION_RANGE), `${id}: ${object.id} alcanzable desde ${label}`)
      ok(points.some((point) => closestInteractable(point, objects)?.id === 'chest'), `${id}: el cofre es la interacción más cercana desde algún punto`)
    }
  }
  for (const id of V04B_ROOMS.map((room) => room.id).filter((id) => !CHEST_ROOMS.includes(id))) ok(!v04bSpatialRoom(id).features.chest, `${id}: sin cofre`)
  equal(Object.keys(ROOMS).length, 7, 'Salas legadas sin cambios')
})

// ---------- Presupuesto y recursos ----------
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

interface Budget { submissions: number; triangles: number; geometries: Set<THREE.BufferGeometry>; materials: Set<THREE.Material> }
function budget(scene: THREE.Object3D): Budget {
  const result: Budget = { submissions: 0, triangles: 0, geometries: new Set(), materials: new Set() }
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return
    for (let parent = object.parent; parent; parent = parent.parent) if (!parent.visible) return
    const geometry = object.geometry as THREE.BufferGeometry
    const count = geometry.index ? geometry.index.count / 3 : (geometry.getAttribute('position')?.count ?? 0) / 3
    result.submissions += object.castShadow ? 2 : 1
    result.triangles += count * (object instanceof THREE.InstancedMesh ? object.count : 1)
    result.geometries.add(geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) result.materials.add(material)
  })
  return result
}

const presented = (roomId: V04BRoomId, chestStatus: ExplorationObject['status']) => furnishedObjects(roomId).map((object): ExplorationObject =>
  object.kind === 'enemy' ? { ...object, id: `v04b-${roomId}:enemy`, visual: `enemy:${roomId}` }
    : object.kind === 'exit' ? { ...object, visual: roomId === '03' && object.id === 'exit:13' ? 'exit:titan:sealed' : 'exit:door:open' }
      : object.kind === 'chest' ? { ...object, id: chestId(roomId), status: chestStatus, visual: `chest:${chestStatus}` }
        : { ...object, visual: object.id === 'wall' ? 'cracked-wall' : object.id.startsWith('pedestal') ? `${object.id}:lit` : object.id === 'altar' ? 'altar:ready' : object.id })

test('presupuesto: con cofre en cualquier estado ninguna sala supera el 125 % del máximo legado (envíos, triángulos, geometrías, materiales)', async () => {
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
    for (const roomId of Object.keys(ROOMS) as (keyof typeof ROOMS)[]) legacy.push(await measure(ROOMS[roomId], objectsForRoom({ ...createExpeditionState(), roomId }), false))
    const max = (key: 'submissions' | 'triangles') => Math.max(...legacy.map((entry) => entry[key]))
    const maxSet = (key: 'geometries' | 'materials') => Math.max(...legacy.map((entry) => entry[key].size))
    for (const id of CHEST_ROOMS) for (const status of ['locked', 'available', 'completed'] as const) {
      const result = await measure(v04bSpatialRoom(id), presented(id, status), true)
      ok(result.submissions <= max('submissions') * 1.25, `${id}/${status}: ${result.submissions} envíos > 125 % de ${max('submissions')}`)
      ok(result.triangles <= max('triangles') * 1.25, `${id}/${status}: ${result.triangles} triángulos > 125 % de ${max('triangles')}`)
      ok(result.geometries.size <= maxSet('geometries') * 1.25, `${id}/${status}: ${result.geometries.size} geometrías > 125 % de ${maxSet('geometries')}`)
      ok(result.materials.size <= maxSet('materials') * 1.25, `${id}/${status}: ${result.materials.size} materiales > 125 % de ${maxSet('materials')}`)
    }
  })
})

test('recursos: el cofre usa geometría/material compartidos y libera sus piezas propias al cambiar de estado y de sala', async () => {
  await withRoot(async (root) => {
    const own = new Set<THREE.BufferGeometry>()
    let disposed = 0
    let sharedBox: THREE.BufferGeometry | undefined
    for (const id of [...CHEST_ROOMS, '03'] as V04BRoomId[]) for (const status of ['locked', 'available', 'completed'] as const) {
      const object: ExplorationObject = { id: chestId(id), label: 'Cofre', kind: 'chest', position: V04B_CHEST_ANCHOR, status, visual: `chest:${status}` }
      let store!: ReturnType<typeof root.render>
      await act(async () => { store = root.render(<StrictMode><V04BWorldObject object={object} roomId={`v04b-${id}`} onInteract={() => {}} /></StrictMode>) })
      const meshes: THREE.Mesh[] = []
      store.getState().scene.traverse((node) => { if (node instanceof THREE.Mesh) meshes.push(node) })
      ok(meshes.length >= 6 && meshes.length <= 12, `${id}/${status}: ${meshes.length} piezas`)
      const boxes = meshes.filter((mesh) => mesh.geometry instanceof THREE.BoxGeometry)
      ok(boxes.length >= 5, 'El cuerpo del cofre usa la caja compartida')
      sharedBox ??= boxes[0].geometry
      ok(boxes.every((mesh) => mesh.geometry === sharedBox), 'Una sola geometría de caja compartida en todos los cofres')
      for (const mesh of meshes) if (mesh.geometry !== sharedBox && !own.has(mesh.geometry)) { own.add(mesh.geometry); mesh.geometry.addEventListener('dispose', () => { disposed++ }) }
    }
    await act(async () => { root.render(null) })
    ok(own.size > 0 && disposed === own.size, `Piezas propias liberadas ${disposed}/${own.size}`)
  })
})
