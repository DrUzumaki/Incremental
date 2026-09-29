// Sepsis boss rules: infection grows in body regions and spreads to neighbours.
// Click a region to treat it. Survive each stage; stages get faster. Too much of the
// body infected ends the run.
import { SEPSIS_REGIONS } from '../data/sepsisMap'
import { BOSSES } from '../data/trials'

const CFG = BOSSES.sepsis

export class SepsisLogic {
  readonly infection = new Map<string, number>(SEPSIS_REGIONS.map((r) => [r.id, 0]))
  stage = 1
  stageTime = 0
  t = 0
  treated = 0
  private neighbours = new Map<string, string[]>()
  // Called when a stage is survived (for Publications) with the number of stages completed.
  onStageCleared: (completed: number) => void = () => {}

  constructor() {
    for (const r of SEPSIS_REGIONS) this.neighbours.set(r.id, [...r.links])
    for (const r of SEPSIS_REGIONS) for (const l of r.links) this.neighbours.get(l)!.push(r.id)
    this.seed()
  }

  spread(): number {
    return CFG.spreadBase + CFG.spreadUp * (this.stage - 1)
  }

  // New infection sites at the start of each stage.
  private seed() {
    const count = CFG.seedsBase + Math.floor((this.stage - 1) / CFG.seedsEvery)
    for (let i = 0; i < count; i++) {
      const r = SEPSIS_REGIONS[Math.floor(Math.random() * SEPSIS_REGIONS.length)]
      this.infection.set(r.id, Math.min(1, this.infection.get(r.id)! + 0.35))
    }
  }

  // Fraction of the whole body infected (0..1).
  total(): number {
    let sum = 0
    for (const v of this.infection.values()) sum += v
    return sum / this.infection.size
  }

  update(dt: number) {
    this.t += dt
    this.stageTime += dt
    const rate = this.spread()
    const next = new Map(this.infection)
    for (const [id, v] of this.infection) {
      if (v <= 0) continue
      next.set(id, Math.min(1, next.get(id)! + rate * 0.5 * dt)) // grows where it is
      for (const n of this.neighbours.get(id)!) next.set(n, Math.min(1, next.get(n)! + rate * v * 0.6 * dt)) // and spreads
    }
    for (const [id, v] of next) this.infection.set(id, v)
    if (this.stageTime >= CFG.stageDuration) {
      this.onStageCleared(this.stage)
      this.stage++
      this.stageTime = 0
      this.seed()
    }
  }

  treat(id: string) {
    const v = this.infection.get(id)
    if (v === undefined) return
    this.infection.set(id, Math.max(0, v - CFG.treat))
    this.treated++
  }

  failed(): boolean {
    return this.total() >= CFG.loseAt
  }
}
