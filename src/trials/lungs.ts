// Lungs trial rules: hold to breathe in, release to breathe out.
// Keep the lung volume inside a drifting green band to keep oxygen up.
import { LUNGS } from '../data/trials'
import type { OrganLogic } from './types'

export class LungsLogic implements OrganLogic {
  volume = 0.5 // 0 = empty, 1 = full
  holding = false
  oxygen = 1
  t = 0
  readonly bandHalf: number
  private speed: number
  private drain: number
  private nextCough = LUNGS.coughEvery
  coughAt = -9 // time of the last cough (for the view)

  constructor(difficulty: number) {
    this.bandHalf = Math.max(LUNGS.minBandHalf, LUNGS.bandHalf - LUNGS.bandShrink * difficulty)
    this.speed = LUNGS.bandSpeed + LUNGS.bandSpeedUp * difficulty
    this.drain = LUNGS.drain + LUNGS.drainUp * difficulty
  }

  // Where the band's centre is right now (two waves so it isn't predictable).
  bandCenter(): number {
    const c = 0.5 + 0.26 * Math.sin(this.t * this.speed) + 0.1 * Math.sin(this.t * this.speed * 2.3 + 1)
    return Math.min(1 - this.bandHalf, Math.max(this.bandHalf, c))
  }

  inBand(): boolean {
    return Math.abs(this.volume - this.bandCenter()) <= this.bandHalf
  }

  update(dt: number) {
    this.t += dt
    this.volume += (this.holding ? LUNGS.rise : -LUNGS.fall) * dt
    if (this.t >= this.nextCough) {
      this.nextCough = this.t + LUNGS.coughEvery * (0.7 + Math.random() * 0.6)
      this.volume += (Math.random() < 0.5 ? -1 : 1) * 0.25
      this.coughAt = this.t
    }
    this.volume = Math.min(1, Math.max(0, this.volume))
    this.oxygen += (this.inBand() ? LUNGS.regen : -this.drain) * dt
    this.oxygen = Math.min(1, this.oxygen)
  }

  failed() {
    return this.oxygen <= 0
  }

  status() {
    return `O2 ${Math.max(0, Math.round(this.oxygen * 100))}%`
  }
}
