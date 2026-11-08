import { summonCreature } from '../src/engine/rules.js'
import type { CreatureCard } from '../src/engine/types.js'
import { attacksReady } from '../src/ui/encounterSummary.js'
import { createDuel } from './duelFixtures.js'

export const presentationTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { presentationTests.push({ name: `H5 presentación · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }

const own: CreatureCard = { id: 'own', name: 'Criatura propia', attack: 1, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } }
const enemy: CreatureCard = { id: 'enemy', name: 'Rata', attack: 1, maxHealth: 1, cost: { mana: 0, sacrifices: 0 } }

test('ataques dirigidos no habilitan confirmar con objetivos vacíos o eliminados', () => {
  const skirmish = createDuel({ playerDeck: [own], opponentDeck: [], mode: 'skirmish', opponentInitialField: [enemy] })
  const duel = summonCreature(skirmish, 'own')
  const ownId = duel.players.player.creatures[0].id, enemyId = duel.players.opponent.creatures[0].id
  equal(attacksReady(duel, [ownId], {}), false)
  equal(attacksReady(duel, [ownId], { [ownId]: 'missing' }), false)
  equal(attacksReady(duel, [ownId], { [ownId]: enemyId }), true)
  equal(attacksReady(duel, [], {}), true)
  const main = createDuel({ playerDeck: [own], opponentDeck: [] })
  ok(main.mode === 'duel')
  equal(attacksReady(summonCreature(main, 'own'), [ownId], {}), true)
})
