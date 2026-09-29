// Animations: functions that turn time (seconds) into a CharFrame for the body to draw.
// Visual only: nothing here changes game rules.
import type { ComplaintAct } from '../../data/emergency'
import { lerpPose, reach, restPose, type CharFrame, type Pose } from './body'
import type { Face } from './face'

const TAU = Math.PI * 2

// --- Base movements ---

function idle(t: number): Pose {
  const p = restPose()
  const breath = Math.sin(t * 2.2)
  p.bob = breath * 0.8
  p.armF[0] += breath * 0.03
  p.armB[0] -= breath * 0.03
  p.lean = Math.sin(t * 0.7) * 0.02
  return p
}

function walk(t: number, speed = 1): Pose {
  const p = restPose()
  const ph = t * TAU * 1.7 * speed
  const s = Math.sin(ph)
  p.legF = [s * 0.5, -Math.max(0, Math.cos(ph)) * 0.8]
  p.legB = [-s * 0.5, -Math.max(0, -Math.cos(ph)) * 0.8]
  p.armF = [-s * 0.45, 0.35]
  p.armB = [s * 0.45, 0.35]
  p.bob = Math.abs(Math.cos(ph)) * 1.2
  p.lean = 0.06 * speed
  return p
}

// Hopping on the back foot with the sore front foot held up.
function limpWalk(t: number): Pose {
  const p = restPose()
  const ph = t * TAU * 1.5
  p.legB = [Math.sin(ph) * 0.3, -Math.max(0, Math.cos(ph)) * 0.5]
  p.legF = [0.45, -1.3]
  p.lift = Math.max(0, Math.sin(ph * 2)) * 3
  p.lean = 0.08
  p.armF = [0.7 + Math.sin(ph) * 0.2, 0.4]
  p.armB = [-0.7 - Math.sin(ph) * 0.2, 0.4]
  return p
}

function face(eyes: Face['eyes'], mouth: Face['mouth'], brows: Face['brows'] = 'none'): Face {
  return { eyes, mouth, brows, blink: true }
}

// --- Patients ---

export type PatientMode = 'waiting' | 'walking' | 'toBay' | 'stormOut'

// `mood` is patience left, 1 (fine) down to 0 (about to leave).
export function patientFrame(act: ComplaintAct, t: number, mode: PatientMode, mood = 1): CharFrame {
  if (mode === 'stormOut') {
    const pose = walk(t, 1.6)
    pose.lean = 0.16
    pose.armF = [pose.armF[0] * 1.6, 1.2]
    pose.armB = [pose.armB[0] * 1.6, 1.2]
    return { time: t, pose, face: { eyes: 'squint', mouth: 'frown', brows: 'angry', flush: 1 }, props: [], fx: [{ kind: 'steam' }] }
  }

  const walking = mode !== 'waiting'
  const pose = act === 'limp' ? (walking ? limpWalk(t) : limpWalk(t * 0.4)) : walking ? walk(t) : idle(t)
  const frame: CharFrame = { time: t, pose, face: face('open', 'flat'), props: [], fx: [] }
  applyAct(frame, act, t, walking)

  if (mode === 'toBay') {
    // Relieved to finally be seen.
    frame.face.mouth = frame.face.mouth === 'small' ? 'small' : 'smile'
    frame.face.brows = 'raised'
    frame.fx = frame.fx.filter((f) => f.kind !== 'gasp')
  } else if (mode === 'waiting') {
    applyMood(frame, act, t, mood)
  }
  return frame
}

function applyAct(f: CharFrame, act: ComplaintAct, t: number, walking: boolean) {
  const p = f.pose
  const shake = Math.sin(t * 38) * 0.03
  switch (act) {
    case 'clutchChest':
      p.armF = reach(5, 5)
      p.armB = reach(15, 5)
      p.lean += 0.14 + shake
      f.face = face('squint', 'wavy', 'worried')
      f.fx.push({ kind: 'sweat', amount: 1 })
      return
    case 'clutchThroat':
      p.armF = reach(1, -6, 'forward')
      p.armB = reach(11, -6, 'forward')
      p.headTilt = -0.12 + shake
      f.face = face('wide', 'open', 'worried')
      return
    case 'dozing':
      p.headTilt = 0.4 + Math.sin(t * 1.3) * 0.08
      p.lean += Math.sin(t * 1.3) * 0.04
      if (walking) {
        // Sleepwalking.
        p.armF = [1.5, 0]
        p.armB = [1.45, 0]
      } else {
        p.armF = [0.05, 0]
        p.armB = [-0.05, 0]
      }
      f.face = { eyes: 'closed', mouth: 'small', brows: 'none' }
      f.fx.push({ kind: 'zzz' })
      return
    case 'dizzy':
      p.lean += Math.sin(t * 2.4) * 0.14
      p.headTilt = Math.sin(t * 2.4 + 1) * 0.2
      p.armF = [0.7 + Math.sin(t * 2.4) * 0.3, 0.3]
      p.armB = [-0.7 + Math.sin(t * 2.4) * 0.3, 0.3]
      f.face = face('swirl', 'wavy')
      f.fx.push({ kind: 'stars' })
      return
    case 'puffy':
      p.headScale = 1.28 + Math.sin(t * 3) * 0.03
      p.armF = reach(6, -14, 'forward')
      p.armB = reach(14, -12, 'forward')
      f.face = { eyes: 'sleepy', mouth: 'small', brows: 'worried', blush: true }
      return
    case 'holdArm':
      p.armF = [0.2, 1.45 + shake]
      p.armB = reach(17, 11)
      f.face = face('open', 'frown', 'worried')
      f.props.push('sling')
      return
    case 'limp':
      f.face = face('squint', 'wavy', 'worried')
      f.fx.push({ kind: 'throb' })
      return
    case 'fever':
      p.armF = reach(6, 9)
      p.armB = reach(16, 9)
      p.lean += Math.sin(t * 1.1) * 0.05 + shake * 0.5
      f.face = { eyes: 'sleepy', mouth: 'flat', brows: 'worried', flush: 0.7 }
      f.props.push('thermometer')
      f.fx.push({ kind: 'sweat', amount: 2 })
      return
    case 'holdSide': {
      p.armB = reach(-6, 16)
      p.armF = reach(3, 12)
      p.lean -= 0.12
      p.legF = [0.2, -0.25]
      p.legB = [-0.1, -0.25]
      const wince = Math.sin(t * 2.6) > 0.75
      f.face = wince ? face('squint', 'open', 'worried') : face('open', 'wavy', 'worried')
      if (wince) p.squash = 0.95
      return
    }
    case 'sneeze': {
      const c = (t % 3) / 3
      if (c < 0.55) {
        const k = c / 0.55
        p.headTilt = -0.3 * k
        p.lean -= 0.1 * k
        f.face = { eyes: k > 0.6 ? 'closed' : 'sleepy', mouth: 'open', brows: 'raised' }
      } else if (c < 0.72) {
        p.headTilt = 0.35
        p.lean += 0.2
        p.squash = 0.9
        f.face = { eyes: 'closed', mouth: 'open', brows: 'none' }
        f.fx.push({ kind: 'achoo' })
      } else {
        p.armF = reach(3, -11, 'forward')
        f.face = face('open', 'flat')
        f.props.push('tissue')
      }
      return
    }
    case 'scratch': {
      const o = Math.sin(t * 22) * 2
      p.armF = reach(-10 + o, 8)
      f.face = face('squint', 'flat', 'angry')
      f.props.push('scritch')
      return
    }
    case 'phone': {
      p.armF = reach(9, -6)
      p.headTilt = 0.22
      const gasp = t % 3.2 > 2.6
      f.face = gasp ? face('wide', 'open', 'raised') : face('open', 'small', 'worried')
      if (gasp) {
        f.fx.push({ kind: 'gasp' })
        p.squash = 1.04
      }
      f.props.push('phone')
      return
    }
    case 'note':
      p.armF = [2.6 + Math.sin(t * 6) * 0.25, 0.3]
      f.face = face('open', 'smile', 'raised')
      f.props.push('note')
      return
  }
}

// Waiting patients get restless, then cross, as their patience runs out.
function applyMood(f: CharFrame, act: ComplaintAct, t: number, mood: number) {
  if (mood >= 0.6) return
  const p = f.pose
  const asleep = act === 'dozing'
  const fast = mood < 0.3
  if (act !== 'limp' && act !== 'holdSide') {
    const tap = Math.max(0, Math.sin(t * (fast ? 20 : 13)))
    p.legF = [0.1 + tap * 0.25, -tap * 0.5]
  }
  if (!asleep) f.face.brows = 'angry'
  if (!asleep && (f.face.mouth === 'smile' || f.face.mouth === 'small')) f.face.mouth = 'flat'
  if (fast) {
    if (!asleep && f.face.mouth !== 'open') f.face.mouth = 'frown'
    f.face.flush = Math.max(f.face.flush ?? 0, 0.5)
    f.fx.push({ kind: 'steam' })
  }
}

// --- Resident ---

export type Gesture = 'point' | 'thumbsUp' | 'facepalm' | 'yawn'

export const GESTURE_DURATION: Record<Gesture, number> = {
  point: 0.55,
  thumbsUp: 0.8,
  facepalm: 1.1,
  yawn: 2.0,
}

export interface GestureState {
  kind: Gesture
  age: number // seconds since it started
  pointAngle?: number // arm angle for 'point' (about 1.6 = straight ahead)
}

// `sweat` is 0..3 and grows with the combo.
export function residentFrame(t: number, gesture: GestureState | null, sweat: number): CharFrame {
  const base = idle(t)
  base.armB = reach(13, 8) // holding the clipboard against the chest
  base.armF = [base.armF[0] + 0.18, 0.25] // relaxed at the front edge of the body, not over the middle
  const f: CharFrame = {
    time: t,
    pose: base,
    face: { eyes: 'open', mouth: sweat >= 3 ? 'grin' : 'flat', brows: sweat >= 2 ? 'worried' : 'none', tired: true, blink: true },
    props: ['stethoscope', 'clipboard'],
    fx: sweat > 0 ? [{ kind: 'sweat', amount: sweat }] : [],
  }
  if (!gesture) return f

  const dur = GESTURE_DURATION[gesture.kind]
  const k = gesture.age / dur
  // Blend in over 0.12 s and back out over the last 0.2 s.
  const w = Math.max(0, Math.min(1, gesture.age / 0.12, (dur - gesture.age) / 0.2))
  const target = { ...base, armF: [...base.armF] as typeof base.armF, armB: [...base.armB] as typeof base.armB }

  switch (gesture.kind) {
    case 'point': {
      // Arm, head and lean all follow the target: low and near, or high and far.
      const a = gesture.pointAngle ?? 1.5
      target.armF = [a, 0]
      target.headTilt = (1.5 - a) * 0.35
      target.lean = 0.04 + (1.5 - a) * 0.12
      if (w > 0.5) {
        f.face = { ...f.face, mouth: 'open', brows: 'raised' }
        f.props.push('finger')
      }
      break
    }
    case 'thumbsUp':
      target.armF = [1.3, 1.6] // out in front, clear of the clipboard
      target.lift = Math.sin(Math.min(1, k * 2) * Math.PI) * 4
      target.squash = 1.04
      if (w > 0.5) {
        f.face = { ...f.face, eyes: 'happy', mouth: 'grin' }
        f.props.push('thumb')
      }
      break
    case 'facepalm':
      target.armF = reach(-1, -17, 'forward')
      target.headTilt = 0.3
      target.lean = 0.1
      target.squash = 0.95
      if (w > 0.5) f.face = { ...f.face, eyes: 'closed', mouth: 'frown', brows: 'worried' }
      if (k > 0.5) f.fx.push({ kind: 'sigh' })
      break
    case 'yawn':
      // Arms stretched out diagonally, so they don't cover the yawning face.
      target.armF = [2.2, 0.5]
      target.armB = [-2.3, -0.4]
      target.lean = -0.1
      target.squash = 1.06
      target.bob = 2
      if (w > 0.5) f.face = { ...f.face, eyes: 'closed', mouth: 'yawn', brows: 'raised' }
      break
  }
  f.pose = lerpPose(base, target, w)
  return f
}
