// The game: owns the state and every department's rules, and advances them over time.
// Knows nothing about drawing; the screen listens to `bus` events.
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { ECONOMY } from '../data/economy'
import type { TreeId } from '../data/tree'
import { TREES } from '../data/trees'
import { Ecg } from '../departments/cardiology/ecg'
import { Triage } from '../departments/emergency/triage'
import { Compounding } from '../departments/pharmacy/compounding'
import { Suture } from '../departments/surgery/suture'
import { EventBus, type EarnSource } from './events'
import { Pager } from './pager'
import { trialMult } from './trials'
import { treeLevels, type GameState } from './state'
import { buyNode, computeStats } from './tree'

// A timed income boost sent from the Pharmacy to another room.
export interface Buff {
  dept: DeptId
  mult: number
  until: number // game time (state.playTime)
}

export class Game {
  readonly state: GameState
  readonly bus = new EventBus()
  readonly triage: Triage
  readonly ecg: Ecg
  readonly pager: Pager
  readonly pharmacy: Compounding
  readonly surgery: Suture
  readonly buffs: Buff[] = []
  viewing: DeptId = 'emergency' // the room on screen; only its minigame runs
  pauseWhenHidden = true // dev testing can turn this off to play in a hidden tab
  inTrial = false // an organ trial or boss is being played; room minigames pause
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
    this.pharmacy = new Compounding({
      stats: () => this.stats('pharmacy'),
      earn: (amount) => this.earn('pharmacy', amount, 'active'),
      dept: () => this.state.depts.pharmacy,
      report: (result) => this.bus.emit('pharmacy', result),
    })
    this.surgery = new Suture({
      stats: () => this.stats('surgery'),
      earn: (amount) => this.earn('surgery', amount, 'active'),
      dept: () => this.state.depts.surgery,
      state: () => this.state,
      report: (result) => this.bus.emit('surgery', result),
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

  // Everything that multiplies a department's income: its own tree, cleared organ trials,
  // the Publications tree, patient flow exported from Emergency, synergy nodes, and pager boosts.
  incomeMultiplier(dept: DeptId): number {
    let m = this.stats(dept).incomeMult ?? 1
    m *= trialMult(this.state, dept)
    m *= this.stats('publications').globalIncome ?? 1
    m *= this.perkMult()
    if (dept !== 'emergency') m *= 1 + (this.stats('emergency').flowExport ?? 0)
    m *= this.synergyMult(dept)
    m *= this.pager.boostMult(dept)
    m *= this.buffMult(dept)
    return m
  }

  // Surgery's permanent perks: every N completed operations, every room earns a bit more.
  perks(): number {
    return Math.floor(this.state.surgeryOps / this.stats('surgery').perkEvery)
  }

  perkMult(): number {
    return 1 + this.perks() * this.stats('surgery').perkPower
  }

  buffMult(dept: DeptId): number {
    return this.buffs.find((b) => b.dept === dept)?.mult ?? 1
  }

  buffLeft(dept: DeptId): number {
    return Math.max(0, ...this.buffs.filter((b) => b.dept === dept).map((b) => b.until - this.state.playTime))
  }

  // Send the Pharmacy's full IV bag to a room.
  sendBuff(dept: DeptId): boolean {
    const b = this.pharmacy.takeBuff()
    if (!b) return false
    // IVs to the same room don't stack: keep the stronger one and the later end time.
    const until = this.state.playTime + b.duration
    let buff = this.buffs.find((x) => x.dept === dept)
    if (buff) {
      buff.mult = Math.max(buff.mult, b.mult)
      buff.until = Math.max(buff.until, until)
    } else {
      buff = { dept, mult: b.mult, until }
      this.buffs.push(buff)
    }
    this.bus.emit('buff', buff)
    return true
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
    } else if (dept === 'pharmacy') {
      const s = this.stats('pharmacy')
      rate = s.dispensers * s.dispenserRate * s.dispenserMult
    } else {
      const s = this.stats('surgery')
      rate = (s.residents * s.residentRate + s.robots * s.robotRate) * s.residentMult
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
      const amount = this.idleRate(id) * paid * ECONOMY.offlineEfficiency * (this.stats('publications').offlineMult ?? 1)
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
    const playing = active && !this.inTrial
    if (playing) this.pager.update(dt)
    if (playing && this.viewing === 'emergency') this.triage.update(dt)
    if (playing && this.viewing === 'cardiology') this.ecg.update(dt)
    if (playing && this.viewing === 'pharmacy') this.pharmacy.update(dt)
    if (playing && this.viewing === 'surgery') this.surgery.update(dt)
    for (let i = this.buffs.length - 1; i >= 0; i--) if (this.buffs[i].until <= this.state.playTime) this.buffs.splice(i, 1)

    const k = Math.min(1, ECONOMY.incomeRateSmoothing * dt * 10)
    for (const id of DEPT_ORDER) {
      this.incomeRate[id] += (this.earnedThisTick[id] / dt - this.incomeRate[id]) * k
      this.earnedThisTick[id] = 0
    }
  }
}
