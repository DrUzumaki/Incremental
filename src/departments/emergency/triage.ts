// Triage minigame rules: the patient queue, patience timers, and scoring.
// No drawing here; triageView.ts handles that.
import {
  COMPLAINTS,
  LEFT_LINES,
  SEVERITIES,
  TRIAGE,
  WRONG_LINES,
  type ComplaintAct,
  type Severity,
} from '../../data/emergency'
import type { DeptState } from '../../core/state'

export interface Patient {
  id: number // unique per arrival, so visuals can follow a patient
  severity: Severity
  complaint: string
  act: ComplaintAct
  patience: number // seconds left
  maxPatience: number
}

export type TriageResult =
  | { kind: 'correct'; pay: number }
  | { kind: 'wrong'; message: string; lostCombo: number }
  | { kind: 'left'; message: string; lostCombo: number }

// What the triage rules need from the rest of the game.
export interface TriageHost {
  stats(): Record<string, number> // Emergency tree stats
  earn(amount: number): number // returns the amount after multipliers
  dept(): DeptState
  report(result: TriageResult, patientId: number, choice?: Severity): void
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function pickSeverity(): Severity {
  let roll = Math.random()
  for (const s of SEVERITIES) {
    roll -= TRIAGE.severityWeights[s]
    if (roll < 0) return s
  }
  return 'green'
}

export class Triage {
  readonly queue: Patient[] = [] // queue[0] is the patient being triaged
  combo = 0
  private host: TriageHost
  private spawnTimer = 0
  private pool: Patient[] = [] // reused patient objects
  private nextId = 1

  constructor(host: TriageHost) {
    this.host = host
  }

  get multiplier(): number {
    const s = this.host.stats()
    return 1 + Math.min(this.combo * s.comboStep, s.comboCap)
  }

  // Advance time: new arrivals, and the front patient's patience.
  update(dt: number): void {
    const s = this.host.stats()

    this.spawnTimer += dt
    if (this.spawnTimer >= s.spawnInterval) {
      if (this.queue.length < s.queueSize) {
        this.queue.push(this.spawn(s.patience))
        this.spawnTimer = 0
      } else {
        // Queue is full: hold the next patient at the door until there's room.
        this.spawnTimer = s.spawnInterval
      }
    }

    const front = this.queue[0]
    if (!front) return
    front.patience -= dt
    if (front.patience > 0) return

    const id = front.id
    const lostCombo = this.combo
    this.removeFront()
    this.combo = 0
    this.host.report({ kind: 'left', message: pick(LEFT_LINES), lostCombo }, id)
  }

  // The player sorts the front patient into a bay.
  sort(choice: Severity): void {
    const front = this.queue[0]
    if (!front) return
    const { severity, id } = front
    this.removeFront()

    if (severity !== choice) {
      const lostCombo = this.combo
      this.combo = 0
      this.host.report({ kind: 'wrong', message: pick(WRONG_LINES), lostCombo }, id, choice)
      return
    }

    const s = this.host.stats()
    const base = (TRIAGE.basePay[severity] + s.payFlat) * (severity === 'red' ? s.redMult : 1)
    const pay = this.host.earn(base * s.payMult * this.multiplier)
    this.combo += 1
    const dept = this.host.dept()
    dept.bestCombo = Math.max(dept.bestCombo, this.combo)
    this.host.report({ kind: 'correct', pay }, id, choice)
  }

  private spawn(patience: number): Patient {
    const p = this.pool.pop() ?? ({} as Patient)
    p.severity = pickSeverity()
    const complaint = pick(COMPLAINTS[p.severity])
    p.id = this.nextId++
    p.complaint = complaint.text
    p.act = complaint.act
    p.patience = patience
    p.maxPatience = patience
    return p
  }

  private removeFront(): void {
    const p = this.queue.shift()
    if (p) this.pool.push(p)
  }
}
