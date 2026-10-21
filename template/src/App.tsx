import { Canvas } from '@react-three/fiber'
import PrototypeScene from './scene/PrototypeScene'

export default function App() {
  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">AI Game Factory</p>
        <h1>Plantilla de prototipo 3D</h1>
        <p>Escena mínima con Vite, React, TypeScript y React Three Fiber.</p>
      </header>

      <section className="scene-frame" aria-label="Escena 3D de prueba">
        <Canvas camera={{ position: [3.5, 2.8, 4.5], fov: 45 }}>
          <color attach="background" args={['#111827']} />
          <ambientLight intensity={0.8} />
          <directionalLight position={[4, 6, 3]} intensity={2} />
          <PrototypeScene />
        </Canvas>
      </section>

      <p className="page-note">Si ves el cubo y el plano, la escena 3D está funcionando.</p>
    </main>
  )
}
