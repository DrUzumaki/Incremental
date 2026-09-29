// Reusable on-screen actors shared by every room: the resident (gestures, yawns,
// cheers) and a crew of hired staff who visibly pay out idle income.
import { GESTURE_DURATION, type Gesture, type GestureState } from './poses'

const YAWN_MIN = 18 // TUNE: seconds between idle yawns (random in this range)
const YAWN_MAX = 40

export class ResidentActor {
  gesture: GestureState | null = null
  private next: Gesture | null = null // plays after the current gesture
  private yawnIn = YAWN_MIN

  // Play a gesture now, optionally followed by another (e.g. point, then thumbs-up).
  play(first: GestureState, then: Gesture | null = null) {
    this.gesture = first
    this.next = then
  }

  cheer() {
    this.play({ kind: 'cheer', age: 0 })
  }

  update(dt: number) {
    if (this.gesture) {
      this.gesture.age += dt
      if (this.gesture.age >= GESTURE_DURATION[this.gesture.kind]) {
        this.gesture = this.next ? { kind: this.next, age: 0 } : null
        this.next = null
      }
      return
    }
    this.yawnIn -= dt
    if (this.yawnIn <= 0) {
      this.gesture = { kind: 'yawn', age: 0 }
      this.yawnIn = YAWN_MIN + Math.random() * (YAWN_MAX - YAWN_MIN)
    }
  }
}

// Idle income piles up in a bucket and is paid out by one staff member at a time,
// so automation is something you watch.
export class StaffCrew {
  readonly gestures: (GestureState | null)[]
  private bucket = 0
  private timer = 0
  private nextIndex = 0
  private every: number

  constructor(spots: number, burstEvery: number) {
    this.gestures = Array.from({ length: spots }, () => null)
    this.every = burstEvery
  }

  add(amount: number) {
    this.bucket += amount
  }

  // `visible` staff take turns; `burst(i, amount)` shows staff member i paying out.
  update(dt: number, visible: number, burst: (i: number, amount: number) => void, pointAngle = 1.7) {
    for (let i = 0; i < this.gestures.length; i++) {
      const g = this.gestures[i]
      if (!g) continue
      g.age += dt
      if (g.age >= GESTURE_DURATION[g.kind]) this.gestures[i] = null
    }
    if (visible <= 0) return
    this.timer -= dt
    if (this.timer > 0 || this.bucket <= 0) return
    this.timer = this.every / visible
    const i = this.nextIndex % visible
    this.nextIndex++
    this.gestures[i] = { kind: 'point', age: 0, pointAngle }
    burst(i, this.bucket)
    this.bucket = 0
  }
}
