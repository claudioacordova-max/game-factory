import { boardCardAnchor, boardConnection } from '../src/ui/boardGeometry.js'
import type { BoardRect } from '../src/ui/boardGeometry.js'

type Test = { name: string; run: () => void }
export const boardGeometryTests: Test[] = []
function test(name: string, run: () => void) { boardGeometryTests.push({ name: `A5 geometría · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
const board: BoardRect = { left: 100, top: 50, width: 800, height: 600 }
const ownRow: BoardRect = { left: 120, top: 400, width: 700, height: 200 }
const own: BoardRect = { left: 180, top: 450, width: 120, height: 150 }
const enemyRow: BoardRect = { left: 120, top: 120, width: 700, height: 200 }
const enemy: BoardRect = { left: 580, top: 140, width: 120, height: 150 }

test('ancla centro superior propio y centro inferior enemigo respecto al tablero', () => {
  equal(boardConnection(board, own, ownRow, enemy, enemyRow), { from: { x: 140, y: 400 }, to: { x: 540, y: 240 } })
  equal([own.left, enemy.top, board.width], [180, 140, 800])
})

test('mover el tablero y todos sus elementos no altera coordenadas relativas', () => {
  const shifted = (rect: BoardRect): BoardRect => ({ ...rect, left: rect.left + 243, top: rect.top - 81 })
  equal(boardConnection(shifted(board), shifted(own), shifted(ownRow), shifted(enemy), shifted(enemyRow)), boardConnection(board, own, ownRow, enemy, enemyRow))
})

test('desplazamiento horizontal actualiza centros sin usar offsets anteriores', () => {
  equal(boardCardAnchor(board, { ...own, left: own.left + 180 }, ownRow, 'top'), { x: 320, y: 400 })
  equal(boardCardAnchor(board, { ...enemy, left: enemy.left - 100 }, enemyRow, 'bottom'), { x: 440, y: 240 })
})

test('tarjetas parcialmente recortadas limitan su ancla a su porción visible', () => {
  equal(boardCardAnchor(board, { ...own, left: 20 }, ownRow, 'top'), { x: 20, y: 400 })
  equal(boardCardAnchor(board, { ...own, left: 800 }, ownRow, 'top'), { x: 720, y: 400 })
  equal(boardCardAnchor(board, { ...own, top: 350 }, ownRow, 'top'), { x: 140, y: 350 })
  equal(boardCardAnchor(board, { ...enemy, top: 250 }, enemyRow, 'bottom'), { x: 540, y: 270 })
})

test('tarjetas invisibles o fuera del tablero omiten la conexión completa', () => {
  for (const hidden of [{ ...own, left: -100 }, { ...own, left: 820 }, { ...own, top: 600 }]) {
    equal(boardConnection(board, hidden, ownRow, enemy, enemyRow), null)
  }
  equal(boardConnection(board, own, ownRow, { ...enemy, left: 1500 }, enemyRow), null)
  equal(boardCardAnchor({ ...board, width: 100 }, own, ownRow, 'top'), { x: 100, y: 400 })
  equal(boardCardAnchor({ ...board, width: 80 }, own, ownRow, 'top'), null)
})

test('geometría nula, negativa o no finita no produce coordenadas SVG inválidas', () => {
  for (const invalid of [
    { ...own, width: 0 }, { ...own, height: -1 }, { ...own, left: NaN }, { ...own, top: Infinity },
    { ...own, left: Number.MAX_VALUE, width: Number.MAX_VALUE },
  ]) equal(boardCardAnchor(board, invalid, ownRow, 'top'), null)
  equal(boardCardAnchor({ ...board, height: 0 }, own, ownRow, 'top'), null)
  equal(boardCardAnchor(board, own, { ...ownRow, width: Infinity }, 'top'), null)
})
