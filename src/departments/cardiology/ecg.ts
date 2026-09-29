// ECG minigame rules: beats scroll toward a line; tap as each one crosses it.
// Now and then the rhythm turns into VF: wait for the defibrillator to charge, then shock
// for a jackpot. No drawing here; ecgView.ts handles that.
import type { DeptState } from '../../core/state'
import { ECG, ECG_LINES } from '../../data/cardiology'

export interface Beat {
  id: number
  t: number // game time when the beat crosses the line
  state: 'coming' | 'hit' | 'missed'
  quality?: 'perfect' | 'good'
}

export interface Vf {
  start: number // time the VF reaches the line
  end: number
  chargedAt: number // time the defibrillator is ready
}

export type EcgResult =
  | { kind: 'hit'; quality: 'perfect' | 'good'; pay: number }
  | { kind: 'miss'; lostCombo: number; message: string }
  | { kind: 'shock'; pay: number; message: string }
  | { kind: 'early'; message: string }
  | { kind: 'converted'; message: string }

export interface EcgHost {
  stats(): Record<string, number> // Cardiology tree stats
  earn(amount: number): number // returns the amount after multipliers
  dept(): DeptState
  report(result: EcgResult): void
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

export class Ecg {
  time = 0
  combo = 0
  readonly beats: Beat[] = []
  vf: Vf | null = null
  private host: EcgHost
  private nextBeat = ECG.firstBeatDelay
  private nextVf = ECG.vfFirstAt
  private nextId = 1

  constructor(host: EcgHost) {
    this.host = host
  }

  get multiplier(): number {
    const s = this.host.stats()
    return 1 + Math.min(this.combo * s.comboStep, s.comboCap)
  }

  private beatPay(s: Record<string, number>) {
    return s.beatValue * s.beatMult
  }

  update(dt: number) {
    const s = this.host.stats()
    this.time += dt

    // Plan the next VF episode once it's about to scroll onto the screen.
    if (!this.vf && this.time + ECG.lookahead >= this.nextVf) {
      const start = this.nextVf
      this.vf = { start, end: start + s.vfDuration, chargedAt: start + s.chargeTime }
    }

    // Schedule beats ahead of time, leaving a gap around VF.
    while (this.nextBeat < this.time + ECG.lookahead) {
      const vf = this.vf
      if (vf && this.nextBeat > vf.start - ECG.vfLeadIn && this.nextBeat < vf.end + ECG.vfLeadIn) {
        this.nextBeat = vf.end + ECG.vfLeadIn
        continue
      }
      this.beats.push({ id: this.nextId++, t: this.nextBeat, state: 'coming' })
      this.nextBeat += 60 / s.bpm
    }

    // Beats that slipped past the line without a tap are missed.
    for (const b of this.beats) {
      if (b.state === 'coming' && b.t < this.time - s.goodWindow) {
        b.state = 'missed'
        if (this.combo > 0) this.breakCombo()
      }
    }
    // Forget beats that have scrolled off the left of the screen.
    while (this.beats.length && this.beats[0].t < this.time - ECG.lookahead) this.beats.shift()

    // VF that nobody shocked ends by itself.
    if (this.vf && this.time > this.vf.end) {
      this.vf = null
      this.scheduleVf(s)
      this.host.report({ kind: 'converted', message: pick(ECG_LINES.converted) })
    }
  }

  private scheduleVf(s: Record<string, number>) {
    this.nextVf = this.time + s.vfEvery * (1 - ECG.vfJitter + Math.random() * ECG.vfJitter * 2)
  }

  private breakCombo() {
    const lostCombo = this.combo
    this.combo = 0
    this.host.report({ kind: 'miss', lostCombo, message: pick(ECG_LINES.miss) })
  }

  inVf(): boolean {
    return !!this.vf && this.time >= this.vf.start && this.time <= this.vf.end
  }

  // The player taps (click or Space).
  tap() {
    const s = this.host.stats()
    const vf = this.vf
    if (vf && this.inVf()) {
      if (this.time < vf.chargedAt) {
        this.host.report({ kind: 'early', message: pick(ECG_LINES.early) })
        return
      }
      const pay = this.host.earn(this.beatPay(s) * s.jackpotMult * this.multiplier)
      this.vf = null
      this.scheduleVf(s)
      this.nextBeat = Math.max(this.nextBeat, this.time + ECG.vfLeadIn * 2)
      this.host.report({ kind: 'shock', pay, message: pick(ECG_LINES.shock) })
      return
    }

    // The nearest beat still coming, if it's close enough to the line.
    let best: Beat | null = null
    for (const b of this.beats) {
      if (b.state !== 'coming') continue
      if (!best || Math.abs(b.t - this.time) < Math.abs(best.t - this.time)) best = b
    }
    const off = best ? Math.abs(best.t - this.time) : Infinity
    if (!best || off > s.goodWindow) {
      if (this.combo > 0) this.breakCombo()
      return
    }
    const quality = off <= s.perfectWindow ? 'perfect' : 'good'
    best.state = 'hit'
    best.quality = quality
    const pay = this.host.earn(this.beatPay(s) * (quality === 'perfect' ? s.perfectMult : 1) * this.multiplier)
    this.combo++
    const dept = this.host.dept()
    dept.bestCombo = Math.max(dept.bestCombo, this.combo)
    this.host.report({ kind: 'hit', quality, pay })
  }
}
