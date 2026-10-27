import { DUNGEON_ENCOUNTERS, PLAYER_CARD_TYPES } from '../engine/content.js'
import { effectiveCopyCard } from '../engine/session.js'
import type { ExpeditionState, WorldInteraction } from '../engine/world.js'
import { ROOMS } from '../engine/spatial.js'
import type { DuelState } from '../engine/types.js'

export interface EncounterSummary {
  title: string
  outcome: string
  resources: string
  details: string[]
  won: boolean
}

const type = (id: string) => {
  const card = PLAYER_CARD_TYPES.find((entry) => entry.id === id)
  if (!card) throw new Error(`Tipo desconocido: ${id}`)
  return card
}

/** All displayed consequences come from the committed transaction, not a second reward calculation. */
export function encounterSummary(before: ExpeditionState, after: ExpeditionState, duel: DuelState,
  sacrificedCopyIds: readonly string[] = []): EncounterSummary {
  const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === duel.encounterId)
  if (!encounter || duel.phase !== 'finished' || !duel.winner) throw new Error('Resultado incompleto.')
  const won = duel.winner === 'player'
  const lost = before.session.copies.filter((copy) => !after.session.copies.some((entry) => entry.id === copy.id))
  const sacrifices = lost.filter((copy) => sacrificedCopyIds.includes(copy.id))
  const deaths = lost.filter((copy) => !sacrificedCopyIds.includes(copy.id))
  const wounded = after.session.copies.filter((copy) => copy.health < effectiveCopyCard(type(copy.cardId), copy).maxHealth)
  const improvements = after.session.copies.flatMap((copy) => {
    const previous = before.session.copies.find((entry) => entry.id === copy.id)
    if (!previous) return []
    const attack = copy.bonusAttack - previous.bonusAttack, health = copy.bonusHealth - previous.bonusHealth
    return attack || health ? [`${type(copy.cardId).name}: ${attack ? `ATQ +${attack}` : `VID máxima y actual +${health}`}`] : []
  })
  const discoveries = after.session.unlockedCardIds.filter((id) => !before.session.unlockedCardIds.includes(id))
  const names = (copies: typeof lost) => copies.map((copy) => type(copy.cardId).name).join(', ')
  let outcome = won ? `Victoria contra ${encounter.enemyName}.` : `Derrota contra ${encounter.enemyName}. Puedes preparar la baraja y reintentar aquí.`
  if (won) {
    if (encounter.id === 'B3') outcome += ' Demo completada. Puedes seguir explorando y consultar tu colección.'
    else if (encounter.id === 'B1' || encounter.id === 'B2') outcome += ` La puerta al sector ${encounter.id === 'B1' ? 2 : 3} queda abierta.`
    else if (encounter.id === 'R4') outcome += after.claimedChestIds.includes('rats-4:chest')
      ? ' Visita completada; el cofre único ya fue reclamado.' : ' Visita completada. Acércate al cofre para reclamar P08 y P12.'
    else outcome += ' La puerta a la siguiente sala del ala queda abierta.'
  }
  return {
    title: won ? encounter.id === 'B3' ? 'Demo completada' : 'Victoria' : 'Derrota', won, outcome,
    resources: `Vida máxima ${before.session.invokerMaxLife} → ${after.session.invokerMaxLife} · Fatiga ${before.session.fatigue} → ${after.session.fatigue} · Vida actual restaurada a ${after.session.invokerLife}/${after.session.invokerMaxLife}`,
    details: [
      `Heridas conservadas: ${wounded.length ? wounded.map((copy) => `${type(copy.cardId).name} ${copy.health}/${effectiveCopyCard(type(copy.cardId), copy).maxHealth}`).join(', ') : 'ninguna'}.`,
      `Bajas: ${deaths.length ? names(deaths) : 'ninguna'}. Sacrificios: ${sacrifices.length ? names(sacrifices) : 'ninguno'}.`,
      `Mejoras por victoria: ${improvements.length ? improvements.join('; ') : 'ninguna'}.`,
      `Descubrimientos en reserva: ${discoveries.length ? discoveries.map((id) => type(id).name).join(', ') : 'ninguno'}.`,
    ],
  }
}

export function worldInteractionMessage(before: ExpeditionState, result: WorldInteraction): string {
  const after = result.state
  if (result.kind === 'encounter') {
    const encounter = DUNGEON_ENCOUNTERS.find((entry) => entry.id === result.duel?.encounterId)
    if (!encounter) throw new Error('Encuentro desconocido.')
    return `Comienza ${encounter.mode === 'skirmish' ? 'la escaramuza' : 'el duelo'} contra ${encounter.enemyName}.`
  }
  if (result.kind === 'chest') {
    const discoveries = after.session.unlockedCardIds.filter((id) => !before.session.unlockedCardIds.includes(id))
    return `Cofre reclamado.${discoveries.length ? ` Nuevas copias básicas sanas en reserva: ${discoveries.map((id) => type(id).name).join(', ')}.` : ' Sus tipos ya estaban descubiertos; no se duplican ni reponen copias.'}`
  }
  if (result.kind === 'shrine') {
    const healed = after.session.copies.filter((copy) => copy.health > (before.session.copies.find((entry) => entry.id === copy.id)?.health ?? copy.health))
    return healed.length ? `Santuario usado: ${healed.length} copia(s) sanada(s) a su máximo individual, incluida la reserva. La vida máxima del invocador sigue en ${after.session.invokerMaxLife}.`
      : 'No hay copias heridas. El santuario conserva su uso.'
  }
  return `Llegaste a ${ROOMS[after.roomId].name}.${before.roomId === 'sector-1' && after.roomId === 'rats-1' ? ' Nueva visita: R1–R4 disponibles en orden; heridas, fatiga y servicios se conservan.' : before.roomId.startsWith('rats-') && after.roomId === 'sector-1' ? ' La próxima entrada inicia otra visita.' : ''}`
}

/** Directed combat needs one live target per selected attacker; empty attacks remain a legal pass. */
export function attacksReady(duel: DuelState, attackerIds: readonly string[], targets: Readonly<Record<string, string>>): boolean {
  return duel.mode !== 'skirmish' || attackerIds.every((id) => duel.players.opponent.creatures.some((unit) => unit.id === targets[id]))
}
