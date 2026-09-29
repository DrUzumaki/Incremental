// The game: owns the state and every department's rules, and advances them over time.
// Knows nothing about drawing; the screen listens to `bus` events.
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { ECONOMY } from '../data/economy'
import type { TreeId } from '../data/tree'
import { TREES } from '../data/trees'
import { Ecg } from '../departments/cardiology/ecg'
import { Triage } from '../departments/emergency/triage'
import { EventBus, type EarnSource } from './events'
import { Pager } from './pager'
import { treeLevels, type GameState } from './state'
import { buyNode, computeStats } from './tree'

export class Game {
  readonly state: GameState
  readonly bus = new EventBus()
  readonly triage: Triage
  readonly ecg: Ecg
  readonly pager: Pager
  viewing: DeptId = 'emergency' // the room on screen; only its minigame runs
  pauseWhenHidden = true // dev testing can turn this off to play in a hidden tab
  // Smoothed income per second for each department (drives visual intensity).
  readonly incomeRate: Record<DeptId, number> = { emergency: 0, cardiology: 0, pharmacy: 0, surgery: 0 }
  private earnedThisTick: Record<DeptId, number> = { emergency: 0, cardiology: 0, pharmacy: 0, surgery: 0 }

  constructor(state: GameState) {
    this.state = state
    // Root nodes are always owned (trees can gain a new root after a save was made).
    for (const tree of Object.values(TREES)) {
      const levels = treeLevels(state, tree.id)
      for (const n of tree.nodes) if (n.root) levels[n.id] = Math.max(1, levels[n.id] ?? 0)
    }
    // Keep unlocks consistent with sign-offs (e.g. after loading an older save).
    for (const id of DEPT_ORDER) {
      const after = DEPTS[id].unlockAfter
      if (after && state.depts[after].signedOff) state.depts[id].unlocked = true
    }
    this.triage = new Triage({
      stats: () => this.stats('emergency'),
      earn: (amount) => this.earn('emergency', amount, 'active'),
      dept: () => this.state.depts.emergency,
      report: (result, patientId, choice) => this.bus.emit('triage', { result, patientId, choice }),
    })
    this.ecg = new Ecg({
      stats: () => this.stats('cardiology'),
      earn: (amount) => this.earn('cardiology', amount, 'active'),
      dept: () => this.state.depts.cardiology,
      report: (result) => this.bus.emit('ecg', result),
    })
    this.pager = new Pager({
      unlocked: () => DEPT_ORDER.filter((d) => this.state.depts[d].unlocked),
      viewing: () => this.viewing,
      autoRespond: () => this.stats('emergency').autoPage > 0,
      durationMult: () => this.stats('emergency').pagerDuration ?? 1,
      onPage: (page) => this.bus.emit('page', page),
      onBoost: (boost, auto) => this.bus.emit('boost', { boost, auto }),
    })
  }

  stats(tree: TreeId): Record<string, number> {
    return computeStats(this.state, tree)
  }

  // Everything that multiplies a department's income: its own tree, patient flow
  // exported from Emergency, synergy nodes, and pager boosts. (Trials and buffs join later.)
  incomeMultiplier(dept: DeptId): number {
    let m = this.stats(dept).incomeMult ?? 1
    if (dept !== 'emergency') m *= 1 + (this.stats('emergency').flowExport ?? 0)
    m *= this.synergyMult(dept)
    m *= this.pager.boostMult(dept)
    return m
  }

  // Synergy nodes boost both their own department and the one they point toward.
  synergyMult(dept: DeptId): number {
    let m = 1
    for (const id of DEPT_ORDER) {
      const levels = this.state.depts[id].nodes
      for (const node of TREES[id].nodes) {
        const lv = levels[node.id] ?? 0
        if (!lv || !node.towards || (id !== dept && node.towards !== dept)) continue
        for (const e of node.effects) if (e.stat === 'synergy' && e.add) m *= 1 + e.add * lv
      }
    }
    return m
  }

  // Cardiology's exported tempo speeds up every room's idle staff.
  tempo(): number {
    return this.state.depts.cardiology.unlocked ? 1 + this.stats('cardiology').tempo : 1
  }

  // Idle income per second before the income multiplier.
  rawIdleRate(dept: DeptId): number {
    let rate = 0
    if (dept === 'emergency') {
      const s = this.stats('emergency')
      rate = s.nurses * s.nurseRate * s.nurseMult
    } else if (dept === 'cardiology') {
      const s = this.stats('cardiology')
      rate = s.techs * s.techRate * s.techMult + s.pacemakers * s.pacemakerRate * s.pacemakerMult
    }
    return rate * this.tempo()
  }

  idleRate(dept: DeptId): number {
    return this.rawIdleRate(dept) * this.incomeMultiplier(dept)
  }

  // Add money to a department. Returns the amount actually earned after multipliers.
  earn(dept: DeptId, raw: number, source: EarnSource): number {
    const amount = source === 'offline' ? raw : raw * this.incomeMultiplier(dept)
    const d = this.state.depts[dept]
    d.currency += amount
    d.lifetime += amount
    this.earnedThisTick[dept] += amount
    this.bus.emit('earn', { dept, amount, source })
    this.checkProgress(dept)
    return amount
  }

  // Pay out idle income for time spent away. Returns what each department earned.
  applyOffline(seconds: number): { seconds: number; earned: Partial<Record<DeptId, number>> } {
    const paid = Math.min(seconds, ECONOMY.offlineCapHours * 3600)
    const earned: Partial<Record<DeptId, number>> = {}
    for (const id of DEPT_ORDER) {
      if (!this.state.depts[id].unlocked) continue
      const amount = this.idleRate(id) * paid * ECONOMY.offlineEfficiency
      if (amount > 0) earned[id] = this.earn(id, amount, 'offline')
    }
    return { seconds, earned }
  }

  buy(tree: TreeId, node: string): boolean {
    if (!buyNode(this.state, tree, node)) return false
    this.bus.emit('purchase', { tree, node })
    return true
  }

  private checkProgress(dept: DeptId) {
    const d = this.state.depts[dept]
    while (d.milestone < ECONOMY.milestones.length && d.lifetime >= ECONOMY.milestones[d.milestone]) {
      this.bus.emit('milestone', { dept, value: ECONOMY.milestones[d.milestone] })
      d.milestone++
    }
    if (!d.signedOff && d.lifetime >= ECONOMY.signOff) {
      d.signedOff = true
      this.bus.emit('signOff', { dept })
      for (const id of DEPT_ORDER) {
        if (DEPTS[id].unlockAfter === dept && !this.state.depts[id].unlocked) {
          this.state.depts[id].unlocked = true
          this.bus.emit('unlock', { dept: id })
        }
      }
    }
  }

  // One step of game time. `active` is false while the tab is hidden, so the
  // minigame pauses (patients don't walk out) but idle staff keep earning.
  update(dt: number, active: boolean) {
    this.state.playTime += dt
    for (const id of DEPT_ORDER) {
      if (!this.state.depts[id].unlocked) continue
      const raw = this.rawIdleRate(id) * dt
      if (raw > 0) this.earn(id, raw, 'idle')
    }
    if (active) this.pager.update(dt)
    if (active && this.viewing === 'emergency') this.triage.update(dt)
    if (active && this.viewing === 'cardiology') this.ecg.update(dt)

    const k = Math.min(1, ECONOMY.incomeRateSmoothing * dt * 10)
    for (const id of DEPT_ORDER) {
      this.incomeRate[id] += (this.earnedThisTick[id] / dt - this.incomeRate[id]) * k
      this.earnedThisTick[id] = 0
    }
  }
}
