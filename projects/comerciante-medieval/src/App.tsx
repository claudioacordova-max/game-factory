import { useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { advancePlayerDay, buyFromBusiness, createInitialGameState, GOODS, GOODS_CATALOG, playerLoadHalfUnits, quoteBuyFromBusiness, saleOffersForFamily, sellToNeed, travelToVillage, type GameState, type Good, type PlayerSaleOffer, type VillageId } from './engine/index.js'
import VillageScene from './scene/VillageScene.js'
import { npcForId, VILLAGES } from './scene/world.js'
import type { ContextInteractionTarget } from './scene/contextInteraction.js'
import ExperimentPanel from './ui/ExperimentPanel.js'

type TradeMode = 'buy' | 'sell'
type BuyOffer = { key: string; good: Good; businessId: string; recipient: string; quote: ReturnType<typeof quoteBuyFromBusiness> }
type TradeOffer = BuyOffer | (PlayerSaleOffer & { key: string })

const money = (tenths: number) => `${(tenths / 10).toFixed(1).replace('.', ',')} monedas`
const load = (halfUnits: number) => `${(halfUnits / 2).toLocaleString('es-ES', { maximumFractionDigits: 1 })}`
const GOOD_ICONS: Record<Good, string> = {
  food: '🍎', firewood: '🪵', wood: '🪚', metal: '⛓️', cloth: '🧵', tool: '🔨', clothing: '🧥', furniture: '🪑', jewelry: '💎',
}
const PROFESSION_NAMES: Record<string, string> = {
  farmer: 'Agricultor', woodcutter: 'Leñador', blacksmith: 'Herrero', tailor: 'Sastre', miner: 'Minero', carpenter: 'Carpintero', jeweler: 'Joyero',
}

function isBuyOffer(offer: TradeOffer): offer is BuyOffer { return 'businessId' in offer }

function offerRecipient(offer: TradeOffer, state: GameState): string {
  if (isBuyOffer(offer)) return offer.recipient
  if (offer.target.type === 'household') return `Hogar de ${state.economy.families[offer.target.familyId].name}`
  const business = state.economy.businesses[offer.target.businessId]
  return `Negocio · ${PROFESSION_NAMES[business.profession] ?? business.profession}`
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState())
  const [nearby, setNearby] = useState<ContextInteractionTarget>()
  const [interaction, setInteraction] = useState<{ npcId: string }>()
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy')
  const [tradeMessage, setTradeMessage] = useState<{ text: string; success: boolean }>()
  const [showExperiments, setShowExperiments] = useState(false)
  const interactionPromptRef = useRef<HTMLDivElement>(null)
  const playerFacingRef = useRef(0)
  const village = VILLAGES.find(candidate => candidate.id === game.player.villageId)!
  const npc = interaction ? npcForId(interaction.npcId) : undefined
  const family = npc ? game.economy.families[npc.familyId] : undefined
  const business = npc ? game.economy.businesses[npc.businessId] : undefined
  const villageOptions = useMemo(() => VILLAGES.filter(candidate => candidate.id !== game.player.villageId), [game.player.villageId])
  const carriedWeight = playerLoadHalfUnits(game.player.inventory)
  const buyOffers: BuyOffer[] = business
    ? GOODS.filter(good => business.commercialInventory[good] > 0).map(good => ({
      key: `buy:${business.id}:${good}`,
      good,
      businessId: business.id,
      recipient: `Negocio · ${PROFESSION_NAMES[business.profession] ?? business.profession}`,
      quote: quoteBuyFromBusiness(game, business.id, good),
    }))
    : []
  const sellOffers: (PlayerSaleOffer & { key: string })[] = family
    ? saleOffersForFamily(game, family.id).map((offer, index) => ({ ...offer, key: `sell:${index}:${offer.good}` }))
    : []
  const offers: TradeOffer[] = tradeMode === 'buy' ? buyOffers : sellOffers

  const resetTrade = (mode: TradeMode) => {
    setTradeMode(mode)
    setTradeMessage(undefined)
  }
  const travel = (destination: VillageId) => {
    const result = travelToVillage(game, destination)
    if (result.ok) {
      setGame(result.state)
      setNearby(undefined)
      setInteraction(undefined)
      setTravelMenuOpen(false)
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
  const transact = (offer: TradeOffer) => {
    if (!npc) return
    const buying = isBuyOffer(offer)
    const result = buying
      ? buyFromBusiness(game, offer.businessId, offer.good, 1)
      : sellToNeed(game, offer.target, offer.good, 1, { requireFullAcceptance: true })
    if (!result.ok) {
      const reason = result.error.code === 'family-production-prohibited'
        ? 'Esta familia no compra esa mercancía.'
        : result.error.message
      setTradeMessage({ text: `No se pudo completar: ${reason}`, success: false })
      return
    }
    setGame(result.state)
    const recipient = buying ? '' : ` · ${offerRecipient(offer, result.state)}`
    setTradeMessage({ text: `${buying ? 'Compraste' : 'Vendiste'} ${GOODS_CATALOG[offer.good].name}${recipient}.`, success: true })
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
            <VillageScene key={game.player.villageId} villageId={game.player.villageId} day={game.economy.day} onNearbyChange={setNearby} interactionPromptRef={interactionPromptRef} playerFacingRef={playerFacingRef} interactionNpcId={interaction?.npcId} contextMenuOpen={travelMenuOpen || Boolean(interaction)} onOpenTravelMenu={() => setTravelMenuOpen(true)} onCloseContextMenu={() => { setTravelMenuOpen(false); setInteraction(undefined) }} onInteractionOutOfRange={() => setInteraction(undefined)} onInteract={target => { setTradeMessage(undefined); setInteraction({ npcId: target.id }); setTravelMenuOpen(false); setTradeMode('buy') }} />
          </Canvas>
          <div className="scene-caption">{village.name} · {village.theme === 'fields' ? 'campos y caminos de tierra' : 'canteras y casas de piedra'}</div>
          <div ref={interactionPromptRef} className="interaction-prompt" aria-live="polite" aria-hidden={!nearby || travelMenuOpen || Boolean(interaction)}>
            {nearby?.kind === 'npc'
              ? <span className="prompt-copy"><strong>{nearby.npc.name}</strong><small>{nearby.npc.role}</small></span>
              : nearby?.kind === 'exit' && <span className="prompt-copy"><strong>Salida del pueblo</strong><small>Viajar a otro pueblo</small></span>}
            <kbd>E</kbd><span>{nearby?.kind === 'exit' ? 'Viajar' : 'Hablar'}</span>
          </div>
          {travelMenuOpen && <section className="panel-card travel-overlay" aria-label="Destinos de viaje" role="dialog" aria-modal="false">
            <button className="close-button" aria-label="Cerrar destinos" onClick={() => setTravelMenuOpen(false)}>×</button>
            <p className="eyebrow">Salida del pueblo</p><h2>Elegir destino</h2><p>El viaje cambia de pueblo y avanza un día económico.</p>
            {villageOptions.map(destination => <button className="travel-button" key={destination.id} onClick={() => travel(destination.id)}>Viajar a {destination.name} · 1 día</button>)}
          </section>}
          {interaction && npc && family && business && <aside className="panel-card interaction-card interaction-overlay" aria-live="polite">
            <button className="close-button" aria-label="Cerrar comercio" onClick={() => setInteraction(undefined)}>×</button>
            <p className="eyebrow">{npc.role} · {village.name}</p><h2>{npc.name}</h2>
            <div className="trade-tabs" role="tablist" aria-label="Acciones comerciales">
              <button type="button" role="tab" aria-selected={tradeMode === 'buy'} className={tradeMode === 'buy' ? 'trade-tab selected' : 'trade-tab'} onClick={() => resetTrade('buy')}>🛒 Comprar</button>
              <button type="button" role="tab" aria-selected={tradeMode === 'sell'} className={tradeMode === 'sell' ? 'trade-tab selected' : 'trade-tab'} onClick={() => resetTrade('sell')}>📦 Vender</button>
            </div>
            <div className="trade-content">
              <div className="offer-grid" aria-label={tradeMode === 'buy' ? 'Mercancías disponibles para comprar' : 'Ofertas para tus mercancías'}>
                {offers.map(offer => {
                  const buying = isBuyOffer(offer)
                  const available = offer.quote.maxQuantity > 0
                  return <button type="button" key={offer.key} className={`good-card${available ? '' : ' unavailable'}`} aria-label={`${buying ? 'Comprar' : 'Vender'} ${GOODS_CATALOG[offer.good].name} ${buying ? 'al' : 'a'} ${offerRecipient(offer, game)} · ${available ? 'Disponible' : 'No disponible'}`} onClick={() => transact(offer)}>
                    <span className="good-icon" aria-hidden="true">{GOOD_ICONS[offer.good]}</span>
                    <span className="good-card-copy"><strong>{GOODS_CATALOG[offer.good].name}</strong>
                      {!buying && <small>{offerRecipient(offer, game)}</small>}
                      <small>{buying ? `Compra ${money(offer.quote.unitPriceTenths)}/u` : `Venta ${money(offer.quote.unitPriceTenths)}/u`}</small>
                      <small>{buying ? `Stock ${business.commercialInventory[offer.good]}` : `Máx. ${offer.quote.maxQuantity}`}</small>
                      <small>{available ? 'Disponible' : 'No disponible'}</small>
                    </span>
                  </button>
                })}
              </div>
              {offers.length === 0 && <p className="empty-trade">{tradeMode === 'buy' ? 'Este negocio no tiene mercancías disponibles ahora.' : 'No hay ofertas para las mercancías que llevas ahora.'}</p>}
              {tradeMessage && <p className={tradeMessage.success ? 'trade-message success' : 'trade-message error'} role="status">{tradeMessage.text}</p>}
            </div>
          </aside>}
        </div>
      </section>
      <section className="tools-toggle-area">
        <button className="option-button tools-toggle" aria-expanded={showExperiments} onClick={() => setShowExperiments(open => !open)}>{showExperiments ? 'Cerrar herramientas de prueba' : 'Abrir herramientas de inspección y prueba'}</button>
      </section>
      {showExperiments && <ExperimentPanel game={game} />}
      <footer className="footer-note">Comerciar no avanza el día. Viajar y avanzar procesan una vez la economía de ambos pueblos.</footer>
    </main>
  )
}
