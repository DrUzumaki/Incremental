// Pharmacy minigame rules: fill a prescription by adding the right pills, then dispense.
// A risky "trial drug" dispense pays more (usually) with comedic side effects.
// Correct orders fill an IV bag that can be sent to another room as a timed buff.
// No drawing here; compoundingView.ts handles that.
import type { DeptState } from '../../core/state'
import { JARS, PHARMACY_LINES } from '../../data/pharmacy'

export interface Order {
  id: number
  counts: number[] // pills wanted per jar
  total: number
  timeLeft: number
  maxTime: number
}

export type PharmacyResult =
  | { kind: 'correct'; pay: number; risky: 'no' | 'good' | 'jackpot' | 'side'; message: string }
  | { kind: 'wrong'; lostCombo: number; message: string }
  | { kind: 'expired'; lostCombo: number; message: string }
  | { kind: 'buffReady' }

export interface PharmacyHost {
  stats(): Record<string, number>
  earn(amount: number): number
  dept(): DeptState
  report(result: PharmacyResult): void
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export class Compounding {
  order: Order
  tray: number[] = JARS.map(() => 0)
  combo = 0
  charge = 0 // correct orders toward the next caffeine IV
  private host: PharmacyHost
  private nextId = 1

  constructor(host: PharmacyHost) {
    this.host = host
    this.order = this.newOrder()
  }

  get multiplier(): number {
    const s = this.host.stats()
    return 1 + Math.min(this.combo * s.comboStep, s.comboCap)
  }

  private newOrder(): Order {
    const s = this.host.stats()
    const total = Math.round(s.minPills + Math.random() * (s.maxPills - s.minPills))
    const counts = JARS.map(() => 0)
    for (let i = 0; i < total; i++) counts[Math.floor(Math.random() * JARS.length)]++
    const time = s.orderTime + total // bigger orders get a little longer
    return { id: this.nextId++, counts, total, timeLeft: time, maxTime: time }
  }

  private next() {
    this.order = this.newOrder()
    this.tray = JARS.map(() => 0)
  }

  update(dt: number) {
    this.order.timeLeft -= dt
    if (this.order.timeLeft > 0) return
    const lostCombo = this.combo
    this.combo = 0
    this.next()
    this.host.report({ kind: 'expired', lostCombo, message: pick(PHARMACY_LINES.expired) })
  }

  addPill(jar: number) {
    const inTray = this.tray.reduce((a, b) => a + b, 0)
    if (jar < 0 || jar >= JARS.length || inTray >= this.order.total + 2) return
    this.tray[jar]++
  }

  clearTray() {
    this.tray = JARS.map(() => 0)
  }

  buffReady(): boolean {
    return this.charge >= this.host.stats().buffCost
  }

  // Spend a full IV bag. Returns the buff's multiplier and duration.
  takeBuff(): { mult: number; duration: number } | null {
    if (!this.buffReady()) return null
    const s = this.host.stats()
    this.charge = 0
    return { mult: s.buffMult, duration: s.buffDuration }
  }

  dispense(risky: boolean) {
    const s = this.host.stats()
    const match = this.tray.every((n, i) => n === this.order.counts[i])
    if (!match) {
      const lostCombo = this.combo
      this.combo = 0
      this.next()
      this.host.report({ kind: 'wrong', lostCombo, message: pick(PHARMACY_LINES.wrong) })
      return
    }
    let mult = 1
    let outcome: 'no' | 'good' | 'jackpot' | 'side' = 'no'
    let message = ''
    if (risky) {
      const roll = Math.random()
      if (roll < s.jackpotChance) {
        outcome = 'jackpot'
        mult = s.jackpotMult
        message = pick(PHARMACY_LINES.riskyJackpot)
      } else if (roll < s.jackpotChance + s.riskyChance) {
        outcome = 'good'
        mult = s.riskyMult
        message = pick(PHARMACY_LINES.riskyGood)
      } else {
        outcome = 'side'
        message = pick(PHARMACY_LINES.riskySide)
      }
    }
    const pay = this.host.earn(s.dosesPerPill * this.order.total * s.doseMult * mult * this.multiplier)
    this.combo++
    const dept = this.host.dept()
    dept.bestCombo = Math.max(dept.bestCombo, this.combo)
    const wasReady = this.buffReady()
    this.charge++
    this.next()
    this.host.report({ kind: 'correct', pay, risky: outcome, message })
    if (!wasReady && this.buffReady()) this.host.report({ kind: 'buffReady' })
  }
}
