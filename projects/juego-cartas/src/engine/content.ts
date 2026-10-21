import type { CreatureCard } from './types.js'
import type { DungeonEncounter } from './exploration.js'

export const PLAYER_DECK: CreatureCard[] = [
  { id: 'player-squire', name: 'Escudero', attack: 2, maxHealth: 3, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-vanguard', name: 'Vanguardia', attack: 3, maxHealth: 4, cost: { mana: 1, sacrifices: 0 } },
  { id: 'player-imp', name: 'Diablillo', attack: 1, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-basilisk', name: 'Basilisco', attack: 4, maxHealth: 4, cost: { mana: 0, sacrifices: 1 } },
  { id: 'player-warden', name: 'Guardián', attack: 2, maxHealth: 6, cost: { mana: 1, sacrifices: 0 } },
  { id: 'player-hawk', name: 'Halcón', attack: 3, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } },
  { id: 'player-ogre', name: 'Ogro', attack: 5, maxHealth: 5, cost: { mana: 0, sacrifices: 1 } },
]

export const DISCOVERY_CARD: CreatureCard = {
  id: 'test-mossling', name: 'Brote de musgo', attack: 1, maxHealth: 4, cost: { mana: 0, sacrifices: 0 },
}

export const PLAYER_CARD_TYPES = [...PLAYER_DECK, DISCOVERY_CARD]

const SHADOW_SCOUT: CreatureCard = { id: 'enemy-scout', name: 'Explorador sombrío', attack: 2, maxHealth: 3, cost: { mana: 0, sacrifices: 0 } }
const RAIDER: CreatureCard = { id: 'enemy-raider', name: 'Saqueador', attack: 3, maxHealth: 3, cost: { mana: 1, sacrifices: 0 } }
const CULTIST: CreatureCard = { id: 'enemy-cultist', name: 'Cultista', attack: 2, maxHealth: 2, cost: { mana: 0, sacrifices: 1 } }
const ARMORED_BOAR: CreatureCard = { id: 'enemy-boar', name: 'Jabalí acorazado', attack: 4, maxHealth: 5, cost: { mana: 1, sacrifices: 0 } }
const BAT: CreatureCard = { id: 'enemy-bat', name: 'Murciélago', attack: 2, maxHealth: 2, cost: { mana: 0, sacrifices: 0 } }
const CRYPT_GUARD: CreatureCard = { id: 'enemy-guard', name: 'Guardia de la cripta', attack: 2, maxHealth: 5, cost: { mana: 0, sacrifices: 0 } }
const STONE_OGRE: CreatureCard = { id: 'enemy-ogre', name: 'Ogro de piedra', attack: 4, maxHealth: 4, cost: { mana: 0, sacrifices: 1 } }

/** Fixed encounter content. The third opponent preserves the original deck and order. */
export const DUNGEON_ENCOUNTERS: readonly (DungeonEncounter & { opponentDeck: CreatureCard[] })[] = [
  {
    id: 'threshold-sentinel',
    name: 'Encuentro 1',
    enemyName: 'Centinela del umbral',
    discoveryCardId: DISCOVERY_CARD.id,
    opponentDeck: [SHADOW_SCOUT, BAT],
  },
  {
    id: 'catacomb-keeper',
    name: 'Encuentro 2',
    enemyName: 'Custodia de las catacumbas',
    opponentDeck: [BAT, RAIDER, CRYPT_GUARD],
  },
  {
    id: 'crypt-guardian',
    name: 'Encuentro 3',
    enemyName: 'Guardián de la cripta',
    opponentDeck: [SHADOW_SCOUT, RAIDER, CULTIST, ARMORED_BOAR, BAT, CRYPT_GUARD, STONE_OGRE],
  },
]
