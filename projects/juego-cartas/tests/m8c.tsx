import {
  createV04BInitialSession, declareAttackers, startCombat, V04B_CARD_TYPES, V04B_ENCOUNTERS,
} from '../src/engine/index.js'
import type { CreatureCard, Creature, DuelState } from '../src/engine/index.js'
import { chooseEnemyBlockers, runEnemyTurn } from '../src/engine/enemy.js'
import { continueToPlayerDecision } from '../src/ui/combatActions.js'
import { createDuel } from './duelFixtures.js'
import { evaluate, range, STYLES } from './balance.js'
import { Expedition, runFullWalk } from './m8b.js'

export const m8cTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m8cTests.push({ name: `M8c · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
const card = (id: string): CreatureCard => V04B_CARD_TYPES.find((c) => c.id === id)!
const PLAYER_DECK = ['N05', 'N05', 'N02', 'N02', 'N06', 'N06', 'A01', 'A01'].map(card)

/** Extra creature for fixtures: a real card, a rat token, or an echo of the given size. */
type Spec = string | { id: string; shield?: number; token?: true; echo?: number }
let fixtureCounter = 0
function put(duel: DuelState, owner: 'player' | 'opponent', specs: Spec[]): DuelState {
  const side = duel.players[owner]
  let next = duel.nextCreatureNumber
  const made: Creature[] = specs.map((spec) => {
    const { id, shield, token, echo } = typeof spec === 'string' ? { id: spec } as Exclude<Spec, string> : spec
    const instanceId = `m8c-fixture-${fixtureCounter++}`
    const base: CreatureCard = echo ? { id: 'crypt-echo', name: 'Eco de la cripta', attack: echo, maxHealth: echo, cost: { mana: 0, sacrifices: 0 } }
      : token ? { id: 'token-rat', name: 'Ficha de rata', attack: 1, maxHealth: 1, cost: { mana: 0, sacrifices: 0 } } : { ...card(id), cost: { ...card(id).cost } }
    const entityKind = echo || token ? 'token' as const : 'real' as const
    return {
      id: `creature-${next++}`, entityKind, card: { ...base, instanceId, entityKind }, owner, health: base.maxHealth, summonedTurn: 0,
      ...(shield ? { shieldCharges: shield } : {}), ...(echo ? { echo: true as const } : {}),
    }
  })
  return { ...duel, players: { ...duel.players, [owner]: { ...side, creatures: [...side.creatures, ...made] } }, nextCreatureNumber: next }
}
interface Setup { hand?: string[]; field?: string[]; rivalLife?: number; playerLife?: number; first?: 'player' | 'opponent'; legacy?: boolean }
/** V0.4B duel with an authored rival hand and field (the rival starts by default; hands are the first cards of the deck). */
function duelWith(setup: Setup = {}) {
  return createDuel({
    ...(setup.legacy ? {} : { collectionProfile: 'v04b' as const }), playerDeck: setup.legacy ? [card('N05')] : PLAYER_DECK,
    opponentDeck: (setup.hand ?? []).map(card), opponentInitialField: (setup.field ?? []).map(card),
    firstPlayer: setup.first ?? 'opponent', opponentLife: setup.rivalLife ?? 20, playerLife: setup.playerLife ?? 20,
  })
}
const rivalIds = (d: DuelState) => d.players.opponent.creatures.map((unit) => unit.card.id)
const rivalHand = (d: DuelState) => d.players.opponent.kind === 'invoker' ? d.players.opponent.hand.map((c) => c.id) : []
const attackersOf = (d: DuelState) => d.attackers.map((id) => d.players.opponent.creatures.find((unit) => unit.id === id)!.card.id)

/** Rival attack decision: the rival plays its (empty or authored) hand and declares attackers against the given player field. */
function attackDecision(setup: Setup, playerField: Spec[], rivalExtra: Spec[] = [], level?: 1 | 2) {
  const d = runEnemyTurn(put(put(duelWith(setup), 'opponent', rivalExtra), 'player', playerField), level)
  return attackersOf(d)
}
/** Rival block decision against the player's field creatures attacking, as [attacker, blocker] card IDs. */
function blockDecision(setup: Setup, attackers: Spec[], rivalExtra: Spec[] = [], level?: 1 | 2) {
  let d = put(put(duelWith({ ...setup, first: 'player' }), 'player', attackers), 'opponent', rivalExtra)
  d = declareAttackers(startCombat(d), d.players.player.creatures.map((unit) => unit.id))
  const assignments = chooseEnemyBlockers(d, level)
  return Object.entries(assignments).map(([attackerId, blockers]) => [
    d.players.player.creatures.find((unit) => unit.id === attackerId)!.card.id,
    ...blockers.map((id) => d.players.opponent.creatures.find((unit) => unit.id === id)!.card.id),
  ])
}

// ---------- (1) Ataque ----------
test('ataque: con daño letal aunque el jugador bloquee a los más fuertes, ataca con todo (también los condenados)', () => {
  // N04 del jugador mata a cada atacante rival que no sea N06; bloquea al más fuerte (N06) y aun así pasan 1 + 1 = 2.
  equal(attackDecision({ field: ['N06', 'N05', 'N05'], playerLife: 2 }, ['N04']), ['N06', 'N05', 'N05'])
  // Con 3 de vida no es letal: las N05 morirían sin matar y se quedan; N06 mata a N04 (3 >= 3) y ataca.
  equal(attackDecision({ field: ['N06', 'N05', 'N05'], playerLife: 3 }, ['N04']), ['N06'])
})
test('ataque: retiene al atacante que moriría ante un bloqueador sin matarlo; ataca si mata o si el bloqueador no puede matarlo', () => {
  equal(attackDecision({ field: ['N05', 'N02'] }, ['N04']), [])          // N04 mata a ambos y sobrevive
  equal(attackDecision({ field: ['N04'] }, ['N04']), ['N04'])            // intercambio: N04 mata a N04 (4 >= 3)
  equal(attackDecision({ field: ['N05'] }, ['H01']), ['N05'])            // H01 (ATQ 0) no puede matar
  equal(attackDecision({ field: ['N05', 'N02'] }, []), ['N05', 'N02'])   // sin bloqueadores todos atacan
})
test('ataque: escudos. Un atacante con escudo no muere; un bloqueador con escudo sobrevive', () => {
  equal(attackDecision({ field: ['R03'] }, ['N04']), ['R03'])                         // N04 no puede matar a R03 con escudo
  equal(attackDecision({ field: ['N04'] }, [{ id: 'R03', shield: 1 }]), [])           // R03 con escudo mata a N04 sin morir
  equal(attackDecision({ field: ['N04'] }, [{ id: 'R03', shield: 0 }]), ['N04'])      // sin escudo es intercambio
})
test('ataque: las criaturas de ATQ 0 no atacan (ni siquiera sin bloqueadores)', () => {
  equal(attackDecision({ field: ['H01', 'N02', 'H02'] }, []), ['N02', 'H02'])
  equal(attackDecision({ field: ['H01', 'H01'] }, []), [])
})
test('ataque: el Eco de la cripta siempre ataca, aunque un bloqueador lo mataría', () => {
  equal(attackDecision({ field: ['N05'] }, ['N04'], [{ id: 'echo', echo: 1 }]), ['crypt-echo'])
  equal(attackDecision({ field: [] }, ['N04', 'N04'], [{ id: 'echo', echo: 2 }]), ['crypt-echo'])
})

// ---------- (2) Bloqueo ----------
test('bloqueo: bloquea con el de menor valor que mata al atacante y sobrevive (también con escudo)', () => {
  equal(blockDecision({ field: ['N04', 'N02'] }, ['N05']), [['N05', 'N02']])
  equal(blockDecision({}, ['N04'], [{ id: 'R03', shield: 1 }]), [['N04', 'R03']])
})
test('bloqueo: acepta intercambios iguales o favorables (valor del bloqueador <= valor del atacante)', () => {
  equal(blockDecision({ field: ['N06'] }, ['N02']), [['N02', 'N06']])   // 4 contra 4
  equal(blockDecision({ field: ['N06'] }, ['N03']), [['N03', 'N06']])   // 4 contra 5
})
test('bloqueo: no bloquea intercambios desfavorables, bloqueos que no matan ni al que sobrevive sin matar (sin daño letal)', () => {
  equal(blockDecision({ field: ['N04'] }, ['N06']), [])    // N04 (7) por N06 (4)
  equal(blockDecision({ field: ['N05'] }, ['N04']), [])    // sacrificio sin matar
  equal(blockDecision({ field: ['H01'] }, ['N09']), [])    // muere sin matar
  equal(blockDecision({ field: ['H01'] }, ['N05']), [])    // sobrevive pero no mata: la decisión no lo contempla, no bloquea
  equal(blockDecision({ field: ['N05', 'N05'] }, []), [])  // sin atacantes
})
test('bloqueo: ante daño letal bloquea a los atacantes más fuertes con sus criaturas de menor valor hasta dejar de serlo', () => {
  const attackers: Spec[] = ['N03', 'N04'] // 3 + 4 = 7
  equal(blockDecision({ field: ['H01', 'N05'], rivalLife: 5 }, attackers), [['N04', 'N05']])   // 7 - 4 = 3 < 5
  equal(blockDecision({ field: ['H01', 'N05'], rivalLife: 3 }, attackers), [['N04', 'N05'], ['N03', 'H01']])
  equal(blockDecision({ field: ['H01', 'N05'], rivalLife: 8 }, attackers), [])                  // 7 < 8: sin emergencia
  equal(blockDecision({ field: [], rivalLife: 5 }, attackers, [{ id: 'echo', echo: 3 }]), [])    // el Eco nunca bloquea
})

// ---------- (3) Sacrificios ----------
test('sacrificios: no invoca si los materiales reales valen más que la carta; las fichas valen 0', () => {
  const costly = runEnemyTurn(duelWith({ hand: ['N03'], field: ['N04'] }))
  equal([rivalIds(costly), rivalHand(costly)], [['N04'], ['N03']])      // 7 > 5: se queda en la mano
  const cheap = runEnemyTurn(duelWith({ hand: ['N03'], field: ['N05'] }))
  equal(rivalIds(cheap), ['N03'])                                       // 2 <= 5
  const token = runEnemyTurn(put(duelWith({ hand: ['N03'], field: ['N04'] }), 'opponent', [{ id: 'rat', token: true }]))
  equal(rivalIds(token).filter((id) => id !== 'token-rat'), ['N04', 'N03'])  // la ficha paga primero y vale 0
  ok(!rivalIds(token).includes('token-rat'))
})
test('sacrificios: H04 no sacrifica tres reales que valen más que el ídolo con su bono ritual; sí cuando valen menos', () => {
  const refuse = runEnemyTurn(duelWith({ hand: ['H04'], field: ['N04', 'N04', 'N04'] }))
  equal([rivalIds(refuse), rivalHand(refuse)], [['N04', 'N04', 'N04'], ['H04']])   // 21 > 1 + 2 * 9
  const accept = runEnemyTurn(duelWith({ hand: ['H04'], field: ['H01', 'H01', 'H01'] }))
  equal(rivalIds(accept), ['H04'])                                                 // 9 <= 1 + 2 * 9
  const idol = accept.players.opponent.creatures[0]
  equal([idol.ritualBonus, idol.health], [9, 10])
})

// ---------- (4) Orden ----------
test('orden: con varias cartas pagables juega primero la de mayor coste; el nivel 1 respeta el orden de la mano', () => {
  const setup = { hand: ['N05', 'N02', 'N04'], field: ['N05'] }
  // N04 (maná 1 + 1 sacrificio) primero y sacrifica la N05 del campo; el maná se gasta y N02 queda en la mano.
  const smart = runEnemyTurn(duelWith(setup))
  equal([rivalIds(smart), rivalHand(smart)], [['N04', 'N05'], ['N02']])
  // Nivel 1 (referencia): N05, luego N02 con el maná y por último N04 sin maná, que ya no es pagable.
  const reference = runEnemyTurn(duelWith(setup), 1)
  equal([rivalIds(reference), rivalHand(reference)], [['N05', 'N05', 'N02'], ['N04']])
})
test('R01 como en el nivel 1: se activa solo para habilitar una carta que se jugará', () => {
  equal(rivalIds(runEnemyTurn(duelWith({ hand: ['R03'], field: ['R01'] }))), ['R03'])         // maná 2 gracias a R01
  equal(rivalIds(runEnemyTurn(duelWith({ hand: ['N05'], field: ['R01'] }))), ['R01', 'N05'])  // sin carta que habilitar se conserva
})

test('una declaración de ataque vacía es legal: la fase de bloqueo sin atacantes se resuelve y el turno pasa al jugador', () => {
  const d = runEnemyTurn(duelWith({ field: ['H01', 'H01'] }))
  equal([d.phase, d.attackers], ['blockers', []])
  const next = continueToPlayerDecision(d)
  equal([next.activePlayer, next.phase, next.players.player.life], ['player', 'main', 20])
})

// ---------- Legado y nivel 1 ----------
test('legado sin cambios: el perfil legado ignora el nivel; ataca con todo (ATQ 0 incluido) y bloquea como siempre', () => {
  const start = put(duelWith({ legacy: true, field: ['H01', 'N05'] }), 'player', ['N04'])
  const legacy = (level?: 1 | 2) => runEnemyTurn(start, level)
  equal(attackersOf(legacy()), ['H01', 'N05'])
  equal(JSON.stringify(legacy(1)), JSON.stringify(legacy(2)))
  equal(JSON.stringify(legacy()), JSON.stringify(legacy(1)))
  // Bloqueo legado: el primer bloqueador letal, o el primero disponible aunque muera (nivel 2 no bloquearía así).
  equal(blockDecision({ legacy: true, field: ['N05', 'N04'] }, ['N06']), [['N06', 'N05']])
  equal(blockDecision({ legacy: true, field: ['N05'] }, ['N04']), [['N04', 'N05']])   // bloqueo sin matar: solo el legado
  equal(blockDecision({ legacy: true, field: ['N05'] }, ['N04'], [], 1), [['N04', 'N05']])
})
test('nivel 1 de referencia en V0.4B: ataca con todo (ATQ 0 y condenados) y bloquea al primero disponible', () => {
  equal(attackDecision({ field: ['H01', 'N05'] }, ['N04'], [], 1), ['H01', 'N05'])
  equal(blockDecision({ field: ['N05'] }, ['N04'], [], 1), [['N04', 'N05']])
})

// ---------- Simulación: legalidad y terminación ----------
/** Observed maximum is 30 turns (balance report, seeds 1-20, both collections); the bound leaves a wide margin without hiding a stall. */
const TURN_BOUND = 60
test('simulación reducida: diez encuentros × semillas 1-10 × ambos iniciales × dos estilos × niveles 1 y 2 terminan sin acciones ilegales', () => {
  const session = createV04BInitialSession()
  for (const data of V04B_ENCOUNTERS) {
    for (const level of [1, 2] as const) {
      for (const style of STYLES) {
        const stats = evaluate(session, data.id, { level, style, seeds: range(1, 10) })
        equal(stats.games, 20, `${data.id}`)
        ok(stats.turnsMax <= TURN_BOUND, `${data.id} N${level} ${style}: ${stats.turnsMax} turnos`)
      }
    }
  }
})
test('el Eco rival (mazo exhausto) con IA nivel 2: aparece, ataca y el duelo termina', () => {
  const stats = evaluate(createV04BInitialSession(), '19', { level: 2, style: 'agresivo', seeds: range(1, 10) })
  ok(stats.echoGames > 0, 'El Rey Esqueleto debe llegar a producir Ecos en el rango de semillas')
})
test('recorrido 01→19 contra el nivel 2: completo (repitiendo contra nivel 1 las salas que el jugador automático no gane)', () => {
  const run = new Expedition(undefined, 2)
  run.fallback = true
  runFullWalk(run)
  equal(run.fights.at(-1)!.room, '19')
  ok(run.fights.every((fight) => fight.attempts >= 1))
  if ((globalThis as { M8C_REPORT?: boolean }).M8C_REPORT) console.log(`M8c recorrido nivel 2: ${run.fights.map((f) => `${f.room}×${f.attempts}${f.level === 1 ? '*' : ''}`).join(' ')}`)
})
