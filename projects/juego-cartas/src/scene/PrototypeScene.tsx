import { Canvas } from '@react-three/fiber'

export type DungeonNodeStatus = 'available' | 'active' | 'completed' | 'locked'

export interface DungeonNodeView {
  id: string
  label: string
  enemyName: string
  status: DungeonNodeStatus
}

interface PrototypeSceneProps {
  nodes: DungeonNodeView[]
  onSelectEncounter: (encounterId: string) => void
  interactionDisabled?: boolean
}

const POSITIONS: [number, number, number][] = [
  [-2.25, 0.22, 0.55],
  [0, 0.22, -0.65],
  [2.25, 0.22, 0.55],
]

const NODE_COLORS: Record<DungeonNodeStatus, string> = {
  available: '#a9d970',
  active: '#f3c96c',
  completed: '#a5a789',
  locked: '#505b56',
}

function DungeonMap({ nodes, onSelectEncounter, interactionDisabled }: PrototypeSceneProps) {
  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 6, 4]} intensity={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[7.5, 4.5]} />
        <meshStandardMaterial color="#202b25" roughness={0.95} />
      </mesh>
      {POSITIONS.slice(0, nodes.length - 1).map((position, index) => {
        const next = POSITIONS[index + 1]
        const dx = next[0] - position[0]
        const dz = next[2] - position[2]
        const distance = Math.hypot(dx, dz)
        return (
          <mesh
            key={`path-${index}`}
            position={[(position[0] + next[0]) / 2, 0.015, (position[2] + next[2]) / 2]}
            rotation={[0, -Math.atan2(dz, dx), 0]}
          >
            <boxGeometry args={[distance, 0.07, 0.12]} />
            <meshStandardMaterial color="#58644f" roughness={0.85} />
          </mesh>
        )
      })}
      {nodes.map((node, index) => {
        const position = POSITIONS[index]
        const color = NODE_COLORS[node.status]
        const canSelect = node.status === 'available' && !interactionDisabled
        return (
          <group key={node.id} position={position}>
            <mesh position={[0, -0.07, 0]}>
              <cylinderGeometry args={[0.72, 0.82, 0.26, 8]} />
              <meshStandardMaterial color={node.status === 'completed' ? '#56614a' : '#37463a'} roughness={0.9} />
            </mesh>
            <mesh
              position={[0, 0.48, 0]}
              onClick={(event) => {
                event.stopPropagation()
                if (canSelect) onSelectEncounter(node.id)
              }}
              onPointerOver={(event) => {
                if (canSelect) event.stopPropagation()
              }}
            >
              <dodecahedronGeometry args={[0.42, 0]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={node.status === 'available' || node.status === 'active' ? 0.28 : 0.04}
                roughness={0.35}
                metalness={0.12}
              />
            </mesh>
            <mesh position={[0, 0.05, 0.48]}>
              <boxGeometry args={[1.15, 0.12, 0.12]} />
              <meshStandardMaterial color={node.status === 'locked' ? '#303a35' : '#66715c'} />
            </mesh>
          </group>
        )
      })}
    </>
  )
}

export default function PrototypeScene(props: PrototypeSceneProps) {
  return (
    <section className="dungeon-map" aria-label="Mapa 3D de la mazmorra">
      <Canvas camera={{ position: [0, 5.4, 7.5], fov: 42 }}>
        <DungeonMap {...props} />
      </Canvas>
      <div className="dungeon-node-list" aria-label="Encuentros de la mazmorra">
        {props.nodes.map((node) => {
          const available = node.status === 'available' && !props.interactionDisabled
          const statusLabel = node.status === 'completed' ? 'Completado'
            : node.status === 'active' ? 'En curso'
              : node.status === 'locked' ? 'Bloqueado' : 'Disponible'
          return (
            <button
              className={`dungeon-node dungeon-node-${node.status}`}
              key={node.id}
              type="button"
              disabled={!available}
              onClick={() => props.onSelectEncounter(node.id)}
            >
              <span>{node.label} · {statusLabel}</span>
              <strong>{node.enemyName}</strong>
              {available && <small>Entrar al encuentro</small>}
            </button>
          )
        })}
      </div>
    </section>
  )
}
