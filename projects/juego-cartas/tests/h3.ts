import {
  addCopyToActiveDeck, beginAdventureEncounter, beginSessionDuel, createExplorationProgress,
  createGameSession, declareAttackers, declareBlockers, effectiveCopyCard, endTurn,
  ENEMY_CARD_TYPES, finishSessionDuel, MAIN_ENCOUNTERS, PLAYER_CARD_TYPES,
  reinvokeCreatureType, removeCopyFromActiveDeck, resolveCombat, settleAdventureEncounter,
  startCombat, summonCreature,
} from '../src/engine/index.js'
import type { CreatureCopy, DuelState, GameSession } from '../src/engine/index.js'

type Test = { name: string; run: () => void }
export const h3Tests: Test[] = []
function test(name: string, run: () => void) { h3Tests.push({ name: `H3 · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
const card = (id: string) => PLAYER_CARD_TYPES.find((entry) => entry.id === id)!
const enemy = (id: string) => ENEMY_CARD_TYPES.find((entry) => entry.id === id)!
const copy = (session: GameSession, id: string): CreatureCopy => session.copies.find((entry) => entry.cardId === id)!
const sessionWith = (...ids: string[]) => createGameSession(ids.map(card))
const progress = (session: GameSession, id: string) => {
  const owned = copy(session, id)
  return [owned.bonusAttack, owned.bonusHealth, owned.health]
}
function attack(duel: DuelState, ids: string[], blocks: Record<string, string[]> = {}) {
  return resolveCombat(declareBlockers(declareAttackers(startCombat(duel), ids), blocks))
}
function nextPlayerTurn(duel: DuelState): DuelState {
  return endTurn(attack(endTurn(attack(duel, [])), []))
}
// Isolated settlement fixtures only: these terminal states do not claim played victories or balance.
function terminalFixture(duel: DuelState, winner: 'player' | 'opponent' = 'player'): DuelState {
  const loser = winner === 'player' ? 'opponent' : 'player'
  return { ...duel, phase: 'finished', winner, players: { ...duel.players, [loser]: { ...duel.players[loser], life: 0 } } }
}

test('toda copia épica comienza sin mejoras; representación efectiva muestra progreso individual cero', () => {
  const session = sessionWith('P16', 'P17', 'P18')
  for (const owned of session.copies) {
    equal([owned.bonusAttack, owned.bonusHealth], [0, 0])
    const effective = effectiveCopyCard(card(owned.cardId), owned)
    equal([effective.attack, effective.maxHealth, effective.growthProgress], [card(owned.cardId).attack, card(owned.cardId).maxHealth, 0])
  }
})

test('victoria real: invocada en último turno gana +1 aunque otra criatura ataque y gane', () => {
  const started = beginSessionDuel(sessionWith('P05', 'P18'), PLAYER_CARD_TYPES, [], { opponentLife: 2 })
  let duel = summonCreature(started.duel, 'P05')
  duel = nextPlayerTurn(duel)
  duel = summonCreature(duel, 'P18')
  const epic = duel.players.player.creatures.find((unit) => unit.card.id === 'P18')!
  equal(epic.summonedTurn, duel.turn)
  duel = attack(duel, [duel.players.player.creatures.find((unit) => unit.card.id === 'P05')!.id])
  equal([duel.phase, duel.winner, duel.attackers.includes(epic.id)], ['finished', 'player', false])
  const after = finishSessionDuel(started.session, duel)
  equal(progress(after, 'P18'), [1, 0, 5])
  equal(progress(after, 'P05'), [0, 0, 3])
})

test('victoria real atacando: mejora pendiente solo aparece al liquidar y conserva identidad', () => {
  const started = beginSessionDuel(sessionWith('P18'), PLAYER_CARD_TYPES, [], { opponentLife: 3 })
  const summoned = summonCreature(started.duel, 'P18')
  const won = attack(summoned, [summoned.players.player.creatures[0].id])
  equal([won.phase, won.winner], ['finished', 'player'])
  equal(progress(started.session, 'P18'), [0, 0, 5])
  equal(won.players.player.creatures[0].card.attack, 3)
  const after = finishSessionDuel(started.session, won)
  equal(copy(after, 'P18').id, copy(started.session, 'P18').id)
  equal(progress(after, 'P18'), [1, 0, 5])
})

test('integración H2: victoria real de escaramuza progresa con daño simultáneo y conserva la herida', () => {
  const started = beginSessionDuel(sessionWith('P18'), PLAYER_CARD_TYPES, [], { mode: 'skirmish', opponentInitialField: [enemy('E01')] })
  const summoned = summonCreature(started.duel, 'P18')
  const unit = summoned.players.player.creatures[0]
  const won = resolveCombat(declareAttackers(startCombat(summoned), [unit.id], { [unit.id]: summoned.players.opponent.creatures[0].id }))
  equal([won.mode, won.phase, won.winner, won.players.opponent.creatures.length], ['skirmish', 'finished', 'player', 0])
  equal(progress(finishSessionDuel(started.session, won), 'P18'), [1, 0, 4])
})

test('fixture: épicas exclusivamente en mano, pila y reserva no progresan; campo vacío tampoco', () => {
  let session = sessionWith('P05', 'P16', 'P01', 'P17', 'P18')
  session = removeCopyFromActiveDeck(session, copy(session, 'P18').id)
  const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
  equal(started.duel.players.player.hand.map((c) => c.id), ['P05', 'P16', 'P01'])
  equal(started.duel.players.player.deck.map((c) => c.id), ['P17'])
  const after = finishSessionDuel(started.session, terminalFixture(started.duel))
  for (const id of ['P16', 'P17', 'P18']) equal(progress(after, id), [0, 0, card(id).maxHealth])
  ok(copy(after, 'P18') === copy(session, 'P18'), 'La reserva conserva su objeto')
})

test('fixture: derrota con épica invocada superviviente conserva heridas y no progresa', () => {
  const initial = sessionWith('P18')
  const session = { ...initial, copies: [{ ...initial.copies[0], health: 2 }] }
  const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
  const lost = terminalFixture(summonCreature(started.duel, 'P18'), 'opponent')
  equal(progress(finishSessionDuel(started.session, lost), 'P18'), [0, 0, 2])
})

test('victoria real con épica muerta en daño simultáneo elimina copia sin mejora', () => {
  const started = beginSessionDuel(sessionWith('P18', 'P02'), PLAYER_CARD_TYPES, [], { opponentLife: 2, opponentInitialField: [enemy('E14')] })
  const summoned = summonCreature(summonCreature(started.duel, 'P18'), 'P02')
  const epic = summoned.players.player.creatures.find((unit) => unit.card.id === 'P18')!
  const won = attack(summoned, summoned.players.player.creatures.map((unit) => unit.id), { [epic.id]: [summoned.players.opponent.creatures[0].id] })
  equal([won.phase, won.winner], ['finished', 'player'])
  const after = finishSessionDuel(started.session, won)
  equal(after.copies.map((entry) => entry.cardId), ['P02'])
  ok(!after.activeDeckCopyIds.includes(epic.copyId!))
})

test('fixture: épica sacrificada desaparece y no gana mejoras', () => {
  const started = beginSessionDuel(sessionWith('P18', 'P13'), PLAYER_CARD_TYPES, [])
  const summoned = summonCreature(started.duel, 'P18')
  const sacrificed = summonCreature(summoned, 'P13', [summoned.players.player.creatures[0].id])
  const after = finishSessionDuel(started.session, terminalFixture(sacrificed))
  equal(after.copies.map((entry) => [entry.cardId, entry.bonusAttack, entry.bonusHealth]), [['P13', 0, 0]])
})

test('fixture: varias épicas elegibles reciben una mejora cada una en la misma victoria', () => {
  const started = beginSessionDuel(sessionWith('P01', 'P16', 'P02', 'P17', 'P18'), PLAYER_CARD_TYPES, [])
  let duel = summonCreature(started.duel, 'P01')
  duel = summonCreature(duel, 'P16', [duel.players.player.creatures[0].id])
  duel = nextPlayerTurn(duel)
  duel = summonCreature(duel, 'P02')
  duel = summonCreature(duel, 'P17', [duel.players.player.creatures.find((unit) => unit.card.id === 'P02')!.id])
  duel = nextPlayerTurn(duel)
  duel = summonCreature(duel, 'P18')
  const after = finishSessionDuel(started.session, terminalFixture(duel))
  equal(progress(after, 'P16'), [1, 0, 6])
  equal(progress(after, 'P17'), [0, 1, 9])
  equal(progress(after, 'P18'), [1, 0, 5])
})

test('fixture tras combate real: muchas bajas y multibloqueo solo conceden +1 por victoria', () => {
  const targets = Array.from({ length: 3 }, () => enemy('E01'))
  const started = beginSessionDuel(sessionWith('P18'), PLAYER_CARD_TYPES, [], { opponentInitialField: targets })
  const summoned = summonCreature(started.duel, 'P18')
  const unit = summoned.players.player.creatures[0]
  const fought = attack(summoned, [unit.id], { [unit.id]: summoned.players.opponent.creatures.map((entry) => entry.id) })
  equal([fought.players.opponent.creatures.length, fought.players.player.creatures[0].health], [0, 2])
  equal(progress(finishSessionDuel(started.session, terminalFixture(fought)), 'P18'), [1, 0, 2])
})

test('fixture: cuatro victorias elegibles solo mejoran +3 ATQ y +3 VID; cuarta no cura', () => {
  for (const id of ['P16', 'P17', 'P18']) {
    let session = sessionWith('P01', id)
    for (let victory = 1; victory <= 4; victory++) {
      const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
      let duel = started.duel
      if (card(id).cost.sacrifices) {
        duel = summonCreature(duel, 'P01')
        duel = summonCreature(duel, id, [duel.players.player.creatures[0].id])
      } else duel = summonCreature(duel, id)
      session = finishSessionDuel(started.session, terminalFixture(duel))
      const expected = Math.min(victory, 3)
      equal(progress(session, id), id === 'P17' ? [0, expected, 8 + expected] : [expected, 0, card(id).maxHealth])
      const effective = effectiveCopyCard(card(id), copy(session, id))
      equal(effective.growthProgress, expected)
      // Restore only the spent seed between isolated encounters; epic progress remains earned.
      if (card(id).cost.sacrifices && victory < 4) {
        session = reinvokeCreatureType(session, 'P01', PLAYER_CARD_TYPES)
        session = addCopyToActiveDeck(session, copy(session, 'P01').id)
      }
    }
  }
})

test('P17 aplica +1 vida actual y máxima después del daño real y conserva la herida siguiente', () => {
  const started = beginSessionDuel(sessionWith('P01', 'P17'), PLAYER_CARD_TYPES, [], { opponentInitialField: [enemy('E03')] })
  let duel = summonCreature(started.duel, 'P01')
  duel = summonCreature(duel, 'P17', [duel.players.player.creatures[0].id])
  const unit = duel.players.player.creatures[0]
  duel = attack(duel, [unit.id], { [unit.id]: [duel.players.opponent.creatures[0].id] })
  equal(duel.players.player.creatures[0].health, 6)
  const after = finishSessionDuel(started.session, terminalFixture(duel))
  equal(progress(after, 'P17'), [0, 1, 7])
  const next = beginSessionDuel(after, PLAYER_CARD_TYPES, [])
  const representation = next.duel.players.player.hand[0]
  equal([representation.copyId, representation.startingHealth, representation.maxHealth, representation.growthProgress], [unit.copyId, 7, 9, 1])
})

test('victoria real: P17 herida letal no revive ni mejora después del daño', () => {
  const initial = sessionWith('P01', 'P17', 'P02')
  const session = { ...initial, copies: initial.copies.map((entry) => entry.cardId === 'P17' ? { ...entry, health: 4 } : entry) }
  const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [], { opponentLife: 2, opponentInitialField: [enemy('E14')] })
  let duel = summonCreature(started.duel, 'P01')
  duel = summonCreature(duel, 'P17', [duel.players.player.creatures[0].id])
  duel = summonCreature(duel, 'P02')
  const epic = duel.players.player.creatures.find((unit) => unit.card.id === 'P17')!
  duel = attack(duel, duel.players.player.creatures.map((unit) => unit.id), { [epic.id]: [duel.players.opponent.creatures[0].id] })
  equal([duel.phase, duel.winner], ['finished', 'player'])
  equal(finishSessionDuel(started.session, duel).copies.map((entry) => entry.cardId), ['P02'])
})

test('fixture: bonos sobreviven al siguiente duelo; perder y reinvocar genera ID nuevo y progreso cero', () => {
  let session = sessionWith('P18')
  const started = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
  session = finishSessionDuel(started.session, terminalFixture(summonCreature(started.duel, 'P18')))
  const previousId = copy(session, 'P18').id
  const next = beginSessionDuel(session, PLAYER_CARD_TYPES, [])
  equal([next.duel.players.player.hand[0].copyId, next.duel.players.player.hand[0].attack, next.duel.players.player.hand[0].growthProgress], [previousId, 4, 1])
  const summoned = summonCreature(next.duel, 'P18')
  // Isolated death fixture, with the dead copy removed as the real resolver does.
  const lost = terminalFixture({ ...summoned, players: { ...summoned.players, player: { ...summoned.players.player, creatures: [] } } }, 'opponent')
  session = reinvokeCreatureType(finishSessionDuel(next.session, lost), 'P18', PLAYER_CARD_TYPES)
  ok(copy(session, 'P18').id !== previousId)
  equal(progress(session, 'P18'), [0, 0, 5])
  const fresh = effectiveCopyCard(card('P18'), copy(session, 'P18'))
  equal([fresh.attack, fresh.maxHealth, fresh.growthProgress], [3, 5, 0])
})

test('fixture: doble liquidación de sesión o aventura no aplica otra mejora a la copia', () => {
  const started = beginAdventureEncounter({ session: sessionWith('P18'), progress: createExplorationProgress() }, 'B1', MAIN_ENCOUNTERS, PLAYER_CARD_TYPES)
  const won = terminalFixture(summonCreature(started.duel, 'P18'))
  const settled = settleAdventureEncounter(started.state, won, MAIN_ENCOUNTERS, PLAYER_CARD_TYPES)
  equal(progress(settled.session, 'P18'), [1, 0, 5])
  ok(finishSessionDuel(settled.session, won) === settled.session)
  ok(settleAdventureEncounter(settled, won, MAIN_ENCOUNTERS, PLAYER_CARD_TYPES) === settled)
  equal(progress(settled.session, 'P18'), [1, 0, 5])
  equal(settled.session.settledDuelIds, [won.id])
})
