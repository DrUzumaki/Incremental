// Heart trial rules: stray electrical sparks crawl toward the AV node in the middle
// of the heart. Click them before they reach it; too many leaks and you lose.
import { HEART } from '../data/trials'
import type { OrganLogic } from './types'

export const HEART_CENTER = { x: 400, y: 238 }
export const AV_NODE = { x: 400, y: 262 }

export interface Spark {
  active: boolean
  x: number
  y: number
  vx: number
  vy: number
  wiggle: number // phase of the side-to-side wobble
}

export class HeartLogic implements OrganLogic {
  readonly sparks: Spark[] = Array.from({ length: 32 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, wiggle: 0 }))
  leaks = 0
  zapped = 0
  t = 0
  private spawnIn = 0.6
  private spawnEvery: number
  private speed: number

  constructor(difficulty: number) {
    this.spawnEvery = Math.max(HEART.minSpawn, HEART.spawnEvery - HEART.spawnFaster * difficulty)
    this.speed = HEART.speed + HEART.speedUp * difficulty
  }

  update(dt: number) {
    this.t += dt
    this.spawnIn -= dt
    if (this.spawnIn <= 0) {
      this.spawnIn = this.spawnEvery * (0.7 + Math.random() * 0.6)
      this.spawn()
    }
    for (const s of this.sparks) {
      if (!s.active) continue
      s.wiggle += dt * 6
      // Wobble sideways a little while heading for the node.
      const side = Math.sin(s.wiggle) * 0.6
      s.x += (s.vx - s.vy * side) * dt
      s.y += (s.vy + s.vx * side) * dt
      const dx = AV_NODE.x - s.x
      const dy = AV_NODE.y - s.y
      const d = Math.hypot(dx, dy)
      if (d < 14) {
        s.active = false
        this.leaks++
        continue
      }
      s.vx = (dx / d) * this.speed
      s.vy = (dy / d) * this.speed
    }
  }

  private spawn() {
    const s = this.sparks.find((p) => !p.active)
    if (!s) return
    // Start somewhere on the heart's outer wall.
    const a = Math.random() * Math.PI * 2
    s.active = true
    s.x = HEART_CENTER.x + Math.cos(a) * 170
    s.y = HEART_CENTER.y + Math.sin(a) * 130
    s.wiggle = Math.random() * 6
    s.vx = 0
    s.vy = 0
  }

  // A click at (x, y). Returns true if it zapped a spark.
  zap(x: number, y: number): boolean {
    let best: Spark | null = null
    let bestD = HEART.hitRadius
    for (const s of this.sparks) {
      if (!s.active) continue
      const d = Math.hypot(s.x - x, s.y - y)
      if (d <= bestD) {
        best = s
        bestD = d
      }
    }
    if (!best) return false
    best.active = false
    this.zapped++
    return true
  }

  failed() {
    return this.leaks >= HEART.maxLeaks
  }

  status() {
    return `Leaks ${this.leaks}/${HEART.maxLeaks} · zapped ${this.zapped}`
  }
}
