import {
  ACTIVE_CONTENT, DUNGEON_ENCOUNTERS, ENEMY_CARD_TYPES, INITIAL_PLAYER_CARD_IDS,
  MAIN_ENCOUNTERS, PLAYER_CARD_TYPES, PLAYER_DECK,
} from '../src/engine/content.js'
import { LEGACY_CONTENT } from '../src/engine/content/legacy.js'
import { beginAdventureEncounter } from '../src/engine/exploration.js'
import { createDuel, declareAttackers, declareBlockers, endTurn, requireInvoker, resolveCombat, startCombat } from '../src/engine/rules.js'
import { createExpeditionState } from '../src/engine/world.js'

function ok(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

export const contentCompatibilityTests = [
  { name: 'M0 contenido · la fachada activa expone un único conjunto legado completo', run: () => {
    ok(ACTIVE_CONTENT === LEGACY_CONTENT && ACTIVE_CONTENT.id === 'legacy-v1', 'Solo el contenido legado está activo')
    ok(PLAYER_CARD_TYPES === LEGACY_CONTENT.playerCardTypes
      && ENEMY_CARD_TYPES === LEGACY_CONTENT.enemyCardTypes
      && INITIAL_PLAYER_CARD_IDS === LEGACY_CONTENT.initialPlayerCardIds
      && PLAYER_DECK === LEGACY_CONTENT.playerDeck
      && DUNGEON_ENCOUNTERS === LEGACY_CONTENT.dungeonEncounters
      && MAIN_ENCOUNTERS === LEGACY_CONTENT.mainEncounters, 'No mezclar catálogos, inicio ni encuentros de distintas configuraciones')
  } },
  { name: 'M0 contenido · las referencias del conjunto activo están cerradas sobre P/E', run: () => {
    const playerTypes = new Set(PLAYER_CARD_TYPES)
    const enemyTypes = new Set(ENEMY_CARD_TYPES)
    const playerIds = new Set(PLAYER_CARD_TYPES.map((card) => card.id))
    ok(PLAYER_CARD_TYPES.length === 18 && playerIds.size === 18
      && PLAYER_CARD_TYPES.every((card) => /^P\d{2}$/.test(card.id)), 'Catálogo propio legado sin tipos añadidos o duplicados')
    ok(ENEMY_CARD_TYPES.length === 14 && new Set(ENEMY_CARD_TYPES.map((card) => card.id)).size === 14
      && ENEMY_CARD_TYPES.every((card) => /^E\d{2}$/.test(card.id)), 'Catálogo enemigo legado sin tipos añadidos o duplicados')
    ok(PLAYER_DECK.length === 8 && INITIAL_PLAYER_CARD_IDS.length === 8
      && PLAYER_DECK.every((card, index) => playerTypes.has(card) && card.id === INITIAL_PLAYER_CARD_IDS[index]), 'Inicio resuelto contra sus propias definiciones, conservando el orden')
    ok(DUNGEON_ENCOUNTERS.length === 7 && new Set(DUNGEON_ENCOUNTERS.map((encounter) => encounter.id)).size === 7, 'Siete encuentros distintos')
    for (const encounter of DUNGEON_ENCOUNTERS) {
      ok([...encounter.opponentDeck, ...encounter.opponentInitialField].every((card) => enemyTypes.has(card)), `${encounter.id}: enemigos resueltos contra su catálogo`)
      ok(encounter.rewardCardIds.every((id) => playerIds.has(id))
        && (!encounter.discoveryCardId || playerIds.has(encounter.discoveryCardId)), `${encounter.id}: premios y descubrimiento válidos`)
    }
    ok(MAIN_ENCOUNTERS.length === 3 && MAIN_ENCOUNTERS.every((encounter) => DUNGEON_ENCOUNTERS.includes(encounter)), 'Ruta principal formada por encuentros del mismo conjunto')
  } },
  { name: 'M0 compatibilidad · el inicio real conserva las ocho copias y el primer robo enemigo legado', run: () => {
    const expedition = createExpeditionState()
    ok(expedition.roomId === 'sector-1' && expedition.session.copies.length === 8
      && expedition.session.copies.every((copy, index) => copy.cardId === INITIAL_PLAYER_CARD_IDS[index]), 'El bootstrap jugable sigue usando las ocho iniciales legadas')
    const started = beginAdventureEncounter(expedition, 'B1', DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES, () => 1 - Number.EPSILON)
    ok(requireInvoker(started.duel.players.opponent).hand.length === 3, 'El primer encuentro mantiene mano inicial de tres')
    // B1 has only three cards. B2 supplies a real legacy deck with a fourth card
    // so this guard can distinguish the current maintenance from future D02.
    const enemyDeck = MAIN_ENCOUNTERS[1].opponentDeck
    const sample = createDuel({ playerDeck: [], opponentDeck: enemyDeck })
    const firstHand = requireInvoker(sample.players.opponent).hand
    ok(firstHand.length === 3 && firstHand.every((card, index) => card === enemyDeck[index]), 'Mano enemiga inicial ordenada de tres')
    const enemyTurn = endTurn(resolveCombat(declareBlockers(declareAttackers(startCombat(sample), []), {})))
    const afterMaintenance = requireInvoker(enemyTurn.players.opponent)
    ok(afterMaintenance.hand.length === 4 && afterMaintenance.hand[3] === enemyDeck[3]
      && afterMaintenance.deck.length === enemyDeck.length - 4, 'M0 conserva el mantenimiento legado; D02 corresponde a un hito posterior')
  } },
]
