import { Group, InstancedMesh, Matrix4, Mesh } from 'three'
import type { BufferGeometry, Material, Object3D } from 'three'

interface Piece {
  geometry: BufferGeometry
  material: Material
  matrix: Matrix4
  castShadow: boolean
  receiveShadow: boolean
  frustumCulled: boolean
  renderOrder: number
  layers: number
}

function hasShear(matrix: Matrix4): boolean {
  const e = matrix.elements
  // A rotated child under a non-uniformly scaled parent can have non-orthogonal columns.
  // Three's instanced normal transform supports rotation/scale, but not this shear.
  for (const [a, b] of [[0, 4], [0, 8], [4, 8]]) {
    const dot = e[a] * e[b] + e[a + 1] * e[b + 1] + e[a + 2] * e[b + 2]
    const aLengthSq = e[a] ** 2 + e[a + 1] ** 2 + e[a + 2] ** 2
    const bLengthSq = e[b] ** 2 + e[b + 1] ** 2 + e[b + 2] ** 2
    if (Math.abs(dot) > 0.000001 * Math.sqrt(aLengthSq * bLengthSq)) return true
  }
  return false
}

/** Compile only the immutable room architecture. Shared assets remain owned by its source. */
export function buildStaticCryptBatch(source: Group): Group {
  source.updateWorldMatrix(true, true)
  const inverse = source.matrixWorld.clone().invert()
  const buckets = new Map<string, Piece[]>()
  const output = new Group()
  output.name = 'crypt-static-batches'
  const instance = new Matrix4()
  const add = (mesh: Mesh, matrix: Matrix4) => {
    if (Array.isArray(mesh.material)) throw new Error('Crypt static batches require a single material per mesh.')
    const piece: Piece = {
      geometry: mesh.geometry, material: mesh.material, matrix,
      castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow,
      frustumCulled: mesh.frustumCulled, renderOrder: mesh.renderOrder, layers: mesh.layers.mask,
    }
    // Mirrored/singular and sheared transforms retain an ordinary mesh's full normal matrix.
    const key = matrix.determinant() <= 0 || hasShear(matrix) ? `single:${buckets.size}` :
      `${mesh.geometry.uuid}:${mesh.material.uuid}:${mesh.castShadow}:${mesh.receiveShadow}:${mesh.frustumCulled}:${mesh.renderOrder}:${mesh.layers.mask}`
    const bucket = buckets.get(key)
    if (bucket) bucket.push(piece)
    else buckets.set(key, [piece])
  }
  const visit = (object: Object3D) => {
    if (!object.visible) return
    if (object instanceof Mesh) {
      const local = inverse.clone().multiply(object.matrixWorld)
      if (object instanceof InstancedMesh) {
        for (let index = 0; index < object.count; index++) {
          object.getMatrixAt(index, instance)
          add(object, local.clone().multiply(instance))
        }
      } else add(object, local)
    }
    object.children.forEach(visit)
  }
  // The source root is deliberately hidden; child visibility still retains its normal meaning.
  source.children.forEach(visit)
  for (const pieces of buckets.values()) {
    const first = pieces[0]
    const mesh = pieces.length === 1 ? new Mesh(first.geometry, first.material) :
      new InstancedMesh(first.geometry, first.material, pieces.length)
    mesh.castShadow = first.castShadow
    mesh.receiveShadow = first.receiveShadow
    mesh.frustumCulled = first.frustumCulled
    mesh.renderOrder = first.renderOrder
    mesh.layers.mask = first.layers
    mesh.matrixAutoUpdate = false
    if (mesh instanceof InstancedMesh) {
      pieces.forEach((piece, index) => mesh.setMatrixAt(index, piece.matrix))
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingBox()
      mesh.computeBoundingSphere()
    } else mesh.matrix.copy(first.matrix)
    output.add(mesh)
  }
  return output
}

/** Instance buffers belong to the batch; source geometries/materials must never be disposed here. */
export function disposeStaticCryptBatch(batch: Group): void {
  batch.removeFromParent()
  batch.traverse((object) => { if (object instanceof InstancedMesh) object.dispose() })
  batch.clear()
}
