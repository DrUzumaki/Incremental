// Surgery minigame rules: trace a curved incision line from start to end.
// Press near the start (or where you left off), drag along the line, reach the end.
// Straying too far slips; average distance sets the accuracy, and accuracy sets pay.
// Each completed operation counts toward permanent hospital-wide perks.
// No drawing here; sutureView.ts handles that.
import type { DeptState, GameState } from '../../core/state'
import { SURGERY_LINES, SUTURE } from '../../data/surgery'

export interface Pt {
  x: number
  y: number
}

export interface Operation {
  id: number
  points: Pt[]
  length: number // pixels
}

export type SurgeryResult =
  | { kind: 'done'; pay: number; accuracy: number; quality: 'perfect' | 'good' | 'messy'; message: string; perk: boolean }
  | { kind: 'slip'; message: string }
  | { kind: 'timeout'; lostCombo: number; message: string }

export interface SurgeryHost {
  stats(): Record<string, number>
  earn(amount: number): number
  dept(): DeptState
  state(): GameState
  report(result: SurgeryResult): void
}

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]

// A smooth random curve across the operative field (Catmull-Rom through random points).
function makePath(): Pt[] {
  const f = SUTURE.field
  const n = SUTURE.controlPoints
  const ctrl: Pt[] = []
  for (let i = 0; i < n; i++) {
    ctrl.push({ x: f.x + 20 + ((f.w - 40) * i) / (n - 1), y: f.y + 25 + Math.random() * (f.h - 50) })
  }
  const pts: Pt[] = []
  const segs = n - 1
  for (let k = 0; k < SUTURE.pathPoints; k++) {
    const u = (k / (SUTURE.pathPoints - 1)) * segs
    const i = Math.min(segs - 1, Math.floor(u))
    const t = u - i
    const p0 = ctrl[Math.max(0, i - 1)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(n - 1, i + 2)]
    const cr = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
    pts.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) })
  }
  return pts
}

export class Suture {
  op: Operation
  tracing = false
  progress = 0 // index of the furthest point reached
  combo = 0
  timeLeft: number
  maxTime: number
  pen: Pt | null = null // where the pointer is while tracing
  private devSum = 0
  private devCount = 0
  private host: SurgeryHost
  private nextId = 1

  constructor(host: SurgeryHost) {
    this.host = host
    this.op = this.newOp()
    this.maxTime = this.timeLeft = host.stats().opTime
  }

  get multiplier(): number {
    const s = this.host.stats()
    return 1 + Math.min(this.combo * s.comboStep, s.comboCap)
  }

  accuracy(): number {
    if (!this.devCount) return 1
    return Math.max(0, Math.min(1, 1 - this.devSum / this.devCount / this.host.stats().tolerance))
  }

  private newOp(): Operation {
    const points = makePath()
    let length = 0
    for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    return { id: this.nextId++, points, length }
  }

  private next() {
    this.op = this.newOp()
    this.progress = 0
    this.tracing = false
    this.pen = null
    this.devSum = 0
    this.devCount = 0
    this.maxTime = this.timeLeft = this.host.stats().opTime
  }

  update(dt: number) {
    this.timeLeft -= dt
    if (this.timeLeft > 0) return
    const lostCombo = this.combo
    this.combo = 0
    this.next()
    this.host.report({ kind: 'timeout', lostCombo, message: pick(SURGERY_LINES.timeout) })
  }

  pointerDown(p: Pt) {
    const at = this.op.points[this.progress]
    if (Math.hypot(p.x - at.x, p.y - at.y) <= SUTURE.startRadius) {
      this.tracing = true
      this.pen = p
    }
  }

  pointerUp() {
    this.tracing = false
    this.pen = null
  }

  pointerMove(p: Pt) {
    if (!this.tracing) return
    this.pen = p
    const s = this.host.stats()
    const pts = this.op.points
    // Nearest point a little way ahead of where you are.
    let best = this.progress
    let bestD = Infinity
    const end = Math.min(pts.length - 1, this.progress + SUTURE.lookAhead)
    for (let i = Math.max(0, this.progress - 2); i <= end; i++) {
      const d = Math.hypot(pts[i].x - p.x, pts[i].y - p.y)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    if (bestD > s.tolerance) {
      this.tracing = false
      this.pen = null
      this.devSum += s.tolerance * 2 // a slip costs accuracy
      this.devCount++
      this.host.report({ kind: 'slip', message: pick(SURGERY_LINES.slip) })
      return
    }
    this.devSum += bestD
    this.devCount++
    this.progress = Math.max(this.progress, best)
    // Reaching the last couple of points counts as done (the end dot is small).
    if (this.progress >= pts.length - 2) this.finish()
  }

  private finish() {
    const s = this.host.stats()
    const acc = this.accuracy()
    const quality = acc >= SUTURE.perfectAt ? 'perfect' : acc >= SUTURE.comboAt ? 'good' : 'messy'
    const timeFrac = Math.max(0, this.timeLeft / this.maxTime)
    const raw = s.sutureValue * (this.op.length / 100) * acc * acc * s.sutureMult
      * (quality === 'perfect' ? s.perfectMult : 1) * (1 + s.timeBonus * timeFrac) * this.multiplier
    const pay = this.host.earn(raw)
    if (quality === 'messy') this.combo = 0
    else this.combo++
    const dept = this.host.dept()
    dept.bestCombo = Math.max(dept.bestCombo, this.combo)
    // Completed operations count toward permanent perks.
    const state = this.host.state()
    const before = Math.floor(state.surgeryOps / s.perkEvery)
    state.surgeryOps++
    const perk = Math.floor(state.surgeryOps / s.perkEvery) > before
    this.next()
    this.host.report({ kind: 'done', pay, accuracy: acc, quality, message: pick(SURGERY_LINES[quality]), perk })
  }
}
