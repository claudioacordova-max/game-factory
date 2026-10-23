import { createEngine } from '../src/engine/index.js'

const state = createEngine()
if (Object.keys(state).length !== 0) {
  throw new Error('El motor inicial debe estar vacío en el Hito 1.')
}

console.log('✓ el motor vacío se crea y no contiene reglas ni estado económico')
