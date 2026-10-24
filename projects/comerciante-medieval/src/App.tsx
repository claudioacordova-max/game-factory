import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  advancePlayerDay,
  buyFromBusiness,
  createInitialGameState,
  GOODS,
  playerLoadHalfUnits,
  quoteBuyFromBusiness,
  quoteSellToNeed,
  saleOffersForFamily,
  sellToNeed,
  travelToVillage,
  type GameState,
  type Good,
  type PlayerSaleOffer,
  type PlayerTradeQuote,
  type VillageId,
} from './engine/index.js'
import VillageScene from './scene/VillageScene.js'
import { npcForId, VILLAGES } from './scene/world.js'
import type { ContextInteractionTarget } from './scene/contextInteraction.js'
import ExperimentPanel from './ui/ExperimentPanel.js'

type TradeMode = 'buy' | 'sell'
type BuyOffer = { key: string; good: Good; businessId: string; recipient: string; quote: PlayerTradeQuote }
type SaleOffer = PlayerSaleOffer & { key: string }
type TradeOffer = BuyOffer | SaleOffer

const money = (tenths: number) => (tenths / 10).toFixed(1).replace('.', ',')
const load = (halfUnits: number) => halfUnits % 2 === 0
  ? String(halfUnits / 2)
  : (halfUnits / 2).toLocaleString('es-ES', { maximumFractionDigits: 1 })

const GOOD_SHORT: Record<Good, string> = {
  food: 'Comida', firewood: 'Leña', wood: 'Madera', metal: 'Metal', cloth: 'Tela',
  tool: 'Herramienta', clothing: 'Ropa', furniture: 'Mueble', jewelry: 'Joya',
}

const PROFESSION_NAMES: Record<string, string> = {
  farmer: 'Agricultor', woodcutter: 'Leñador', blacksmith: 'Herrero', tailor: 'Sastre',
  miner: 'Minero', carpenter: 'Carpintero', jeweler: 'Joyero',
}

function GoodIcon({ good }: { good: Good }) {
  const common = { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' as const }
  return <svg className={`good-icon-illustration icon-${good}`} viewBox="0 0 40 40" aria-hidden="true">
    {good === 'food' && <g {...common}><path d="M20 12c-1-3 0-5 3-7M21 10c4-4 8-2 8-2s-1 5-7 6"/><path d="M20 13c-7-5-14 0-13 9 1 9 7 13 13 11 6 2 12-2 13-11 1-9-6-14-13-9Z"/></g>}
    {good === 'firewood' && <g {...common}><path d="m6 27 22-13 6 5L12 32zM6 18l9-5 5 4-9 6z"/><path d="m11 29 22-13M10 19l5-3"/></g>}
    {good === 'wood' && <g {...common}><path d="M7 13h22l4 4-4 4H7zM7 23h20l4 4-4 4H7z"/><path d="M12 13v8M25 23v8"/></g>}
    {good === 'metal' && <g {...common}><path d="m20 5 12 8-4 18H12L8 13zM8 13h24M12 31l8-18 8 18M20 5v8"/></g>}
    {good === 'cloth' && <g {...common}><path d="M10 9h20v8H10zM7 18h26v6H7zM10 25h20v7H10z"/><path d="M15 9v8M26 18v6M15 25v7"/></g>}
    {good === 'tool' && <g {...common}><path d="m12 31 15-15M22 9l3-3 9 9-3 3zM8 7l8 2 2 8-4 4-8-8z"/><path d="m8 7 8 8"/></g>}
    {good === 'clothing' && <g {...common}><path d="m14 8 6 4 6-4 8 6-5 7-4-3v15H15V18l-4 3-5-7zM16 8c0 5 8 5 8 0"/></g>}
    {good === 'furniture' && <g {...common}><path d="M9 7h22v25H9zM13 12h14v6H13zM13 22h14M13 18v14M27 18v14"/></g>}
    {good === 'jewelry' && <g {...common}><path d="M9 13h22l-2 17H11zM9 13l5-7h12l5 7M14 6l6 7 6-7M9 13h22"/><path d="m20 13 4 5-4 4-4-4z"/></g>}
  </svg>
}

function CoinIcon() {
  return <svg className="coin-icon" viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="8.5" fill="currentColor" />
    <circle cx="10" cy="10" r="6.6" fill="none" stroke="#744f21" strokeWidth="1" />
    <path d="M7.5 7.4c.5-.7 1.2-1 2.4-1 1.7 0 2.6.8 2.6 1.8 0 2.6-5.1 1.2-5.1 3.9 0 1 .9 1.8 2.6 1.8 1.1 0 2-.4 2.6-1.2M10 5.4v9.2" fill="none" stroke="#744f21" strokeLinecap="round" strokeWidth="1.15" />
  </svg>
}

function BagIcon() {
  return <svg className="bag-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8.3 5.2c.4-2 1.7-3.2 3.7-3.2s3.3 1.2 3.7 3.2l2.2 1.3 2 13.1c.2 1.4-.8 2.4-2.2 2.4H6.3c-1.4 0-2.4-1-2.2-2.4l2-13.1 2.2-1.3Z" fill="currentColor" />
    <path d="M8.3 5.2h7.4M9.4 12.2c1.1-1.1 4.1-1.1 5.2 0 .9.9.2 1.9-2.6 2.7-2.8.8-3.5 1.8-2.6 2.7 1.1 1.1 4.1 1.1 5.2 0m-2.6-7v8" fill="none" stroke="#f7edd8" strokeLinecap="round" strokeWidth="1.5" />
  </svg>
}

function LoadIcon() {
  return <svg className="load-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m3 7 9-4 9 4-9 4-9-4Zm0 2 8 3.6v9L3 18V9Zm18 0-8 3.6v9l8-3.6V9Z" fill="currentColor" />
    <path d="m7.5 5 9 4m-8.4 6.2v3.1" fill="none" stroke="#f7edd8" strokeLinecap="round" strokeWidth="1.1" />
  </svg>
}

function CoinAmount({ tenths, className = '' }: { tenths: number; className?: string }) {
  const value = money(tenths)
  return <span className={`coin-amount ${className}`.trim()} aria-label={`${value} monedas`}>
    <CoinIcon /><span aria-hidden="true">{value}</span>
  </span>
}

function isBuyOffer(offer: TradeOffer): offer is BuyOffer { return 'businessId' in offer }

function offerRecipient(offer: TradeOffer, state: GameState): string {
  if (isBuyOffer(offer)) return offer.recipient
  if (offer.target.type === 'household') return `Hogar de ${state.economy.families[offer.target.familyId].name}`
  const business = state.economy.businesses[offer.target.businessId]
  return `Negocio · ${PROFESSION_NAMES[business.profession] ?? business.profession}`
}

function quoteForCurrent(offer: TradeOffer, state: GameState): PlayerTradeQuote {
  return isBuyOffer(offer)
    ? quoteBuyFromBusiness(state, offer.businessId, offer.good)
    : quoteSellToNeed(state, offer.target, offer.good)
}

function availableCount(offer: TradeOffer, state: GameState): string {
  if (isBuyOffer(offer)) return `Stock ${state.economy.businesses[offer.businessId].commercialInventory[offer.good]}`
  return `Acepta hasta ${offer.quote.maxQuantity}`
}

function tradeReason(quote: PlayerTradeQuote): string | undefined {
  if (quote.maxQuantity > 0) return undefined
  const reason = quote.rejection?.toLocaleLowerCase('es') ?? ''
  if (reason.includes('dinero') || reason.includes('fondos')) return 'Falta dinero'
  if (reason.includes('capacidad') || reason.includes('carga')) return 'Sin espacio'
  if (reason.includes('existencias')) return 'Sin stock'
  if (reason.includes('no llevas')) return 'No llevas este bien'
  if (reason.includes('cubierta')) return 'Necesidad cubierta'
  if (reason.includes('progreso de hoy')) return 'Tope diario alcanzado'
  if (reason.includes('no compra')) return 'No lo necesita'
  return quote.rejection ?? 'No disponible'
}

function tradeOfferLabel(action: 'Comprar' | 'Vender', goodName: string, recipient: string, quote: PlayerTradeQuote, amount: string): string {
  const preposition = action === 'Comprar' ? 'al' : 'a'
  const reason = tradeReason(quote)
  return `${action} ${goodName} ${preposition} ${recipient}. Precio ${money(quote.unitPriceTenths)} monedas. ${amount}${reason ? ` · ${reason}` : ''}`
}

export default function App() {
  const [game, setGame] = useState<GameState>(() => createInitialGameState())
  const [nearby, setNearby] = useState<ContextInteractionTarget>()
  const [interaction, setInteraction] = useState<{ npcId: string }>()
  const [travelMenuOpen, setTravelMenuOpen] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const [tradeMode, setTradeMode] = useState<TradeMode>('buy')
  const [tradeMessage, setTradeMessage] = useState<{ text: string; success: boolean }>()
  const [showExperiments, setShowExperiments] = useState(false)
  const interactionPromptRef = useRef<HTMLDivElement>(null)
  const playerFacingRef = useRef(0)
  const buyTabRef = useRef<HTMLButtonElement>(null)
  const sellTabRef = useRef<HTMLButtonElement>(null)
  const activeDialogRef = useRef<HTMLElement>(null)
  const dialogOpenerRef = useRef<HTMLElement | null>(null)
  const previousDialogRef = useRef<'inventory' | 'travel' | 'trade' | undefined>(undefined)

  const village = VILLAGES.find(candidate => candidate.id === game.player.villageId)!
  const npc = interaction ? npcForId(interaction.npcId) : undefined
  const family = npc ? game.economy.families[npc.familyId] : undefined
  const business = npc ? game.economy.businesses[npc.businessId] : undefined
  const activeDialog = inventoryOpen ? 'inventory' : travelMenuOpen ? 'travel' : interaction ? 'trade' : undefined
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
  const sellOffers: SaleOffer[] = family
    ? saleOffersForFamily(game, family.id).map((offer, index) => ({ ...offer, key: `sell:${index}:${offer.good}:${offer.target.type === 'household' ? offer.target.familyId : offer.target.businessId}` }))
    : []
  const offers: TradeOffer[] = tradeMode === 'buy' ? buyOffers : sellOffers
  const carriedGoods = GOODS.filter(good => game.player.inventory[good] > 0)

  useEffect(() => {
    const previousDialog = previousDialogRef.current
    if (activeDialog && activeDialog !== previousDialog) {
      if (!previousDialog) {
        const focusedElement = document.activeElement
        dialogOpenerRef.current = focusedElement instanceof HTMLElement && focusedElement !== document.body
          ? focusedElement
          : interactionPromptRef.current && nearby ? interactionPromptRef.current : null
      }
      previousDialogRef.current = activeDialog
      window.requestAnimationFrame(() => activeDialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus())
    } else if (!activeDialog && previousDialog) {
      previousDialogRef.current = undefined
      const opener = dialogOpenerRef.current
      dialogOpenerRef.current = null
      window.requestAnimationFrame(() => {
        if (opener?.isConnected && opener.getAttribute('aria-hidden') !== 'true') opener.focus()
      })
    }
  }, [activeDialog, nearby])

  useEffect(() => {
    const openInventoryShortcut = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'i' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, button, a, [role="button"], [role="tab"], [role="slider"], [role="combobox"]'))) return
      if (travelMenuOpen || interaction || showExperiments) return
      event.preventDefault()
      setInventoryOpen(open => !open)
    }
    window.addEventListener('keydown', openInventoryShortcut)
    return () => window.removeEventListener('keydown', openInventoryShortcut)
  }, [travelMenuOpen, interaction, showExperiments])

  useEffect(() => {
    if (!activeDialog) return
    const containTabFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const dialog = activeDialogRef.current
      if (!dialog) return
      const focusable = [...dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter(element => element.getAttribute('aria-hidden') !== 'true' && !element.closest('[aria-hidden="true"]') && element.getClientRects().length > 0)
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus()
        return
      }
      const activeIndex = focusable.indexOf(document.activeElement as HTMLElement)
      const shouldWrapBackward = event.shiftKey && activeIndex <= 0
      const shouldWrapForward = !event.shiftKey && (activeIndex === -1 || activeIndex === focusable.length - 1)
      if (shouldWrapBackward || shouldWrapForward) {
        event.preventDefault()
        focusable[shouldWrapBackward ? focusable.length - 1 : 0].focus()
      }
    }
    document.addEventListener('keydown', containTabFocus)
    return () => document.removeEventListener('keydown', containTabFocus)
  }, [activeDialog])

  const closeTrade = () => {
    setInteraction(undefined)
    setTradeMessage(undefined)
  }

  const resetTrade = (mode: TradeMode) => {
    setTradeMode(mode)
    setTradeMessage(undefined)
  }

  const selectOffer = (offer: TradeOffer) => transact(offer)

  const travel = (destination: VillageId) => {
    const result = travelToVillage(game, destination)
    if (result.ok) {
      setGame(result.state)
      setNearby(undefined)
      setInteraction(undefined)
      setTravelMenuOpen(false)
      setInventoryOpen(false)
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
    setTradeMessage({ text: `${buying ? 'Compraste' : 'Vendiste'} ${GOOD_SHORT[offer.good].toLocaleLowerCase('es')}${recipient}.`, success: true })
  }

  const closeOverlays = () => {
    setInventoryOpen(false)
    setTravelMenuOpen(false)
    closeTrade()
  }

  return (
    <main className="game-shell atlas-shell">
      <header className="atlas-header">
        <div className="brand-block">
          <p className="eyebrow">Comerciante Medieval <span>·</span> Cuaderno de viaje</p>
          <h1>{village.name}</h1>
        </div>
        <div className="day-chip atlas-day"><span className="day-mark" aria-hidden="true">☼</span><span>Día <strong>{game.economy.day}</strong></span></div>
      </header>

      <section className="atlas-hud" aria-label="Estado del comerciante">
        <div className="atlas-stat purse-stat"><span className="atlas-icon" aria-hidden="true"><CoinIcon /></span><span className="atlas-label">Bolsa</span><strong><CoinAmount tenths={game.player.moneyTenths} /></strong></div>
        <div className="atlas-stat load-stat"><span className="atlas-icon" aria-hidden="true"><LoadIcon /></span><span className="atlas-label">Carga</span><strong>{load(carriedWeight)} <span>/ {load(game.player.capacityHalfUnits)}</span></strong><div className="load-meter" role="img" aria-label={`Carga ${load(carriedWeight)} de ${load(game.player.capacityHalfUnits)}`}><span style={{ width: `${Math.min(100, carriedWeight / game.player.capacityHalfUnits * 100)}%` }} /></div></div>
        <div className={`carried-goods${carriedGoods.length ? '' : ' carried-goods-empty'}`} aria-label={carriedGoods.length ? 'Mercancías transportadas' : 'Sin mercancías'}>
          {carriedGoods.map(good => <span className="carried-good-icon" key={good} title={GOOD_SHORT[good]} aria-label={GOOD_SHORT[good]}><GoodIcon good={good} /></span>)}
        </div>
        <button className="atlas-button bag-button" type="button" aria-label="Abrir inventario" title="Inventario (I)" onClick={() => setInventoryOpen(true)}><BagIcon /></button>
        <button className="atlas-button day-button" type="button" onClick={advanceDay}><span aria-hidden="true">↻</span> Avanzar día</button>
      </section>

      <section className="game-layout" aria-label="Exploración del pueblo">
        <div className="scene-frame atlas-scene-frame">
          <Canvas shadows camera={{ position: [0, 19, 22], fov: 43 }}>
            <color attach="background" args={[game.player.villageId === 'village-a' ? '#b9d2db' : '#b8c5cd']} />
            <ambientLight intensity={1.15} />
            <directionalLight position={[-6, 12, 6]} intensity={2.1} castShadow />
            <VillageScene key={game.player.villageId} villageId={game.player.villageId} day={game.economy.day} onNearbyChange={setNearby} interactionPromptRef={interactionPromptRef} playerFacingRef={playerFacingRef} interactionNpcId={interaction?.npcId} contextMenuOpen={travelMenuOpen || Boolean(interaction) || inventoryOpen} onOpenTravelMenu={() => { setTravelMenuOpen(true); setInventoryOpen(false) }} onCloseContextMenu={closeOverlays} onInteractionOutOfRange={closeTrade} onInteract={target => { setTradeMessage(undefined); setInteraction({ npcId: target.id }); setTravelMenuOpen(false); setInventoryOpen(false); setTradeMode('buy') }} />
          </Canvas>
          <div className="scene-caption atlas-scene-caption">{village.theme === 'fields' ? 'Campos y caminos de tierra' : 'Canteras y casas de piedra'}</div>
          <div ref={interactionPromptRef} tabIndex={-1} className="interaction-prompt atlas-interaction-prompt" aria-live="polite" aria-hidden={!nearby || travelMenuOpen || Boolean(interaction) || inventoryOpen}>
            {nearby?.kind === 'npc'
              ? <span className="prompt-copy"><strong>{nearby.npc.name}</strong><small>{nearby.npc.role}</small></span>
              : nearby?.kind === 'exit' && <span className="prompt-copy"><strong>Salida del pueblo</strong><small>Viajar a otro pueblo</small></span>}
            <kbd>E</kbd><span>{nearby?.kind === 'exit' ? 'Viajar' : 'Hablar'}</span>
          </div>

          {inventoryOpen && <>
            <button type="button" aria-label="Cerrar inventario" className="atlas-backdrop" onClick={() => setInventoryOpen(false)} />
            <section ref={activeDialogRef} className="atlas-window inventory-window" data-items={Math.min(carriedGoods.length, 3)} role="dialog" aria-modal="true" aria-labelledby="inventory-title">
              <div className="window-heading">
                <div><p className="eyebrow">Bolsa</p><h2 id="inventory-title" tabIndex={-1} data-dialog-initial-focus>Mercancías</h2></div>
                <button type="button" className="atlas-close" aria-label="Cerrar inventario" onClick={() => setInventoryOpen(false)}>×</button>
              </div>
              {carriedGoods.length > 0 ? <div className="inventory-grid">
                {carriedGoods.map(good => <div className="inventory-good" key={good}>
                  <span className="inventory-good-icon"><GoodIcon good={good} /></span>
                  <span className="inventory-good-name">{GOOD_SHORT[good]}</span>
                  <strong>{game.player.inventory[good]}</strong>
                </div>)}
              </div> : <p className="inventory-empty">Bolsa vacía</p>}
            </section>
          </>}

          {travelMenuOpen && <>
            <button type="button" aria-label="Cerrar destinos" className="atlas-backdrop" onClick={() => setTravelMenuOpen(false)} />
            <section ref={activeDialogRef} className="atlas-window travel-window" aria-label="Destino de viaje" role="dialog" aria-modal="true">
              <div className="travel-window-heading">
                <div className="travel-origin"><span aria-hidden="true">⌖</span><strong tabIndex={-1} data-dialog-initial-focus>{village.name}</strong><small>Aquí</small></div>
                <button className="atlas-close" aria-label="Cerrar destinos" onClick={() => setTravelMenuOpen(false)}>×</button>
              </div>
              <p className="travel-day-note">1 día de viaje</p>
              {villageOptions.map(destination => <button className="travel-destination" key={destination.id} onClick={() => travel(destination.id)}>
                <span><strong>{destination.name}</strong></span><span className="travel-arrow" aria-hidden="true">→</span>
              </button>)}
            </section>
          </>}

          {interaction && npc && family && business && <>
            <button type="button" aria-label="Cerrar comercio" className="atlas-backdrop" onClick={closeTrade} />
            <section ref={activeDialogRef} className="atlas-window trade-window" aria-live="polite" role="dialog" aria-modal="true" aria-labelledby="trade-title">
              <div className="trade-heading">
                <div><p className="eyebrow">{npc.role}</p><h2 id="trade-title" tabIndex={-1} data-dialog-initial-focus>{npc.name}</h2></div>
                <button className="atlas-close" aria-label="Cerrar comercio" onClick={closeTrade}>×</button>
              </div>
              <div className="trade-tabs" role="tablist" aria-label="Acciones comerciales">
                <button
                  ref={buyTabRef}
                  id="trade-buy-tab"
                  type="button"
                  role="tab"
                  aria-selected={tradeMode === 'buy'}
                  aria-controls="trade-mode-panel"
                  tabIndex={tradeMode === 'buy' ? 0 : -1}
                  className={tradeMode === 'buy' ? 'trade-tab selected' : 'trade-tab'}
                  onClick={() => resetTrade('buy')}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
                    event.preventDefault()
                    const nextMode: TradeMode = event.key === 'Home' ? 'buy' : event.key === 'End' ? 'sell' : event.key === 'ArrowRight' ? 'sell' : 'buy'
                    resetTrade(nextMode)
                    window.requestAnimationFrame(() => (nextMode === 'buy' ? buyTabRef.current : sellTabRef.current)?.focus())
                  }}
                >Comprar</button>
                <button
                  ref={sellTabRef}
                  id="trade-sell-tab"
                  type="button"
                  role="tab"
                  aria-selected={tradeMode === 'sell'}
                  aria-controls="trade-mode-panel"
                  tabIndex={tradeMode === 'sell' ? 0 : -1}
                  className={tradeMode === 'sell' ? 'trade-tab selected' : 'trade-tab'}
                  onClick={() => resetTrade('sell')}
                  onKeyDown={event => {
                    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft' && event.key !== 'Home' && event.key !== 'End') return
                    event.preventDefault()
                    const nextMode: TradeMode = event.key === 'Home' ? 'buy' : event.key === 'End' ? 'sell' : event.key === 'ArrowRight' ? 'buy' : 'sell'
                    resetTrade(nextMode)
                    window.requestAnimationFrame(() => (nextMode === 'buy' ? buyTabRef.current : sellTabRef.current)?.focus())
                  }}
                >Vender</button>
              </div>
              <div id="trade-mode-panel" role="tabpanel" aria-labelledby={tradeMode === 'buy' ? 'trade-buy-tab' : 'trade-sell-tab'} tabIndex={0}>
              <div className="trade-offer-list" aria-label={tradeMode === 'buy' ? 'Mercancías que ofrece el negocio' : 'Necesidades que puedes atender'}>
                {offers.map(offer => {
                  const quote = quoteForCurrent(offer, game)
                  const available = quote.maxQuantity > 0
                  const reason = tradeReason(quote)
                  return <button type="button" key={offer.key} className={`trade-offer${available ? '' : ' trade-offer-unavailable'}`} aria-label={tradeOfferLabel(tradeMode === 'buy' ? 'Comprar' : 'Vender', GOOD_SHORT[offer.good], offerRecipient(offer, game), quote, availableCount(offer, game))} onClick={() => selectOffer(offer)} disabled={!available}>
                    <span className="trade-offer-icon"><GoodIcon good={offer.good} /></span>
                    <span className="trade-offer-name"><strong>{GOOD_SHORT[offer.good]}</strong>{tradeMode === 'sell' && <small>{offerRecipient(offer, game)}</small>}</span>
                    <span className="trade-offer-price"><small>Precio</small><CoinAmount tenths={quote.unitPriceTenths} /></span>
                    <span className="trade-offer-availability"><strong>{availableCount(offer, game)}</strong>{reason && <small>{reason}</small>}</span>
                  </button>
                })}
                {offers.length === 0 && <p className="empty-trade">{tradeMode === 'buy' ? 'Este puesto no tiene mercancías disponibles ahora.' : 'No hay mercancías que este hogar o negocio necesite ahora.'}</p>}
              </div>
              {tradeMessage && <p className={`trade-message ${tradeMessage.success ? 'success' : 'error'}`} role="status">{tradeMessage.text}</p>}
              </div>
            </section>
          </>}
        </div>
      </section>

      <section className="tools-toggle-area atlas-tools-toggle-area">
        <button className="option-button tools-toggle" aria-label={showExperiments ? 'Cerrar herramientas de prueba' : 'Abrir herramientas de inspección y prueba'} title={showExperiments ? 'Cerrar herramientas de prueba' : 'Herramientas de inspección y prueba'} aria-expanded={showExperiments} onClick={() => setShowExperiments(open => !open)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8.2 2 3.6 0 .4 2a6.3 6.3 0 0 1 1.3.8l1.9-.7 1.8 3.1-1.5 1.4a6.4 6.4 0 0 1 0 1.6l1.5 1.4-1.8 3.1-1.9-.7a6.3 6.3 0 0 1-1.3.8l-.4 2H8.2l-.4-2a6.3 6.3 0 0 1-1.3-.8l-1.9.7-1.8-3.1 1.5-1.4a6.4 6.4 0 0 1 0-1.6L2.8 7.2l1.8-3.1 1.9.7a6.3 6.3 0 0 1 1.3-.8z" fill="currentColor"/><circle cx="10" cy="9.5" r="2.2" fill="#edf1e9"/></svg>
        </button>
      </section>
      {showExperiments && <ExperimentPanel game={game} />}
    </main>
  )
}
