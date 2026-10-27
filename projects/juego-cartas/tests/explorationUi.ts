import { collectionShortcut } from '../src/ui/explorationControls.js'

export const explorationUiTests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { explorationUiTests.push({ name: `A2 exploración · ${name}`, run }) }
function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`Esperado ${String(expected)}; recibido ${String(actual)}`)
}
const event = { key: 'i', repeat: false, ctrlKey: false, altKey: false, metaKey: false }
const world = { inCombat: false, resultOpen: false, collectionOpen: false }

test('I abre desde el mundo y vuelve a cerrar desde la colección', () => {
  equal(collectionShortcut(event, world, false), 'open')
  equal(collectionShortcut({ ...event, key: 'I' }, { ...world, collectionOpen: true }, false), 'close')
})

test('escritura, repetición y combinaciones del navegador no activan colección', () => {
  equal(collectionShortcut(event, world, true), null)
  for (const option of ['repeat', 'ctrlKey', 'altKey', 'metaKey'] as const) {
    equal(collectionShortcut({ ...event, [option]: true }, world, false), null)
  }
  equal(collectionShortcut({ ...event, key: 'w' }, world, false), null)
})

test('el atajo no permite abrir colección durante combate ni resultado', () => {
  equal(collectionShortcut(event, { ...world, inCombat: true }, false), null)
  equal(collectionShortcut(event, { ...world, resultOpen: true }, false), null)
  equal(collectionShortcut(event, { ...world, resultOpen: true, collectionOpen: true }, false), null)
})
