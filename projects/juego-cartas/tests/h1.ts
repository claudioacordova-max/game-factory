import { requireInvoker } from '../src/engine/rules.js'
import {
  enterRatWing, addCopyToActiveDeck,
  createExplorationProgress, createGameSession, DUNGEON_ENCOUNTERS, ENEMY_CARD_TYPES,
  finishSessionDuel, INITIAL_PLAYER_CARD_IDS, MAIN_ENCOUNTERS, moveActiveDeckCopy,
  PLAYER_CARD_TYPES, PLAYER_DECK, reinvokeCreatureType, reinvokeStatus,
  removeCopyFromActiveDeck, settleAdventureEncounter,
  summonCreature, unlockCreatureType,
  declareAttackers, declareBlockers, endTurn, resolveCombat, startCombat,
} from '../src/engine/index.js'
import { beginAdventureEncounter, beginSessionDuel, createDuel, seededRandom, startSessionDuel } from './duelFixtures.js'
import { runEnemyTurn } from '../src/engine/enemy.js'
import type { AdventureState, CreatureCard, DuelState, GameSession } from '../src/engine/index.js'

type Test = { name: string; run: () => void }
export const h1Tests: Test[] = []
function test(name: string, run: () => void) { h1Tests.push({ name: `H1 · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function rejected(run: () => unknown) {
  let caught = false
  try { run() } catch { caught = true }
  ok(caught, 'La acción inválida debe rechazarse')
}
const card = (id: string) => PLAYER_CARD_TYPES.find((entry) => entry.id === id)!
const encounter = (id: string) => DUNGEON_ENCOUNTERS.find((entry) => entry.id === id)!
// Isolated rule fixtures: these terminal states do not establish expedition balance or a played victory.
const terminal = (duel: DuelState, winner: 'player' | 'opponent' = 'player'): DuelState => ({ ...duel, phase: 'finished', winner })
function missing(ids: string[], max = 20): GameSession {
  const initial = createGameSession(ids.map(card))
  return { ...initial, copies: [], activeDeckCopyIds: [], invokerMaxLife: max, invokerLife: max }
}
function adventure(session = createGameSession(PLAYER_DECK)): AdventureState {
  return { session, progress: createExplorationProgress() }
}

test('18 tipos propios exactos con cifras y metadatos del CSV', () => {
  equal(PLAYER_CARD_TYPES.map((c) => [c.id, c.attack, c.maxHealth, c.cost.mana, c.cost.sacrifices, c.reinvokeCost, c.rarity, c.seed, c.growth ?? '-', c.growthCap]), [
    ['P01',1,2,0,0,0,'common',true,'-',0], ['P02',2,1,0,0,0,'common',true,'-',0],
    ['P03',1,3,0,0,0,'common',true,'-',0], ['P04',0,4,0,0,0,'common',true,'-',0],
    ['P05',2,3,0,0,1,'common',false,'-',0], ['P06',3,2,0,0,1,'common',false,'-',0],
    ['P07',2,5,1,0,1,'common',false,'-',0], ['P08',3,3,1,0,1,'common',false,'-',0],
    ['P09',2,4,0,0,1,'common',false,'-',0], ['P10',4,2,1,0,1,'common',false,'-',0],
    ['P11',4,4,1,0,2,'rare',false,'-',0], ['P12',2,8,1,0,2,'rare',false,'-',0],
    ['P13',5,5,0,1,2,'rare',false,'-',0], ['P14',6,4,0,1,2,'rare',false,'-',0],
    ['P15',4,6,1,0,2,'rare',false,'-',0], ['P16',5,6,1,1,3,'epic',false,'attack',3],
    ['P17',4,8,1,1,3,'epic',false,'health',3], ['P18',3,5,1,0,3,'epic',false,'attack',3],
  ])
})

test('14 enemigos y 7 encuentros exactos, sin anexar cartas antiguas', () => {
  equal(ENEMY_CARD_TYPES.map((c) => [c.id,c.attack,c.maxHealth,c.cost.mana,c.cost.sacrifices]), [
    ['E01',1,1,0,0],['E02',1,2,0,0],['E03',2,3,0,0],['E04',2,1,0,0],['E05',3,2,0,0],
    ['E06',2,2,0,0],['E07',2,3,0,0],['E08',3,2,1,0],['E09',2,4,1,0],['E10',3,5,0,0],
    ['E11',4,5,1,0],['E12',3,4,0,1],['E13',4,6,1,0],['E14',5,5,0,1],
  ])
  equal(DUNGEON_ENCOUNTERS.map((e) => [e.id,e.mode,e.opponentLife,e.opponentInitialField.map((c) => c.id),e.opponentDeck.map((c) => c.id)]), [
    ['R1','skirmish',0,['E01'],[]],['R2','skirmish',0,['E01','E03'],[]],['R3','skirmish',0,['E01','E02','E04'],[]],
    ['R4','duel',12,[],['E01','E05']],['B1','duel',17,[],['E08','E07','E09']],
    ['B2','duel',22,[],['E08','E09','E07','E11','E10']],['B3','duel',30,['E06'],['E11','E13','E08','E09','E14','E12']],
  ])
  equal(MAIN_ENCOUNTERS.map((e) => e.id), ['B1','B2','B3'])
})

test('inicio de ocho copias sanas, orden y mano de tres aprobados', () => {
  const session = createGameSession(PLAYER_DECK)
  equal(session.copies.map((c) => c.cardId), INITIAL_PLAYER_CARD_IDS)
  equal(INITIAL_PLAYER_CARD_IDS, ['P01','P02','P11','P03','P04','P05','P06','P07'])
  equal([session.invokerMaxLife, session.invokerLife, session.fatigue], [20,20,0])
  for (const copy of session.copies) equal([copy.health,copy.bonusAttack,copy.bonusHealth], [card(copy.cardId).maxHealth,0,0])
  const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
  equal(started.duel.players.player.hand.map((c) => c.id), ['P01','P02','P11'])
  equal(started.duel.players.player.deck.map((c) => c.id), INITIAL_PLAYER_CARD_IDS.slice(3))
  equal(started.duel.participantCopyIds, session.activeDeckCopyIds)
})

test('reinvocación común/rara/épica paga 1/2/3 de máximo y ajusta vida actual', () => {
  let session = missing(['P05','P11','P16'])
  for (const [id,max] of [['P05',19],['P11',17],['P16',14]] as const) {
    session = reinvokeCreatureType(session,id,PLAYER_CARD_TYPES)
    equal([session.invokerMaxLife,session.invokerLife],[max,max])
  }
  equal(session.activeDeckCopyIds, [])
  equal(session.copies.map((c) => [c.bonusAttack,c.bonusHealth]), [[0,0],[0,0],[0,0]])
})

test('suelo 1 exacto por cada coste y rechazo sin cobrar ni cambiar nada', () => {
  for (const id of ['P05','P11','P16']) {
    const cost = card(id).reinvokeCost!
    const allowed = reinvokeCreatureType(missing([id],cost+1),id,PLAYER_CARD_TYPES)
    equal([allowed.invokerMaxLife,allowed.invokerLife],[1,1])
    const blocked = missing([id],cost)
    const snapshot = JSON.stringify(blocked)
    rejected(() => reinvokeCreatureType(blocked,id,PLAYER_CARD_TYPES))
    equal(JSON.stringify(blocked),snapshot)
    equal(reinvokeStatus(blocked,id,PLAYER_CARD_TYPES).allowed,false)
  }
})

test('cuatro semillas recuperables gratis a máximo 1 y fatiga alta', () => {
  let session = { ...missing(['P01','P02','P03','P04'],1), fatigue: 9 }
  for (const id of session.unlockedCardIds) session = reinvokeCreatureType(session,id,PLAYER_CARD_TYPES)
  equal([session.invokerMaxLife,session.invokerLife,session.fatigue,session.copies.length],[1,1,9,4])
  for (const copy of session.copies) session = addCopyToActiveDeck(session,copy.id)
  let duel = beginSessionDuel(session,PLAYER_CARD_TYPES,[]).duel
  for (const c of [...duel.players.player.hand]) duel = summonCreature(duel,c.id)
  equal([duel.players.player.mana,duel.players.player.creatures.length],[0,3])
})

test('reserva herida bloquea reinvocación, sin curación ni duplicación', () => {
  let session = createGameSession([card('P05')])
  session = removeCopyFromActiveDeck(session,session.copies[0].id)
  session = { ...session, copies: [{ ...session.copies[0], health: 1 }] }
  const snapshot = JSON.stringify(session)
  rejected(() => reinvokeCreatureType(session,'P05',PLAYER_CARD_TYPES))
  equal(JSON.stringify(session),snapshot)
  equal(reinvokeStatus(session,'P05',PLAYER_CARD_TYPES).reason,'Ya posees una copia de este tipo')
})

test('tipo desconocido o no descubierto se rechaza sin cobrar', () => {
  const session = missing(['P01'])
  const snapshot = JSON.stringify(session)
  rejected(() => reinvokeCreatureType(session,'unknown',PLAYER_CARD_TYPES))
  rejected(() => reinvokeCreatureType(session,'P16',PLAYER_CARD_TYPES))
  equal(JSON.stringify(session),snapshot)
})

test('recrea ID nuevo con salud base y sin bonos; no devuelve identidad antigua', () => {
  let session = createGameSession([card('P16')])
  const oldId = session.copies[0].id
  session = { ...session, copies: [{ ...session.copies[0], health: 2, bonusAttack: 3 }] }
  const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[])
  let lost = terminal(started.duel,'opponent')
  lost = { ...lost, players: { ...lost.players, player: { ...lost.players.player, hand: [], deck: [], creatures: [] } } }
  const settled = finishSessionDuel(started.session,lost)
  const next = reinvokeCreatureType(settled,'P16',PLAYER_CARD_TYPES)
  equal(next.copies,[{ id:'copy-2',cardId:'P16',health:6,bonusAttack:0,bonusHealth:0 }])
  ok(next.copies[0].id !== oldId)
  equal(next.activeDeckCopyIds,[])
})

test('dominio bloquea edición, orden, desbloqueo, reinvocación y nuevo combate durante intento activo', () => {
  let session = createGameSession([card('P01'),card('P02')])
  session = unlockCreatureType(session,card('P05'))
  session = { ...session, copies: session.copies.filter((c) => c.cardId !== 'P05') }
  const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[])
  const snapshot = JSON.stringify(started.session)
  const id = started.session.copies[0].id
  for (const action of [
    () => reinvokeCreatureType(started.session,'P05',PLAYER_CARD_TYPES),
    () => addCopyToActiveDeck(started.session,id), () => removeCopyFromActiveDeck(started.session,id),
    () => moveActiveDeckCopy(started.session,id,1), () => unlockCreatureType(started.session,card('P16')),
    () => beginSessionDuel(started.session,PLAYER_CARD_TYPES,[]),
    () => startSessionDuel(started.session,PLAYER_CARD_TYPES,[]),
  ]) rejected(action)
  equal(JSON.stringify(started.session),snapshot)
})

test('participantes capturados; reserva preserva objeto, identidad y herida aunque cambie la baraja futura', () => {
  let session = createGameSession([card('P01'),card('P05')])
  session = { ...session, copies: session.copies.map((copy) => ({ ...copy,health:1 })) }
  const reserve = session.copies[1]
  session = removeCopyFromActiveDeck(session,reserve.id)
  const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[])
  const result = terminal({ ...started.duel,players: { ...started.duel.players,player: { ...started.duel.players.player,hand:[] } } },'opponent')
  // Deliberately alter future selection as a fixture: settlement must still use the captured participants.
  const after = finishSessionDuel({ ...started.session, activeDeckCopyIds:[reserve.id] },result)
  equal(after.copies,[reserve])
  ok(after.copies[0] === reserve,'La reserva no participante debe conservar el objeto')
  equal(after.activeDeckCopyIds,[reserve.id])
})

test('máximo propio reducido al inicio y vidas enemigas 12/17/22/30, con E06 inicial solo B3', () => {
  const session = { ...createGameSession(PLAYER_DECK), invokerMaxLife:7,invokerLife:2 }
  for (const id of ['R4','B1','B2','B3']) {
    const e = encounter(id)
    const started = beginSessionDuel(session,PLAYER_CARD_TYPES,e.opponentDeck,{ encounterId:id,opponentLife:e.opponentLife,opponentInitialField:e.opponentInitialField })
    equal([started.duel.players.player.life,started.session.invokerLife,requireInvoker(started.duel.players.opponent).life],[7,7,e.opponentLife])
    equal(started.duel.players.opponent.creatures.map((u) => [u.card.id,u.health]),id==='B3'?[['E06',2]]:[])
    equal(requireInvoker(started.duel.players.opponent).hand.map((c) => c.id),e.opponentDeck.slice(0,3).map((c) => c.id))
    if (id==='B3') {
      const summoned = summonCreature(started.duel,'P01')
      ok(summoned.players.player.creatures[0].id !== summoned.players.opponent.creatures[0].id)
    }
  }
})

test('tabla de premios y fatiga aplica una vez, con restauración de vida actual al máximo resultante', () => {
  for (const e of DUNGEON_ENCOUNTERS) {
    const session = { ...createGameSession(PLAYER_DECK), invokerMaxLife:10,invokerLife:1,fatigue:3 }
    const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[],{ encounterId:e.id })
    const won = terminal(started.duel)
    const after = finishSessionDuel(started.session,won,e)
    const expectedMax = e.id.startsWith('R') && e.id!=='R4' ? 11 : ['B1','B2'].includes(e.id) ? 14 : 20
    equal([after.invokerMaxLife,after.invokerLife,after.fatigue],[expectedMax,expectedMax,e.reducesFatigue?2:3])
    ok(finishSessionDuel(after,won,e) === after,'La liquidación repetida debe ser idéntica')
    const lost = finishSessionDuel(started.session,terminal(started.duel,'opponent'),e)
    equal([lost.invokerMaxLife,lost.invokerLife,lost.fatigue],[10,10,4])
    const capped = finishSessionDuel({ ...started.session,invokerMaxLife:19 },won,e)
    equal(capped.invokerMaxLife,20)
    const noFatigue = finishSessionDuel({ ...started.session,fatigue:0 },won,e)
    equal(noFatigue.fatigue,0)
  }
})

test('transición única: sesión, progreso, recompensas y bajas idempotentes', () => {
  const initial = adventure({ ...createGameSession(PLAYER_DECK),invokerMaxLife:12,invokerLife:12,fatigue:2 })
  const started = beginAdventureEncounter(initial,'B1',MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  const won = terminal(started.duel)
  const settled = settleAdventureEncounter(started.state,won,MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  equal([settled.session.invokerMaxLife,settled.session.invokerLife,settled.session.fatigue],[16,16,1])
  equal(settled.progress.completedEncounterIds,['B1'])
  equal(settled.session.unlockedCardIds.slice(-2),['P13','P16'])
  equal(settled.session.copies.slice(-2).map((c) => [c.cardId,c.health]),[['P13',5],['P16',6]])
  equal(settled.session.activeDeckCopyIds,initial.session.activeDeckCopyIds)
  ok(settleAdventureEncounter(settled,won,MAIN_ENCOUNTERS,PLAYER_CARD_TYPES) === settled)
  equal(settleAdventureEncounter(started.state,won,MAIN_ENCOUNTERS,PLAYER_CARD_TYPES),settled)
  equal(settled.session.settledDuelIds,settled.progress.settledDuelIds)
})

test('la semilla de entrada a un encuentro de aventura llega al barajado del duelo', () => {
  const initial = adventure()
  const entry = encounter('B1')
  const source = seededRandom(8042)
  let randomCalls = 0
  const countedSource = () => { randomCalls += 1; return source() }
  const seeded = beginAdventureEncounter(initial, entry.id, MAIN_ENCOUNTERS, PLAYER_CARD_TYPES, countedSource).duel
  equal(randomCalls, initial.session.activeDeckCopyIds.length - 1)
  const expected = startSessionDuel(initial.session, PLAYER_CARD_TYPES, entry.opponentDeck, {
    mode: entry.mode,
    encounterId: entry.id,
    opponentLife: entry.opponentLife,
    opponentInitialField: entry.opponentInitialField,
    random: seededRandom(8042),
  })
  equal(
    [...seeded.players.player.hand, ...seeded.players.player.deck].map((card) => card.copyId),
    [...expected.players.player.hand, ...expected.players.player.deck].map((card) => card.copyId),
  )
})

test('primer descubrimiento básico sano, premios repetidos no duplican ni reponen una pérdida', () => {
  let session = unlockCreatureType(createGameSession([]),card('P17'))
  equal(session.copies,[{id:'copy-1',cardId:'P17',health:8,bonusAttack:0,bonusHealth:0}])
  equal(session.activeDeckCopyIds,[])
  ok(unlockCreatureType(session,card('P17')) === session)
  session = { ...session,copies:[] }
  ok(unlockCreatureType(session,card('P17')) === session)
  equal(session.copies,[])
  const next = reinvokeCreatureType(session,'P17',PLAYER_CARD_TYPES)
  equal([next.copies[0].id,next.copies[0].health,next.invokerMaxLife],['copy-2',8,17])
})

test('resultados inválidos o de otro intento no alteran nada; las escaramuzas no se abren como duelo de vida 0', () => {
  const started = beginAdventureEncounter(adventure(),'B1',MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  const snapshot = JSON.stringify(started.state)
  rejected(() => settleAdventureEncounter(started.state,started.duel,MAIN_ENCOUNTERS,PLAYER_CARD_TYPES))
  rejected(() => settleAdventureEncounter(started.state,{ ...terminal(started.duel),id:'otro' },MAIN_ENCOUNTERS,PLAYER_CARD_TYPES))
  rejected(() => settleAdventureEncounter(started.state,{ ...terminal(started.duel),encounterId:'B2' },MAIN_ENCOUNTERS,PLAYER_CARD_TYPES))
  rejected(() => beginAdventureEncounter(started.state,'B1',MAIN_ENCOUNTERS,PLAYER_CARD_TYPES))
  rejected(() => beginAdventureEncounter(adventure(),'R1',DUNGEON_ENCOUNTERS,PLAYER_CARD_TYPES))
  const group = beginAdventureEncounter(enterRatWing(adventure()),'R1',DUNGEON_ENCOUNTERS,PLAYER_CARD_TYPES).duel
  equal([group.mode,group.players.opponent.kind],['skirmish','group'])
  rejected(() => createDuel({playerDeck:[],opponentDeck:[],opponentLife:0}))
  equal(JSON.stringify(started.state),snapshot)
})

test('H3 sustituye «ninguna épica progresa en H1»: victoria invocada y superviviente mejora sin atribuir bajas', () => {
  const session = createGameSession([card('P18')])
  const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[])
  const summoned = summonCreature(started.duel,'P18')
  const after = finishSessionDuel(started.session,terminal(summoned),encounter('B1'))
  equal([after.copies[0].bonusAttack,after.copies[0].bonusHealth],[1,0])
})

test('coste combinado 1 maná + 1 sacrificio exige ambos y rechaza atómicamente', () => {
  const session = createGameSession([card('P01'),card('P16')])
  const started = beginSessionDuel(session,PLAYER_CARD_TYPES,[])
  const summoned = summonCreature(started.duel,'P01')
  const sacrificeId = summoned.players.player.creatures[0].id
  for (const invalid of [
    () => summonCreature(summoned,'P16',[]),
    () => summonCreature(summoned,'P16',[sacrificeId,sacrificeId]),
    () => summonCreature({ ...summoned,players:{ ...summoned.players,player:{ ...summoned.players.player,mana:0 } } },'P16',[sacrificeId]),
  ]) rejected(invalid)
  equal([summoned.players.player.mana,summoned.players.player.creatures[0].card.id],[1,'P01'])
  const legal = summonCreature(summoned,'P16',[sacrificeId])
  equal([legal.players.player.mana,legal.players.player.creatures.map((u) => u.card.id)],[0,['P16']])
  const after = finishSessionDuel(started.session,terminal(legal),encounter('B1'))
  equal(after.copies.map((c) => c.cardId),['P16'])
})

test('unicidad propia en baraja y representaciones temporales; enemigo permite tipos repetidos', () => {
  const session = createGameSession([card('P01')])
  const snapshot = JSON.stringify(session)
  rejected(() => beginSessionDuel({ ...session,activeDeckCopyIds:['copy-1','copy-1'] },PLAYER_CARD_TYPES,[]))
  rejected(() => beginSessionDuel({ ...session,copies:[...session.copies,{ ...session.copies[0],id:'otra' }] },PLAYER_CARD_TYPES,[]))
  const sameType: CreatureCard = { ...card('P01'),copyId:'copy-1' }
  rejected(() => createDuel({playerDeck:[sameType,{ ...sameType,copyId:'otra' }],opponentDeck:[]}))
  rejected(() => createDuel({playerDeck:[sameType,{ ...card('P02'),copyId:'copy-1' }],opponentDeck:[]}))
  equal(requireInvoker(createDuel({playerDeck:[],opponentDeck:[ENEMY_CARD_TYPES[0],ENEMY_CARD_TYPES[0]]}).players.opponent).hand.length,2)
  equal(JSON.stringify(session),snapshot)
})

test('subir/bajar respeta identidad y orden fijo sin tocar salud', () => {
  const session = createGameSession(PLAYER_DECK)
  const moved = moveActiveDeckCopy(session,'copy-3',-1)
  equal(moved.activeDeckCopyIds.slice(0,3),['copy-1','copy-3','copy-2'])
  const started = beginSessionDuel(moved,PLAYER_CARD_TYPES,[])
  equal(started.duel.players.player.hand.map((c) => c.id),['P01','P11','P02'])
  equal(moveActiveDeckCopy(moved,'copy-3',1),session)
  ok(moveActiveDeckCopy(session,'copy-1',-1) === session)
  rejected(() => moveActiveDeckCopy(session,'missing',1))
  equal(moved.copies,session.copies)
})

test('bucle real B1: perder copia en bloqueo, derrota, reinvocar pagando y reintentar', () => {
  const initial = adventure({ ...createGameSession([card('P05')]),invokerMaxLife:5,invokerLife:5 })
  const started = beginAdventureEncounter(initial,'B1',MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  let duel = summonCreature(started.duel,'P05')
  for (let turn = 0; turn < 8 && duel.phase !== 'finished'; turn++) {
    const passed = resolveCombat(declareBlockers(declareAttackers(startCombat(duel),[]),{}))
    duel = runEnemyTurn(endTurn(passed))
    const assignments = duel.players.player.creatures.length && duel.attackers.length
      ? { [duel.attackers[0]]: [duel.players.player.creatures[0].id] } : {}
    duel = resolveCombat(declareBlockers(duel,assignments))
    if (duel.phase !== 'finished') duel = endTurn(duel)
  }
  equal([duel.phase,duel.winner],['finished','opponent'])
  const settled = settleAdventureEncounter(started.state,duel,MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  equal([settled.session.copies.length,settled.session.fatigue,settled.session.invokerMaxLife,settled.session.invokerLife],[0,1,5,5])
  equal(settled.progress.completedEncounterIds,[])
  let recovered = reinvokeCreatureType(settled.session,'P05',PLAYER_CARD_TYPES)
  equal([recovered.copies[0].id,recovered.copies[0].health,recovered.invokerMaxLife],['copy-2',3,4])
  recovered = addCopyToActiveDeck(recovered,'copy-2')
  const retry = beginAdventureEncounter({ ...settled,session:recovered },'B1',MAIN_ENCOUNTERS,PLAYER_CARD_TYPES)
  equal([retry.duel.players.player.life,retry.duel.players.player.mana,retry.duel.players.player.hand[0].copyId],[4,0,'copy-2'])
  equal(summonCreature(retry.duel,'P05').players.player.creatures[0].health,3)
})
