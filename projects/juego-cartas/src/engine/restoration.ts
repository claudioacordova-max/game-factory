import { RuleViolation } from './rules.js'
import { NORMAL_INVOKER_MAX_LIFE, effectiveCopyCard, requireOutsideCombat, validateSessionCopies } from './session.js'
import type { GameSession, RatCycleState, RatRoomId } from './session.js'
import { V04B_CARD_TYPES } from './content/v04b.js'

/**
 * V0.4B restoration effect, orb and rat cycle (MIG-D01/D03/D06). Pure functions; legacy sessions are rejected.
 * Convention: invalid commands (combat, legacy, incoherent events) throw RuleViolation; legitimate player
 * interactions that simply do nothing (full orb, nothing to recharge at the altar) return `{ recharged: false, reason }`.
 */
function requireV04B(session: GameSession): void {
  if (session.collectionProfile !== 'v04b') throw new RuleViolation('La restauración y el orbe solo existen en el perfil V0.4B.')
}

// ---------- Restauración ----------
export interface RestorationSummary { healedCopies: number; maxLifeRecovered: number; fatigueRemoved: boolean }

function woundedCount(session: GameSession): number {
  return session.copies.filter((copy) => {
    const type = V04B_CARD_TYPES.find((card) => card.id === copy.cardId)
    return type !== undefined && copy.health < effectiveCopyCard(type, copy).maxHealth
  }).length
}

/** What a restoration would change right now (zeros when nothing). Never mutates. */
export function restorationPreview(session: GameSession): RestorationSummary {
  return {
    healedCopies: woundedCount(session),
    maxLifeRecovered: Math.max(0, NORMAL_INVOKER_MAX_LIFE - session.invokerMaxLife),
    fatigueRemoved: session.fatigue > 0,
  }
}

export function restorationNeeded(session: GameSession): boolean {
  const preview = restorationPreview(session)
  return preview.healedCopies > 0 || preview.maxLifeRecovered > 0 || preview.fatigueRemoved
}

/** Heals living wounded copies (deck and reserve), restores invoker max life/life to 20 and clears fatigue. No revival, no slots. */
export function applyRestoration(session: GameSession): GameSession {
  requireOutsideCombat(session)
  requireV04B(session)
  validateSessionCopies(session)
  return {
    ...session,
    copies: session.copies.map((copy) => {
      const type = V04B_CARD_TYPES.find((card) => card.id === copy.cardId)
      return type ? { ...copy, health: Math.max(copy.health, effectiveCopyCard(type, copy).maxHealth) } : copy
    }),
    invokerMaxLife: NORMAL_INVOKER_MAX_LIFE,
    invokerLife: NORMAL_INVOKER_MAX_LIFE,
    fatigue: 0,
  }
}

/** Free boss restoration (B1/B2): same effect, no orb charge needed or spent. Not connected to any encounter yet. */
export function applyBossRestoration(session: GameSession): GameSession {
  return applyRestoration(session)
}

// ---------- Orbe ----------
export interface OrbStatus { present: boolean; charged: boolean; canActivate: boolean; reason: string }

export function orbStatus(session: GameSession): OrbStatus {
  const orb = session.collectionProfile === 'v04b' ? session.orb : undefined
  if (!orb) return { present: false, charged: false, canActivate: false, reason: 'Sin orbe' }
  const charged = orb.charges > 0
  const reason = session.activeDuelId !== null ? 'Solo fuera de combate'
    : !charged ? 'Orbe vacío'
      : !restorationNeeded(session) ? 'No hay nada que restaurar' : ''
  return { present: true, charged, canActivate: !reason, reason }
}

/** Consumes the single charge and applies the restoration. Rejected (without spending) if not allowed. */
export function activateOrb(session: GameSession): GameSession {
  requireOutsideCombat(session)
  requireV04B(session)
  const status = orbStatus(session)
  if (!status.canActivate) throw new RuleViolation(status.reason)
  const restored = applyRestoration(session)
  return { ...restored, orb: { ...session.orb!, charges: session.orb!.charges - 1 } }
}

// ---------- Ciclo de ratas (MIG-D03) ----------
export const RAT_ROOM_IDS: readonly RatRoomId[] = ['07', '08', '09']

function ratCycle(session: GameSession): RatCycleState {
  requireV04B(session)
  if (!session.ratCycle || !session.orb) throw new RuleViolation('Esta sesión V0.4B no tiene ciclo de ratas.')
  return session.ratCycle
}

export interface RatCycleStatus {
  encounters: Record<RatRoomId, 'active' | 'defeated'>
  /** 10 to 09 is closed until the player leaves via 10 to 04 and re-enters from 03. */
  returnClosed: boolean
  canRecharge: boolean
  reason: string
}

export function ratCycleStatus(session: GameSession): RatCycleStatus {
  const cycle = ratCycle(session)
  const encounters = Object.fromEntries(RAT_ROOM_IDS.map((id) => [id, cycle.defeated.includes(id) ? 'defeated' : 'active'])) as Record<RatRoomId, 'active' | 'defeated'>
  const reason = session.orb!.charges >= session.orb!.capacity ? 'El orbe ya está cargado'
    : cycle.returnClosed ? 'Ya recargaste: sal por 04 y vuelve a entrar desde 03'
      : RAT_ROOM_IDS.some((id) => !cycle.defeated.includes(id)) ? 'Faltan ratas por vencer en este ciclo' : ''
  return { encounters, returnClosed: cycle.returnClosed, canRecharge: !reason, reason }
}

/** Victory in 07/08/09. Rejected if already defeated this cycle or while the circuit is closed after a recharge. */
export function recordRatEncounterVictory(session: GameSession, roomId: RatRoomId): GameSession {
  requireOutsideCombat(session)
  const cycle = ratCycle(session)
  if (!RAT_ROOM_IDS.includes(roomId)) throw new RuleViolation(`Sala de ratas desconocida: ${roomId}.`)
  if (cycle.returnClosed) throw new RuleViolation('El circuito de ratas está cerrado hasta volver a entrar desde 03.')
  if (cycle.defeated.includes(roomId)) throw new RuleViolation(`La sala ${roomId} ya fue vencida en este ciclo.`)
  return { ...session, ratCycle: { ...cycle, defeated: [...cycle.defeated, roomId] } }
}

export interface AltarResult { session: GameSession; recharged: boolean; reason: string }

/** Altar interaction in 10. A legitimate no-op returns the unchanged session with a reason instead of throwing. */
export function useRatAltar(session: GameSession): AltarResult {
  requireOutsideCombat(session)
  const status = ratCycleStatus(session)
  if (!status.canRecharge) return { session, recharged: false, reason: status.reason }
  return {
    session: { ...session, orb: { ...session.orb!, charges: session.orb!.capacity }, ratCycle: { defeated: [], returnClosed: true, leftAltarVia04: false } },
    recharged: true, reason: '',
  }
}

/** Exit 10 to 04. Without a prior recharge it changes nothing. */
export function leaveAltarTo04(session: GameSession): GameSession {
  requireOutsideCombat(session)
  const cycle = ratCycle(session)
  return cycle.returnClosed ? { ...session, ratCycle: { ...cycle, leftAltarVia04: true } } : session
}

/** Entry 03 to 07. After a recharge it requires having left through 10 to 04, then reopens the normal route. */
export function enterRatCircuitFrom03(session: GameSession): GameSession {
  requireOutsideCombat(session)
  const cycle = ratCycle(session)
  if (!cycle.returnClosed) return session
  if (!cycle.leftAltarVia04) throw new RuleViolation('Tras recargar debes salir por 10 a 04 antes de volver a entrar desde 03.')
  return { ...session, ratCycle: { ...cycle, returnClosed: false, leftAltarVia04: false } }
}
