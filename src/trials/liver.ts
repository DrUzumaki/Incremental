// Liver trial rules: toxins and nutrients fall; move the liver to catch toxins and let
// nutrients pass. Missed toxins and caught nutrients both do damage.
import { LIVER } from '../data/trials'
import type { OrganLogic } from './types'

export const LIVER_Y = 388 // the liver's height on screen

export interface Drop {
  active: boolean
  x: number
  y: number
  toxin: boolean
  spin: number
}

export class LiverLogic implements OrganLogic {
  readonly drops: Drop[] = Array.from({ length: 40 }, () => ({ active: false, x: 0, y: 0, toxin: true, spin: 0 }))
  x = 400 // centre of the liver
  damage = 0
  filtered = 0
  t = 0
  keys = { left: false, right: false }
  lastHit: { t: number; good: boolean; x: number } | null = null
  private spawnIn = 0.8
  private spawnEvery: number
  private speed: number

  constructor(difficulty: number) {
    this.spawnEvery = Math.max(LIVER.minSpawn, LIVER.spawnEvery - LIVER.spawnFaster * difficulty)
    this.speed = LIVER.fallSpeed + LIVER.fallSpeedUp * difficulty
  }

  moveTo(x: number) {
    const half = LIVER.paddleWidth / 2
    this.x = Math.max(half, Math.min(800 - half, x))
  }

  update(dt: number) {
    this.t += dt
    if (this.keys.left) this.moveTo(this.x - 520 * dt)
    if (this.keys.right) this.moveTo(this.x + 520 * dt)
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawnIn = this.spawnEvery * (0.7 + Math.random() * 0.6)
      const d = this.drops.find((p) => !p.active)
      if (d) Object.assign(d, { active: true, x: 50 + Math.random() * 700, y: -20, toxin: Math.random() < LIVER.toxinChance, spin: Math.random() * 6 })
    }
    for (const d of this.drops) {
      if (!d.active) continue
      const before = d.y
      d.y += this.speed * dt
      d.spin += dt * 3
      // Crossing the liver's top edge while over it counts as caught.
      if (before < LIVER_Y - 14 && d.y >= LIVER_Y - 14 && Math.abs(d.x - this.x) <= LIVER.paddleWidth / 2 + 10) {
        d.active = false
        if (d.toxin) this.filtered++
        else this.damage++
        this.lastHit = { t: this.t, good: d.toxin, x: d.x }
        continue
      }
      if (d.y > 470) {
        d.active = false
        if (d.toxin) {
          this.damage++
          this.lastHit = { t: this.t, good: false, x: d.x }
        }
      }
    }
  }

  failed() {
    return this.damage >= LIVER.maxDamage
  }

  status() {
    return `Damage ${this.damage}/${LIVER.maxDamage} · filtered ${this.filtered}`
  }
}
