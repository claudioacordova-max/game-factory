import { V04B_SPATIAL_ROOMS } from '../src/engine/index.js'
import { boundaryMasonry, cryptTheme } from '../src/scene/cryptVisuals.js'

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

export const cryptVisualTests = [
  { name: 'la mampostería visual no invade el rectángulo navegable de ninguna sala', run: () => {
    for (const room of Object.values(V04B_SPATIAL_ROOMS)) {
      for (const block of boundaryMasonry(room)) {
        const outsideX = block.x + block.width / 2 <= -room.width / 2 || block.x - block.width / 2 >= room.width / 2
        const outsideZ = block.z + block.depth / 2 <= -room.depth / 2 || block.z - block.depth / 2 >= room.depth / 2
        assert(outsideX || outsideZ, `Mampostería invadiendo ${room.id}: ${JSON.stringify(block)}`)
      }
    }
  } },
  { name: 'cada sala V0.4B recibe tema propio y región visual correspondiente', run: () => {
    const rooms = Object.values(V04B_SPATIAL_ROOMS)
    for (const room of rooms) {
      const theme = cryptTheme(room.id)
      assert(theme, `Falta tema: ${room.id}`)
      assert(theme.wing === ['v04b-07', 'v04b-08', 'v04b-09'].includes(room.id), `Región incorrecta: ${room.id}`)
    }
  } },
]
