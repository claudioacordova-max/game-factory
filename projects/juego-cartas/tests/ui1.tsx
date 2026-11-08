import { renderToStaticMarkup } from 'react-dom/server'
import {
  createGameSession, createV04BInitialSession, grantCreatureCopies, REINVOKE_ALL_MIN_MAX_LIFE, reinvokeAllLostCopies, reinvokeAllStatus,
  reinvokeCreatureType, reinvokeStatus, RuleViolation, V04B_CARD_TYPES,
} from '../src/engine/index.js'
import type { GameSession } from '../src/engine/index.js'
import { ENEMY_CARD_TYPES, PLAYER_CARD_TYPES } from '../src/engine/content.js'
import { LEGACY_ADVENTURE } from '../src/adventure/legacyAdventure.js'
import { CollectionView, DeckPanel } from '../src/ui/CollectionViews.js'
import { CollectionOverlay } from '../src/ui/CollectionOverlay.js'
import { activateOrbControl, ExplorationHUD, keepAvatarFocus, orbControlFor } from '../src/ui/ExplorationHUD.js'
import { CreaturePortrait, V04B_PORTRAIT_IDS } from '../src/ui/GameIcons.js'
import { CopyChooser, ReinvokeAllConfirm } from '../src/ui/Grimoire.js'
import { deckGroups, directCopyChoice, matchesFilters, reserveGroups } from '../src/ui/grimoireModel.js'

export const ui1Tests: { name: string; run: () => void }[] = []
function test(name: string, run: () => void) { ui1Tests.push({ name: `UI-1 · ${name}`, run }) }
function ok(value: unknown, message = 'Condición incumplida'): asserts value { if (!value) throw new Error(message) }
function equal(actual: unknown, expected: unknown, message = '') {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Esperado ${JSON.stringify(expected)}; recibido ${JSON.stringify(actual)}`)
}
function rejects(run: () => unknown) {
  try { run() } catch (error) { if (error instanceof RuleViolation) return; throw error }
  throw new Error('Se esperaba rechazo de dominio')
}
const noop = () => {}
const type = (id: string) => V04B_CARD_TYPES.find((card) => card.id === id)!

/** FNV-1a 32-bit: a dependency-free fingerprint of the legacy markup captured before UI-1. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return `${hash.toString(16)}:${text.length}`
}

/** Initial session plus a reserve of two N02 (copy-9 wounded) and two N03, and a third deck N05 is not possible (limit 2). */
function reserveSession(): GameSession {
  const base = grantCreatureCopies(createV04BInitialSession(), 'ui1', ['N02', 'N03', 'N03'], V04B_CARD_TYPES)
  // Initial deck: copy-1..copy-8 (A01, A01, A02, R01, H01, N02, N05, N06); reserve: copy-9 (N02), copy-10/11 (N03).
  return { ...base, copies: base.copies.map((copy) => copy.id === 'copy-9' ? { ...copy, health: 1 } : copy) }
}
/** Removes identities as a death or sacrifice would (slots kept). */
function lose(session: GameSession, ids: string[]): GameSession {
  return { ...session, copies: session.copies.filter((copy) => !ids.includes(copy.id)), activeDeckCopyIds: session.activeDeckCopyIds.filter((id) => !ids.includes(id)) }
}

// ---------- 1. Agrupación y contador ----------
test('Colección y baraja agrupan por tipo con contador ×N e indican cuántas copias están heridas', () => {
  const session = reserveSession()
  const reserve = reserveGroups(session, V04B_CARD_TYPES)
  equal(reserve.map((group) => [group.type.id, group.copies.map((copy) => copy.id), group.wounded]), [['N02', ['copy-9'], 1], ['N03', ['copy-10', 'copy-11'], 0]])
  const markup = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} />)
  equal((markup.match(/data-card-id="N03"/g) ?? []).length, 1, 'Una sola ficha por tipo.')
  ok(markup.includes('Añadir Rata carroñera a la baraja: 2 en reserva"'), 'Ficha agrupada de N03')
  ok(markup.includes('Añadir Limo de huesos a la baraja: 1 en reserva, 1 herida; elegir copia'), 'Heridas indicadas en la ficha')
  ok(!markup.includes('data-card-id="A01"') && markup.includes('aria-label="3 copias en reserva"'), 'Colección solo muestra copias fuera de la baraja')
  const deckSession = { ...session, activeDeckCopyIds: [...session.activeDeckCopyIds, 'copy-9'] }
  const deck = deckGroups(deckSession, V04B_CARD_TYPES)
  equal(deck.find((group) => group.type.id === 'A01')!.copies.length, 2)
  equal(deck.find((group) => group.type.id === 'N02')!.wounded, 1)
  const deckMarkup = renderToStaticMarkup(<DeckPanel session={deckSession} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} />)
  equal((deckMarkup.match(/data-card-id="A01"/g) ?? []).length, 1, 'Los dos Diablillos comparten ficha.')
  ok(deckMarkup.includes('<span class="group-count">×2</span>') && deckMarkup.includes('2 ATQ · 2 VID · 1 herida'), 'Contador y heridas en la baraja')
})

// ---------- 2-3. Elección de copia al añadir y retirar ----------
test('sin heridas se mueve una copia directamente; con heridas se elige la copia viendo su vida (añadir y retirar)', () => {
  const session = reserveSession()
  const [n02, n03] = reserveGroups(session, V04B_CARD_TYPES)
  equal([directCopyChoice(n03, 'add'), directCopyChoice(n03, 'remove'), directCopyChoice(n02, 'add'), directCopyChoice(n02, 'remove')], ['copy-10', 'copy-11', null, null])
  const deckSession = { ...session, activeDeckCopyIds: [...session.activeDeckCopyIds, 'copy-9'] }
  const deckN02 = deckGroups(deckSession, V04B_CARD_TYPES).find((group) => group.type.id === 'N02')!
  equal(deckN02.copies.map((copy) => [copy.id, copy.health]), [['copy-6', 2], ['copy-9', 1]])
  equal(directCopyChoice(deckN02, 'remove'), null)
  const add = renderToStaticMarkup(<CopyChooser group={deckN02} action="add" onChoose={noop} onClose={noop} />)
  ok(add.includes('Añadir Limo de huesos copy-9 (1/2 VID, herida)') && add.includes('Añadir Limo de huesos copy-6 (2/2 VID, sana)') && add.includes('Cancelar'))
  const remove = renderToStaticMarkup(<CopyChooser group={deckN02} action="remove" onChoose={noop} onClose={noop} />)
  ok(remove.includes('Retirar Limo de huesos copy-9 (1/2 VID, herida)') && remove.includes('¿Qué copia de Limo de huesos?'))
  const deckMarkup = renderToStaticMarkup(<DeckPanel session={deckSession} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} />)
  ok(deckMarkup.includes('aria-haspopup="dialog" aria-label="Retirar una copia de Limo de huesos de la baraja (elegir copia; 1 herida)"'), 'La X con heridas abre la elección')
  ok(deckMarkup.includes('aria-label="Retirar una copia de Diablillo furioso de la baraja"'), 'La X sin heridas retira directamente')
  const locked = renderToStaticMarkup(<DeckPanel session={{ ...deckSession, activeDuelId: 'duel-x' }} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} />)
  ok(/class="remove-card" type="button" disabled=""/.test(locked), 'En combate la baraja queda bloqueada')
})

test('Colección nunca muestra «Retirar de baraja»; retirar solo existe en la X de la baraja', () => {
  for (const session of [reserveSession(), { ...reserveSession(), activeDeckCopyIds: [] }, lose(reserveSession(), ['copy-1', 'copy-5'])]) {
    for (const tab of ['collection', 'reinvoke'] as const) {
      const markup = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialTab={tab} />)
      ok(!markup.includes('Retirar de baraja') && !markup.includes('Retirar'), `Pestaña ${tab}`)
    }
  }
})

// ---------- 4-5. Reinvocar y reinvocar todas ----------
test('Reinvocar lista las copias perdidas con su coste por copia y conserva el suelo 1 de la reinvocación individual', () => {
  const session = lose(reserveSession(), ['copy-1', 'copy-8', 'copy-10'])
  const markup = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialTab="reinvoke" />)
  ok(markup.includes('Reinvocar una copia de Diablillo furioso (gratis)') && markup.includes('Reinvocar una copia de Ghoul (1 de vida máxima)') && markup.includes('Reinvocar una copia de Rata carroñera (1 de vida máxima)'))
  ok(markup.includes('aria-label="3 copias perdidas"'))
  const floor = { ...session, invokerMaxLife: 2, invokerLife: 2 }
  equal([reinvokeStatus(floor, 'N06', V04B_CARD_TYPES).allowed, reinvokeStatus({ ...floor, invokerMaxLife: 1 }, 'N06', V04B_CARD_TYPES).allowed], [true, false], 'Suelo 1 individual intacto.')
  const recovered = reinvokeCreatureType(session, 'N06', V04B_CARD_TYPES)
  const after = renderToStaticMarkup(<CollectionView session={recovered} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} />)
  ok(after.includes('data-card-id="N06"'), 'La copia reinvocada pasa a Colección (reserva)')
})

test('Reinvocar todas: coste total con semillas gratis, umbral de vida máxima resultante ≥ 7 y operación atómica', () => {
  equal(REINVOKE_ALL_MIN_MAX_LIFE, 7)
  // Lost: A01 (seed, 0), H01 (seed, 0), N06 (1), N03 (1): total 2.
  const session = lose(reserveSession(), ['copy-1', 'copy-5', 'copy-8', 'copy-10'])
  const atNine = { ...session, invokerMaxLife: 9, invokerLife: 9 }
  const status = reinvokeAllStatus(atNine, V04B_CARD_TYPES)
  equal([status.cardIds, status.cost, status.resultingMaxLife, status.allowed], [["A01", "H01", "N06", "N03"], 2, 7, true])
  const done = reinvokeAllLostCopies(atNine, V04B_CARD_TYPES)
  equal([done.invokerMaxLife, done.invokerLife, done.copies.length - atNine.copies.length, reinvokeAllStatus(done, V04B_CARD_TYPES).reason], [7, 7, 4, 'No hay copias perdidas'])
  const fresh = done.copies.filter((copy) => !atNine.copies.some((old) => old.id === copy.id))
  ok(fresh.every((copy) => copy.health === type(copy.cardId).maxHealth && !done.activeDeckCopyIds.includes(copy.id)), 'Copias sanas en reserva')
  const atEight = { ...session, invokerMaxLife: 8, invokerLife: 8 }
  const blocked = reinvokeAllStatus(atEight, V04B_CARD_TYPES)
  equal([blocked.allowed, blocked.resultingMaxLife, blocked.reason], [false, 6, 'La vida máxima quedaría en 6; debe quedar al menos en 7'])
  const before = JSON.stringify(atEight)
  rejects(() => reinvokeAllLostCopies(atEight, V04B_CARD_TYPES))
  equal(JSON.stringify(atEight), before, 'El rechazo no cambia nada.')
  const seedsOnly = lose(createV04BInitialSession(), ['copy-1', 'copy-4'])
  equal([reinvokeAllStatus(seedsOnly, V04B_CARD_TYPES).cost, reinvokeAllStatus(seedsOnly, V04B_CARD_TYPES).resultingMaxLife], [0, 20], 'Semillas gratis.')
  rejects(() => reinvokeAllLostCopies({ ...atNine, activeDuelId: 'duel-x' }, V04B_CARD_TYPES))
  rejects(() => reinvokeAllLostCopies(createGameSession([PLAYER_CARD_TYPES[0]]), PLAYER_CARD_TYPES))
  const enabled = renderToStaticMarkup(<CollectionView session={atNine} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} onReinvokeAll={noop} initialTab="reinvoke" />)
  ok(/<button type="button" class="button button-primary" aria-haspopup="dialog">Reinvocar todas · −2 vida máx\.<\/button>/.test(enabled) && enabled.includes('Máximo: 9 → 7 (umbral 7)'))
  const disabled = renderToStaticMarkup(<CollectionView session={atEight} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} onReinvokeAll={noop} initialTab="reinvoke" />)
  ok(/<button type="button" class="button button-primary" disabled="" aria-haspopup="dialog" aria-describedby="reinvoke-all-reason">Reinvocar todas/.test(disabled), 'Desactivado')
  ok(disabled.includes('La vida máxima quedaría en 6; debe quedar al menos en 7'), 'Motivo visible')
  const confirm = renderToStaticMarkup(<ReinvokeAllConfirm session={atNine} cardTypes={V04B_CARD_TYPES} onConfirm={noop} onClose={noop} filtered />)
  ok(confirm.includes('¿Reinvocar 4 copias perdidas?') && confirm.includes('2 de vida máxima') && confirm.includes('9 → <strong>7</strong>') && confirm.includes('Gratis'))
  ok(confirm.includes('también las ocultas por los filtros') && confirm.includes('Confirmar · −2 vida máx.'))
})

// ---------- 6. Filtros ----------
test('filtros de maná y sacrificios: OR dentro de categoría, AND entre categorías; en Colección y Reinvocar, con indicación y limpieza', () => {
  equal(['A01', 'A03', 'R03', 'R04', 'N03', 'N08', 'N04'].filter((id) => matchesFilters(type(id), { mana: ['0', '3+'], sacrifices: [] })), ['A01', 'R04', 'N03', 'N08'])
  equal(['A01', 'N03', 'N04', 'N07', 'N08', 'N09'].filter((id) => matchesFilters(type(id), { mana: ['0'], sacrifices: ['1'] })), ['N03', 'N07'])
  equal(['N03', 'N04', 'N08', 'H04'].filter((id) => matchesFilters(type(id), { mana: [], sacrifices: ['2+'] })), ['N08', 'H04'])
  const session = lose(reserveSession(), ['copy-1', 'copy-8'])
  const filters = { mana: ['0' as const], sacrifices: ['1' as const] }
  const collection = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialFilters={filters} />)
  ok(collection.includes('data-card-id="N03"') && !collection.includes('data-card-id="N02"'), 'Colección filtrada')
  ok(collection.includes('Filtros activos:') && collection.includes('Quitar filtro 0 maná') && collection.includes('Quitar filtro 1 sacrificio') && collection.includes('Limpiar filtros') && collection.includes('Filtros (2 activos)'))
  const reinvoke = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialTab="reinvoke" initialFilters={{ mana: ['1'], sacrifices: [] }} />)
  ok(reinvoke.includes('data-card-id="N06"') && !reinvoke.includes('data-card-id="A01"'), 'Reinvocar filtrado')
  const open = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialFiltersOpen initialFilters={filters} />)
  ok(open.includes('aria-expanded="true"') && open.includes('aria-pressed="true" aria-label="Filtrar por 0 maná"') && open.includes('aria-pressed="false" aria-label="Filtrar por 3+ maná"'))
  const none = renderToStaticMarkup(<CollectionView session={session} cardTypes={V04B_CARD_TYPES} onChangeDeck={noop} onReinvoke={noop} initialFilters={{ mana: ['3+'], sacrifices: [] }} />)
  ok(none.includes('Ninguna copia en reserva coincide con los filtros.'))
})

// ---------- 7. Retratos ----------
test('cada tipo V0.4B tiene retrato propio, distinto de los demás y del genérico', () => {
  equal([...V04B_PORTRAIT_IDS].sort(), V04B_CARD_TYPES.map((card) => card.id).sort())
  const art = (id: string) => renderToStaticMarkup(<CreaturePortrait cardId={id} />).replace(/<text[^]*?<\/text>/, '').replace(/ data-portrait="[^"]*"/, '').replace(/class="[^"]*"/, '')
  const generic = art('ZZ9')
  const all = V04B_CARD_TYPES.map((card) => art(card.id))
  equal(new Set(all).size, all.length, 'Retratos repetidos.')
  ok(all.every((markup) => markup !== generic), 'Ningún V0.4B usa el genérico')
  const tone = (id: string) => /portrait-(\w+)/.exec(renderToStaticMarkup(<CreaturePortrait cardId={id} />))![1]
  equal(['A01', 'R01', 'H01', 'N01'].map(tone), ['ember', 'rune', 'shade', 'stone'])
})

// ---------- 8. Foco del orbe ----------
test('orbe: el clic no roba el foco del avatar y el orbe gastado sigue sin poder activarse (sin atributo disabled nativo)', () => {
  const hurt = { ...createV04BInitialSession(), invokerMaxLife: 18 }
  let activations = 0
  const active = orbControlFor(hurt, () => { activations++ })!
  ok(activateOrbControl(active) && activations === 1)
  const spent = orbControlFor({ ...hurt, orb: { charges: 0, capacity: 1 } }, () => { activations++ })!
  ok(!activateOrbControl(spent) && activations === 1, 'El orbe vacío no se activa')
  let prevented = false
  keepAvatarFocus({ preventDefault: () => { prevented = true } })
  ok(prevented, 'El mousedown no mueve el foco')
  const hud = (session: GameSession) => renderToStaticMarkup(<ExplorationHUD life={18} maxLife={20} mana={1} fatigue={0} level={1} roomName="Sala" complete={false} onCollection={noop} orb={orbControlFor(session, noop)} />)
  const spentHtml = hud({ ...hurt, orb: { charges: 0, capacity: 1 } })
  ok(/<button class="orb-launcher empty" type="button" aria-disabled="true"/.test(spentHtml) && !/orb-launcher[^>]*disabled=""/.test(spentHtml), 'aria-disabled sin disabled nativo')
  ok(spentHtml.includes('aria-label="Orbe de restauración: Orbe vacío"'), 'Motivo anunciado')
  ok(!/orb-launcher charged[^>]*aria-disabled/.test(hud(hurt)), 'Orbe activable sin aria-disabled')
})

// ---------- Legado ----------
function legacyVariant(): GameSession {
  const base = LEGACY_ADVENTURE.session(LEGACY_ADVENTURE.create())
  const [lost, wounded] = base.copies
  return { ...base, copies: base.copies.filter((copy) => copy.id !== lost.id).map((copy) => copy.id === wounded.id ? { ...copy, health: Math.max(1, copy.health - 1) } : copy),
    activeDeckCopyIds: base.activeDeckCopyIds.filter((id) => id !== lost.id), invokerMaxLife: 18, invokerLife: 18 }
}
export function legacyMarkups(): Record<string, string> {
  const initial = LEGACY_ADVENTURE.session(LEGACY_ADVENTURE.create())
  const variant = legacyVariant()
  return {
    overlay: renderToStaticMarkup(<CollectionOverlay session={initial} onClose={noop} onChangeDeck={noop} onReinvoke={noop} notice="" noticeRevision={0} />),
    overlayVariant: renderToStaticMarkup(<CollectionOverlay session={variant} onClose={noop} onChangeDeck={noop} onReinvoke={noop} notice="Aviso" noticeRevision={1} />),
    collection: renderToStaticMarkup(<CollectionView session={variant} onChangeDeck={noop} onReinvoke={noop} />),
    deck: renderToStaticMarkup(<DeckPanel session={variant} onChangeDeck={noop} />),
    empty: renderToStaticMarkup(<CollectionView session={createGameSession([])} onChangeDeck={noop} onReinvoke={noop} />),
    hud: renderToStaticMarkup(<ExplorationHUD life={18} maxLife={20} mana={2} fatigue={1} level={2} roomName="Sala" complete={false} onCollection={noop} />),
    portraits: [...PLAYER_CARD_TYPES, ...ENEMY_CARD_TYPES].map((card) => card.id).concat('crypt-echo').map((id) => renderToStaticMarkup(<CreaturePortrait cardId={id} />)).join('\n'),
  }
}
/** Captured from HEAD ed83a85 (before UI-1) with exactly these fixtures. */
const LEGACY_FINGERPRINTS: Record<string, string> = {
  overlay: '2cb72280:24709', overlayVariant: 'f739faf1:24050', collection: '157f1fd5:16920', deck: '2726c46c:5940',
  empty: '80554cc6:1109', hud: '9c6d4067:2463', portraits: '560ee694:17868',
}
test('legado idéntico: Colección, baraja, HUD y retratos legados producen el mismo marcado que antes de UI-1', () => {
  const now = Object.fromEntries(Object.entries(legacyMarkups()).map(([key, markup]) => [key, fingerprint(markup)]))
  equal(now, LEGACY_FINGERPRINTS)
  ok(reinvokeAllStatus(createGameSession([PLAYER_CARD_TYPES[0]]), PLAYER_CARD_TYPES).reason === 'Solo en la expedición V0.4B')
})
