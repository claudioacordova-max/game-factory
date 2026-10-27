/** H6: deterministic observations over the production engine, not a second combat engine. */
import { PLAYER_CARD_TYPES } from '../src/engine/content.js'
import {
  addCopyToActiveDeck, createGameSession, effectiveCopyCard, moveActiveDeckCopy,
  reinvokeCreatureType, reinvokeStatus, removeCopyFromActiveDeck,
} from '../src/engine/session.js'
import { createExplorationProgress } from '../src/engine/exploration.js'
import {
  declareAttackers, declareBlockers, endTurn, resolveCombat, startCombat, summonCreature,
} from '../src/engine/rules.js'
import { resolveEnemyBlocks, runEnemyTurn } from '../src/engine/enemy.js'
import {
  createExpeditionState, interactWorldObject, isExpeditionComplete, objectsForRoom, settleExpeditionEncounter,
} from '../src/engine/world.js'
import type { ExpeditionState } from '../src/engine/world.js'
import { isWalkable, ROOMS, roomWithObjects } from '../src/engine/spatial.js'
import type { Creature, DuelState } from '../src/engine/types.js'

type Test = { name: string; run: () => void }
export type Policy = 'pressure' | 'quality' | 'trades'
export type Route = 'progress' | 'recovery' | 'epic3'
export type DeckOrder = 'baseline' | 'offense' | 'endurance'
export interface Snapshot {
  maxLife: number; fatigue: number; owned: number; wounded: string[]; discovered: string[]
  copies: string[]; growth: Record<string, number>; chests: string[]; shrines: string[]
}
export interface EncounterObservation {
  encounter: string; purpose: string; winner: string; ownTurns: number; alternatingTurn: number
  actions: number; before: Snapshot; after: Snapshot; lost: string[]; deck: string[]; trace: string[]
  terminalHeroLife: number; survivingSummonedEpics: string[]
}
export interface Reinvocation { card: string; cost: number; maxBefore: number; maxAfter: number; copy: string }
export interface ExpeditionReport {
  route: string; order: DeckOrder; policy: Policy; outcome: 'complete' | 'recovered' | 'defeat' | 'inconclusive'
  diagnostic: string; encounters: EncounterObservation[]; reinvocations: Reinvocation[]
  final: Snapshot; ownTurns: number; actions: number; farms: number
}
const SEEDS = ['P01', 'P02', 'P03', 'P04']
const ORDERS: Record<DeckOrder, string[]> = {
  baseline: ['P01', 'P02', 'P11', 'P03', 'P04', 'P05', 'P06', 'P07', 'P09', 'P13', 'P16', 'P08', 'P12', 'P10', 'P15', 'P17', 'P14', 'P18'],
  offense: ['P02', 'P06', 'P11', 'P05', 'P09', 'P01', 'P03', 'P04', 'P16', 'P13', 'P18', 'P17', 'P14', 'P15', 'P10', 'P08', 'P07', 'P12'],
  endurance: ['P03', 'P09', 'P11', 'P01', 'P05', 'P04', 'P07', 'P06', 'P02', 'P16', 'P17', 'P18', 'P12', 'P15', 'P13', 'P14', 'P08', 'P10'],
}
export const EXPEDITION_LIMITS = { ownTurnsPerEncounter: 60, encountersPerRun: 100, r1RecoveryFarms: 20, trainingVictories: 3 } as const
const card = (id: string) => PLAYER_CARD_TYPES.find((entry) => entry.id === id)!
function ok(value: unknown, message: string): asserts value { if (!value) throw new Error(`H6 integrity: ${message}`) }
function unique(ids: string[]) { return new Set(ids).size === ids.length }
export function assertExpeditionIntegrity(state: ExpeditionState, duel?: DuelState): void {
  const s = state.session
  ok(unique(s.copies.map((c) => c.id)) && unique(s.copies.map((c) => c.cardId)), 'copy/type uniqueness')
  ok(unique(s.unlockedCardIds) && unique(s.activeDeckCopyIds), 'discovery/deck uniqueness')
  ok(s.activeDeckCopyIds.every((id) => s.copies.some((c) => c.id === id)), 'active reference')
  ok(s.copies.every((c) => s.unlockedCardIds.includes(c.cardId)), 'owned type discovered')
  ok(Number.isInteger(s.invokerMaxLife) && s.invokerMaxLife >= 1 && s.invokerMaxLife <= 20, 'max life 1..20')
  ok(s.invokerLife >= 0 && s.invokerLife <= s.invokerMaxLife && s.fatigue >= 0, 'persistent life/fatigue')
  ok(Number.isInteger(s.fatigue), 'integer fatigue')
  ok(unique(s.settledDuelIds) && unique(state.progress.settledDuelIds), 'settlement identity')
  ok(unique(state.claimedChestIds) && unique(state.usedShrineIds), 'single-use services')
  const legalDiscoveries = new Set(['P01', 'P02', 'P11', 'P03', 'P04', 'P05', 'P06', 'P07'])
  for (const [source, rewards] of [
    ['sector-1:chest', ['P09']], ['sector-2:chest', ['P10']],
    ['sector-3:chest', ['P14', 'P18']], ['rats-4:chest', ['P08', 'P12']],
  ] as const) if (state.claimedChestIds.includes(source)) rewards.forEach((id) => legalDiscoveries.add(id))
  if (state.progress.completedEncounterIds.includes('B1')) ['P13', 'P16'].forEach((id) => legalDiscoveries.add(id))
  if (state.progress.completedEncounterIds.includes('B2')) ['P15', 'P17'].forEach((id) => legalDiscoveries.add(id))
  ok(s.unlockedCardIds.every((id) => legalDiscoveries.has(id)), 'discovery has a legal source')
  for (const c of s.copies) {
    ok(!!card(c.cardId), 'catalog reference')
    ok(c.health > 0 && c.health <= effectiveCopyCard(card(c.cardId), c).maxHealth, 'individual health')
    ok(c.bonusAttack >= 0 && c.bonusAttack <= 3 && c.bonusHealth >= 0 && c.bonusHealth <= 3, 'growth cap')
    ok(card(c.cardId).growth === 'attack' ? c.bonusHealth === 0
      : card(c.cardId).growth === 'health' ? c.bonusAttack === 0 : c.bonusAttack + c.bonusHealth === 0, 'growth kind')
  }
  if (!duel) return
  ok(s.activeDuelId === duel.id, 'active duel ownership')
  const p = duel.players.player
  ok(p.level === 1 && p.mana >= 0 && p.mana <= Math.max(0, 1 - s.fatigue), 'usable player mana')
  const refs = [...p.hand, ...p.deck, ...p.creatures.map((c) => c.card)].map((c) => c.copyId!)
  ok(refs.every((id) => !!id && duel.participantCopyIds.includes(id) && s.copies.some((c) => c.id === id)), 'temporary reference')
  ok(unique(refs), 'disjoint hand/deck/field')
  ok(unique([...p.hand, ...p.deck, ...p.creatures.map((c) => c.card)].map((c) => c.id)), 'temporary types')
  for (const unit of [...p.creatures, ...duel.players.opponent.creatures]) {
    ok(unit.health > 0 && unit.health <= unit.card.maxHealth, 'live field health')
  }
  ok(p.life <= s.invokerMaxLife && (duel.phase === 'finished' || p.life > 0), 'combat life')
}
function snapshot(state: ExpeditionState): Snapshot {
  const s = state.session
  return {
    maxLife: s.invokerMaxLife, fatigue: s.fatigue, owned: s.copies.length,
    wounded: s.copies.filter((c) => c.health < effectiveCopyCard(card(c.cardId), c).maxHealth).map((c) => `${c.cardId}:${c.health}`),
    discovered: [...s.unlockedCardIds], copies: s.copies.map((c) => `${c.cardId}@${c.id}:${c.health}`),
    growth: Object.fromEntries(s.copies.filter((c) => card(c.cardId).growth).map((c) => [c.cardId, c.bonusAttack + c.bonusHealth])),
    chests: [...state.claimedChestIds], shrines: [...state.usedShrineIds],
  }
}
function interaction(state: ExpeditionState, anchor: string) {
  const object = objectsForRoom(state).find((o) => o.id === `${state.roomId}:${anchor}`)
  ok(object, `missing object ${anchor}`)
  // The fixed rooms have connected corridors. These nearby walkable approach poses use
  // production collision/range checks; this harness deliberately does not emulate movement.
  const room = roomWithObjects(ROOMS[state.roomId], objectsForRoom(state))
  const pose = [{ x: object.position.x + 1, z: object.position.z, yaw: 0 },
    { x: object.position.x - 1, z: object.position.z, yaw: 0 },
    { x: object.position.x, z: object.position.z + 1, yaw: 0 }].find((p) => isWalkable(room, p))
  ok(pose, 'walkable approach')
  const result = interactWorldObject(state, object.id, pose)
  assertExpeditionIntegrity(result.state, result.duel)
  return result
}
function value(unit: Creature): number {
  return unit.card.seed ? 1 : (unit.card.reinvokeCost ?? 1) * 3 + unit.card.attack + unit.health / 4
    + (unit.card.rarity === 'epic' ? 8 + (unit.card.growthProgress ?? 0) * 3 : 0)
}
/** Policy preference only: all damage and deaths in candidate results come from the engine. */
function score(before: DuelState, after: DuelState, policy: Policy): number {
  const lost = before.players.player.creatures.filter((u) => !after.players.player.creatures.some((v) => v.id === u.id))
  // Keep a gradient among lethal candidates so a greedy multi-threat defence can
  // accumulate several necessary blocks rather than tie on every partial defence.
  if (after.winner === 'opponent') return -1e8 + after.players.player.life * 10000 - lost.reduce((n, u) => n + value(u), 0)
  const ownDamage = before.players.player.creatures.reduce((n, u) => n + u.health, 0)
    - after.players.player.creatures.reduce((n, u) => n + u.health, 0)
  const enemyLost = before.players.opponent.creatures.filter((u) => !after.players.opponent.creatures.some((v) => v.id === u.id)).length
  const enemyDamage = before.players.opponent.creatures.reduce((n, u) => n + u.health, 0)
    - after.players.opponent.creatures.reduce((n, u) => n + u.health, 0)
  const heroDamage = before.players.player.life - after.players.player.life
  const faceDamage = before.players.opponent.kind === 'invoker' && after.players.opponent.kind === 'invoker'
    ? before.players.opponent.life - after.players.opponent.life : 0
  const costs = policy === 'pressure' ? [0.6, 0.15, 0.8] : policy === 'quality' ? [3, 0.8, 0.3] : [1.4, 0.4, 1.2]
  return (after.winner === 'player' ? 1e6 : 0) + faceDamage * (policy === 'pressure' ? 4 : 2)
    + enemyLost * 8 + enemyDamage * 1.5 - lost.reduce((n, u) => n + value(u), 0) * costs[0]
    - ownDamage * costs[1] - heroDamage * costs[2]
}
function combinations<T>(items: T[], max = 3): T[][] {
  const result: T[][] = []
  const visit = (start: number, prefix: T[]) => {
    if (prefix.length) result.push(prefix)
    if (prefix.length === max) return
    for (let i = start; i < items.length; i++) visit(i + 1, [...prefix, items[i]])
  }
  visit(0, [])
  return result
}
function choosePlayerAttack(duel: DuelState, policy: Policy, state: ExpeditionState): DuelState {
  const observe = (next: DuelState) => { assertExpeditionIntegrity(state, next); return next }
  const ready = observe(startCombat(duel))
  const units = ready.players.player.creatures.filter((u) => u.card.attack > 0)
  if (ready.mode === 'duel') {
    const resolve = (ids: string[]) => observe(resolveEnemyBlocks(observe(declareAttackers(ready, ids))))
    let ids = units.map((u) => u.id)
    let best = resolve(ids)
    // One removal sweep: do not throw away a valuable epic just to block all attackers.
    for (const unit of units) {
      const candidateIds = ids.filter((id) => id !== unit.id)
      const candidate = resolve(candidateIds)
      if (score(ready, candidate, policy) > score(ready, best, policy)) { ids = candidateIds; best = candidate }
    }
    return best
  }
  let targets: Record<string, string> = {}
  const resolve = (assignment: Record<string, string>) => observe(resolveCombat(observe(declareAttackers(ready, Object.keys(assignment), assignment))))
  let best = resolve(targets)
  // At most triples per target, followed by the whole remaining group. Multiple attackers
  // aimed at one enemy are resolved together, with production field-order retaliation.
  for (const enemy of ready.players.opponent.creatures) {
    const available = units.filter((u) => !targets[u.id])
    let chosen = targets
    for (const group of [...combinations(available), available]) {
      const candidateTargets = { ...targets, ...Object.fromEntries(group.map((u) => [u.id, enemy.id])) }
      const candidate = resolve(candidateTargets)
      if (score(ready, candidate, policy) > score(ready, best, policy)) { chosen = candidateTargets; best = candidate }
    }
    targets = chosen
  }
  return best
}
function choosePlayerBlocks(duel: DuelState, policy: Policy, state: ExpeditionState): DuelState {
  const observe = (next: DuelState) => { assertExpeditionIntegrity(state, next); return next }
  let assignments: Record<string, string[]> = {}
  const resolve = (blocks: Record<string, string[]>) => observe(resolveCombat(observe(declareBlockers(duel, blocks))))
  let best = resolve(assignments)
  // A bounded greedy sweep, considering singles, pairs, triples and all remaining blockers.
  // Start unblocked: quality deliberately spends nonlethal hero life to preserve copies.
  for (const enemy of duel.players.opponent.creatures.filter((u) => duel.attackers.includes(u.id))) {
    const used = new Set(Object.values(assignments).flat())
    const available = duel.players.player.creatures.filter((u) => !used.has(u.id))
    let chosen = assignments
    for (const group of [...combinations(available), available]) {
      const candidateAssignments = { ...assignments, [enemy.id]: group.map((u) => u.id) }
      const candidate = resolve(candidateAssignments)
      if (score(duel, candidate, policy) > score(duel, best, policy)) { chosen = candidateAssignments; best = candidate }
    }
    assignments = chosen
  }
  return best
}

class ExpeditionRun {
  state: ExpeditionState
  readonly encounters: EncounterObservation[] = []
  readonly reinvocations: Reinvocation[] = []
  actions = 0
  diagnostic = ''
  constructor(readonly route: string, readonly order: DeckOrder, readonly policy: Policy, initial = createExpeditionState()) {
    this.state = initial; assertExpeditionIntegrity(initial)
  }
  update(state: ExpeditionState) { this.state = state; this.actions++; assertExpeditionIntegrity(state) }
  interact(anchor: string) { const r = interaction(this.state, anchor); this.update(r.state); return r }
  reinvoke(ids = this.state.session.unlockedCardIds) {
    for (const id of ids) {
      const status = reinvokeStatus(this.state.session, id, PLAYER_CARD_TYPES)
      if (!status.allowed) continue
      const maxBefore = this.state.session.invokerMaxLife
      const session = reinvokeCreatureType(this.state.session, id, PLAYER_CARD_TYPES)
      const recreated = session.copies.at(-1)!
      ok(!this.state.session.copies.some((c) => c.id === recreated.id), 'new reinvocation identity')
      ok(recreated.health === card(id).maxHealth && recreated.bonusAttack + recreated.bonusHealth === 0, 'basic reinvocation')
      this.reinvocations.push({ card: id, cost: status.cost, maxBefore, maxAfter: session.invokerMaxLife, copy: session.copies.at(-1)!.id })
      this.update({ ...this.state, session })
    }
  }
  select(ids: string[]) {
    for (const id of [...this.state.session.activeDeckCopyIds]) {
      const c = this.state.session.copies.find((c) => c.id === id)!
      if (!ids.includes(c.cardId)) this.update({ ...this.state, session: removeCopyFromActiveDeck(this.state.session, id) })
    }
    for (const id of ids) {
      const copy = this.state.session.copies.find((c) => c.cardId === id)
      if (copy && !this.state.session.activeDeckCopyIds.includes(copy.id)) {
        this.update({ ...this.state, session: addCopyToActiveDeck(this.state.session, copy.id) })
      }
    }
    const desired = ids.flatMap((id) => this.state.session.copies.filter((c) => c.cardId === id).map((c) => c.id))
    for (let target = 0; target < desired.length; target++) {
      while (this.state.session.activeDeckCopyIds.indexOf(desired[target]) > target) {
        this.update({ ...this.state, session: moveActiveDeckCopy(this.state.session, desired[target], -1) })
      }
    }
  }
  prepare(ids = ORDERS[this.order]) { this.reinvoke(ids); this.select(ids) }
  chest() {
    if (objectsForRoom(this.state).some((o) => o.kind === 'chest' && o.status === 'available')) this.interact('chest')
  }
  shrine() {
    if (objectsForRoom(this.state).some((o) => o.kind === 'shrine' && o.status === 'available') && snapshot(this.state).wounded.length) this.interact('shrine')
  }
  summon(duel: DuelState, trace: string[]): DuelState {
    let next = duel
    for (let count = 0; count < 20; count++) {
      const p = next.players.player
      const affordable = p.hand.filter((c) => c.cost.mana <= p.mana && c.cost.sacrifices <= p.creatures.length)
      const free = affordable.filter((c) => c.cost.mana === 0 && c.cost.sacrifices === 0)
      const sorted = affordable.slice().sort((a, b) => {
        const priority = (id: string) => card(id).rarity === 'epic' ? 100 : card(id).attack * 2 + card(id).maxHealth
        return priority(b.id) - priority(a.id)
      })
      const chosen = free[0] ?? sorted[0]
      if (!chosen) break
      const sacrifices = [...p.creatures].sort((a, b) => value(a) - value(b)).slice(0, chosen.cost.sacrifices)
      if (sacrifices.some((u) => u.card.rarity === 'epic' || (!u.card.seed && u.card.attack >= chosen.attack))) break
      next = summonCreature(next, chosen.id, sacrifices.map((u) => u.id))
      this.actions++; assertExpeditionIntegrity(this.state, next)
      trace.push(`T${next.turn} summon ${chosen.id}${sacrifices.length ? ` sacrifice ${sacrifices.map((u) => u.card.id).join('+')}` : ''}`)
    }
    return next
  }
  fight(purpose: string, training: string[] = [], seedPlan?: [string, string][]): boolean {
    if (this.encounters.length >= EXPEDITION_LIMITS.encountersPerRun) { this.diagnostic = 'encounter limit; inconclusive'; return false }
    const before = snapshot(this.state)
    const deck = this.state.session.activeDeckCopyIds.map((id) => this.state.session.copies.find((c) => c.id === id)!.cardId)
    const beforeCopies = [...this.state.session.copies]
    const actionStart = this.actions
    const started = this.interact('enemy')
    ok(started.duel, 'encounter duel')
    let duel = started.duel
    ok(duel.players.player.life === before.maxLife, 'encounter starts at current persistent maximum')
    let ownTurns = 0
    const trace: string[] = []
    const observe = (next: DuelState) => { assertExpeditionIntegrity(this.state, next); return next }
    const checked = (next: DuelState, count = 1) => { this.actions += count; assertExpeditionIntegrity(this.state, next); return next }
    while (duel.phase !== 'finished' && ownTurns < EXPEDITION_LIMITS.ownTurnsPerEncounter) {
      ownTurns++
      duel = this.summon(duel, trace)
      const names = new Map([...duel.players.player.creatures, ...duel.players.opponent.creatures].map((u) => [u.id, u.card.id]))
      const waiting = training.some((id) => !duel.players.player.creatures.some((u) => u.card.id === id))
      if (seedPlan && ownTurns === 1) {
        const targets = Object.fromEntries(seedPlan.map(([own, target]) => {
          const a = duel.players.player.creatures.find((u) => u.card.id === own)
          const b = duel.players.opponent.creatures.find((u) => u.card.id === target)
          ok(a && b, 'seed recovery plan legal'); return [a.id, b.id]
        }))
        duel = checked(resolveCombat(observe(declareAttackers(observe(startCombat(duel)), Object.keys(targets), targets))), 3)
      } else if (waiting) {
        duel = checked(duel.mode === 'skirmish'
          ? resolveCombat(observe(declareAttackers(observe(startCombat(duel)), [], {})))
          : resolveEnemyBlocks(observe(declareAttackers(observe(startCombat(duel)), []))), duel.mode === 'duel' ? 4 : 3)
      } else duel = checked(choosePlayerAttack(duel, this.policy, this.state), duel.mode === 'duel' ? 4 : 3)
      trace.push(`T${duel.turn} attack ${duel.attackers.map((id) => `${names.get(id)}${duel.targets[id] ? `->${names.get(duel.targets[id])}` : ''}`).join(',') || 'pass'}; own ${duel.players.player.creatures.map((u) => `${u.card.id}:${u.health}`).join(',')}; hero ${duel.players.player.life}; enemy ${duel.players.opponent.kind === 'invoker' ? duel.players.opponent.life : duel.players.opponent.creatures.length}`)
      if (duel.phase === 'finished') break
      duel = checked(endTurn(duel))
      const handSize = duel.players.opponent.kind === 'invoker' ? duel.players.opponent.hand.length : 0
      const enemyTurn = runEnemyTurn(duel)
      const summons = enemyTurn.players.opponent.kind === 'invoker' ? handSize - enemyTurn.players.opponent.hand.length : 0
      duel = checked(enemyTurn, summons + (duel.mode === 'duel' ? 2 : 1))
      const defendingNames = new Map([...duel.players.player.creatures, ...duel.players.opponent.creatures].map((u) => [u.id, u.card.id]))
      // Training is a deliberate wait for eligible summons; avoid ending R1 by blocking
      // its only rat when the hero can safely absorb this turn. Resolve through the engine.
      const unblocked = waiting ? observe(resolveCombat(observe(declareBlockers(duel, {})))) : undefined
      duel = checked(unblocked && unblocked.winner !== 'opponent' ? unblocked : choosePlayerBlocks(duel, this.policy, this.state), 2)
      trace.push(`T${duel.turn} defend ${Object.entries(duel.blockers).map(([id, units]) => `${defendingNames.get(id)}<-${units.map((u) => defendingNames.get(u)).join('+')}`).join(',') || 'hero'}; hero ${duel.players.player.life}`)
      if (duel.phase !== 'finished') duel = checked(endTurn(duel))
    }
    if (duel.phase !== 'finished') this.diagnostic = `own-turn limit at ${duel.encounterId}; ${duel.players.player.creatures.map((u) => `${u.card.id}:${u.health}`).join(',')}; enemy ${duel.players.opponent.creatures.map((u) => `${u.card.id}:${u.health}`).join(',')}; hand ${duel.players.player.hand.map((c) => c.id).join(',')}`
    else {
      this.update(settleExpeditionEncounter(this.state, duel))
      ok(settleExpeditionEncounter(this.state, duel) === this.state, 'settlement must be idempotent')
      ok(this.state.session.settledDuelIds.filter((id) => id === duel.id).length === 1, 'settled once')
      for (const c of this.state.session.copies) {
        const previous = beforeCopies.find((p) => p.id === c.id)
        if (!previous) continue // Newly discovered reward, not a participating copy.
        const growthDelta = c.bonusAttack + c.bonusHealth - previous.bonusAttack - previous.bonusHealth
        ok(growthDelta === 0 || growthDelta === 1, 'at most one earned growth')
        if (growthDelta) ok(duel.winner === 'player' && duel.players.player.creatures.some((u) => u.copyId === c.id && u.health > 0), 'growth requires summoned survivor victory')
      }
    }
    const lost = beforeCopies.filter((c) => !this.state.session.copies.some((x) => x.id === c.id)).map((c) => `${c.cardId}@${c.id}`)
    this.encounters.push({ encounter: duel.encounterId!, purpose, winner: duel.winner ?? 'inconclusive', ownTurns,
      alternatingTurn: duel.turn, actions: this.actions - actionStart, before, after: snapshot(this.state), lost, deck, trace,
      terminalHeroLife: duel.players.player.life,
      survivingSummonedEpics: duel.players.player.creatures.filter((u) => !!u.card.growth).map((u) => u.card.id) })
    return duel.winner === 'player'
  }
  toSectorOne() {
    if (this.state.roomId.startsWith('rats-')) this.interact('wing')
    while (this.state.roomId !== 'sector-1') this.interact('back')
  }
  wing(purpose: string): boolean {
    this.toSectorOne(); this.interact('wing')
    for (let i = 1; i <= 4; i++) {
      this.prepare()
      if (!this.fight(purpose)) return false
      if (i < 4) this.interact('forward')
    }
    this.chest(); this.interact('wing'); return true
  }
  train(epics: string[], count = 3): boolean {
    this.toSectorOne()
    for (let i = 0; i < count; i++) {
      this.prepare(['P04', ...epics, 'P01', 'P03', 'P02'])
      this.interact('wing')
      if (!this.fight('epic-training', epics)) return false
      this.interact('wing')
    }
    return true
  }
  report(): ExpeditionReport {
    return { route: this.route, order: this.order, policy: this.policy,
      outcome: isExpeditionComplete(this.state) ? 'complete' : this.diagnostic ? 'inconclusive'
        : this.route.startsWith('critical-') && this.state.session.invokerMaxLife === 20 && this.state.session.fatigue === 0 ? 'recovered' : 'defeat',
      diagnostic: this.diagnostic, encounters: this.encounters, reinvocations: this.reinvocations,
      final: snapshot(this.state), ownTurns: this.encounters.reduce((n, e) => n + e.ownTurns, 0), actions: this.actions,
      farms: this.encounters.filter((e) => e.purpose !== 'progress').length }
  }
}

export function runExpedition(route: Route, order: DeckOrder, policy: Policy): ExpeditionReport {
  const run = new ExpeditionRun(route, order, policy)
  run.chest()
  if (route !== 'progress' && !run.wing('initial-wing')) return run.report()
  for (let boss = 1; boss <= 3; boss++) {
    // Explicit world travel: all sector gates must have been opened by actual victories.
    while (run.state.roomId !== `sector-${boss}`) run.interact('forward')
    run.chest(); run.prepare(); run.shrine()
    if (route === 'epic3' && boss >= 2) {
      const epics = run.state.session.unlockedCardIds.filter((id) => !!card(id).growth)
      if (!run.train(epics)) return run.report()
      while (run.state.roomId !== `sector-${boss}`) run.interact('forward')
      run.prepare(); run.shrine()
    }
    if (!run.fight('progress')) return run.report()
    if (route === 'recovery' && boss < 3 && !run.wing('between-boss-wing')) return run.report()
    if (boss < 3) run.interact('forward')
  }
  return run.report()
}
export function runExpeditionMatrix(): ExpeditionReport[] {
  return (['progress', 'recovery', 'epic3'] as Route[]).flatMap((route) =>
    (['baseline', 'offense', 'endurance'] as DeckOrder[]).flatMap((order) =>
      (['pressure', 'quality', 'trades'] as Policy[]).map((policy) => runExpedition(route, order, policy))))
}

/** Four independent continuations of one checkpoint earned from the eight initial copies.
 * No reward, wound, life, shrine availability or bonus is reset when branching. */
export function runEpicPreparationComparison(): ExpeditionReport[] {
  const checkpoint = new ExpeditionRun('earned-checkpoint', 'endurance', 'trades')
  checkpoint.chest(); checkpoint.prepare()
  ok(checkpoint.fight('progress'), 'comparison checkpoint requires a real B1 win')
  return ([0, 1, 2, 3] as const).map((victories) => {
    const run = new ExpeditionRun(`prepared-${victories}`, 'endurance', 'trades', structuredClone(checkpoint.state))
    run.encounters.push(...structuredClone(checkpoint.encounters))
    run.reinvocations.push(...structuredClone(checkpoint.reinvocations))
    run.actions = checkpoint.actions
    for (let boss = 2; boss <= 3; boss++) {
      while (run.state.roomId !== `sector-${boss}`) run.interact('forward')
      run.chest()
      const epics = run.state.session.unlockedCardIds.filter((id) => !!card(id).growth)
      if (victories && !run.train(epics, victories)) return run.report()
      while (run.state.roomId !== `sector-${boss}`) run.interact('forward')
      // Same early epic deck for all four treatments; the rest keeps endurance order.
      run.prepare([...new Set(['P04', ...epics, 'P01', 'P03', 'P02', ...ORDERS.endurance])])
      run.shrine()
      if (!run.fight('progress')) return run.report()
    }
    return run.report()
  })
}

/** Explicit critical fixture only at initialization; all following state is earned through real actions. */
export function runCriticalRecovery(fatigue: 1 | 4, mode: 'r1-max' | 'direct' = 'r1-max'): ExpeditionReport {
  const initialSession = createGameSession(SEEDS.map(card))
  const initial = createExpeditionState({ session: { ...initialSession, copies: [], activeDeckCopyIds: [],
    invokerMaxLife: 1, invokerLife: 1, fatigue }, progress: createExplorationProgress() })
  const run = new ExpeditionRun(`critical-fatigue-${fatigue}-${mode}`, 'baseline', 'trades', initial)
  // First rat wounds P01. Next rat trades P02. Later repeats rotate seeds and retain all wounds.
  for (let i = 0; mode === 'r1-max' && i < EXPEDITION_LIMITS.r1RecoveryFarms && run.state.session.invokerMaxLife < 20; i++) {
    run.prepare(SEEDS); run.interact('wing')
    const selected = i === 0 ? 'P01' : i === 1 ? 'P02' : 'P03'
    if (!run.fight('max-recovery', [], [[selected, 'E01']])) return run.report()
    run.interact('wing')
  }
  // Seed-only R1->R4, repeated until the initial fatigue has actually been removed.
  const plans: [string, string][][] = [
    [['P01', 'E01']], [['P01', 'E03'], ['P02', 'E03'], ['P03', 'E01']],
    [['P01', 'E01'], ['P02', 'E02'], ['P03', 'E04']],
  ]
  for (let cycle = 0; cycle < fatigue; cycle++) {
    run.interact('wing')
    for (let i = 0; i < 4; i++) {
      run.prepare(SEEDS)
      if (!run.fight('fatigue-recovery', [], i < 3 ? plans[i] : undefined)) return run.report()
      if (i < 3) run.interact('forward')
    }
    run.chest(); run.interact('wing')
  }
  return run.report()
}

export const expeditionTests: Test[] = [
  { name: 'H6 - 27 deterministic expeditions preserve integrity; results are balance observations', run: () => {
    const reports = runExpeditionMatrix()
    ok(reports.length === 27, 'matrix size')
    ok(unique(reports.map((r) => `${r.route}/${r.order}/${r.policy}`)), 'matrix cells distinct')
    for (const r of reports) {
      ok(r.encounters.length > 0, 'real encounter attempted')
      ok(r.outcome !== 'inconclusive' || !!r.diagnostic, 'bounded run diagnostic')
    }
  } },
  { name: 'H6 - earned checkpoint supports observed 0/1/2/3 epic preparation without synthetic growth', run: () => {
    const reports = runEpicPreparationComparison()
    ok(reports.length === 4, 'four training treatments')
    const first = reports[0].encounters[0]
    for (const [victories, r] of reports.entries()) {
      ok(r.route === `prepared-${victories}`, 'distinct ordered 0/1/2/3 treatments')
      ok(JSON.stringify(r.encounters[0]) === JSON.stringify(first), 'identical legally earned checkpoint')
      const bossIndices = ['B1', 'B2', 'B3'].map((id) => r.encounters.findIndex((e) => e.encounter === id))
      ok(bossIndices[0] === 0 && bossIndices[1] > 0 && bossIndices[2] > bossIndices[1], 'both preparation stages reach their measured boss attempts')
      ok(r.encounters.filter((e) => e.purpose === 'epic-training').length === victories * 2, 'exact training count across both stages')
      const identity = (s: Snapshot, id: string) => s.copies.find((entry) => entry.startsWith(`${id}@`))?.split(':')[0]
      for (let stage = 1; stage <= 2; stage++) {
        const previous = r.encounters[bossIndices[stage - 1]]
        const boss = r.encounters[bossIndices[stage]]
        const training = r.encounters.slice(bossIndices[stage - 1] + 1, bossIndices[stage])
        ok(training.length === victories, `stage ${stage}: exact requested number of R1 training victories`)
        ok(training.every((e) => e.encounter === 'R1' && e.purpose === 'epic-training' && e.winner === 'player'), 'training consists of real R1 victories in the correct stage')
        const epics = boss.before.discovered.filter((id) => !!card(id).growth)
        const intendedEpics = stage === 1 ? ['P16'] : ['P16', 'P17', 'P18']
        ok(JSON.stringify([...epics].sort()) === JSON.stringify(intendedEpics), 'stage includes every epic from its legal discovery sources')
        for (const id of epics) {
          const cap = Math.min(3, card(id).growthCap ?? 3)
          let expectedBonus = previous.after.growth[id] ?? 0
          // Existing survivors retain their identity; newly discovered/recreated copies
          // establish it before training. No treatment may replace a growing copy.
          const copyIdentity = identity(previous.after, id) ?? identity(training[0]?.before ?? boss.before, id)
          ok(copyIdentity, 'training epic has an owned copy identity')
          for (const e of training) {
            ok(identity(e.before, id) === copyIdentity && identity(e.after, id) === copyIdentity, 'same epic copy survives each training victory')
            ok(e.deck.includes(id) && e.survivingSummonedEpics.includes(id), 'each intended epic was selected, summoned and survived')
            ok(!e.lost.some((lost) => lost === copyIdentity), 'trained copy was not killed or sacrificed')
            ok(e.before.growth[id] === expectedBonus, 'earned bonus persists into the next training victory')
            expectedBonus = Math.min(cap, expectedBonus + 1)
            ok(e.after.growth[id] === expectedBonus, 'each eligible victory earns exactly one bonus up to cap')
          }
          ok(identity(boss.before, id) === copyIdentity, 'trained copy reaches the measured boss attempt')
          ok(boss.before.growth[id] === expectedBonus, 'boss begins with exactly the legally earned treatment bonus')
        }
      }
    }
  } },
  { name: 'H6 - critical seed-only recovery records actual wounds, casualties, reinvocation and repeat R4', run: () => {
    for (const fatigue of [1, 4] as const) {
      for (const mode of ['r1-max', 'direct'] as const) {
        const r = runCriticalRecovery(fatigue, mode)
        ok(!r.diagnostic, `rescue inconclusive: ${r.diagnostic}`)
        ok(r.encounters.every((e) => e.winner === 'player'), 'scripted rescue must actually win')
        ok(r.final.maxLife === 20 && r.final.fatigue === 0, 'recovery target')
        ok(r.encounters.filter((e) => e.encounter === 'R4').length === fatigue, 'R4 repeated for each fatigue')
        ok(r.encounters.some((e) => e.lost.length) && r.encounters.some((e) => e.after.wounded.length), 'persistent losses/wounds')
        ok(r.reinvocations.length > 4 && r.reinvocations.every((x) => x.cost === 0), 'free repeated seed recreation')
        ok(r.final.chests.length === 1 && r.final.chests[0] === 'rats-4:chest', 'single earned chest')
      }
    }
  } },
]
