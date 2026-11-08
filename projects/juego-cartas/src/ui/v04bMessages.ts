import { effectiveCopyCard } from '../engine/session.js'
import type { GameSession } from '../engine/session.js'
import type { DuelState } from '../engine/types.js'
import { V04B_CARD_TYPES } from '../engine/content/v04b.js'
import { V04B_ENCOUNTERS } from '../engine/content/v04bEncounters.js'
import { v04bRoom } from '../engine/content/v04bMap.js'
import { RUNE_NAMES } from '../engine/v04bPlay.js'
import type { V04BInteraction, V04BSettlement } from '../engine/v04bPlay.js'
import type { EncounterSummary } from './encounterSummary.js'

const type = (id: string) => {
  const card = V04B_CARD_TYPES.find((entry) => entry.id === id)
  if (!card) throw new Error(`Tipo desconocido: ${id}`)
  return card
}

/** Same structure as the legacy result; consequences come from the committed transaction. No rewards in M6b. */
export function v04bEncounterSummary(before: GameSession, settlement: V04BSettlement, duel: DuelState, sacrificedCopyIds: readonly string[] = []): EncounterSummary {
  const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === duel.encounterId)
  if (!encounter || duel.phase !== 'finished' || !duel.winner) throw new Error('Resultado incompleto.')
  const after = settlement.state.expedition.session
  const settled = settlement.settledSession
  const won = settlement.won
  const lost = before.copies.filter((copy) => !settled.copies.some((entry) => entry.id === copy.id))
  const sacrifices = lost.filter((copy) => sacrificedCopyIds.includes(copy.id))
  const deaths = lost.filter((copy) => !sacrificedCopyIds.includes(copy.id))
  const wounded = after.copies.filter((copy) => copy.health < effectiveCopyCard(type(copy.cardId), copy).maxHealth)
  const names = (copies: typeof lost) => copies.map((copy) => `${type(copy.cardId).name} ${copy.id}`).join(', ')
  let outcome = won ? `Victoria contra ${encounter.name}.` : `Derrota contra ${encounter.name}. Puedes preparar la baraja y reintentar aquí.`
  if (won) {
    if (encounter.id === '19') outcome += ' Demo completada. Puedes seguir explorando y consultar tu colección.'
    else outcome += ` Las salidas de ${v04bRoom(encounter.id).name} quedan abiertas.`
    if (settlement.restored) outcome += ' Restauración gratuita: copias sanadas, vida máxima 20 y fatiga eliminada; el orbe conserva su carga.'
  }
  const restoredHealed = settlement.restored
    ? settled.copies.filter((copy) => copy.health < (after.copies.find((entry) => entry.id === copy.id)?.health ?? copy.health)).length : 0
  return {
    title: won ? encounter.id === '19' ? 'Demo completada' : 'Victoria' : 'Derrota', won, outcome,
    resources: `Vida máxima ${before.invokerMaxLife} → ${after.invokerMaxLife} · Fatiga ${before.fatigue} → ${after.fatigue} · Vida actual restaurada a ${after.invokerLife}/${after.invokerMaxLife}`,
    details: [
      `Heridas conservadas: ${wounded.length ? wounded.map((copy) => `${type(copy.cardId).name} ${copy.id} ${copy.health}/${effectiveCopyCard(type(copy.cardId), copy).maxHealth}`).join(', ') : 'ninguna'}.`,
      `Bajas: ${deaths.length ? names(deaths) : 'ninguna'}. Sacrificios: ${sacrifices.length ? names(sacrifices) : 'ninguno'}.`,
      ...(settlement.restored ? [`Restauración gratuita: ${restoredHealed} copia(s) sanada(s).`] : []),
      'Sin premios de cartas en este ensayo.',
    ],
  }
}

export function v04bInteractionMessage(result: V04BInteraction): string {
  switch (result.kind) {
    case 'travel': {
      const room = v04bRoom(result.to)
      return `Llegaste a ${room.name} · ${room.zone}.`
    }
    case 'encounter': {
      const encounter = V04B_ENCOUNTERS.find((entry) => entry.id === result.duel.encounterId)
      if (!encounter) throw new Error('Encuentro desconocido.')
      return `Comienza ${encounter.mode === 'skirmish' ? 'la escaramuza' : 'el duelo'} contra ${encounter.name}.`
    }
    case 'altar':
      return result.result.recharged ? 'El altar recarga el orbe de restauración. El regreso a la Corte de las Ratas queda cerrado.' : `El altar no responde: ${result.result.reason}.`
    case 'inscription':
      return `La inscripción dice: «${result.text}».`
    case 'pedestal': {
      const name = RUNE_NAMES[result.rune]
      if (result.result.outcome === 'advanced') return `La runa de ${name} se enciende (${result.result.state.puzzle.progress}/3).`
      if (result.result.outcome === 'reset') return `${result.result.reason}. Puedes volver a intentarlo sin penalización.`
      if (result.result.outcome === 'solved') return `La runa de ${name} se enciende: los tres pedestales arden. El sello de la Cámara del Titán se libera en el Cruce de los Sellos.`
      return `${result.result.reason}.`
    }
    case 'wall':
      return result.result.revealed ? 'Al apartar la piedra agrietada se abre un paso oculto hacia la Cámara del Sacrificio.' : `${result.result.reason}.`
  }
}
