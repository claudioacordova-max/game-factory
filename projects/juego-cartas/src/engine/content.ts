import { LEGACY_CONTENT } from './content/legacy.js'

// Static selection for the playable expedition. Future content stays isolated until
// its collection, engine and world contracts are implemented and authorized.
export const ACTIVE_CONTENT = LEGACY_CONTENT

// Compatibility facade: consumers receive one complete data set, never mixed tables.
export const PLAYER_CARD_TYPES = ACTIVE_CONTENT.playerCardTypes
export const ENEMY_CARD_TYPES = ACTIVE_CONTENT.enemyCardTypes
export const INITIAL_PLAYER_CARD_IDS = ACTIVE_CONTENT.initialPlayerCardIds
export const PLAYER_DECK = ACTIVE_CONTENT.playerDeck
export const DUNGEON_ENCOUNTERS = ACTIVE_CONTENT.dungeonEncounters
export const MAIN_ENCOUNTERS = ACTIVE_CONTENT.mainEncounters
