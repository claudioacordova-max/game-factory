import { createV04BEncounterDuel, endTurn, resolveCombat, declareBlockers, validateCombatIdentities, V04B_ENCOUNTERS } from '../src/engine/index.js'
import type { DuelState, GameSession } from '../src/engine/index.js'
import { runEnemyTurn } from '../src/engine/enemy.js'
import type { EnemyAiLevel } from '../src/engine/enemy.js'
import { playerTurn, rivalTurn } from './m8b.js'
import { seededRandom } from './duelFixtures.js'

/**
 * M8c balance simulation (tests only, no game data is changed). Automatic player styles:
 * - agresivo: summons everything payable, attacks with every creature that has ATK, never blocks.
 * - prudente: same summons and attacks, but blocks a rival attacker when a free creature survives it.
 * The rival is the level-1 reference or the level-2 heuristics.
 */
export type PlayerStyle = 'agresivo' | 'prudente'
export const STYLES: readonly PlayerStyle[] = ['agresivo', 'prudente']
export const ROOMS: readonly string[] = V04B_ENCOUNTERS.map((entry) => entry.id)

/** Changes applied only to the freshly created duel (simulation what-ifs); never to the real content. */
export type DuelVariant = (duel: DuelState) => DuelState

export interface PlayedDuel { winner: 'player' | 'opponent'; turns: number; echoes: number; playerLife: number; rivalLife: number; foesLeft: number }

const STEP_CAP = 400

function rivalAgainstPassivePlayer(start: DuelState, level: EnemyAiLevel): DuelState {
  const d = runEnemyTurn(start, level)
  if (d.phase === 'finished') return d
  if (d.phase !== 'blockers') throw new Error(`Turno rival bloqueado en fase ${d.phase}`)
  return resolveCombat(declareBlockers(d, {}))
}

/** Plays one duel to the end. Throws on any illegal action, blocked turn or non-terminating duel. */
export function playDuel(start: DuelState, level: EnemyAiLevel, style: PlayerStyle): PlayedDuel {
  let d = start
  for (let step = 0; step < STEP_CAP && d.phase !== 'finished'; step += 1) {
    validateCombatIdentities(d)
    if (d.activePlayer === 'player') {
      if (d.phase !== 'main') throw new Error(`Jugador en fase ${d.phase}`)
      d = playerTurn(d, level)
    } else {
      if (d.mode !== 'skirmish' && d.phase !== 'main') throw new Error(`Rival en fase ${d.phase}`)
      d = style === 'prudente' ? rivalTurn(d, level) : rivalAgainstPassivePlayer(d, level)
    }
    if (d.phase === 'finished') break
    d = endTurn(d)
  }
  if (d.phase !== 'finished' || !d.winner) throw new Error(`Encuentro ${start.encounterId} sin terminar en ${STEP_CAP} pasos`)
  const rival = d.players.opponent
  return {
    winner: d.winner, turns: d.turn, echoes: d.echoCount ?? 0, playerLife: d.players.player.life,
    rivalLife: rival.kind === 'invoker' ? rival.life : 0, foesLeft: rival.creatures.filter((unit) => !unit.echo).length,
  }
}

export interface Stats {
  games: number; wins: number; turnsSum: number; turnsMax: number; echoGames: number; echoMax: number
  /** Diagnostics: player life left in wins; rival life / real rival creatures left in losses. */
  winLifeSum: number; lossRivalLifeSum: number; lossFoesSum: number; lossTurnsSum: number
}
export const emptyStats = (): Stats => ({ games: 0, wins: 0, turnsSum: 0, turnsMax: 0, echoGames: 0, echoMax: 0, winLifeSum: 0, lossRivalLifeSum: 0, lossFoesSum: 0, lossTurnsSum: 0 })

export function addResult(stats: Stats, result: PlayedDuel): Stats {
  stats.games += 1
  stats.turnsSum += result.turns
  stats.turnsMax = Math.max(stats.turnsMax, result.turns)
  if (result.echoes > 0) stats.echoGames += 1
  stats.echoMax = Math.max(stats.echoMax, result.echoes)
  if (result.winner === 'player') { stats.wins += 1; stats.winLifeSum += result.playerLife }
  else { stats.lossRivalLifeSum += result.rivalLife; stats.lossFoesSum += result.foesLeft; stats.lossTurnsSum += result.turns }
  return stats
}

export interface EvaluateOptions { level: EnemyAiLevel; style: PlayerStyle; seeds: readonly number[]; variant?: DuelVariant }

/** One room × seeds × both starting players for a given collection session. */
export function evaluate(session: GameSession, room: string, options: EvaluateOptions): Stats {
  const stats = emptyStats()
  for (const seed of options.seeds) {
    for (const firstPlayer of ['player', 'opponent'] as const) {
      const duel = createV04BEncounterDuel(session, room, { random: seededRandom(seed), firstPlayer }).duel
      addResult(stats, playDuel(options.variant ? options.variant(duel) : duel, options.level, options.style))
    }
  }
  return stats
}

export const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index)
export const pct = (stats: Stats) => stats.games ? Math.round(1000 * stats.wins / stats.games) / 10 : 0
export const meanTurns = (stats: Stats) => stats.games ? Math.round(10 * stats.turnsSum / stats.games) / 10 : 0
