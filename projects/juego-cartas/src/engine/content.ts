import type { CreatureCard } from './types.js'
import type { DungeonEncounter } from './exploration.js'

// Literal approved CSV baseline, replacing the previous prototype catalog.
export const PLAYER_CARD_TYPES: CreatureCard[] = [
  {"id":"P01","name":"Rata amaestrada","attack":1,"maxHealth":2,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":true,"reinvokeCost":0,"growthCap":0},
  {"id":"P02","name":"Chispa errante","attack":2,"maxHealth":1,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":true,"reinvokeCost":0,"growthCap":0},
  {"id":"P03","name":"Esqueleto remendado","attack":1,"maxHealth":3,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":true,"reinvokeCost":0,"growthCap":0},
  {"id":"P04","name":"Lodo guardián","attack":0,"maxHealth":4,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":true,"reinvokeCost":0,"growthCap":0},
  {"id":"P05","name":"Exploradora de cripta","attack":2,"maxHealth":3,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P06","name":"Bribón de ceniza","attack":3,"maxHealth":2,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P07","name":"Guardia de cobre","attack":2,"maxHealth":5,"cost":{"mana":1,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P08","name":"Arquera de hollín","attack":3,"maxHealth":3,"cost":{"mana":1,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P09","name":"Acólita del umbral","attack":2,"maxHealth":4,"cost":{"mana":0,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P10","name":"Perro sepulcral","attack":4,"maxHealth":2,"cost":{"mana":1,"sacrifices":0},"rarity":"common","seed":false,"reinvokeCost":1,"growthCap":0},
  {"id":"P11","name":"Espadachina espectral","attack":4,"maxHealth":4,"cost":{"mana":1,"sacrifices":0},"rarity":"rare","seed":false,"reinvokeCost":2,"growthCap":0},
  {"id":"P12","name":"Centinela pétreo","attack":2,"maxHealth":8,"cost":{"mana":1,"sacrifices":0},"rarity":"rare","seed":false,"reinvokeCost":2,"growthCap":0},
  {"id":"P13","name":"Quimera menor","attack":5,"maxHealth":5,"cost":{"mana":0,"sacrifices":1},"rarity":"rare","seed":false,"reinvokeCost":2,"growthCap":0},
  {"id":"P14","name":"Carroñero de hierro","attack":6,"maxHealth":4,"cost":{"mana":0,"sacrifices":1},"rarity":"rare","seed":false,"reinvokeCost":2,"growthCap":0},
  {"id":"P15","name":"Custodia rúnica","attack":4,"maxHealth":6,"cost":{"mana":1,"sacrifices":0},"rarity":"rare","seed":false,"reinvokeCost":2,"growthCap":0},
  {"id":"P16","name":"Basilisco ancestral","attack":5,"maxHealth":6,"cost":{"mana":1,"sacrifices":1},"rarity":"epic","seed":false,"reinvokeCost":3,"growthCap":3,"growth":"attack"},
  {"id":"P17","name":"Coloso de hueso","attack":4,"maxHealth":8,"cost":{"mana":1,"sacrifices":1},"rarity":"epic","seed":false,"reinvokeCost":3,"growthCap":3,"growth":"health"},
  {"id":"P18","name":"Espectro hambriento","attack":3,"maxHealth":5,"cost":{"mana":1,"sacrifices":0},"rarity":"epic","seed":false,"reinvokeCost":3,"growthCap":3,"growth":"attack"},
]

export const ENEMY_CARD_TYPES: CreatureCard[] = [
  {"id":"E01","name":"Rata","attack":1,"maxHealth":1,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E02","name":"Rata torpe","attack":1,"maxHealth":2,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E03","name":"Rata grande","attack":2,"maxHealth":3,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E04","name":"Rata mordedora","attack":2,"maxHealth":1,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E05","name":"Alfa de la madriguera","attack":3,"maxHealth":2,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E06","name":"Esqueleto novato","attack":2,"maxHealth":2,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E07","name":"Vigía exánime","attack":2,"maxHealth":3,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E08","name":"Murmurante","attack":3,"maxHealth":2,"cost":{"mana":1,"sacrifices":0}},
  {"id":"E09","name":"Acólito de fosa","attack":2,"maxHealth":4,"cost":{"mana":1,"sacrifices":0}},
  {"id":"E10","name":"Guardián sepulcral","attack":3,"maxHealth":5,"cost":{"mana":0,"sacrifices":0}},
  {"id":"E11","name":"Gólem agrietado","attack":4,"maxHealth":5,"cost":{"mana":1,"sacrifices":0}},
  {"id":"E12","name":"Bruja del umbral","attack":3,"maxHealth":4,"cost":{"mana":0,"sacrifices":1}},
  {"id":"E13","name":"Caballero hueco","attack":4,"maxHealth":6,"cost":{"mana":1,"sacrifices":0}},
  {"id":"E14","name":"Verdugo de cripta","attack":5,"maxHealth":5,"cost":{"mana":0,"sacrifices":1}},
]

export const INITIAL_PLAYER_CARD_IDS = ['P01', 'P02', 'P11', 'P03', 'P04', 'P05', 'P06', 'P07']
export const PLAYER_DECK = INITIAL_PLAYER_CARD_IDS.map((id) => PLAYER_CARD_TYPES.find((card) => card.id === id)!)
const enemies = (ids: string[]) => ids.map((id) => ENEMY_CARD_TYPES.find((card) => card.id === id)!)

export const DUNGEON_ENCOUNTERS: readonly DungeonEncounter[] = [
  {"id":"R1","name":"Ratas · 1","enemyName":"Ratas · 1","zone":"Ala de ratas","mode":"skirmish","opponentLife":0,"rewardMaxLife":1,"reducesFatigue":false,"repeatable":true,"rewardCardIds":[], opponentDeck: enemies([]), opponentInitialField: enemies(["E01"]) },
  {"id":"R2","name":"Ratas · 2","enemyName":"Ratas · 2","zone":"Ala de ratas","mode":"skirmish","opponentLife":0,"rewardMaxLife":1,"reducesFatigue":false,"repeatable":true,"rewardCardIds":[], opponentDeck: enemies([]), opponentInitialField: enemies(["E01","E03"]) },
  {"id":"R3","name":"Ratas · 3","enemyName":"Ratas · 3","zone":"Ala de ratas","mode":"skirmish","opponentLife":0,"rewardMaxLife":1,"reducesFatigue":false,"repeatable":true,"rewardCardIds":[], opponentDeck: enemies([]), opponentInitialField: enemies(["E01","E02","E04"]) },
  {"id":"R4","name":"Señora de las ratas","enemyName":"Señora de las ratas","zone":"Ala de ratas","mode":"duel","opponentLife":12,"rewardMaxLife":"restore","reducesFatigue":true,"repeatable":true,"rewardCardIds":[], opponentDeck: enemies(["E01","E05"]), opponentInitialField: enemies([]) },
  {"id":"B1","name":"Centinela del umbral","enemyName":"Centinela del umbral","zone":"Sector 1","mode":"duel","opponentLife":17,"rewardMaxLife":4,"reducesFatigue":true,"repeatable":false,"rewardCardIds":["P13","P16"],"discoveryCardId":"P13", opponentDeck: enemies(["E08","E07","E09"]), opponentInitialField: enemies([]) },
  {"id":"B2","name":"Custodia de catacumbas","enemyName":"Custodia de catacumbas","zone":"Sector 2","mode":"duel","opponentLife":22,"rewardMaxLife":4,"reducesFatigue":true,"repeatable":false,"rewardCardIds":["P15","P17"], opponentDeck: enemies(["E08","E09","E07","E11","E10"]), opponentInitialField: enemies([]) },
  {"id":"B3","name":"Guardián de la cripta","enemyName":"Guardián de la cripta","zone":"Sector 3","mode":"duel","opponentLife":30,"rewardMaxLife":"restore","reducesFatigue":true,"repeatable":false,"rewardCardIds":[], opponentDeck: enemies(["E11","E13","E08","E09","E14","E12"]), opponentInitialField: enemies(["E06"]) },
]

// Transitional route for the three-portal diorama; H2/H5 integrate the optional wing.
export const MAIN_ENCOUNTERS = DUNGEON_ENCOUNTERS.filter((encounter) => encounter.id.startsWith('B'))
