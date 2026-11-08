/**
 * M8c balance report (not part of the suite). From projects/juego-cartas:
 *   npx.cmd tsc -p tsconfig.test.json && node .test-dist/tests/balanceRun.js [--quick] [--what-if]
 * Prints Markdown tables to stdout. Deterministic: seeds 1-20 (`--quick`: 1-5), both starting players.
 */
import { createV04BInitialSession, V04B_ENCOUNTERS } from '../src/engine/index.js'
import type { GameSession } from '../src/engine/index.js'
import type { EnemyAiLevel } from '../src/engine/enemy.js'
import { Expedition, runFullWalk, runMinimalWalk } from './m8b.js'
import { evaluate, meanTurns, pct, range, ROOMS, STYLES } from './balance.js'
import type { Stats } from './balance.js'
import { WHAT_IFS } from './balanceWhatIf.js'

const args: string[] = (globalThis as { process?: { argv: string[] } }).process?.argv ?? []
const quick = args.includes('--quick')
const seeds = range(1, quick ? 5 : 20)
const LEVELS: readonly EnemyAiLevel[] = [1, 2]
const name = (room: string) => V04B_ENCOUNTERS.find((entry) => entry.id === room)!.name

/** Expected collection per room: the session the full walk (11 chests) has when it reaches that fight; 02..06 etc. */
function expectedSessions(): Map<string, GameSession> {
  const sessions = new Map<string, GameSession>()
  const run = new Expedition(undefined, 1)
  run.onFight = (room, session) => { sessions.set(room, session) }
  runFullWalk(run)
  return sessions
}

function cell(stats: Stats) { return `${pct(stats)}% · ${meanTurns(stats)}/${stats.turnsMax} · E${stats.echoGames}/${stats.echoMax}` }

function table(title: string, sessionFor: (room: string) => GameSession) {
  console.log(`\n### ${title}\n`)
  console.log('Celda: % victorias del jugador · turnos medios/máximos · E = duelos con Eco / tamaño máximo del Eco.\n')
  console.log(`| Sala | Encuentro | ${STYLES.flatMap((style) => LEVELS.map((level) => `${style} vs N${level}`)).join(' | ')} |`)
  console.log(`|---|---|${STYLES.flatMap(() => LEVELS.map(() => '---')).join('|')}|`)
  for (const room of ROOMS) {
    const cells = STYLES.flatMap((style) => LEVELS.map((level) => cell(evaluate(sessionFor(room), room, { level, style, seeds }))))
    console.log(`| ${room} | ${name(room)} | ${cells.join(' | ')} |`)
  }
}

function walkLine(label: string, run: Expedition) {
  const fights = run.fights.map((fight) => `${fight.room}×${fight.attempts}${fight.level === 1 && run.rivalLevel === 2 ? '*' : ''}`).join(' ')
  console.log(`- ${label}: ${fights}${run.blocked.length ? ` · salas sin victoria en el límite: ${run.blocked.map((entry) => `${entry.room} (${entry.attempts} intentos)`).join(', ')}` : ''}`)
}

console.log(`# Datos de la simulación M8c (semillas 1-${seeds.at(-1)}, ambos jugadores iniciales)`)
const initial = createV04BInitialSession()
table('Colección inicial (8 cartas)', () => initial)
const expected = expectedSessions()
table('Colección esperada en ese punto del recorrido completo (cofres previos)', (room) => expected.get(room) ?? initial)

console.log('\n### Recorrido 01→19 (intentos hasta la primera victoria por sala; `*` = sala repetida contra nivel 1 tras agotar el límite)\n')
for (const level of LEVELS) {
  const full = new Expedition(undefined, level); full.fallback = true; runFullWalk(full); walkLine(`completo, rival nivel ${level}`, full)
  const minimal = new Expedition(undefined, level); minimal.fallback = true; runMinimalWalk(minimal); walkLine(`ruta mínima, rival nivel ${level}`, minimal)
}

if (args.includes('--what-if')) {
  console.log('\n### Propuestas simuladas (solo en la simulación; rival nivel 2; % de victorias base → con propuesta, estilos agresivo/prudente)\n')
  console.log('| Propuesta | Sala | Colección inicial | Colección esperada | Turnos medios (inicial, agr.) |')
  console.log('|---|---|---|---|---|')
  for (const whatIf of WHAT_IFS) {
    const row = (session: GameSession) => STYLES.map((style) => {
      const base = evaluate(session, whatIf.room, { level: 2, style, seeds })
      const changed = evaluate(session, whatIf.room, { level: 2, style, seeds, variant: whatIf.variant })
      return { text: `${pct(base)} → ${pct(changed)}`, turns: `${meanTurns(base)} → ${meanTurns(changed)}` }
    })
    const initialRow = row(initial), expectedRow = row(expected.get(whatIf.room) ?? initial)
    console.log(`| ${whatIf.name} | ${whatIf.room} | ${initialRow.map((r) => r.text).join(' / ')} | ${expectedRow.map((r) => r.text).join(' / ')} | ${initialRow[0].turns} |`)
  }
}
