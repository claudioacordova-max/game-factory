import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { advancePlayerDay, buyFromBusiness, createInitialGameState, GOODS, GOODS_CATALOG, playerLoadHalfUnits, quoteBuyFromBusiness, quoteSellToNeed, saleGoodsForTarget, sellToNeed, tradeQuantityStatus, tradeTotalTenthsForQuantity, travelToVillage, type GameState, type Good, type PlayerSaleTarget, type VillageId } from './engine/index.js'
import VillageScene from './scene/VillageScene.js'
import { npcForId, VILLAGES, type VillageNpc } from './scene/world.js'
import ExperimentPanel from './ui/ExperimentPanel.js'

type InteractionOption = 'home' | 'business'
const money = (tenths: number) => `${(tenths / 10).toFixed(1).replace('.', ',')} monedas`
const load = (halfUnits: number) => `${(halfUnits / 2).toLocaleString('es-ES', { maximumFractionDigits: 1 })}`

export default function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState())
  const [nearby, setNearby] = useState<VillageNpc>()
  const [interaction, setInteraction] = useState<{ npcId: string; option?: InteractionOption }>()
  const [selectedGood, setSelectedGood] = useState<Good>()
  const [quantity, setQuantity] = useState(1)
  const [tradeMessage, setTradeMessage] = useState<{ text: string; success: boolean }>()
  const [showExperiments, setShowExperiments] = useState(false)
  const village = VILLAGES.find(candidate => candidate.id === game.player.villageId)!
  const npc = interaction ? npcForId(interaction.npcId) : undefined
  const family = npc ? game.economy.families[npc.familyId] : undefined
  const business = npc ? game.economy.businesses[npc.businessId] : undefined
  const villageOptions = useMemo(() => VILLAGES.filter(candidate => candidate.id !== game.player.villageId), [game.player.villageId])
  const carriedWeight = playerLoadHalfUnits(game.player.inventory)
  const saleTarget: PlayerSaleTarget | undefined = npc && interaction?.option === 'home'
    ? { type: 'household', familyId: npc.familyId }
    : npc && interaction?.option === 'business' ? { type: 'business', businessId: npc.businessId } : undefined
  const purchaseGoods = business ? GOODS.filter(good => business.commercialInventory[good] > 0) : []
  const sellGoods = saleTarget ? saleGoodsForTarget(game, saleTarget) : []
  const activeGoods = interaction?.option === 'business' ? [...new Set([...purchaseGoods, ...sellGoods])] : sellGoods
  const activeGood = selectedGood && activeGoods.includes(selectedGood) ? selectedGood : activeGoods[0]
  const isBuying = Boolean(activeGood && interaction?.option === 'business' && purchaseGoods.includes(activeGood))
  const quote = activeGood
    ? isBuying
      ? quoteBuyFromBusiness(game, npc!.businessId, activeGood)
      : saleTarget ? quoteSellToNeed(game, saleTarget, activeGood) : undefined
    : undefined
  const requestedTotal = quote ? tradeTotalTenthsForQuantity(quantity, quote.unitPriceTenths) : undefined
  const quantityStatus = quote ? tradeQuantityStatus(quantity, quote.maxQuantity) : 'invalid'

  const chooseInteraction = (option: InteractionOption) => {
    setSelectedGood(undefined)
    setQuantity(1)
    setTradeMessage(undefined)
    setInteraction(current => current ? { ...current, option } : current)
  }
  const travel = (destination: VillageId) => {
    const result = travelToVillage(game, destination)
    if (result.ok) {
      setGame(result.state)
      setNearby(undefined)
      setInteraction(undefined)
      setTradeMessage(undefined)
    }
  }
  const advanceDay = () => {
    const result = advancePlayerDay(game)
    if (result.ok) {
      setGame(result.state)
      setTradeMessage(undefined)
    }
  }
  const transact = () => {
    if (!npc || !activeGood || !saleTarget || !quote) return
    const amount = Number.isInteger(quantity) && quantity > 0 ? quantity : 0
    const buying = interaction?.option === 'business' && purchaseGoods.includes(activeGood)
    const result = buying
      ? buyFromBusiness(game, npc.businessId, activeGood, amount)
      : sellToNeed(game, saleTarget, activeGood, amount, { requireFullAcceptance: true })
    if (!result.ok) {
      setTradeMessage({ text: `Operación rechazada: ${result.error.message}`, success: false })
      return
    }
    setGame(result.state)
    setTradeMessage({ text: `Operación aceptada: ${result.quantity} × ${GOODS_CATALOG[activeGood].name}, ${money(result.moneyTenths)}. Dinero: ${money(result.state.player.moneyTenths)}; carga: ${load(playerLoadHalfUnits(result.state.player.inventory))}/${load(result.state.player.capacityHalfUnits)}.`, success: true })
    setQuantity(1)
  }

  return (
    <main className="game-shell">
      <header className="game-header">
        <div><p className="eyebrow">Comerciante Medieval · Demo 3D</p><h1>{village.name}</h1></div>
        <div className="day-chip">Día {game.economy.day}</div>
      </header>
      <section className="hud-grid" aria-label="Estado del comerciante">
        <div className="hud-card"><span>Dinero</span><strong>{money(game.player.moneyTenths)}</strong></div>
        <div className="hud-card"><span>Carga</span><strong>{load(carriedWeight)} / {load(game.player.capacityHalfUnits)}</strong></div>
        <div className="hud-card inventory-hud"><span>Inventario</span><strong>{GOODS.filter(good => game.player.inventory[good] > 0).map(good => `${GOODS_CATALOG[good].name} ${game.player.inventory[good]}`).join(' · ') || 'Vacío'}</strong></div>
        <button className="time-button" onClick={advanceDay}>Avanzar día</button>
      </section>
      <section className="game-layout" aria-label="Exploración del pueblo">
        <div className="scene-frame">
          <Canvas shadows camera={{ position: [0, 19, 22], fov: 43 }}>
            <color attach="background" args={[game.player.villageId === 'village-a' ? '#b9d2db' : '#b8c5cd']} />
            <ambientLight intensity={1.15} />
            <directionalLight position={[-6, 12, 6]} intensity={2.1} castShadow />
            <VillageScene key={game.player.villageId} villageId={game.player.villageId} onNearbyChange={setNearby} interactionNpcId={interaction?.npcId} onInteractionOutOfRange={() => setInteraction(undefined)} onInteract={target => { setTradeMessage(undefined); setInteraction({ npcId: target.id }); setSelectedGood(undefined); setQuantity(1) }} />
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
              {nearby ? <><strong>{nearby.name}</strong><span>{nearby.role} · pulsa E o el botón para interactuar</span><button className="primary-button" onClick={() => { setTradeMessage(undefined); setInteraction({ npcId: nearby.id }); setSelectedGood(undefined); setQuantity(1) }}>Interactuar</button></> : <span>Acércate a un habitante para interactuar.</span>}
            </div>
          </section>
          <section className="panel-card">
            <h2>Viajar</h2><p>El viaje cambia de pueblo y avanza un día económico.</p>
            {villageOptions.map(destination => <button className="travel-button" key={destination.id} onClick={() => travel(destination.id)}>Viajar a {destination.name} · 1 día</button>)}
          </section>
          {interaction && npc && family && business && <section className="panel-card interaction-card" aria-live="polite">
            <button className="close-button" aria-label="Cerrar interacción" onClick={() => setInteraction(undefined)}>×</button>
            <p className="eyebrow">Habitante · {npc.role}</p><h2>{npc.name}</h2>
            {!interaction.option ? <>
              <p>Familia: {family.name} · fondo compartido {money(family.moneyTenths)}.</p>
              <button className="option-button" onClick={() => chooseInteraction('home')}>Hogar</button>
              <button className="option-button" onClick={() => chooseInteraction('business')}>Negocio</button>
            </> : <>
              <h3>{interaction.option === 'home' ? 'Hogar' : 'Negocio'}</h3>
              <p>Fondo familiar compartido: {money(family.moneyTenths)}.</p>
              {activeGoods.length === 0 ? <p>{interaction.option === 'home' ? 'No hay necesidades domésticas disponibles para comerciar ahora.' : 'No hay existencias comerciales ni insumos pertinentes disponibles ahora.'}</p> : <>
                <label className="field-label" htmlFor="trade-good">Mercancía</label>
                <select id="trade-good" value={activeGood} onChange={event => { setSelectedGood(event.target.value as Good); setQuantity(1); setTradeMessage(undefined) }}>
                  {activeGoods.map(good => <option key={good} value={good}>{GOODS_CATALOG[good].name}{purchaseGoods.includes(good) ? ` · stock ${business.commercialInventory[good]}` : ''}</option>)}
                </select>
                {quote && <>
                  <div className="quote-box">
                    <span>{purchaseGoods.includes(activeGood!) ? 'El negocio vende' : 'El destinatario compra'} a precio fijo</span>
                    <strong>{money(quote.unitPriceTenths)} por unidad</strong>
                    <span>Máximo disponible/aceptado: {quote.maxQuantity}</span>
                    <span>Total al máximo: {money(quote.totalTenths)}</span>
                  </div>
                  <label className="field-label" htmlFor="trade-quantity">Cantidad</label>
                  <input id="trade-quantity" type="number" min="1" max={quote.maxQuantity} step="1" value={quantity} onChange={event => setQuantity(Number(event.target.value))} />
                  {requestedTotal === undefined || quantityStatus === 'invalid'
                    ? <p className="rejection-note" role="status">Indica una cantidad entera positiva para calcular el importe.</p>
                    : <>
                      <p className="trade-result">Total de esta cantidad: {money(requestedTotal)}</p>
                      {quantityStatus === 'exceeds-maximum'
                        ? <p className="rejection-note" role="status">La cantidad supera el máximo actual de {quote.maxQuantity}. Si intentas confirmarla, el motor la rechazará; dinero e inventario no cambiarán.</p>
                        : <p className="trade-result">Resultado previsto: dinero {money(game.player.moneyTenths + (isBuying ? -1 : 1) * requestedTotal)} · carga {load(carriedWeight + (isBuying ? 1 : -1) * quantity * GOODS_CATALOG[activeGood!].weightHalfUnits)}/{load(game.player.capacityHalfUnits)}</p>}
                    </>}
                  {quote.rejection && quote.maxQuantity === 0 && <p className="rejection-note">{quote.rejection}</p>}
                  <button className="primary-button trade-button" disabled={quote.maxQuantity === 0} onClick={transact}>{purchaseGoods.includes(activeGood!) ? 'Comprar' : 'Vender'}</button>
                </>}
              </>}
              {tradeMessage && <p className={tradeMessage.success ? 'trade-message success' : 'trade-message error'} role="status">{tradeMessage.text}</p>}
            </>}
          </section>}
        </aside>
      </section>
      <section className="tools-toggle-area">
        <button className="option-button tools-toggle" aria-expanded={showExperiments} onClick={() => setShowExperiments(open => !open)}>{showExperiments ? 'Cerrar herramientas de prueba' : 'Abrir herramientas de inspección y prueba'}</button>
      </section>
      {showExperiments && <ExperimentPanel game={game} />}
      <footer className="footer-note">Comerciar no avanza el día. Viajar y avanzar procesan una vez la economía de ambos pueblos.</footer>
    </main>
  )
}
