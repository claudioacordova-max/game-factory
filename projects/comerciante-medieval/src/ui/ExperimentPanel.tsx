import { useState } from 'react'
import {
  DEFAULT_EXPERIMENT_PARAMETERS,
  EXPERIMENT_SCENARIOS,
  caravanCircuitDay,
  caravanLocation,
  runExperimentScenario,
  type ExperimentParameterOverrides,
  type ExperimentRunReport,
  type ExperimentScenarioId,
} from '../engine/index.js'
import { GOODS, GOODS_CATALOG, type GameState } from '../engine/model.js'

const money = (tenths: number) => `${(tenths / 10).toFixed(1).replace('.', ',')} monedas`
const goodsText = (inventory: Record<string, number>) => GOODS.map(good => `${GOODS_CATALOG[good].name}: ${inventory[good] ?? 0}`).join(' · ')
const json = (value: unknown) => JSON.stringify(value, null, 2)

interface ExperimentPanelProps { game: GameState }

export default function ExperimentPanel({ game }: ExperimentPanelProps) {
  const [scenario, setScenario] = useState<ExperimentScenarioId>('normal')
  const [days, setDays] = useState(9)
  const [seed, setSeed] = useState(0)
  const [parameters, setParameters] = useState<ExperimentParameterOverrides>({ ...DEFAULT_EXPERIMENT_PARAMETERS })
  const [report, setReport] = useState<ExperimentRunReport>()
  const [feedback, setFeedback] = useState('')
  const businesses = Object.values(game.economy.businesses)
  const families = Object.values(game.economy.families).sort((a, b) => a.id.localeCompare(b.id))
  const caravanDay = caravanCircuitDay(game.economy.day)
  const caravanEvents = game.eventLog.filter(event => event.type === 'caravan-sale' || event.type === 'caravan-supply')

  const updateParameter = (key: keyof ExperimentParameterOverrides, value: number) => setParameters(current => ({ ...current, [key]: value }))
  const run = () => {
    try {
      setReport(runExperimentScenario(scenario, days, parameters, seed))
      setFeedback('Escenario ejecutado desde el estado inicial reproducible.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'No se pudo ejecutar el escenario.')
    }
  }
  const copyReport = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(json(report))
      setFeedback('Informe copiado al portapapeles.')
    } catch {
      setFeedback('No se pudo acceder al portapapeles; usa Exportar JSON.')
    }
  }
  const exportReport = () => {
    if (!report) return
    const url = URL.createObjectURL(new Blob([json(report)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `comerciante-${report.scenario}-${report.days}d-seed-${report.seed}.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setFeedback('Informe JSON exportado.')
  }

  return <section className="experiment-panel" aria-label="Herramientas de inspección y escenarios">
    <header className="experiment-heading"><div><p className="eyebrow">Herramientas separadas del juego normal</p><h2>Inspección y escenarios</h2></div><span>Día {game.economy.day}</span></header>
    <p className="experiment-note">Cada ejecución parte de un escenario nuevo y determinista; no cambia la partida que estás jugando. La semilla se registra para reproducibilidad; la economía actual no usa aleatoriedad.</p>

    <div className="inspection-grid">
      <article className="inspection-card"><h3>Jugador</h3><p>{game.player.villageId} · {money(game.player.moneyTenths)}</p><p>Carga {game.player.inventory && (Object.entries(game.player.inventory).reduce((sum, [good, amount]) => sum + amount * GOODS_CATALOG[good as keyof typeof GOODS_CATALOG].weightHalfUnits, 0) / 2).toLocaleString('es-ES')} / {game.player.capacityHalfUnits / 2}</p><pre>{goodsText(game.player.inventory)}</pre></article>
      <article className="inspection-card"><h3>Caravana</h3><p>Día de circuito {caravanDay}/9 · ubicación: <strong>{caravanLocation(game.economy.day)}</strong></p><p>El puerto figura solo como ubicación de la caravana; no es destino del jugador.</p><details><summary>Operaciones de caravana en esta sesión ({caravanEvents.length})</summary><pre>{json(caravanEvents.slice(-30))}</pre></details></article>
    </div>

    <details className="inspection-details"><summary>Inspeccionar las ocho familias y sus inventarios</summary>
      <div className="family-grid">{families.map(family => <details className="family-card" key={family.id}>
        <summary>{family.name} · Tramo {family.tier} · {money(family.moneyTenths)}</summary>
        <p>{family.members} integrantes · {family.adults} adultos · metas monetarias: T2 {family.needs.tierOneUpgradeMoneyMet ? 'cumplida' : 'pendiente'} / T3 {family.needs.tierThreeUpgradeMoneyMet ? 'cumplida' : 'pendiente'} / prosperidad {family.needs.prosperityGoalsMet ? 'cumplida' : 'pendiente'}</p>
        <h4>Necesidades y metas</h4><pre>{json({ essentials: family.needs.essentials, progression: family.needs.progression })}</pre>
        <h4>Hogar · inventario doméstico</h4><pre>{goodsText(family.household.inventory)}</pre><p>Durabilidad de mudas (días restantes): {family.household.clothingDurabilityDays.join(', ') || 'ninguna'}</p>
        <h4>Negocios · inventarios separados y herramientas</h4>
        {family.businessIds.map(id => {
          const business = game.economy.businesses[id]
          return <div className="business-inspection" key={id}><strong>{business.id} · {business.profession} · {business.villageId}</strong><p>Comercial: {goodsText(business.commercialInventory)}</p><p>Productivo: {goodsText(business.productiveInventory)}</p><p>Herramientas · días de trabajo restantes: {business.tools.map(tool => tool.remainingWorkDays).join(', ') || 'ninguna'}</p></div>
        })}
        <h4>Decisiones y eventos recientes</h4><pre>{json(game.eventLog.filter(event => event.familyId === family.id).slice(-8))}</pre>
      </details>)}</div>
      <h3>Negocios del mundo ({businesses.length})</h3><p>Las existencias comerciales, productivas y durabilidades anteriores son inspeccionables por familia; se muestran como compartimentos separados.</p>
    </details>

    <details className="scenario-details" open>
      <summary>Escenarios reproducibles y controles experimentales</summary>
      <div className="scenario-controls">
        <label>Escenario<select value={scenario} onChange={event => setScenario(event.target.value as ExperimentScenarioId)}>{EXPERIMENT_SCENARIOS.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Días de simulación<input type="number" min="1" max="365" value={days} onChange={event => setDays(Number(event.target.value))} /></label>
        <div className="duration-buttons">{[1, 9, 36, 90].map(duration => <button type="button" key={duration} onClick={() => setDays(duration)}>{duration} días</button>)}</div>
        <label>Semilla registrada<input type="number" min="0" step="1" value={seed} onChange={event => setSeed(Number(event.target.value))} /></label>
      </div>
      <div className="parameter-grid">
        <label>Tarifa compra jugador (‰)<input type="number" min="500" max="1500" step="10" value={parameters.playerBuyTariffPermille} onChange={event => updateParameter('playerBuyTariffPermille', Number(event.target.value))} /></label>
        <label>Tarifa venta jugador (‰)<input type="number" min="500" max="1500" step="10" value={parameters.playerSellTariffPermille} onChange={event => updateParameter('playerSellTariffPermille', Number(event.target.value))} /></label>
        <label>Producción (%)<input type="number" min="50" max="200" step="5" value={parameters.productionOutputPermille / 10} onChange={event => updateParameter('productionOutputPermille', Number(event.target.value) * 10)} /></label>
        <label>Frecuencia de producción (%)<input type="number" min="50" max="200" step="5" value={parameters.productionFrequencyPermille / 10} onChange={event => updateParameter('productionFrequencyPermille', Number(event.target.value) * 10)} /></label>
        <label>Duración de ropa (días)<input type="number" min="1" max="365" value={parameters.clothingDurabilityDays} onChange={event => updateParameter('clothingDurabilityDays', Number(event.target.value))} /></label>
        <label>Trabajo por herramienta (días)<input type="number" min="1" max="365" value={parameters.toolWorkDays} onChange={event => updateParameter('toolWorkDays', Number(event.target.value))} /></label>
        <label>Umbral rojo (días)<input type="number" min="1" max="30" value={parameters.redCoverageDays} onChange={event => updateParameter('redCoverageDays', Number(event.target.value))} /></label>
        <label>Umbral verde (días)<input type="number" min="2" max="60" value={parameters.greenCoverageDays} onChange={event => updateParameter('greenCoverageDays', Number(event.target.value))} /></label>
        <label>Espera amarilla (días)<input type="number" min="1" max="14" value={parameters.yellowPurchaseWaitDays} onChange={event => updateParameter('yellowPurchaseWaitDays', Number(event.target.value))} /></label>
        <label>Ascenso T2→T3 (décimas)<input type="number" min="1" max="1000000" step="100" value={parameters.tierThreeEntryMoneyTenths} onChange={event => updateParameter('tierThreeEntryMoneyTenths', Number(event.target.value))} /></label>
        <label>Meta prosperidad T3 (décimas)<input type="number" min="0" max="1000000" step="100" value={parameters.tierThreeProsperityMoneyTenths} onChange={event => updateParameter('tierThreeProsperityMoneyTenths', Number(event.target.value))} /></label>
      </div>
      <p className="parameter-defaults">Valores actuales del experimento. Restaurar defaults aprobados: tarifas 900/1100‰; producción y frecuencia 100%; durabilidades 80/60 días; umbrales 7/14 días; espera amarilla 2 días; T3 10.000/20.000 décimas.</p>
      <div className="scenario-actions"><button className="primary-button" onClick={run}>Reiniciar y ejecutar escenario</button><button className="option-button" onClick={() => { setParameters({ ...DEFAULT_EXPERIMENT_PARAMETERS }); setDays(9); setSeed(0) }}>Restaurar parámetros y duración iniciales</button></div>
      {feedback && <p role="status" className="experiment-feedback">{feedback}</p>}
    </details>

    {report && <section className="report-section" aria-live="polite">
      <header><div><h3>{report.scenarioName} · {report.days} días</h3><p>Día global {report.startDay} → {report.finalDay} · semilla {report.seed}</p></div><div className="report-actions"><button onClick={copyReport}>Copiar informe</button><button onClick={exportReport}>Exportar JSON</button></div></header>
      <div className="report-metrics"><span>Fondos familiares: {money(report.metrics.familyMoneyStartTenths)} → {money(report.metrics.familyMoneyEndTenths)} ({money(report.metrics.familyMoneyChangeTenths)})</span><span>Inventario comercial: {report.metrics.totalCommercialStockUnits} unidades</span><span>Familias con necesidades rojas: {report.metrics.familiesWithRedNeeds}</span><span>Ofertas comerciales activas: {report.metrics.activeCommercialOfferCount}</span><span>Comercio local: {report.metrics.tradeEventCount} eventos</span><span>Caravana: {report.metrics.caravanSupplyCount} abastecimientos · {report.metrics.caravanExportCount} exportaciones</span><span>Tramos: {json(report.metrics.tierCounts)}</span></div>
      <h4>Asserts del escenario</h4>{report.assertions.map(item => <p className={item.passed ? 'assertion-pass' : 'assertion-fail'} key={item.label}>{item.passed ? '✓' : '✗'} {item.label}: {item.observation}</p>)}
      {report.setupActions.length > 0 && <><h4>Acciones de preparación</h4>{report.setupActions.map(action => <p key={action.label}>{action.accepted ? '✓' : '✗'} {action.label}: {action.detail}</p>)}</>}
      <details><summary>Resumen diario ({report.daily.length})</summary><div className="table-scroll"><table><thead><tr><th>Día</th><th>Ciclo</th><th>Caravana</th><th>Producción</th><th>Consumo</th><th>Comercio</th><th>Flujo local</th><th>Compra caravana</th><th>Venta caravana</th><th>Fondos familiares</th><th>Necesidades rojas</th><th>Stock comercial</th><th>Tramos</th></tr></thead><tbody>{report.daily.map(day => <tr key={day.day}><td>{day.day}</td><td>{day.productionCycleDay}/4 · {day.caravanCycleDay}/9</td><td>{day.caravanLocation}</td><td>{Object.values(day.activityByGood.produced).reduce((sum, value) => sum + (value ?? 0), 0)}</td><td>{Object.values(day.activityByGood.consumed).reduce((sum, value) => sum + (value ?? 0), 0)}</td><td>{(day.eventCounts.purchase ?? 0) + (day.eventCounts['internal-transfer'] ?? 0)}</td><td>{money(day.moneyFlowsTenths.localTrade)}</td><td>{money(day.moneyFlowsTenths.caravanSupply)}</td><td>{money(day.moneyFlowsTenths.caravanExport)}</td><td>{money(day.familyMoneyTenths)}</td><td>{day.familiesWithRedNeeds}</td><td>{day.commercialStockUnits}</td><td>{json(day.tierCounts)}</td></tr>)}</tbody></table></div></details>
      <details><summary>Ciclos productivos de 4 días ({report.productionCycles.length})</summary><pre>{json(report.productionCycles)}</pre></details>
      <details><summary>Circuitos de caravana de 9 días ({report.caravanCycles.length})</summary><pre>{json(report.caravanCycles)}</pre></details>
      <details><summary>Eventos económicos completos ({report.events.length})</summary><pre>{json(report.events)}</pre></details>
      <details><summary>Inventarios finales separados</summary><pre>{json(report.finalInventories)}</pre></details>
      <details><summary>Informe JSON avanzado</summary><pre>{json(report)}</pre></details>
    </section>}
  </section>
}
