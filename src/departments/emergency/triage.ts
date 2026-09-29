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
import { UPGRADES } from '../../data/upgrades'
import type { GameState } from '../../core/state'

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
  | { kind: 'wrong'; message: string }
  | { kind: 'left'; message: string }

// Minigame numbers after upgrades are applied.
export function getTriageStats(state: GameState) {
  const lv = state.upgrades
  return {
    payBonus: lv.stethoscopes * UPGRADES.stethoscopes.effect,
    patience: TRIAGE.patience + lv.chairs * UPGRADES.chairs.effect,
    comboCap: TRIAGE.comboCap + lv.training * UPGRADES.training.effect,
    spawnInterval: TRIAGE.spawnInterval * UPGRADES.fastTrack.effect ** lv.fastTrack,
    showHint: lv.cards > 0,
  }
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
  private state: GameState
  private spawnTimer = 0
  private pool: Patient[] = [] // reused patient objects
  private nextId = 1

  constructor(state: GameState) {
    this.state = state
  }

  get multiplier(): number {
    const { comboCap } = getTriageStats(this.state)
    return 1 + Math.min(this.combo * TRIAGE.comboStep, comboCap)
  }

  // Advance time. Returns a result if the front patient gave up and left.
  update(dt: number): TriageResult | null {
    const stats = getTriageStats(this.state)

    this.spawnTimer += dt
    if (this.spawnTimer >= stats.spawnInterval) {
      if (this.queue.length < TRIAGE.queueSize) {
        this.queue.push(this.spawn(stats.patience))
        this.spawnTimer = 0
      } else {
        // Queue is full: hold the next patient at the door until there's room.
        this.spawnTimer = stats.spawnInterval
      }
    }

    const front = this.queue[0]
    if (!front) return null
    front.patience -= dt
    if (front.patience > 0) return null

    this.removeFront()
    this.combo = 0
    return { kind: 'left', message: pick(LEFT_LINES) }
  }

  // The player sorts the front patient into a bay.
  sort(choice: Severity): TriageResult | null {
    const front = this.queue[0]
    if (!front) return null
    const severity = front.severity
    this.removeFront()

    if (severity !== choice) {
      this.combo = 0
      return { kind: 'wrong', message: pick(WRONG_LINES) }
    }

    const { payBonus } = getTriageStats(this.state)
    const pay = (TRIAGE.basePay[severity] + payBonus) * this.multiplier
    this.combo += 1
    this.state.dollars += pay
    this.state.bestCombo = Math.max(this.state.bestCombo, this.combo)
    return { kind: 'correct', pay }
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
