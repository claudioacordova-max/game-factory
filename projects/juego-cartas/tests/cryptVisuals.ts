import { DUNGEON_ENCOUNTERS } from '../src/engine/content.js'
import { ROOMS } from '../src/engine/spatial.js'
import { boundaryMasonry, CRYPT_THEMES, RAT_GROUPS } from '../src/scene/cryptVisuals.js'

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

export const cryptVisualTests = [
  { name: 'la mampostería visual no invade el rectángulo navegable de ninguna sala', run: () => {
    for (const room of Object.values(ROOMS)) {
      for (const block of boundaryMasonry(room)) {
        const outsideX = block.x + block.width / 2 <= -room.width / 2 || block.x - block.width / 2 >= room.width / 2
        const outsideZ = block.z + block.depth / 2 <= -room.depth / 2 || block.z - block.depth / 2 >= room.depth / 2
        assert(outsideX || outsideZ, `Mampostería invadiendo ${room.id}: ${JSON.stringify(block)}`)
      }
    }
  } },
  { name: 'cada sala real recibe composición propia y región visual correspondiente', run: () => {
    const kinds = new Set<string>()
    for (const room of Object.values(ROOMS)) {
      const theme = CRYPT_THEMES[room.id]
      assert(theme, `Falta tema: ${room.id}`)
      assert(theme.wing === room.id.startsWith('rats-'), `Región incorrecta: ${room.id}`)
      kinds.add(theme.kind)
    }
    assert(kinds.size === Object.keys(ROOMS).length, 'Las siete salas necesitan composiciones distinguibles')
  } },
  { name: 'los grupos visuales de roedores corresponden al campo inicial real R1–R3', run: () => {
    for (const [roomId, models] of Object.entries(RAT_GROUPS)) {
      const encounterId = roomId.replace('rats-', 'R')
      const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === encounterId)
      assert(encounter?.mode === 'skirmish', `${roomId} debe representar una escaramuza real`)
      assert(JSON.stringify(models.map((model) => model.cardId)) === JSON.stringify(encounter.opponentInitialField?.map((card) => card.id)), `Representación ajena al contenido: ${encounterId}`)
      // Small groups fit the unchanged 0.75×0.65 enemy body; models never expand occupancy.
      for (const model of models) {
        assert(Math.abs(model.x) + model.scale * 0.27 <= 0.375, `Roedor fuera de anchura en ${roomId}`)
        assert(Math.abs(model.z) + model.scale * 0.35 <= 0.325, `Roedor fuera de profundidad en ${roomId}`)
      }
    }
  } },
]
