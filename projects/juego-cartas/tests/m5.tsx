import { renderToStaticMarkup } from 'react-dom/server'
import {
  activateOrb, applyBossRestoration, applyRestoration, createGameSession, createV04BCatalogSandbox, createV04BEncounterDuel, createV04BInitialSession,
  enterRatCircuitFrom03, grantCreatureCopies, leaveAltarTo04, orbStatus, ratCycleStatus, recordRatEncounterVictory, reinvokeCreatureType,
  restorationNeeded, restorationPreview, RuleViolation, useRatAltar, V04B_CARD_TYPES,
} from '../src/engine/index.js'
import type { GameSession, RatRoomId } from '../src/engine/index.js'
import { ExplorationHUD, orbControlFor } from '../src/ui/ExplorationHUD.js'

export const m5Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m5Tests.push({ name: `M5 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}
const base = () => createV04BInitialSession()
const maxOf = (cardId: string) => V04B_CARD_TYPES.find((c) => c.id === cardId)!.maxHealth
function woundType(session: GameSession, cardId: string, health: number): GameSession {
  return { ...session, copies: session.copies.map((c) => c.cardId === cardId ? { ...c, health } : c) }
}
/** Copy loss fixture (death/sacrifice): identity removed, slots untouched. */
function lose(session: GameSession, cardId: string): GameSession {
  const lost = session.copies.filter((c) => c.cardId === cardId).map((c) => c.id)
  return { ...session, copies: session.copies.filter((c) => !lost.includes(c.id)), activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => !lost.includes(id)) }
}
/** Initial session with a wounded N02, reduced max life and fatigue 1. */
function hurt(): GameSession {
  return woundType({ ...base(), invokerMaxLife: 17, invokerLife: 9, fatigue: 1 }, 'N02', 1)
}
const rats = (s: GameSession, ...rooms: RatRoomId[]) => rooms.reduce((acc, room) => recordRatEncounterVictory(acc, room), s)
const inCombat = (s: GameSession) => createV04BEncounterDuel(s, '02').session
const legacy = () => createGameSession([V04B_CARD_TYPES[0]])

// ---------- Restauración ----------
test('restauración: sana heridas en baraja y reserva, vida máxima 20, fatiga 0; no toca cupos, bonus ni identidades', () => {
  let s = hurt()
  const n02 = s.copies.find((c) => c.cardId === 'N02')!
  // N06 stays in the deck wounded; N02 goes to the reserve (out of the deck) with a bonus that must survive.
  s = { ...s, copies: s.copies.map((c) => c.cardId === 'N02' ? { ...c, bonusAttack: 1 } : c), activeDeckCopyIds: s.activeDeckCopyIds.filter((id) => id !== n02.id) }
  s = woundType(s, 'A01', 1)
  ok(!s.activeDeckCopyIds.includes(n02.id))
  ok(s.activeDeckCopyIds.length > 0)
  const restored = applyRestoration(s)
  for (const c of restored.copies) equal(c.health, maxOf(c.cardId) + c.bonusHealth)
  ok(restored.copies.find((c) => c.id === n02.id)!.health === maxOf('N02'))
  equal([restored.invokerMaxLife, restored.invokerLife, restored.fatigue], [20, 20, 0])
  equal(restored.unlockedCopySlots, s.unlockedCopySlots)
  equal(restored.copies.map((c) => [c.id, c.cardId, c.bonusAttack, c.bonusHealth]), s.copies.map((c) => [c.id, c.cardId, c.bonusAttack, c.bonusHealth]))
  equal(restored.activeDeckCopyIds, s.activeDeckCopyIds)
  equal(restored.grantedCopyEventIds, s.grantedCopyEventIds)
  equal(s.invokerMaxLife, 17)
})

test('restauración: respeta la salud máxima efectiva con bonus de vida', () => {
  const s = createV04BCatalogSandbox()
  const target = s.copies.find((c) => c.cardId === 'N08')!
  const wounded = { ...s, copies: s.copies.map((c) => c.id === target.id ? { ...c, bonusHealth: 2, health: 1 } : c) }
  equal(applyRestoration(wounded).copies.find((c) => c.id === target.id)!.health, maxOf('N08') + 2)
})

test('restauración: una copia perdida no revive ni se crean copias; recuperarla vuelve a costar vida máxima', () => {
  const s = lose(hurt(), 'N05')
  const restored = applyRestoration(s)
  equal(restored.copies.length, s.copies.length)
  ok(!restored.copies.some((c) => c.cardId === 'N05'))
  equal(restored.unlockedCopySlots.N05, s.unlockedCopySlots.N05)
  const recovered = reinvokeCreatureType(restored, 'N05', V04B_CARD_TYPES)
  equal(recovered.invokerMaxLife, 19)
  equal(recovered.unlockedCopySlots, restored.unlockedCopySlots)
  equal(applyRestoration(recovered).invokerMaxLife, 20)
})

test('restauración: rechazada en combate y en sesiones legadas; la consulta distingue necesidad', () => {
  rejects(() => applyRestoration(inCombat(hurt())))
  rejects(() => applyRestoration(legacy()))
  ok(!restorationNeeded(base()))
  equal(restorationPreview(base()), { healedCopies: 0, maxLifeRecovered: 0, fatigueRemoved: false })
  equal(restorationPreview(hurt()), { healedCopies: 1, maxLifeRecovered: 3, fatigueRemoved: true })
  ok(restorationNeeded({ ...base(), fatigue: 1 }))
  ok(restorationNeeded({ ...base(), invokerMaxLife: 19 }))
  ok(restorationNeeded(woundType(base(), 'N02', 1)))
})

// ---------- Orbe ----------
test('orbe: inicial cargado con capacidad 1 en la sesión inicial y el sandbox; el legado no tiene orbe', () => {
  for (const s of [createV04BInitialSession(), createV04BCatalogSandbox()]) equal([s.orb, orbStatus(s).charged], [{ charges: 1, capacity: 1 }, true])
  equal(legacy().orb, undefined)
  equal(legacy().ratCycle, undefined)
  equal(orbStatus(legacy()).present, false)
})

test('orbe: activar consume la carga y aplica la restauración', () => {
  const used = activateOrb(hurt())
  equal(used.orb, { charges: 0, capacity: 1 })
  equal([used.invokerMaxLife, used.invokerLife, used.fatigue], [20, 20, 0])
  equal(used.copies.find((c) => c.cardId === 'N02')!.health, maxOf('N02'))
  equal(orbStatus(used).reason, 'Orbe vacío')
})

test('orbe: rechazado en combate, vacío, sin nada que restaurar o legado, sin gastar carga', () => {
  const s = hurt()
  rejects(() => activateOrb(inCombat(s)))
  rejects(() => activateOrb(activateOrb(s)))
  rejects(() => activateOrb({ ...s, orb: { charges: 0, capacity: 1 } }))
  const healthy = base()
  rejects(() => activateOrb(healthy))
  equal(healthy.orb, { charges: 1, capacity: 1 })
  equal(orbStatus(healthy).reason, 'No hay nada que restaurar')
  rejects(() => activateOrb(legacy()))
  equal(s.orb, { charges: 1, capacity: 1 })
})

test('restauración de jefe: no consume ni requiere carga (orbe vacío y lleno)', () => {
  for (const charges of [0, 1]) {
    const r = applyBossRestoration({ ...hurt(), orb: { charges, capacity: 1 } })
    equal(r.orb, { charges, capacity: 1 })
    equal([r.invokerMaxLife, r.fatigue, r.copies.find((c) => c.cardId === 'N02')!.health], [20, 0, maxOf('N02')])
  }
  rejects(() => applyBossRestoration(inCombat(hurt())))
})

// ---------- Ciclo de ratas MIG-D03 ----------
test('ratas: estado inicial, victorias y consultas; eventos incoherentes se rechazan', () => {
  const s = base()
  equal(ratCycleStatus(s).encounters, { '07': 'active', '08': 'active', '09': 'active' })
  const one = recordRatEncounterVictory(s, '08')
  equal(ratCycleStatus(one).encounters, { '07': 'active', '08': 'defeated', '09': 'active' })
  rejects(() => recordRatEncounterVictory(one, '08'))
  rejects(() => recordRatEncounterVictory(s, '10' as RatRoomId))
  rejects(() => recordRatEncounterVictory(inCombat(s), '07'))
  rejects(() => recordRatEncounterVictory(legacy(), '07'))
  equal(s.ratCycle!.defeated, [])
})

test('ratas: el altar no recarga con orbe lleno ni con ratas pendientes; resultado sin efecto con motivo', () => {
  const full = rats(base(), '07', '08', '09')
  const noOp = useRatAltar(full)
  equal([noOp.recharged, noOp.session === full, noOp.reason], [false, true, 'El orbe ya está cargado'])
  equal(ratCycleStatus(noOp.session).encounters['09'], 'defeated')
  const empty = { ...hurt(), orb: { charges: 0, capacity: 1 } }
  const partial = useRatAltar(rats(empty, '07', '08'))
  equal([partial.recharged, partial.reason, partial.session.orb!.charges], [false, 'Faltan ratas por vencer en este ciclo', 0])
  rejects(() => useRatAltar(inCombat(empty)))
})

test('ratas: ciclo completo (recarga, reactivación, cierre 10→09, salida 04, reentrada 03, segunda recarga)', () => {
  let s: GameSession = grantCreatureCopies(activateOrb(hurt()), 'chest-test', ['N03'], V04B_CARD_TYPES)
  equal(s.orb!.charges, 0)
  const events = s.grantedCopyEventIds
  s = rats(s, '07', '08', '09')
  const altar = useRatAltar(s)
  ok(altar.recharged)
  s = altar.session
  equal(s.orb, { charges: 1, capacity: 1 })
  equal(ratCycleStatus(s).encounters, { '07': 'active', '08': 'active', '09': 'active' })
  ok(ratCycleStatus(s).returnClosed)
  equal(s.grantedCopyEventIds, events)
  // No second recharge staying at the altar, no victories while closed, no re-entry without leaving through 04.
  equal(useRatAltar(s).recharged, false)
  rejects(() => recordRatEncounterVictory(s, '07'))
  rejects(() => enterRatCircuitFrom03(s))
  s = leaveAltarTo04(s)
  ok(ratCycleStatus(s).returnClosed, 'sigue cerrado hasta reentrar')
  s = enterRatCircuitFrom03(s)
  ok(!ratCycleStatus(s).returnClosed)
  // Second recharge only after another full circuit and an empty orb.
  s = woundType(s, 'N02', 1)
  s = rats(s, '07', '08')
  ok(!useRatAltar(s).recharged)
  s = rats(s, '09')
  equal(useRatAltar(s).reason, 'El orbe ya está cargado')
  s = activateOrb(s)
  const second = useRatAltar(s)
  ok(second.recharged)
  equal(second.session.orb, { charges: 1, capacity: 1 })
  equal(second.session.grantedCopyEventIds, events)
})

test('ratas: sin recarga no hay reinicio; salir por 04 y reentrar no reactiva nada', () => {
  const s = enterRatCircuitFrom03(leaveAltarTo04(rats(base(), '07', '08', '09')))
  equal(ratCycleStatus(s).encounters, { '07': 'defeated', '08': 'defeated', '09': 'defeated' })
  equal(s.orb, { charges: 1, capacity: 1 })
})

test('ratas: las concesiones de cofres y las copias quedan intactas en toda la secuencia', () => {
  let s = grantCreatureCopies({ ...hurt(), orb: { charges: 0, capacity: 1 } }, 'chest-a', ['N03'], V04B_CARD_TYPES)
  const before = JSON.stringify([s.grantedCopyEventIds, s.copies, s.unlockedCopySlots])
  s = enterRatCircuitFrom03(leaveAltarTo04(useRatAltar(rats(s, '07', '08', '09')).session))
  equal(JSON.stringify([s.grantedCopyEventIds, s.copies, s.unlockedCopySlots]), before)
})

// ---------- HUD ----------
const hud = (session: GameSession) => renderToStaticMarkup(<ExplorationHUD life={session.invokerLife} maxLife={session.invokerMaxLife} mana={1} fatigue={session.fatigue} level={1} roomName="Sala" complete={false} onCollection={() => undefined} orb={orbControlFor(session, () => undefined)} />)

test('HUD: orbe cargado y activo', () => {
  const html = hud(hurt())
  ok(html.includes('orb-launcher charged'))
  ok(html.includes('Cargado'))
  ok(html.includes('aria-label="Activar orbe de restauración (cargado)"'))
  ok(!/<button[^>]*orb-launcher[^>]*disabled/.test(html))
})

test('HUD: orbe vacío desactivado con motivo', () => {
  const html = hud({ ...hurt(), orb: { charges: 0, capacity: 1 } })
  ok(/<button[^>]*orb-launcher empty[^>]*disabled/.test(html))
  ok(html.includes('<small>Vacío</small>'))
  ok(!html.includes('Vacío ·'))
})

test('HUD: sin nada que restaurar desactivado con motivo', () => {
  const html = hud(base())
  ok(/<button[^>]*orb-launcher charged[^>]*disabled/.test(html))
  ok(html.includes('No hay nada que restaurar'))
})

test('HUD: ausente en sesiones legadas', () => {
  ok(orbControlFor(legacy(), () => undefined) === undefined)
  const html = hud(legacy())
  ok(!html.includes('orb-launcher'))
  ok(html.includes('collection-launcher'))
})
