// Gut trial rules: bacteria live along a winding gut. Bad ones (red) split over time;
// click them before they take over. Zapping a good one (green) makes room for a bad one.
import { GUT } from '../data/trials'
import type { OrganLogic } from './types'

// The gut's centre line across the screen.
export function gutY(x: number): number {
  return 225 + 110 * Math.sin(x / 95)
}

export interface Bug {
  active: boolean
  x: number
  y: number
  bad: boolean
  age: number
  phase: number
}

export class GutLogic implements OrganLogic {
  readonly bugs: Bug[] = Array.from({ length: 60 }, () => ({ active: false, x: 0, y: 0, bad: true, age: 0, phase: 0 }))
  zapped = 0
  oops = 0
  t = 0
  private spawnIn = 0.5
  private spawnEvery: number
  private growEvery: number

  constructor(difficulty: number) {
    this.spawnEvery = Math.max(GUT.minSpawn, GUT.spawnEvery - GUT.spawnFaster * difficulty)
    this.growEvery = Math.max(1.2, GUT.growEvery - GUT.growFaster * difficulty)
    for (let i = 0; i < 5; i++) this.spawn(false, null)
  }

  private spawn(bad: boolean, near: Bug | null) {
    const b = this.bugs.find((p) => !p.active)
    if (!b) return
    const x = near ? Math.max(60, Math.min(740, near.x + (Math.random() - 0.5) * 70)) : 60 + Math.random() * 680
    Object.assign(b, { active: true, x, y: gutY(x) + (Math.random() - 0.5) * 36, bad, age: 0, phase: Math.random() * 6 })
  }

  badCount(): number {
    return this.bugs.filter((b) => b.active && b.bad).length
  }

  update(dt: number) {
    this.t += dt
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawnIn = this.spawnEvery * (0.7 + Math.random() * 0.6)
      this.spawn(Math.random() < 0.7, null)
    }
    for (const b of this.bugs) {
      if (!b.active) continue
      b.age += dt
      b.phase += dt
      // Unzapped bad bacteria split.
      if (b.bad && b.age >= this.growEvery) {
        b.age = 0
        this.spawn(true, b)
      }
    }
  }

  zap(x: number, y: number): 'bad' | 'good' | null {
    let best: Bug | null = null
    let bestD = GUT.hitRadius
    for (const b of this.bugs) {
      if (!b.active) continue
      const d = Math.hypot(b.x - x, b.y - y)
      if (d <= bestD) {
        best = b
        bestD = d
      }
    }
    if (!best) return null
    best.active = false
    if (best.bad) {
      this.zapped++
      return 'bad'
    }
    this.oops++
    this.spawn(true, best)
    return 'good'
  }

  failed() {
    return this.badCount() >= GUT.maxBad
  }

  status() {
    return `Bad bacteria ${this.badCount()}/${GUT.maxBad}`
  }
}
