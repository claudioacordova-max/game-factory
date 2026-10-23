import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { createInitialGameState, travelToVillage, type GameState, type VillageId } from './engine/index.js'
import VillageScene from './scene/VillageScene.js'
import { npcForId, VILLAGES, type VillageNpc } from './scene/world.js'

type InteractionOption = 'home' | 'business'

export default function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState())
  const [nearby, setNearby] = useState<VillageNpc>()
  const [interaction, setInteraction] = useState<{ npcId: string; option?: InteractionOption }>()
  const village = VILLAGES.find(candidate => candidate.id === game.player.villageId)!
  const npc = interaction ? npcForId(interaction.npcId) : undefined
  const family = npc ? game.economy.families[npc.familyId] : undefined
  const business = npc ? game.economy.businesses[npc.businessId] : undefined
  const villageOptions = useMemo(() => VILLAGES.filter(candidate => candidate.id !== game.player.villageId), [game.player.villageId])

  const travel = (destination: VillageId) => {
    const result = travelToVillage(game, destination)
    if (result.ok) {
      setGame(result.state)
      setNearby(undefined)
      setInteraction(undefined)
    }
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div><p className="eyebrow">Comerciante Medieval · Demo 3D</p><h1>{village.name}</h1></div>
        <div className="day-chip">Día {game.economy.day}</div>
      </header>
      <section className="game-layout" aria-label="Exploración del pueblo">
        <div className="scene-frame">
          <Canvas shadows camera={{ position: [0, 19, 22], fov: 43 }}>
            <color attach="background" args={[game.player.villageId === 'village-a' ? '#b9d2db' : '#b8c5cd']} />
            <ambientLight intensity={1.15} />
            <directionalLight position={[-6, 12, 6]} intensity={2.1} castShadow />
            <VillageScene key={game.player.villageId} villageId={game.player.villageId} onNearbyChange={setNearby} onInteract={target => setInteraction({ npcId: target.id })} />
          </Canvas>
          <div className="scene-caption">{village.name} · {village.theme === 'fields' ? 'campos y caminos de tierra' : 'canteras y casas de piedra'}</div>
        </div>
        <aside className="play-panel">
          <section className="panel-card">
            <h2>Explorar</h2>
            <p>Camina por el pueblo y acércate a sus habitantes.</p>
            <div className="key-guide"><kbd>W A S D</kbd><span>o flechas para caminar</span></div>
            <div className="key-guide"><kbd>E</kbd><span>hablar al estar cerca</span></div>
            <div className="nearby-card" aria-live="polite">
              {nearby ? <><strong>{nearby.name}</strong><span>{nearby.role} · pulsa E o el botón para interactuar</span><button className="primary-button" onClick={() => setInteraction({ npcId: nearby.id })}>Interactuar</button></> : <span>Acércate a un habitante para interactuar.</span>}
            </div>
          </section>
          <section className="panel-card">
            <h2>Viajar</h2>
            <p>El viaje cambia de pueblo y avanza un día económico.</p>
            {villageOptions.map(destination => <button className="travel-button" key={destination.id} onClick={() => travel(destination.id)}>Viajar a {destination.name} · 1 día</button>)}
          </section>
          {interaction && npc && family && business && <section className="panel-card interaction-card" aria-live="polite">
            <button className="close-button" aria-label="Cerrar interacción" onClick={() => setInteraction(undefined)}>×</button>
            <p className="eyebrow">Habitante</p><h2>{npc.name}</h2>
            {!interaction.option ? <>
              <p>Elige qué quieres consultar.</p>
              <button className="option-button" onClick={() => setInteraction({ ...interaction, option: 'home' })}>Hogar</button>
              <button className="option-button" onClick={() => setInteraction({ ...interaction, option: 'business' })}>Negocio</button>
            </> : interaction.option === 'home' ? <>
              <h3>Hogar</h3><p>Familia: {family.name}</p><p>La consulta y el intercambio estarán disponibles en el siguiente hito.</p>
            </> : <>
              <h3>Negocio</h3><p>Negocio de {npc.role}.</p><p>La consulta de existencias y el intercambio estarán disponibles en el siguiente hito.</p>
            </>}
          </section>}
        </aside>
      </section>
      <footer className="footer-note">Prototipo de exploración exterior · Hogares y negocios son accesibles desde la calle.</footer>
    </main>
  )
}
