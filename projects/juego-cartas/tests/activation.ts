import { activateOnce, preventRepeatedActivationKey } from '../src/ui/activation.js'
import { applyCombatAction, createCombatControls } from '../src/ui/combatActions.js'
import { createDuel } from './duelFixtures.js'
import type { CreatureCard } from '../src/engine/types.js'

export const activationTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { activationTests.push({ name: `A6 activación · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`) }
const cards: CreatureCard[] = Array.from({ length: 5 }, (_, index) => ({ id: `activation-${index}`, name: `Prueba ${index}`, attack: 1, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } }))
const fixture = () => createCombatControls(createDuel({ playerDeck: cards, opponentDeck: [] }))

test('la activación simple y de teclado se conserva; el multiclic nativo se filtra sin temporizadores', () => {
  let actions = 0, prevented = 0
  for (const detail of [0, 1, 2, 3]) activateOnce({ detail, preventDefault: () => { prevented += 1 } }, () => { actions += 1 })
  equal([actions, prevented], [2, 2])
})

test('el segundo clic tras cambiar de fase no confirma la acción nueva del siguiente render', () => {
  let state = fixture()
  const event = (detail: number) => ({ detail, preventDefault() {} })
  activateOnce(event(1), () => { state = applyCombatAction(state, { type: 'begin-attack' }, state.revision).state })
  equal([state.duel.phase, state.duel.turn], ['attackers', 1])
  const revisionAfterRender = state.revision
  activateOnce(event(2), () => { state = applyCombatAction(state, { type: 'attack', attackerIds: [], targets: {} }, state.revision).state })
  equal([state.revision, state.duel.turn], [revisionAfterRender, 1])
  activateOnce(event(1), () => { state = applyCombatAction(state, { type: 'attack', attackerIds: [], targets: {} }, state.revision).state })
  equal([state.duel.phase, state.duel.turn], ['main', 3])
})

test('el segundo clic no juega otra carta tras el render; una activación posterior sí puede hacerlo', () => {
  let state = fixture()
  const play = (id: string) => { state = applyCombatAction(state, { type: 'summon', cardId: id }, state.revision).state }
  activateOnce({ detail: 1, preventDefault() {} }, () => play(cards[0].id))
  activateOnce({ detail: 2, preventDefault() {} }, () => play(cards[1].id))
  equal(state.duel.players.player.creatures.map((unit) => unit.card.id), [cards[0].id])
  activateOnce({ detail: 0, preventDefault() {} }, () => play(cards[1].id))
  equal(state.duel.players.player.creatures.map((unit) => unit.card.id), [cards[0].id, cards[1].id])
})

test('solo la repetición de Enter/Espacio cancela la activación por defecto', () => {
  let prevented = 0
  for (const key of ['Enter', ' ', 'Spacebar']) {
    preventRepeatedActivationKey({ key, repeat: false, preventDefault: () => { prevented += 100 } })
    preventRepeatedActivationKey({ key, repeat: true, preventDefault: () => { prevented += 1 } })
  }
  preventRepeatedActivationKey({ key: 'ArrowRight', repeat: true, preventDefault: () => { prevented += 100 } })
  equal(prevented, 3)
})
