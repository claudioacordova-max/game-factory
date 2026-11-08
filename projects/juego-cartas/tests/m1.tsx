import { renderToStaticMarkup } from 'react-dom/server'
import {
  addCopyToActiveDeck, beginSessionDuel, cardInstanceId, createCopySlotSession,
  createDuel, createGameSession, createV04BCatalogSandbox, createV04BInitialSession,
  declareAttackers, discoveredCardIds, endTurn, finishSessionDuel, grantCreatureCopies,
  reinvokeCreatureType, reinvokeStatus, removeCopyFromActiveDeck, requireInvoker, resolveCombat,
  RuleViolation, startCombat, startSessionDuel, summonCreature, unlockedSlotsForType,
  unlockCreatureType, V04B_CARD_TYPES,
} from '../src/engine/index.js'
import type { CreatureCard, GameSession } from '../src/engine/index.js'
import { playEnemyCards } from '../src/engine/enemy.js'
import { CollectionView, DeckPanel } from '../src/ui/CollectionViews.js'
import { CombatView } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { activateOnce } from '../src/ui/activation.js'
import { applyCombatAction, createCombatControls, writeHandCardDrag } from '../src/ui/combatActions.js'
import { seededRandom } from './duelFixtures.js'

export const m1Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { m1Tests.push({ name: `M1 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}
const card = (id: string): CreatureCard => V04B_CARD_TYPES.find((entry) => entry.id === id)!
const ordered = () => 1 - Number.EPSILON
const prepare = (...ids: string[]) => createCopySlotSession(ids.map(card), V04B_CARD_TYPES)
function lose(session: GameSession, ids = session.copies.map((copy) => copy.id)): GameSession {
  const started = beginSessionDuel({ ...session, activeDeckCopyIds: ids }, V04B_CARD_TYPES, [], { random: ordered })
  // Isolated settlement fixture: the captured participants have no surviving representation.
  return finishSessionDuel(started.session, { ...started.duel, phase: 'finished', winner: 'opponent', players: {
    ...started.duel.players, player: { ...started.duel.players.player, hand: [], deck: [], creatures: [] },
  } })
}

test('21 nombres, cifras, límites y costes oficiales; 7/7/7/18 copias sin rarezas ni crecimiento heredados', () => {
  const expected = [
    ['A01','Diablillo furioso',2,1,0,0,2,0], ['A02','Rata de la madriguera',1,1,0,0,2,1],
    ['A03','Diablillo de las brasas',2,1,1,0,2,1], ['A04','Señor de las Ratas',1,2,1,0,1,1],
    ['R01','Runa inestable',1,1,0,0,2,0], ['R02','Runa viviente',1,1,0,0,2,1],
    ['R03','Gólem de piedra',3,3,2,0,2,1], ['R04','Titán rúnico',4,5,4,0,1,5],
    ['H01','Alzado de la Sombra',0,3,0,0,2,0], ['H02','Acólito de la Sombra',1,4,1,0,2,1],
    ['H03','Liche del grimorio',1,3,0,0,2,1], ['H04','Ídolo de la Sombra',0,1,0,3,1,5],
    ['N01','Urna maldita',0,1,1,0,2,1], ['N02','Limo de huesos',2,2,1,0,2,1],
    ['N03','Rata carroñera',3,2,0,1,2,1], ['N04','Caballero no muerto',4,3,1,1,2,1],
    ['N05','Esqueleto',1,1,0,0,2,1], ['N06','Ghoul',3,1,1,0,2,1],
    ['N07','Araña de cripta',2,3,0,1,2,1], ['N08','Abominación',4,4,0,2,2,1],
    ['N09','Demonio',5,3,0,2,2,1],
  ]
  equal(V04B_CARD_TYPES.map((c) => [c.id,c.name,c.attack,c.maxHealth,c.cost.mana,c.cost.sacrifices,c.maxCopies,c.reinvokeCost]), expected)
  equal(['aggro','ramp','healing','neutral'].map((group) => V04B_CARD_TYPES.filter((c) => c.group === group).reduce((sum,c) => sum + c.maxCopies!,0)), [7,7,7,18])
  equal(V04B_CARD_TYPES.filter((c) => c.seed).map((c) => c.id), ['A01','R01','H01'])
  equal(V04B_CARD_TYPES.filter((c) => c.special).map((c) => c.id), ['A04','R04','H04'])
  ok(V04B_CARD_TYPES.every((c) => !c.rarity && !c.growth && !c.instanceId && !c.copyId))
})

test('metadatos distinguen el dominio M2 incorporado de efectos incorporados M3', () => {
  equal(V04B_CARD_TYPES.filter((c) => c.abilities?.length).map((c) => c.id), ['A02','A03','A04','R01','R02','R03','R04','H02','H03','H04','N01'])
  ok(V04B_CARD_TYPES.flatMap((c) => c.abilities ?? []).every((a) => a.description.length > 50 && /^(domain-m2|domain-m3)$/.test(a.implementation)))
  let duel = startSessionDuel(prepare('A02','R01','R02'), V04B_CARD_TYPES, [], { random: ordered })
  for (const c of [...duel.players.player.hand]) duel = summonCreature(duel, cardInstanceId(c))
  equal([duel.players.player.creatures.length,duel.players.player.mana,duel.players.player.creatures.map((u) => u.entityKind)], [4,1,['real','token','real','real']])
})

test('inicio aislado de ocho identidades y siete tipos frente al sandbox de 39', () => {
  const initial = createV04BInitialSession(), sandbox = createV04BCatalogSandbox()
  equal(initial.copies.map((c) => c.cardId), ['A01','A01','A02','R01','H01','N02','N05','N06'])
  equal([initial.activeDeckCopyIds.length,discoveredCardIds(initial).length,Object.values(initial.unlockedCopySlots).reduce((a,b) => a+b,0)], [8,7,8])
  equal([sandbox.copies.length,sandbox.activeDeckCopyIds.length,discoveredCardIds(sandbox).length,Object.values(sandbox.unlockedCopySlots).reduce((a,b) => a+b,0)], [39,39,21,39])
  ok(sandbox.copies.every((c) => c.health === card(c.cardId).maxHealth && !c.bonusAttack && !c.bonusHealth))
  initial.copies[0].health = 0
  initial.unlockedCopySlots.A01 = 0
  initial.activeDeckCopyIds.pop()
  initial.grantedCopyEventIds.push('local-only')
  equal([createV04BInitialSession().copies[0].health,sandbox.copies[0].health,sandbox.unlockedCopySlots.A01,sandbox.activeDeckCopyIds.length,sandbox.grantedCopyEventIds.length], [1,1,2,39,1])
})

test('MIG-D01 A02: una obtenida no anticipa segunda; evento 07 concede otra, pérdidas y recuperación nunca crean tercera', () => {
  let session = prepare('A02')
  rejects(() => reinvokeCreatureType(session,'A02',V04B_CARD_TYPES))
  const originalId = session.copies[0].id
  session = lose(session)
  equal([session.copies.length,unlockedSlotsForType(session,'A02')], [0,1])
  session = reinvokeCreatureType(session,'A02',V04B_CARD_TYPES)
  equal([session.copies.length,session.invokerMaxLife,session.activeDeckCopyIds.length], [1,19,0])
  ok(session.copies[0].id !== originalId)
  rejects(() => reinvokeCreatureType(session,'A02',V04B_CARD_TYPES))
  session = grantCreatureCopies(session,'reward-07',['A02'],V04B_CARD_TYPES)
  equal([session.copies.length,unlockedSlotsForType(session,'A02'),session.activeDeckCopyIds.length], [2,2,0])
  ok(grantCreatureCopies(session,'reward-07',['A02'],V04B_CARD_TYPES) === session)
  rejects(() => grantCreatureCopies(session,'third',['A02'],V04B_CARD_TYPES))
  session = lose(session)
  equal([session.copies.length,unlockedSlotsForType(session,'A02')], [0,2])
  const before = session.invokerMaxLife
  session = reinvokeCreatureType(session,'A02',V04B_CARD_TYPES)
  session = reinvokeCreatureType(session,'A02',V04B_CARD_TYPES)
  equal([session.copies.length,session.invokerMaxLife,session.activeDeckCopyIds.length], [2,before-2,0])
  rejects(() => reinvokeCreatureType(session,'A02',V04B_CARD_TYPES))
  ok(grantCreatureCopies(session,'reward-07',['A02'],V04B_CARD_TYPES) === session)
})

test('sandbox gestiona las 39 identidades entre reserva/baraja sin mínimo ni máximo y reparte instancias únicas', () => {
  let session = createV04BCatalogSandbox()
  for (const id of [...session.activeDeckCopyIds]) session = removeCopyFromActiveDeck(session,id)
  equal([session.copies.length,session.activeDeckCopyIds.length], [39,0])
  equal(startSessionDuel(session,V04B_CARD_TYPES,[]).players.player.hand.length,0)
  for (const copy of session.copies) session = addCopyToActiveDeck(session,copy.id)
  const duel = startSessionDuel(session,V04B_CARD_TYPES,[],{random:seededRandom(39)})
  const cards = [...duel.players.player.hand,...duel.players.player.deck]
  equal([duel.players.player.hand.length,duel.players.player.deck.length,new Set(cards.map(cardInstanceId)).size,new Set(cards.map((c) => c.copyId)).size], [3,36,39,39])
  equal(new Set(cards.map((c) => c.id)).size,21)
})

test('concesión es atómica, única, en reserva; rechazo no consume evento ni añade cupos parciales', () => {
  const initial = prepare('A04'), before = JSON.stringify(initial)
  for (const ids of [['N02','A04'],['N02','unknown'],['N02','N02','N02']]) rejects(() => grantCreatureCopies(initial,'attempt',ids,V04B_CARD_TYPES))
  equal(JSON.stringify(initial),before)
  const granted = grantCreatureCopies(initial,'attempt',['N02','N02'],V04B_CARD_TYPES)
  equal([unlockedSlotsForType(granted,'N02'),granted.copies.length,granted.activeDeckCopyIds], [2,3,initial.activeDeckCopyIds])
  const lost = lose(granted,granted.copies.filter((c) => c.cardId === 'N02').map((c) => c.id))
  ok(grantCreatureCopies(lost,'attempt',['N02','N02'],V04B_CARD_TYPES) === lost, 'Un premio repetido tampoco repone pérdidas')
  rejects(() => unlockCreatureType(initial,card('N02')))
})

for (const id of ['A01','R01','H01','N05','A04','R04','H04']) {
  test(`recuperación ${id} coste ${card(id).reinvokeCost}: matriz máximo 20/6/5/2/1 y suelo 1 atómico`, () => {
    for (const max of [20,6,5,2,1]) {
      const missing = { ...lose(prepare(id)), invokerMaxLife: max, invokerLife: max }
      const before = JSON.stringify(missing), cost = card(id).reinvokeCost!
      const status = reinvokeStatus(missing,id,V04B_CARD_TYPES)
      equal([status.cost,status.resultingMaxLife,status.allowed], [cost,max-cost,max-cost >= 1])
      if (max-cost < 1) rejects(() => reinvokeCreatureType(missing,id,V04B_CARD_TYPES))
      else {
        const recovered = reinvokeCreatureType(missing,id,V04B_CARD_TYPES)
        equal([recovered.invokerMaxLife,recovered.invokerLife,recovered.copies[0].health,recovered.activeDeckCopyIds.length,unlockedSlotsForType(recovered,id)], [max-cost,max-cost,card(id).maxHealth,0,1])
      }
      equal(JSON.stringify(missing),before)
    }
  })
}

test('recuperar vacante con superviviente herida conserva salud, identidad y selección; nueva sana en reserva', () => {
  let session = prepare('N02','N02')
  const survivor = { ...session.copies[0],health:1 }
  session = { ...session,copies:[survivor,session.copies[1]] }
  session = lose(session,[session.copies[1].id])
  session = addCopyToActiveDeck(session,survivor.id)
  const recovered = reinvokeCreatureType(session,'N02',V04B_CARD_TYPES)
  ok(recovered.copies[0] === survivor)
  equal([recovered.copies[0].health,recovered.copies[1].health,recovered.activeDeckCopyIds,recovered.invokerMaxLife], [1,2,[survivor.id],19])
  ok(recovered.copies[0].id !== recovered.copies[1].id)
})

test('duplicados heridos conservan identidad al barajar, repartir y robar sin modificar sesión ni definiciones', () => {
  const initial = prepare('H01','H01','A01','N05','N06')
  const session = { ...initial,copies:initial.copies.map((c,i) => ({ ...c,health:i === 0 ? 1 : c.health })) }
  const before = JSON.stringify(session)
  const first = startSessionDuel(session,V04B_CARD_TYPES,[],{random:seededRandom(810)})
  const repeated = startSessionDuel(session,V04B_CARD_TYPES,[],{random:seededRandom(810)})
  const cards = [...first.players.player.hand,...first.players.player.deck]
  equal(cards.map((c) => c.copyId),[...repeated.players.player.hand,...repeated.players.player.deck].map((c) => c.copyId))
  ok(cards.map((c) => c.copyId).join() !== session.activeDeckCopyIds.join())
  equal(cards.filter((c) => c.id === 'H01').map((c) => [c.copyId,c.startingHealth]).sort(), [['copy-1',1],['copy-2',3]])
  ok(new Set(cards.map(cardInstanceId)).size === 5 && cards.every((c) => c.entityKind === 'real'))
  const next = endTurn({ ...first,phase:'resolved',activePlayer:'opponent' })
  equal([next.players.player.hand.length,next.players.player.hand[3].instanceId], [4,first.players.player.deck[0].instanceId])
  equal(JSON.stringify(session),before)
})

test('clic/teclado y payload real de arrastre eligen la copia exacta; ID de tipo nuevo se rechaza', () => {
  const initial = prepare('H01','H01')
  const session = { ...initial,copies:initial.copies.map((c,i) => ({ ...c,health:i === 0 ? 1 : 3 })) }
  let controls = createCombatControls(startSessionDuel(session,V04B_CARD_TYPES,[],{random:ordered}))
  const first = controls.duel.players.player.hand[0], second = controls.duel.players.player.hand[1]
  const denied = applyCombatAction(controls,{type:'summon',cardId:'H01'},controls.revision)
  ok(denied.state === controls && denied.message)
  const single = createCombatControls(startSessionDuel(prepare('H01'),V04B_CARD_TYPES,[],{random:ordered}))
  const deniedSingle = applyCombatAction(single,{type:'summon',cardId:'H01'},single.revision)
  ok(deniedSingle.state === single && deniedSingle.message, 'Ni siquiera un tipo único debe sustituir la referencia de instancia nueva')
  rejects(() => summonCreature(controls.duel,'H01'))
  for (const detail of [0,1]) {
    const fresh = createCombatControls(startSessionDuel(session,V04B_CARD_TYPES,[],{random:ordered}))
    let selected = fresh
    activateOnce({detail,preventDefault() {}}, () => { selected = applyCombatAction(fresh,{type:'summon',cardId:cardInstanceId(fresh.duel.players.player.hand[1])},fresh.revision).state })
    equal(selected.duel.players.player.creatures.map((c) => [c.copyId,c.health]), [[second.copyId,3]])
  }
  let payload = '', format = ''
  const transfer: Pick<DataTransfer,'effectAllowed' | 'setData'> = {effectAllowed:'none',setData: (type: string,value: string) => { format=type; payload=value }}
  writeHandCardDrag(transfer,first)
  equal([format,payload,transfer.effectAllowed], ['text/plain',first.instanceId,'move'])
  controls = applyCombatAction(controls,{type:'summon',cardId:payload},controls.revision).state
  equal([controls.duel.players.player.creatures[0].copyId,controls.duel.players.player.creatures[0].health,controls.duel.players.player.hand[0].copyId], [first.copyId,1,second.copyId])
})

test('campo, daño simultáneo y liquidación pierden solo una de dos copias; reserva y participantes capturados, cierre idempotente', () => {
  const initial = prepare('H01','H01','N02')
  const selected = { ...initial,activeDeckCopyIds:initial.activeDeckCopyIds.slice(0,2),copies:initial.copies.map((c,i) => ({ ...c,health:i === 0 ? 1 : c.health })) }
  const started = beginSessionDuel(selected,V04B_CARD_TYPES,[],{mode:'skirmish',opponentInitialField:[card('N03')],random:ordered})
  let duel = started.duel
  for (const c of [...duel.players.player.hand]) duel = summonCreature(duel,cardInstanceId(c))
  const [first,second] = duel.players.player.creatures, enemy = duel.players.opponent.creatures[0]
  ok(first.id !== second.id && first.card.instanceId !== second.card.instanceId)
  duel = resolveCombat(declareAttackers(startCombat(duel),[first.id],{[first.id]:enemy.id}))
  equal(duel.players.player.creatures.map((c) => [c.copyId,c.health]), [[second.copyId,3]])
  const finished = { ...duel,phase:'finished' as const,winner:'opponent' as const }
  const changedSelection = { ...started.session,activeDeckCopyIds:[initial.copies[2].id] }
  const settled = finishSessionDuel(changedSelection,finished)
  equal(settled.copies.map((c) => [c.id,c.health]), [[second.copyId,3],[initial.copies[2].id,2]])
  ok(settled.copies[1] === selected.copies[2], 'Reserva intacta')
  equal(unlockedSlotsForType(settled,'H01'),2)
  ok(finishSessionDuel(settled,finished) === settled)
})

test('sacrificio pendiente identifica duplicado concreto; cancelar y eventos obsoletos no consumen la otra copia', () => {
  let duel = startSessionDuel(prepare('H01','H01','N03'),V04B_CARD_TYPES,[],{random:ordered})
  for (const c of duel.players.player.hand.filter((c) => c.id === 'H01')) duel = summonCreature(duel,cardInstanceId(c))
  let controls = createCombatControls(duel)
  const pendingCard = controls.duel.players.player.hand[0], [first,second] = duel.players.player.creatures
  controls = applyCombatAction(controls,{type:'summon',cardId:cardInstanceId(pendingCard)},controls.revision).state
  const cancelled = applyCombatAction(controls,{type:'cancel'},controls.revision).state
  equal(cancelled.duel.players.player.creatures.map((c) => c.copyId),[first.copyId,second.copyId])
  ok(applyCombatAction(cancelled,{type:'sacrifice',creatureId:second.id},controls.revision).state === cancelled)
  controls = applyCombatAction(cancelled,{type:'summon',cardId:cardInstanceId(pendingCard)},cancelled.revision).state
  const result = applyCombatAction(controls,{type:'sacrifice',creatureId:second.id},controls.revision)
  equal(result.sacrificedCopyIds,[second.copyId])
  equal(result.state.duel.players.player.creatures.map((c) => c.copyId),[first.copyId,pendingCard.copyId])
})

test('duplicados de carta con sacrificio no comparten selección pendiente al desaparecer la elegida', () => {
  let duel = startSessionDuel(prepare('H01','N03','N03'),V04B_CARD_TYPES,[],{random:ordered})
  duel = summonCreature(duel,cardInstanceId(duel.players.player.hand[0]))
  let controls = createCombatControls(duel)
  const [first,second] = duel.players.player.hand
  controls = applyCombatAction(controls,{type:'summon',cardId:cardInstanceId(second)},controls.revision).state
  equal(controls.pending?.cardId,second.instanceId)
  controls = { ...controls,duel:{ ...controls.duel,players:{ ...controls.duel.players,player:{ ...controls.duel.players.player,hand:[first] } } } }
  const rejected = applyCombatAction(controls,{type:'sacrifice',creatureId:duel.players.player.creatures[0].id},controls.revision)
  ok(rejected.state === controls && rejected.message)
  equal(controls.duel.players.player.creatures.length,1)
})

test('duplicados enemigos reales tienen instancias propias sin copyId y la IA existente invoca ambos', () => {
  let duel = createDuel({collectionProfile:'v04b',playerDeck:[],opponentDeck:[card('A02'),card('A02')],opponentInitialField:[card('A02')],firstPlayer:'opponent'})
  const hand = requireInvoker(duel.players.opponent).hand
  ok(hand[0].instanceId !== hand[1].instanceId && hand.every((c) => c.entityKind === 'real' && !c.copyId))
  duel = playEnemyCards(duel)
  equal(duel.players.opponent.creatures.length,5)
  equal(new Set(duel.players.opponent.creatures.map((c) => c.card.instanceId)).size,5)
  equal(new Set(duel.players.opponent.creatures.map((c) => c.id)).size,5)
  equal(duel.players.opponent.creatures.filter((c) => c.entityKind === 'real').length,3)
  equal(duel.players.opponent.creatures.filter((c) => c.entityKind === 'token').length,2)
  ok(duel.players.opponent.creatures.every((c) => !c.copyId))
})

test('rechaza IDs persistentes/de baraja/instancias/participantes/campo duplicados sin mutar entradas', () => {
  const session = prepare('H01','H01'), before = JSON.stringify(session)
  for (const invalid of [
    { ...session,copies:[session.copies[0],session.copies[0]] },
    { ...session,activeDeckCopyIds:[session.copies[0].id,session.copies[0].id] },
    { ...session,activeDeckCopyIds:['missing'] },
    { ...session,unlockedCopySlots:{H01:1} },
  ]) rejects(() => startSessionDuel(invalid,V04B_CARD_TYPES,[]))
  rejects(() => createDuel({collectionProfile:'v04b',playerDeck:[{...card('H01'),copyId:'same'},{...card('H01'),copyId:'same'}],opponentDeck:[]}))
  rejects(() => createDuel({collectionProfile:'v04b',playerDeck:[card('H01'),card('H01'),card('H01')],opponentDeck:[]}))
  rejects(() => createDuel({collectionProfile:'v04b',playerDeck:[card('A04'),card('A04')],opponentDeck:[]}))
  rejects(() => createDuel({collectionProfile:'v04b',playerDeck:[{...card('H01'),instanceId:'same'}],opponentDeck:[{...card('H01'),instanceId:'same'}]}))
  rejects(() => createDuel({playerDeck:[],opponentDeck:[{...card('H01'),instanceId:''}]}))
  let duel = startSessionDuel(session,V04B_CARD_TYPES,[],{random:ordered})
  const broken = { ...duel,participantCopyIds:['copy-1','copy-1'],phase:'finished' as const,winner:'player' as const }
  rejects(() => finishSessionDuel(session,broken))
  duel = summonCreature(duel,cardInstanceId(duel.players.player.hand[0]))
  const duplicateField = { ...duel,players:{ ...duel.players,player:{ ...duel.players.player,creatures:[duel.players.player.creatures[0],duel.players.player.creatures[0]] } } }
  rejects(() => summonCreature(duplicateField,cardInstanceId(duel.players.player.hand[0])))
  const special = prepare('R04')
  rejects(() => addCopyToActiveDeck({ ...special,unlockedCopySlots:{R04:2} },special.copies[0].id))
  equal(JSON.stringify(session),before)
})

test('concesión, recuperación, edición e inicio se bloquean en combate sin pagos ni cupos nuevos', () => {
  const prepared = prepare('A02','H01')
  const missing = lose(prepared,[prepared.copies[0].id])
  const started = beginSessionDuel(missing,V04B_CARD_TYPES,[],{random:ordered})
  const before = JSON.stringify(started.session)
  for (const operation of [
    () => grantCreatureCopies(started.session,'reward-07',['A02'],V04B_CARD_TYPES),
    () => reinvokeCreatureType(started.session,'A02',V04B_CARD_TYPES),
    () => addCopyToActiveDeck(started.session,prepared.copies[1].id),
    () => removeCopyFromActiveDeck(started.session,prepared.copies[1].id),
    () => startSessionDuel(started.session,V04B_CARD_TYPES,[]),
  ]) rejects(operation)
  equal(JSON.stringify(started.session),before)
})

test('liquidación rechaza cruzar perfiles en ambos sentidos aunque coincida copyId y no haya bloqueo activo', () => {
  const legacy = createGameSession([card('N05')]), modern = prepare('N05')
  equal(legacy.copies[0].id,modern.copies[0].id)
  for (const [source,target] of [[legacy,modern],[modern,legacy]]) {
    const duel = startSessionDuel(source,V04B_CARD_TYPES,[],{random:ordered})
    const terminal = { ...duel,phase:'finished' as const,winner:'opponent' as const,players:{
      ...duel.players,player:{ ...duel.players.player,hand:[],deck:[],creatures:[] },
    } }
    const before = JSON.stringify(target)
    equal(target.activeDuelId,null)
    rejects(() => finishSessionDuel(target,terminal))
    equal(JSON.stringify(target),before)
  }
})

test('colección y reserva renderizan ambas identidades, salud/cupos y recuperación de vacantes', () => {
  const initial = prepare('N02','N02')
  const session = { ...initial,copies:initial.copies.map((c,i) => ({...c,health:i === 0 ? 1 : 2})),activeDeckCopyIds:[initial.copies[1].id] }
  const noop = () => {}
  // UI-1: Colección groups the reserve by type (copy-1, wounded); the deck copy (copy-2) is only in the deck panel;
  // add/remove are split (tile vs. deck ×) and vacancies live in the Reinvocar tab.
  const markup = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} />)
  ok(markup.includes('data-card-id="N02"') && markup.includes('×1') && markup.includes('1 herida') && markup.includes('VID'))
  ok(markup.includes('Añadir Limo de huesos a la baraja: 1 en reserva, 1 herida; elegir copia') && !markup.includes('Retirar'))
  const deck = renderToStaticMarkup(<DeckPanel session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} />)
  ok(deck.includes('Retirar una copia de Limo de huesos de la baraja') && !deck.includes('1 herida'))
  const missing = lose(session,[initial.copies[1].id])
  const vacancy = renderToStaticMarkup(<CollectionView session={missing} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialTab="reinvoke" />)
  ok(vacancy.includes('×1<small> perdidas</small>') && vacancy.includes('Reinvocar una copia de Limo de huesos (1 de vida máxima)') && vacancy.includes('Máximo: 20 → 19'))
})

test('mano duplicada renderizada selecciona solo una instancia y muestra copia, salud y efectos disponibles', () => {
  const initial = prepare('N03','N03')
  const session = { ...initial,copies:initial.copies.map((c,i) => ({ ...c,health:i === 0 ? 1 : 2 })) }
  const duel = startSessionDuel(session,V04B_CARD_TYPES,[],{random:ordered})
  const noop = () => {}
  const props: CombatViewProps = {
    duel,session,enemyName:'Prueba M1',enemyMaxLife:20,notice:'',noticeRevision:0,
    selectedCardId:cardInstanceId(duel.players.player.hand[1]),sacrificeIds:[],attackerIds:[],targetChoices:{},blockerChoices:{},
    onSelectCard:noop,onAllowFieldDrop:noop,onDropHandCard:noop,onToggleSacrifice:noop,onSelectAttacker:noop,onCancelSummon:noop,
    onBeginCombat:noop,onDeclareAttacks:noop,onConfirmBlocks:noop,onStartBlockDrag:()=>false,onEndBlockDrag:noop,onDropRelation:noop,onMoveBlocker:noop,onMoveAttacker:noop,
  }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  equal((markup.match(/class="hand-card is-selected/g) ?? []).length,1)
  ok(markup.includes('copy-1') && markup.includes('copy-2') && markup.includes('is-wounded'))
  const pendingSession = prepare('A03')
  const pendingMarkup = renderToStaticMarkup(<CollectionView session={pendingSession} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} />)
  ok(pendingMarkup.includes('Habilidades') && pendingMarkup.includes('Habilidades disponibles'))
})
