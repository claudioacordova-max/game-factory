import {
  activatePedestal, availableChests, chestAvailability, createGameSession, createV04BEncounterDuel, createV04BExpedition,
  createV04BInitialSession, examineWall, ExplorationViolation, isEncounterDefeated, isSealOpen, isV04BExpeditionComplete, openExits, ratCycleStatus,
  readInscription, recordRoomVictory, roomExits, RuleViolation, travel, useAltar, V04B_ENCOUNTERS, V04B_ONE_WAY_EDGES, V04B_ROOMS,
  V04B_TWO_WAY_EDGES, v04bHasEdge,
} from '../src/engine/index.js'
import type { V04BExpedition, V04BRoomId, V04BRune } from '../src/engine/index.js'

export const m6aTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m6aTests.push({ name: `M6a · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof ExplorationViolation || error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}

const start = () => createV04BExpedition()
const R = (id: string) => id as V04BRoomId
const go = (s: V04BExpedition, ...path: string[]) => path.reduce((acc, room) => travel(acc, room), s)
const win = (s: V04BExpedition, room: string) => recordRoomVictory(s, room)
const statusOf = (s: V04BExpedition, to: string) => roomExits(s).find((e) => e.to === to)?.status
const exitsOf = (s: V04BExpedition) => roomExits(s).map((e) => `${e.to}:${e.status}`).sort()
const rune = (s: V04BExpedition, ...runes: V04BRune[]) => runes.reduce((acc, r) => activatePedestal(acc, r).state, s)

/** Opens 02, reaches 03 (B1 defeated). */
const at03 = () => go(win(go(start(), '02'), '02'), '03')
/** Defeats the mandatory route up to 04 (04 defeated) and stands in 04. */
const at04 = () => win(go(at03(), '04'), '04')
/** Rat circuit fully defeated, standing in 10. */
const at10 = () => {
  let s = go(at03(), '07')
  s = win(s, '07'); s = go(s, '08'); s = win(s, '08'); s = go(s, '09'); s = win(s, '09')
  return go(s, '10')
}
/** Main route up to 14 (B1, 04, B2 defeated), standing in 14. */
const at14 = () => go(win(go(at04(), '05', '06'), '06'), '14')

// ---------- Auditoría del grafo y datos ----------
test('grafo: 19 salas con nombres y zonas oficiales', () => {
  equal(V04B_ROOMS.map((r) => r.id), ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'])
  equal(V04B_ROOMS.map((r) => r.name), [
    'Atrio de la Cripta', 'Sala del Centinela', 'Cruce de los Sellos', 'Cámara de los Caídos', 'Galería de los Ecos', 'Salón del Osario', 'Primera Madriguera',
    'Nido Profundo', 'Corte de las Ratas', 'Altar', 'Archivo Rúnico', 'Núcleo de Maná', 'Cámara del Titán', 'Entrada a las Profundidades', 'Antesala del Trono',
    'Foso de los Restos', 'Cámara de las Cadenas', 'Cámara del Sacrificio', 'Salón del Trono'])
  const zones = new Set(V04B_ROOMS.map((r) => r.zone))
  equal([...zones].sort(), ['El Umbral', 'La Cripta Profunda', 'Las Catacumbas', 'Las Cámaras Rúnicas', 'Las Madrigueras'].sort())
})

test('grafo: encuentros del mapa coinciden con los de M4 (id y nombre de sala)', () => {
  const withEncounter = V04B_ROOMS.filter((r) => r.encounterId)
  equal(withEncounter.map((r) => r.id).sort(), V04B_ENCOUNTERS.map((e) => e.id).sort())
  for (const room of withEncounter) equal(V04B_ENCOUNTERS.find((e) => e.id === room.encounterId)!.roomName, room.name)
})

test('grafo: conjunto exacto de aristas dirigidas; sin 12→13, 18→15, 04→10 ni 13 sin 03', () => {
  const pairs: [string, string][] = [
    ['01', '02'], ['02', '03'], ['03', '04'], ['04', '05'], ['05', '06'], ['06', '14'], ['14', '15'], ['15', '19'],
    ['03', '07'], ['07', '08'], ['08', '09'], ['09', '10'], ['04', '11'], ['11', '12'], ['12', '05'], ['03', '13'],
    ['14', '16'], ['16', '17'], ['17', '15'], ['14', '18'],
  ]
  const expected = [...pairs.flatMap(([a, b]) => [`${a}>${b}`, `${b}>${a}`]), '10>04'].sort()
  const actual = [...V04B_TWO_WAY_EDGES.flatMap(([a, b]) => [`${a}>${b}`, `${b}>${a}`]), ...V04B_ONE_WAY_EDGES.map(([a, b]) => `${a}>${b}`)].sort()
  equal(actual, expected)
  ok(!v04bHasEdge('12', '13') && !v04bHasEdge('13', '12') && !v04bHasEdge('18', '15') && !v04bHasEdge('15', '18') && !v04bHasEdge('04', '10'))
  ok(v04bHasEdge('10', '04'))
  equal(V04B_ROOMS.filter((r) => v04bHasEdge('13', r.id)).map((r) => r.id), ['03'])
})

test('cofres: 11 cofres y 31 copias previstas; no se conceden', () => {
  const s = start()
  const all = chestAvailability(s)
  equal(all.map((c) => c.roomId), ['03', '04', '07', '09', '12', '13', '14', '15', '16', '17', '18'])
  equal(all.reduce((n, c) => n + c.cardIds.length, 0), 31)
  equal(s.session.copies.length, 8)
  equal(availableChests(s), [])
})

test('inicio: sala 01, sin salidas ocultas ni bloqueadas y sesión V0.4B intacta', () => {
  const s = start()
  equal(s.currentRoomId, '01')
  equal(exitsOf(s), ['02:open'])
  equal(s.session, createV04BInitialSession())
})

// ---------- Bloqueo por encuentro ----------
test('bloqueo: 02 bloquea 03 hasta vencer B1; el regreso a 01 queda abierto', () => {
  const s = go(start(), '02')
  equal(exitsOf(s), ['01:open', '03:blocked'])
  rejects(() => travel(s, '03'))
  equal(exitsOf(win(s, '02')), ['01:open', '03:open'])
})

test('bloqueo: 04 desde 03 y desde 10→04; 04→03 abierta, 04→05/04→11 bloqueadas, 04→10 inexistente', () => {
  const from03 = go(at03(), '04')
  equal(exitsOf(from03), ['03:open', '05:blocked', '11:blocked'])
  rejects(() => travel(from03, '10'))
  // Entry via 10→04 with 04 undefeated.
  let s = at10()
  s = go(s, '04')
  // at10 enters 04 from the one-way exit and 04 is not yet defeated.
  equal(s.previousRoomId, '10')
  ok(!isEncounterDefeated(s, '04'))
  equal(exitsOf(s), ['03:open', '05:blocked', '11:blocked'])
  rejects(() => travel(s, '05')); rejects(() => travel(s, '11')); rejects(() => travel(s, '10'))
  equal(exitsOf(win(s, '04')), ['03:open', '05:open', '11:open'])
})

test('bloqueo: 06→14 tras B2, 05 y 06 regreso abierto', () => {
  const s = go(at04(), '05', '06')
  equal(exitsOf(s), ['05:open', '14:blocked'])
  equal(exitsOf(win(s, '06')), ['05:open', '14:open'])
})

test('bloqueo: salas de ratas bloquean su avance y mantienen el regreso', () => {
  let s = go(at03(), '07')
  equal(exitsOf(s), ['03:open', '08:blocked'])
  s = win(s, '07'); s = go(s, '08')
  equal(exitsOf(s), ['07:open', '09:blocked'])
  s = win(s, '08'); s = go(s, '09')
  equal(exitsOf(s), ['08:open', '10:blocked'])
  equal(exitsOf(win(s, '09')), ['08:open', '10:open'])
})

test('bloqueo: 16 y 17; 17 entrada desde 16 y desde 15 siempre puede regresar', () => {
  let s = go(at14(), '16')
  equal(exitsOf(s), ['14:open', '17:blocked'])
  s = go(win(s, '16'), '17')
  equal(exitsOf(s), ['15:blocked', '16:open'])
  equal(exitsOf(win(s, '17')), ['15:open', '16:open'])
  // Entering 17 from 15: 15 (entry) and 16 (listed return) are both open; 17 is optional and this only leads back.
  const from15 = go(at14(), '15', '17')
  equal(from15.previousRoomId, '15')
  equal(exitsOf(from15), ['15:open', '16:open'])
  equal(exitsOf(win(from15, '17')), ['15:open', '16:open'])
})

test('bloqueo: 19 solo tiene el regreso a 15; 18 es callejón con regreso a 14', () => {
  let s = go(at14(), '15', '19')
  equal(exitsOf(s), ['15:open'])
  ok(!isV04BExpeditionComplete(s))
  s = win(s, '19')
  ok(isV04BExpeditionComplete(s))
  equal(exitsOf(s), ['15:open'])
  let wall = examineWall(at14()).state
  wall = go(wall, '18')
  equal(exitsOf(wall), ['14:open'])
  equal(exitsOf(win(wall, '18')), ['14:open'])
})

test('victoria: solo en la sala actual con encuentro y no repetida; rechazada en combate', () => {
  const s = start()
  rejects(() => win(s, '02')) // not the current room
  rejects(() => win(s, '01')) // no encounter
  const in02 = go(s, '02')
  rejects(() => win(in02, '03'))
  rejects(() => win(win(in02, '02'), '02'))
  const combat = { ...in02, session: createV04BEncounterDuel(in02.session, '02').session }
  rejects(() => win(combat, '02'))
  rejects(() => travel(combat, '01'))
  rejects(() => readInscription({ ...combat, currentRoomId: '11' }))
})

// ---------- Sello 03↔13 y puzle ----------
test('sello: 03→13 oculta antes de B1, sellada tras B1, abierta tras el puzle; 13→03 siempre abierta', () => {
  const before = { ...start(), currentRoomId: R('03') }
  equal(statusOf(before, '13'), 'hidden')
  equal(statusOf(at03(), '13'), 'sealed')
  rejects(() => travel(at03(), '13'))
  const solved = rune(go(at04(), '11', '12'), 'hueso', 'sombra', 'mana')
  const back = go(solved, '05', '04', '03')
  equal(statusOf(back, '13'), 'open')
  const in13 = go(back, '13')
  equal(exitsOf(in13), ['03:open'])
  equal(exitsOf(go(at04(), '11', '12')).includes('13:open'), false)
})

test('puzle: inscripción en 11 solo allí; orden correcto Hueso→Sombra→Maná resuelve y abre cofre 12 y sello', () => {
  rejects(() => readInscription(at04()))
  const in11 = go(at04(), '11')
  equal(readInscription(in11), 'Primero lo que queda, luego lo que oculta, al final lo que fluye')
  equal(exitsOf(in11), ['04:open', '12:open'])
  const in12 = go(in11, '12')
  equal(exitsOf(in12), ['05:open', '11:open'])
  ok(!isSealOpen(in12))
  ok(!availableChests(in12).some((c) => c.roomId === '12'))
  let r = activatePedestal(in12, 'hueso'); equal(r.outcome, 'advanced')
  r = activatePedestal(r.state, 'sombra'); equal(r.outcome, 'advanced')
  r = activatePedestal(r.state, 'mana'); equal(r.outcome, 'solved')
  ok(isSealOpen(r.state))
  const chest = availableChests(r.state).find((c) => c.roomId === '12')
  equal(chest?.cardIds, ['H01', 'N05', 'R02'])
  equal(r.state.session.copies.length, 8) // nothing granted
})

test('puzle: error reinicia sin penalización; ordenes incorrectos; sin efecto tras resolver; fuera de 12 rechaza', () => {
  const in12 = go(at04(), '11', '12')
  rejects(() => activatePedestal(at04(), 'hueso'))
  rejects(() => activatePedestal(in12, 'oro' as V04BRune))
  for (const wrong of [['sombra'], ['mana'], ['hueso', 'mana'], ['hueso', 'hueso']] as V04BRune[][]) {
    const r = wrong.reduce((acc, ru) => activatePedestal(acc.state, ru), { state: in12 } as ReturnType<typeof activatePedestal>)
    equal(r.outcome, 'reset')
    equal(r.state.puzzle, { progress: 0, solved: false })
    equal(r.state.session, in12.session) // no penalty
  }
  // After a failure the whole sequence works again.
  const retry = rune(activatePedestal(in12, 'sombra').state, 'hueso', 'sombra', 'mana')
  ok(retry.puzzle.solved)
  const again = activatePedestal(retry, 'hueso')
  equal(again.outcome, 'ignored')
  ok(again.reason.length > 0)
  equal(again.state, retry)
})

// ---------- Muro 14↔18 ----------
test('muro: 14↔18 oculta hasta examinar; revela de forma permanente; repetir no tiene efecto', () => {
  const s = at14()
  equal(statusOf(s, '18'), 'hidden')
  rejects(() => travel(s, '18'))
  rejects(() => examineWall(at04()))
  const examined = examineWall(s)
  ok(examined.revealed)
  equal(statusOf(examined.state, '18'), 'open')
  const repeat = examineWall(examined.state)
  ok(!repeat.revealed && repeat.reason.length > 0)
  equal(repeat.state, examined.state)
  const in18 = go(examined.state, '18')
  equal(exitsOf(in18), ['14:open'])
  ok(!v04bHasEdge('18', '15'))
  equal(statusOf(go(in18, '14'), '18'), 'open')
})

// ---------- Cofres informativos ----------
test('cofres: disponibilidad según victorias, puzle y llegada', () => {
  const ids = (s: V04BExpedition) => availableChests(s).map((c) => c.roomId)
  equal(ids(go(win(go(start(), '02'), '02'), '03')), ['03'])
  equal(ids(at04()), ['03', '04'])
  equal(ids(go(at04(), '05', '06')), ['03', '04'])
  const afterB2 = go(win(go(at04(), '05', '06'), '06'), '14')
  equal(ids(afterB2), ['03', '04', '14'])
  equal(ids(go(afterB2, '15')), ['03', '04', '14', '15'])
  const solved = rune(go(at04(), '11', '12'), 'hueso', 'sombra', 'mana')
  ok(ids(solved).includes('12'))
  ok(!ids(solved).includes('13'))
  const in13 = go(go(solved, '05', '04', '03'), '13')
  ok(ids(in13).includes('13'))
})

test('cofres: 07 y 09 siguen disponibles tras reactivar; 18 y 16/17 tras su victoria', () => {
  const s = at10()
  const ids = availableChests(s).map((c) => c.roomId)
  ok(ids.includes('07') && ids.includes('09') && !ids.includes('08'))
  const recharged = useAltar(spend(s)).state
  ok(!isEncounterDefeated(recharged, '07'))
  ok(availableChests(recharged).some((c) => c.roomId === '07')) // one-time availability survives, claim-once is M7
  const deep = examineWall(at14()).state
  ok(!availableChests(deep).some((c) => c.roomId === '18'))
  ok(availableChests(win(go(deep, '18'), '18')).some((c) => c.roomId === '18'))
  const c16 = win(go(at14(), '16'), '16')
  ok(availableChests(c16).some((c) => c.roomId === '16'))
  ok(availableChests(win(go(c16, '17'), '17')).some((c) => c.roomId === '17'))
})

// ---------- Integración con el ciclo de ratas M5 ----------
function spend(s: V04BExpedition): V04BExpedition {
  return { ...s, session: { ...s.session, orb: { ...s.session.orb!, charges: 0 } } }
}

test('ratas: altar no recarga con orbe lleno o ratas pendientes; devuelve motivo', () => {
  const s = at10()
  const full = useAltar(s)
  ok(!full.recharged && full.reason.length > 0)
  equal(full.state, s)
  rejects(() => useAltar(at03()))
  const partial = go(win(go(at03(), '07'), '07'), '08')
  const away = { ...partial, currentRoomId: R('10') }
  ok(!useAltar(spend(away)).recharged)
})

test('ratas: recarga en 10 reactiva 07–09, cierra 10→09, salida 10→04, reentrada desde 03', () => {
  let s = spend(at10())
  equal(statusOf(s, '09'), 'open')
  const used = useAltar(s)
  ok(used.recharged)
  s = used.state
  equal(s.session.orb!.charges, 1)
  ok(ratCycleStatus(s.session).returnClosed)
  for (const room of ['07', '08', '09']) ok(!isEncounterDefeated(s, R(room)))
  equal(exitsOf(s), ['04:open', '09:blocked'])
  rejects(() => travel(s, '09'))
  // Staying at the altar does not recharge again.
  ok(!useAltar(spend(s)).recharged)
  s = go(s, '04')
  ok(s.session.ratCycle!.leftAltarVia04)
  s = go(s, '03', '07')
  ok(!s.session.ratCycle!.returnClosed)
  equal(exitsOf(s), ['03:open', '08:blocked'])
  // Reactivated 07–09 block their advance again, then the circuit completes and reaches 10 again.
  s = win(s, '07')
  equal(exitsOf(s), ['03:open', '08:open'])
  s = go(win(go(win(go(s, '08'), '08'), '09'), '09'), '10')
  equal(statusOf(s, '09'), 'open')
  ok(isEncounterDefeated(s, '09'))
})

test('ratas: sin recarga se puede volver a 09 (sigue vencida); 04→03→07 no reinicia', () => {
  let s = at10()
  s = go(s, '09')
  ok(isEncounterDefeated(s, '09'))
  equal(exitsOf(s), ['08:open', '10:open'])
  s = go(s, '08', '07', '03', '07')
  ok(isEncounterDefeated(s, '07') && isEncounterDefeated(s, '08'))
  equal(exitsOf(s), ['03:open', '08:open'])
})

test('ratas: reactivación en una sala de ratas bloquea el avance de 07–09 (ciclo M5 reflejado)', () => {
  let s = at10()
  s = useAltar(spend(s)).state
  const in07 = { ...s, currentRoomId: R('07'), previousRoomId: R('03') }
  equal(statusOf(in07, '08'), 'blocked')
  rejects(() => win({ ...s, currentRoomId: R('07') }, '07')) // closed circuit rejects the event too
})

test('ratas: 10→04 tras recarga y 04 aún vencida o no mantiene 04→03 y bloqueos', () => {
  const s = go(useAltar(spend(at10())).state, '04')
  equal(exitsOf(s), ['03:open', '05:blocked', '11:blocked'])
})

// ---------- Recorrido ----------
test('camino mínimo 01→19 sin salas opcionales: solo victorias en 02, 04 y 06', () => {
  let s = start()
  s = go(s, '02'); s = win(s, '02')
  s = go(s, '03', '04'); s = win(s, '04')
  s = go(s, '05', '06'); s = win(s, '06')
  s = go(s, '14', '15', '19')
  equal(s.currentRoomId, '19')
  equal(s.defeatedRoomIds, ['02', '04', '06'])
  equal(s.visitedRoomIds, ['01', '02', '03', '04', '05', '06', '14', '15', '19'])
  for (const optional of ['07', '08', '09', '10', '11', '12', '13', '16', '17', '18']) ok(!s.visitedRoomIds.includes(R(optional)))
  equal(availableChests(s).flatMap((c) => c.cardIds).length, 15) // 8 initial + 15 = 23 main-route copies
  s = win(s, '19')
  ok(isV04BExpeditionComplete(s))
})

test('travel: bloqueada, sin conexión o inexistente rechaza sin cambiar el estado', () => {
  const s = start()
  const before = JSON.stringify(s)
  rejects(() => travel(s, '03')); rejects(() => travel(s, '19')); rejects(() => travel(s, '99')); rejects(() => travel(s, '01'))
  equal(JSON.stringify(s), before)
})

// ---------- Exploración exhaustiva ----------
test('BFS: ningún estado alcanzable queda sin salida y desde todos se puede completar la expedición', () => {
  const keyOf = (s: V04BExpedition) => JSON.stringify([
    s.currentRoomId, s.previousRoomId, [...s.defeatedRoomIds].sort(), s.puzzle, s.wallExamined,
    [...s.session.ratCycle!.defeated].sort(), s.session.ratCycle!.returnClosed, s.session.ratCycle!.leftAltarVia04, s.session.orb!.charges,
  ])
  const actions = (s: V04BExpedition): V04BExpedition[] => {
    const next: V04BExpedition[] = openExits(s).map((to) => travel(s, to))
    const room = V04B_ROOMS.find((r) => r.id === s.currentRoomId)!
    if (room.encounterId && !isEncounterDefeated(s, room.id)) next.push(win(s, room.id))
    if (s.currentRoomId === '10') next.push(useAltar(s).state)
    if (s.currentRoomId === '12') for (const r of ['hueso', 'sombra', 'mana'] as V04BRune[]) next.push(activatePedestal(s, r).state)
    if (s.currentRoomId === '14') next.push(examineWall(s).state)
    if (s.session.orb!.charges > 0) next.push(spend(s)) // fixture standing for an activated orb, so the altar can recharge
    return next
  }
  const first = start()
  const seen = new Map<string, V04BExpedition>([[keyOf(first), first]])
  const reverse = new Map<string, Set<string>>()
  const queue = [first]
  while (queue.length > 0) {
    const state = queue.shift()!
    const key = keyOf(state)
    ok(openExits(state).length > 0, `Sin salida abierta: ${key}`)
    for (const next of actions(state)) {
      const nextKey = keyOf(next)
      if (!reverse.has(nextKey)) reverse.set(nextKey, new Set())
      reverse.get(nextKey)!.add(key)
      if (!seen.has(nextKey)) { seen.set(nextKey, next); queue.push(next) }
    }
  }
  // Reverse reachability from "B3 defeated": every state must be able to finish the expedition.
  const finals = [...seen.entries()].filter(([, s]) => isV04BExpeditionComplete(s)).map(([k]) => k)
  ok(finals.length > 0, 'Ningún estado alcanza la victoria final')
  const canFinish = new Set(finals)
  const pending = [...finals]
  while (pending.length > 0) {
    for (const prev of reverse.get(pending.pop()!) ?? []) if (!canFinish.has(prev)) { canFinish.add(prev); pending.push(prev) }
  }
  const stuck = [...seen.keys()].filter((k) => !canFinish.has(k))
  equal(stuck.length, 0, `Estados sin camino al final: ${stuck.slice(0, 3).join(' | ')}`)
  ok(seen.size > 100, `Pocos estados explorados: ${seen.size}`)
  // 19 after victory is terminal by design but keeps its return exit to 15, so no reachable state is closed.
})

// ---------- Sesión base ----------
test('la expedición V0.4B rechaza una sesión de perfil base', () => {
  rejects(() => createV04BExpedition(createGameSession([])))
})
