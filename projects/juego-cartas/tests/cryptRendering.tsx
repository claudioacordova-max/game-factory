import { act, StrictMode } from 'react'
import { createRoot, extend } from '@react-three/fiber'
import * as THREE from 'three'
import { Masonry } from '../src/scene/CryptGeometry.js'
import { CryptRoom } from '../src/scene/CryptEnvironment.js'
import { buildStaticCryptBatch, disposeStaticCryptBatch } from '../src/scene/staticCryptBatch.js'
import { ROOMS } from '../src/engine/spatial.js'

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}
function near(a: number, b: number): boolean { return Math.abs(a - b) < 0.00001 }
extend({
  Group: THREE.Group, Mesh: THREE.Mesh, InstancedMesh: THREE.InstancedMesh,
  RingGeometry: THREE.RingGeometry, PlaneGeometry: THREE.PlaneGeometry,
  CircleGeometry: THREE.CircleGeometry, OctahedronGeometry: THREE.OctahedronGeometry,
  MeshBasicMaterial: THREE.MeshBasicMaterial, MeshStandardMaterial: THREE.MeshStandardMaterial,
})

/** Real R3F reconciliation, without pretending this stub measures WebGL or FPS. */
async function withRoot(run: (root: ReturnType<typeof createRoot>) => Promise<void>) {
  const globals = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
  const previous = globals.IS_REACT_ACT_ENVIRONMENT
  globals.IS_REACT_ACT_ENVIRONMENT = true
  const canvas = { width: 100, height: 100, style: {}, addEventListener() {}, removeEventListener() {} }
  const gl = {
    render() {}, setPixelRatio() {}, setSize() {}, getSize(out: THREE.Vector2) { return out.set(100, 100) },
    domElement: canvas, shadowMap: { enabled: false }, outputColorSpace: '', toneMapping: 0,
  } as unknown as THREE.WebGLRenderer
  const root = createRoot(canvas as unknown as HTMLCanvasElement)
  try {
    await root.configure({ gl, frameloop: 'never', dpr: 1, size: { width: 100, height: 100, top: 0, left: 0 } })
    await run(root)
  } finally {
    await act(async () => { root.unmount() })
    if (previous === undefined) delete globals.IS_REACT_ACT_ENVIRONMENT
    else globals.IS_REACT_ACT_ENVIRONMENT = previous
  }
}

/** Multiset of rendered pieces, independent of how many objects submit them. */
function pieces(root: THREE.Group): string[] {
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert(), instance = new THREE.Matrix4()
  const result: string[] = []
  const visit = (object: THREE.Object3D) => {
    if (!object.visible) return
    if (object instanceof THREE.Mesh) {
      assert(!Array.isArray(object.material), 'Single-material art fixture')
      const base = inverse.clone().multiply(object.matrixWorld)
      const signature = (matrix: THREE.Matrix4) => result.push(JSON.stringify([
        object.geometry.uuid, object.material.uuid, object.castShadow, object.receiveShadow,
        object.frustumCulled, object.renderOrder, object.layers.mask,
        matrix.elements,
      ]))
      if (object instanceof THREE.InstancedMesh) {
        for (let index = 0; index < object.count; index++) {
          object.getMatrixAt(index, instance)
          signature(base.clone().multiply(instance))
        }
      } else signature(base)
    }
    object.children.forEach(visit)
  }
  root.children.forEach(visit)
  return result.sort()
}

function samePieces(expected: string[], actual: string[]): boolean {
  if (expected.length !== actual.length) return false
  const unpack = (value: string) => {
    const data = JSON.parse(value) as [...unknown[], number[]]
    return { attributes: JSON.stringify(data.slice(0, -1)), matrix: data[data.length - 1] as number[] }
  }
  const remaining = actual.map(unpack)
  for (const value of expected.map(unpack)) {
    // Instance attributes use Float32, so compare transforms with their upload precision.
    const index = remaining.findIndex((candidate) => candidate.attributes === value.attributes
      && candidate.matrix.every((number, i) => near(number, value.matrix[i])))
    if (index < 0) return false
    remaining.splice(index, 1)
  }
  return remaining.length === 0
}

export const cryptRenderingTests = [
  { name: 'Masonry real conserva 168 transformaciones al alternar paletas con datos estables', run: async () => {
    const blocks = Array.from({ length: 168 }, (_, i) => ({
      x: i % 14 - 6.5, y: -0.035, z: Math.floor(i / 14) - 5.5, width: 0.97, height: 0.06, depth: 0.97,
    }))
    await withRoot(async (root) => {
      let store!: ReturnType<typeof root.render>
      const matrix = new THREE.Matrix4()
      for (const color of ['#39434c', '#45483c', '#39434c', '#303b49', '#45483c', '#39434c']) {
        await act(async () => { store = root.render(<Masonry blocks={blocks} color={color} />) })
        const mesh = store.getState().scene.children[0]
        assert(mesh instanceof THREE.InstancedMesh && mesh.count === 168, 'Exactly the floor instances survive')
        for (let i = 0; i < blocks.length; i++) {
          mesh.getMatrixAt(i, matrix)
          assert(near(matrix.elements[0], 0.97) && near(matrix.elements[5], 0.06)
            && near(matrix.elements[10], 0.97), `Floor ${i} must not become an identity cube`)
          assert(near(matrix.elements[12], blocks[i].x) && near(matrix.elements[13], blocks[i].y)
            && near(matrix.elements[14], blocks[i].z), `Floor ${i} keeps its real location`)
        }
        assert(mesh.boundingSphere && mesh.boundingSphere.radius > 8, 'Bounds cover the whole floor after reconstruction')
      }
    })
  } },
  { name: 'batch estático conserva piezas y sombras y libera solo buffers de sus instancias', run: async () => {
    const source = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshStandardMaterial()
    source.position.set(3, 0, -2)
    const first = new THREE.Mesh(geometry, material), second = new THREE.Mesh(geometry, material)
    first.position.set(-2, 1, 4); first.rotation.y = 0.6; first.scale.set(0.7, 2, 1.2)
    second.position.set(2, 0.5, -1); second.scale.set(2, 1, 0.4)
    first.castShadow = second.castShadow = true
    source.add(first, second)
    const mirrored = new THREE.Mesh(geometry, material)
    mirrored.position.set(1, 0, 2); mirrored.scale.x = -1
    source.add(mirrored)
    const shadowVariant = new THREE.Mesh(geometry, material)
    shadowVariant.position.y = 2; shadowVariant.receiveShadow = true
    source.add(shadowVariant)
    const batch = buildStaticCryptBatch(source)
    assert(samePieces(pieces(source), pieces(batch)), 'All exact source pieces, including mirrored fallback and shadow variants')
    assert(batch.children.length === 3, 'Only compatible repeated meshes share a draw submission')
    let buffers = 0, geometryDisposals = 0, materialDisposals = 0
    batch.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) object.addEventListener('dispose', () => { buffers++ })
    })
    geometry.addEventListener('dispose', () => { geometryDisposals++ })
    material.addEventListener('dispose', () => { materialDisposals++ })
    const parent = new THREE.Group(); parent.add(batch)
    disposeStaticCryptBatch(batch)
    assert(buffers === 1 && Number(batch.children.length) === 0 && parent.children.length === 0, 'Owned instance buffers and graph are released')
    assert(geometryDisposals === 0 && materialDisposals === 0, 'Shared source resources remain alive')
    geometry.dispose(); material.dispose()
  } },
  { name: 'dos piezas con shear de jerarquía conservan meshes y transformación completa de normales', run: async () => {
    const source = new THREE.Group(), scaledParent = new THREE.Group()
    scaledParent.position.set(3, 0.5, -1)
    scaledParent.scale.set(1.7, 1.36, 1)
    scaledParent.rotation.y = 0.3
    source.add(scaledParent)
    const geometry = new THREE.IcosahedronGeometry(1, 0), material = new THREE.MeshStandardMaterial()
    const originals = [-1, 1].map((side) => {
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.x = side
      mesh.rotation.z = side * 0.52
      mesh.castShadow = true
      mesh.receiveShadow = true
      scaledParent.add(mesh)
      return mesh
    })
    const batch = buildStaticCryptBatch(source)
    batch.updateWorldMatrix(true, true)
    assert(batch.children.length === 2 && batch.children.every((object) => object instanceof THREE.Mesh
      && !(object instanceof THREE.InstancedMesh)), 'Two otherwise compatible sheared pieces must not be instanced together')
    assert(samePieces(pieces(source), pieces(batch)), 'Sheared geometry, material, shadow flags and transforms remain intact')
    const normals = geometry.getAttribute('normal')
    for (let i = 0; i < originals.length; i++) {
      const before = new THREE.Matrix3().getNormalMatrix(originals[i].matrixWorld)
      const after = new THREE.Matrix3().getNormalMatrix(batch.children[i].matrixWorld)
      for (let vertex = 0; vertex < normals.count; vertex++) {
        const normal = new THREE.Vector3().fromBufferAttribute(normals, vertex)
        assert(normal.clone().applyMatrix3(before).normalize().distanceTo(normal.clone().applyMatrix3(after).normalize()) < 0.0000000001,
          'The ordinary mesh keeps the original inverse-transpose normals, including shadow normal bias')
      }
    }
    disposeStaticCryptBatch(batch)
    geometry.dispose(); material.dispose()
  } },
  { name: 'siete salas reales conservan arte exacto y un solo batch tras retornos y desmontaje', run: async () => {
    await withRoot(async (root) => {
      let store!: ReturnType<typeof root.render>
      let previousBatch: THREE.Group | undefined
      let expectedDisposals = 0, disposals = 0
      const route = [...Object.values(ROOMS), ...Object.values(ROOMS).reverse(), ROOMS['sector-1'], ROOMS['rats-1'], ROOMS['sector-1']]
      for (const room of route) {
        await act(async () => { store = root.render(<StrictMode><CryptRoom room={room} /></StrictMode>) })
        const scene = store.getState().scene
        const source = scene.getObjectByName('crypt-static-source'), batch = scene.getObjectByName('crypt-static-batches')
        assert(source instanceof THREE.Group && !source.visible && batch instanceof THREE.Group, 'Exactly the compiled architecture is visible')
        if (previousBatch !== batch) assert(disposals === expectedDisposals, 'Every previous room released its instance buffers')
        assert(!previousBatch || previousBatch === batch || previousBatch.parent === null, 'Previous room leaves the graph')
        const names: string[] = []
        scene.traverse((object) => { if (object.name === 'crypt-static-batches') names.push(object.name) })
        assert(names.length === 1, 'Room transitions never accumulate rendered batches')
        assert(samePieces(pieces(source), pieces(batch)), `Unchanged matrices/materials/geometry/shadows in ${room.id}`)
        if (previousBatch !== batch) batch.traverse((object) => {
          if (object instanceof THREE.InstancedMesh) {
            expectedDisposals++
            object.addEventListener('dispose', () => { disposals++ })
          }
        })
        previousBatch = batch
      }
      await act(async () => { root.render(null) })
      assert(disposals === expectedDisposals, 'Final unmount also releases every owned instance buffer')
      assert(store.getState().scene.children.length === 0, 'Final room leaves no objects in the scene')
    })
  } },
]
