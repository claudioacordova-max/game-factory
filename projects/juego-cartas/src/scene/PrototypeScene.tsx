import { Canvas } from '@react-three/fiber'
import { Icon } from '../ui/GameIcons.js'

export type DungeonNodeStatus = 'available' | 'active' | 'completed' | 'locked'
export interface DungeonNodeView { id: string; label: string; enemyName: string; status: DungeonNodeStatus }
interface PrototypeSceneProps { nodes: DungeonNodeView[]; onSelectEncounter: (encounterId: string) => void; interactionDisabled?: boolean }

const POSITIONS: [number, number, number][] = [[-2.8, 0.2, 0.65], [0, 0.2, -0.75], [2.8, 0.2, 0.65]]
const COLORS: Record<DungeonNodeStatus, string> = { available: '#80d3c5', active: '#dbba78', completed: '#bc995b', locked: '#4a6068' }

function CryptGate({ node, position, onSelectEncounter, interactionDisabled }: { node: DungeonNodeView; position: [number, number, number] } & Pick<PrototypeSceneProps, 'onSelectEncounter' | 'interactionDisabled'>) {
  const color = COLORS[node.status]
  const selectable = node.status === 'available' && !interactionDisabled
  return <group position={position} onClick={(event) => { event.stopPropagation(); if (selectable) onSelectEncounter(node.id) }}>
    <mesh position={[0, -0.18, 0]} receiveShadow><cylinderGeometry args={[1.03, 1.12, 0.32, 8]} /><meshStandardMaterial color="#24353c" roughness={0.95} /></mesh>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.84, 0.025, 4, 32]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selectable ? 0.6 : 0.1} /></mesh>
    {[-0.62, 0.62].map((x) => <group key={x} position={[x, 0, -0.2]}>
      <mesh position={[0, 0.64, 0]} castShadow><boxGeometry args={[0.27, 1.3, 0.4]} /><meshStandardMaterial color="#3b4c52" roughness={0.9} /></mesh>
      {[0.18, 0.58, 0.98].map((y) => <mesh key={y} position={[0, y, 0.01]}><boxGeometry args={[0.32, 0.09, 0.44]} /><meshStandardMaterial color="#4c5b60" roughness={1} /></mesh>)}
      <mesh position={[0, 0.12, 0.07]}><boxGeometry args={[0.42, 0.24, 0.56]} /><meshStandardMaterial color="#536067" /></mesh>
    </group>)}
    <mesh position={[0, 1.25, -0.2]} castShadow><torusGeometry args={[0.62, 0.14, 5, 12, Math.PI]} /><meshStandardMaterial color="#58676b" roughness={0.9} /></mesh>
    <mesh position={[0, 0.6, -0.32]}><planeGeometry args={[0.92, 1.28]} /><meshStandardMaterial color={node.status === 'locked' ? '#101e25' : color} emissive={color} emissiveIntensity={selectable ? 0.75 : node.status === 'completed' ? 0.12 : 0.02} roughness={0.5} /></mesh>
    <mesh position={[0, 1.86, -0.2]}><octahedronGeometry args={[0.16]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selectable ? 0.8 : 0.03} metalness={0.5} roughness={0.4} /></mesh>
    {node.status === 'locked' && <group position={[0, 0.73, -0.04]}><mesh><boxGeometry args={[0.23, 0.25, 0.12]} /><meshStandardMaterial color="#8b8d78" /></mesh><mesh position={[0, 0.16, 0]}><torusGeometry args={[0.085, 0.025, 5, 12, Math.PI]} /><meshStandardMaterial color="#8b8d78" /></mesh></group>}
    {selectable && <pointLight position={[0, 0.9, 0.55]} color={color} intensity={3} distance={3} />}
    {[-0.8, 0.8].map((x) => <group position={[x, 0, 0.62]} key={x}><mesh position={[0, 0.23, 0]}><cylinderGeometry args={[0.06, 0.09, 0.5, 6]} /><meshStandardMaterial color="#8b7354" /></mesh><mesh position={[0, 0.53, 0]}><octahedronGeometry args={[0.08]} /><meshStandardMaterial color="#dfae62" emissive="#dfae62" emissiveIntensity={1.5} /></mesh></group>)}
  </group>
}
function DungeonMap(props: PrototypeSceneProps) {
  return <>
    <color attach="background" args={['#0c1b24']} /><fog attach="fog" args={['#0c1b24', 10, 21]} />
    <ambientLight intensity={1.35} color="#bacbd1" /><directionalLight position={[1, 7, 5]} intensity={2.2} color="#d9d1b7" castShadow shadow-mapSize={[1024, 1024]} />
    <pointLight position={[-4, 2, 2]} color="#61bcb4" intensity={5} distance={9} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.32, 0]} receiveShadow><planeGeometry args={[16, 10]} /><meshStandardMaterial color="#15252f" roughness={1} /></mesh>
    {POSITIONS.slice(0, props.nodes.length - 1).map((position, index) => {
      const next = POSITIONS[index + 1]
      const dx = next[0] - position[0], dz = next[2] - position[2], distance = Math.hypot(dx, dz)
      return <group key={index} position={[(position[0] + next[0]) / 2, 0.05, (position[2] + next[2]) / 2]} rotation={[0, -Math.atan2(dz, dx), 0]}>
        <mesh receiveShadow><boxGeometry args={[distance, 0.15, 0.55]} /><meshStandardMaterial color="#4a5355" roughness={1} /></mesh>
        {Array.from({ length: 7 }, (_, tile) => <mesh key={tile} position={[(tile - 3) * distance / 7, 0.09, 0]}><boxGeometry args={[0.02, 0.01, 0.55]} /><meshStandardMaterial color="#26333b" /></mesh>)}
        <mesh position={[0, 0.085, 0]}><boxGeometry args={[distance, 0.015, 0.035]} /><meshStandardMaterial color="#9e8b5e" emissive="#9e8b5e" emissiveIntensity={0.15} /></mesh>
      </group>
    })}
    {props.nodes.map((node, index) => <CryptGate key={node.id} node={node} position={POSITIONS[index]} onSelectEncounter={props.onSelectEncounter} interactionDisabled={props.interactionDisabled} />)}
    {[-5, -3.7, 0, 3.7, 5].map((x, index) => <group key={x} position={[x, 0, -2.2 - index % 2]}>
      <mesh position={[0, 0.4 + index % 2 * 0.18, 0]} castShadow><boxGeometry args={[0.45, 0.8 + index % 2 * 0.36, 0.45]} /><meshStandardMaterial color="#2a3d47" roughness={1} /></mesh>
      <mesh position={[0, 0.85 + index % 2 * 0.36, 0]}><boxGeometry args={[0.58, 0.12, 0.58]} /><meshStandardMaterial color="#3b4c53" /></mesh>
    </group>)}
  </>
}
export default function PrototypeScene(props: PrototypeSceneProps) {
  return <section className="dungeon-map" aria-label="Mapa 3D de la mazmorra">
    <div className="map-viewport"><span className="map-overline" aria-hidden="true">CRIPTA · TRES ENCUENTROS</span><Canvas shadows dpr={[1, 1.5]} camera={{ position: [1.3, 6, 9.8], fov: 46 }}><DungeonMap {...props} /></Canvas><span className="map-vignette" aria-hidden="true" /></div>
    <div className="dungeon-node-list" aria-label="Encuentros de la mazmorra">{props.nodes.map((node, index) => {
      const available = node.status === 'available' && !props.interactionDisabled
      const statusLabel = node.status === 'completed' ? 'Completado' : node.status === 'active' ? 'En curso' : node.status === 'locked' ? 'Bloqueado' : 'Disponible'
      return <button className={`dungeon-node dungeon-node-${node.status}`} key={node.id} type="button" disabled={!available} onClick={() => props.onSelectEncounter(node.id)}>
        <span className="node-step"><span>{String(index + 1).padStart(2, '0')}</span><Icon name={node.status === 'locked' ? 'lock' : node.status === 'completed' ? 'check' : 'gate'} /></span>
        <strong>{node.enemyName}</strong><span className="node-status">{statusLabel}{available && <Icon name="arrow" />}</span>
      </button>
    })}</div>
  </section>
}
