import { renderToStaticMarkup } from 'react-dom/server'
import { PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { createGameSession } from '../src/engine/session.js'
import { startCombat, summonCreature } from '../src/engine/rules.js'
import { CombatView } from '../src/ui/CombatView.js'
import type { CombatViewProps } from '../src/ui/CombatView.js'
import { createDuel } from './duelFixtures.js'
import { blockDefenseFixture } from './blockAssignments.js'

export const combatPresentationTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { combatPresentationTests.push({ name: `A3 tablero · ${name}`, run }) }
function ok(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message) }
const cards = PLAYER_CARD_TYPES.slice(0, 3)
const noop = () => {}
function fixture(skirmish = false): CombatViewProps {
  return {
    duel: createDuel({ playerDeck: cards, opponentDeck: [], mode: skirmish ? 'skirmish' : 'duel', opponentLife: 17, playerLife: 11, opponentInitialField: skirmish ? [cards[0]] : [] }),
    session: { ...createGameSession(cards), invokerMaxLife: 11, invokerLife: 11 }, enemyName: skirmish ? 'Ratas de la cripta' : 'Centinela', enemyMaxLife: 17,
    notice: '', noticeRevision: 0, selectedCardId: null, sacrificeIds: [], attackerIds: [], targetChoices: {}, blockerChoices: {}, focusedBlockerAttackerId: null, focusedAttackerId: null, onFocusAttacker: noop,
    onSelectCard: noop, onAllowFieldDrop: noop, onDropHandCard: noop, onToggleSacrifice: noop, onSelectEnemy: noop, onSelectAttacker: noop, onSelectBlocker: noop, onChooseTarget: noop,
    onCancelSummon: noop, onBeginCombat: noop, onDeclareAttacks: noop, onConfirmBlocks: noop,
    onStartBlockDrag: () => true, onEndBlockDrag: noop, onDropBlocker: noop, onRemoveBlocker: noop, onMoveBlocker: noop,
  }
}

test('el grupo de escaramuza no recibe vida ficticia ni identidad de invocador', () => {
  const props = fixture(true)
  const markup = renderToStaticMarkup(<CombatView {...props} enemyMaxLife={999} />)
  ok(markup.includes('Ratas de la cripta') && markup.includes('aria-label="Grupo enemigo"'), 'Falta la identidad del grupo.')
  ok(!markup.includes('Invocador enemigo') && !markup.includes('Vida enemiga') && !markup.includes('999'), 'La escaramuza debe omitir el invocador y su vida.')
  ok(markup.includes('aria-label="Vida propia 11 de 11"'), 'La escaramuza conserva la vida del jugador.')
})

test('ambos invocadores muestran vida actual y máximo de su fuente real', () => {
  const props = fixture()
  props.duel = { ...props.duel, players: { player: { ...props.duel.players.player, life: 7 }, opponent: { ...props.duel.players.player, life: 13 } } }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok(markup.includes('aria-label="Vida propia 7 de 11"'), 'El máximo propio debe venir de sesión, no de la vida actual.')
  ok(markup.includes('aria-label="Vida enemiga 13 de 17"'), 'El máximo enemigo debe venir del encuentro.')
  ok((markup.match(/class="combat-mana"/g) ?? []).length === 1, 'El maná propio debe presentarse una vez.')
  ok(!markup.includes('game-header') && !markup.includes('game-footer') && !markup.includes('phase-panel') && !markup.includes('attack-list') && !markup.includes('blocker-picker'), 'El tablero no debe reconstruir los paneles externos.')
})

test('el objetivo dirigido se conserva junto a la carta atacante', () => {
  const props = fixture(true)
  props.duel = startCombat(summonCreature(props.duel, cards[0].id))
  const attacker = props.duel.players.player.creatures[0].id
  const target = props.duel.players.opponent.creatures[0].id
  props.attackerIds = [attacker]
  props.targetChoices = { [attacker]: target }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok(markup.includes(`data-creature-id="${attacker}"`) && markup.includes(`data-creature-id="${target}"`), 'Las criaturas necesitan anclajes propios del tablero.')
  ok(markup.includes('class="combat-target"') && markup.includes('Ataca a '), 'El objetivo debe verse y poder cambiarse en la carta propia.')
  ok(markup.includes('Confirmar ataques'), 'Debe conservarse la decisión táctica.')
})

test('las cartas no se deshabilitan por maná insuficiente en fase principal', () => {
  const props = fixture()
  const costly = PLAYER_CARD_TYPES.find((card) => card.cost.mana > 0)!
  const hand = [...props.duel.players.player.hand, costly]
  props.duel = { ...props.duel, players: { ...props.duel.players, player: { ...props.duel.players.player, mana: 0, hand } } }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok((markup.match(/draggable="true"/g) ?? []).length === hand.length, 'Incluso la carta cuyo coste excede el maná debe admitir el intento por arrastre.')
})

test('el sacrificio conserva progreso y advertencia sin depender del aviso temporal', () => {
  const props = fixture()
  const ritual = { ...cards[0], id: 'two-sacrifice-fixture', name: 'Ritual de prueba', cost: { mana: 1, sacrifices: 2 } }
  props.duel = { ...props.duel, players: { ...props.duel.players, player: { ...props.duel.players.player, hand: [...props.duel.players.player.hand, ritual] } } }
  props.selectedCardId = ritual.id
  props.sacrificeIds = ['selected-fixture']
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok(markup.includes('1/2 sacrificios') && markup.includes('Al elegir la última criatura, se invoca y los sacrificios se pierden permanentemente.'), 'El progreso y punto definitivo deben permanecer en el tablero.')
  ok(markup.includes('Cancelar sacrificio') && !markup.includes('Confirmar invocación') && !markup.includes('Intentar invocación'), 'No debe existir la confirmación separada anterior.')
  ok(!markup.includes('game-toast'), 'La advertencia debe existir incluso sin una notificación temporal.')
})

test('el combate resuelto no ofrece un fin manual de turno', () => {
  const props = fixture()
  props.duel = { ...props.duel, phase: 'resolved' }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok(!markup.includes('Terminar turno'), 'El siguiente turno pertenece al flujo automático.')
})

test('defensa integra arrastre en la carta, orden, retirada y conexiones sin listas', () => {
  const props = fixture(true)
  props.duel = blockDefenseFixture('skirmish')
  props.blockerChoices = { 'enemy-a': ['own-a', 'own-b'] }
  props.focusedBlockerAttackerId = 'enemy-a'
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok((markup.match(/class="creature-tile[^\"]*"[^>]*draggable="true"/g) ?? []).length === 3, 'Se debe arrastrar la carta propia, no solo su contenedor.')
  ok(markup.includes('aria-label="Orden de bloqueo 1"') && markup.includes('aria-label="Orden de bloqueo 2"'), 'Cada bloqueador muestra su orden actual.')
  ok(markup.includes('Retirar bloqueo de own-a') && markup.includes('Adelantar en daño a own-b'), 'Las acciones accesibles permanecen junto a la criatura.')
  ok(markup.includes('data-board-link-count="2"'), 'Las dos asignaciones deben alimentar la capa de conexiones.')
  ok(!markup.includes('combat-field-order') && !markup.includes('attack-list') && !markup.includes('blocker-picker'), 'La defensa no mezcla el índice de represalia con orden de bloqueos ni usa listas laterales.')
  props.focusedBlockerAttackerId = null
  ok(renderToStaticMarkup(<CombatView {...props} />).includes('Arrastra para bloquear'), 'La criatura sin asignar debe presentar el arrastre como interacción principal.')
})

test('el tablero conecta todos los ataques dirigidos contra un mismo enemigo', () => {
  const props = fixture(true)
  props.duel = { ...blockDefenseFixture('skirmish'), phase: 'attackers', activePlayer: 'player' }
  props.attackerIds = ['own-a', 'own-b']
  props.targetChoices = { 'own-a': 'enemy-a', 'own-b': 'enemy-a' }
  const markup = renderToStaticMarkup(<CombatView {...props} />)
  ok(markup.includes('data-board-link-count="2"') && markup.includes('Objetivo de 2 atacantes'), 'El objetivo compartido debe reflejar ambas relaciones.')
})
