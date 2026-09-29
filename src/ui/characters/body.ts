// The shared character body: one flat-vector figure drawn from a pose, a look and a face.
// Every character in the game (resident, patients, later staff) uses this.
//
// Units: the body is about 100 units tall, feet at y = 0, facing +x.
// Limb angles are in radians: 0 = hanging straight down, positive = swung forward.
// The second number of each limb is the elbow/knee bend, relative to the first.
import { drawFace, type Face } from './face'

export const HIP_Y = -35
export const TORSO_H = 28
export const HEAD_R = 15
export const UPPER_ARM = 13
export const FOREARM = 12
export const THIGH = 17
export const SHIN = 17
const SHOULDER_X = 5
const HIP_X = 4

export type Limb = [number, number]

export interface Pose {
  lift: number // whole body raised off the ground (hops)
  bob: number // upper body raised (breathing, walk bounce)
  lean: number // torso tilt, positive = forward
  squash: number // 1 = normal, < 1 squashed, > 1 stretched
  headTilt: number // positive = nodding forward
  headScale: number
  armF: Limb // front arm (nearer the viewer)
  armB: Limb // back arm
  legF: Limb
  legB: Limb
}

export type HairStyle = 'short' | 'buzz' | 'curly' | 'long' | 'bun' | 'bald' | 'ponytail'

export interface Look {
  skin: string
  hair: string
  hairStyle: HairStyle
  top: string
  topStyle: 'tee' | 'hoodie' | 'coat'
  under?: string // scrubs colour under a coat
  bottom: string
  shoes: string
  height: number // 1 = normal
}

export type Prop =
  | 'clipboard'
  | 'stethoscope'
  | 'thermometer'
  | 'phone'
  | 'note'
  | 'sling'
  | 'tissue'
  | 'thumb'
  | 'finger'
  | 'scritch'

export type Fx =
  | { kind: 'zzz' }
  | { kind: 'sweat'; amount: number }
  | { kind: 'stars' }
  | { kind: 'steam' }
  | { kind: 'achoo' }
  | { kind: 'throb' }
  | { kind: 'gasp' }
  | { kind: 'sigh' }

export interface CharFrame {
  time: number
  pose: Pose
  face: Face
  props: Prop[]
  fx: Fx[]
}

export function restPose(): Pose {
  return {
    lift: 0, bob: 0, lean: 0, squash: 1, headTilt: 0, headScale: 1,
    armF: [0.12, 0.15], armB: [-0.12, 0.15], legF: [0.06, 0], legB: [-0.06, 0],
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpLimb = (a: Limb, b: Limb, t: number): Limb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    lift: lerp(a.lift, b.lift, t),
    bob: lerp(a.bob, b.bob, t),
    lean: lerp(a.lean, b.lean, t),
    squash: lerp(a.squash, b.squash, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    headScale: lerp(a.headScale, b.headScale, t),
    armF: lerpLimb(a.armF, b.armF, t),
    armB: lerpLimb(a.armB, b.armB, t),
    legF: lerpLimb(a.legF, b.legF, t),
    legB: lerpLimb(a.legB, b.legB, t),
  }
}

// Where the shoulders sit in the upper-body frame (see drawCharacter).
export function shoulderY(pose: Pose): number {
  return -TORSO_H - pose.bob
}

// Two-joint "reach": arm angles that put the hand at (dx, dy) from the shoulder.
// `prefer` picks which way the elbow points when there are two answers.
export function reach(dx: number, dy: number, prefer: 'down' | 'forward' = 'down'): Limb {
  const len = Math.hypot(dx, dy)
  const d = Math.max(Math.abs(UPPER_ARM - FOREARM) + 0.01, Math.min(len, UPPER_ARM + FOREARM - 0.01))
  const tx = (dx / (len || 1)) * d
  const ty = (dy / (len || 1)) * d
  const ang = Math.atan2(tx, ty)
  const alpha = Math.acos((UPPER_ARM ** 2 + d * d - FOREARM ** 2) / (2 * UPPER_ARM * d))
  let best: Limb = [0, 0]
  let bestScore = -Infinity
  for (const a1 of [ang + alpha, ang - alpha]) {
    const ex = UPPER_ARM * Math.sin(a1)
    const ey = UPPER_ARM * Math.cos(a1)
    const score = prefer === 'down' ? ey : ex
    if (score > bestScore) {
      bestScore = score
      best = [a1, Math.atan2(tx - ex, ty - ey) - a1]
    }
  }
  return best
}

// --- Colour helper ---

export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const f = 1 - amount
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return `rgb(${r},${g},${b})`
}

// --- Drawing ---

type Pt = { x: number; y: number }

function limbEnd(from: Pt, len: number, angle: number): Pt {
  return { x: from.x + len * Math.sin(angle), y: from.y + len * Math.cos(angle) }
}

function stroke(ctx: CanvasRenderingContext2D, pts: Pt[], width: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y)
  ctx.stroke()
}

function drawLeg(ctx: CanvasRenderingContext2D, hip: Pt, knee: Pt, foot: Pt, look: Look, back: boolean) {
  const d = back ? 0.18 : 0
  stroke(ctx, [hip, knee, foot], 9, shade(look.bottom, d))
  ctx.fillStyle = shade(look.shoes, d)
  ctx.beginPath()
  ctx.ellipse(foot.x + 3, foot.y + 1, 6.5, 3.8, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawArm(ctx: CanvasRenderingContext2D, sh: Pt, limb: Limb, look: Look, back: boolean) {
  const d = back ? 0.18 : 0
  const elbow = limbEnd(sh, UPPER_ARM, limb[0])
  const hand = limbEnd(elbow, FOREARM, limb[0] + limb[1])
  const longSleeves = look.topStyle !== 'tee'
  // White coat sleeves get an outline so the arm doesn't vanish into the coat.
  if (look.topStyle === 'coat') stroke(ctx, [sh, elbow, hand], 9, shade(look.top, 0.22 + d))
  stroke(ctx, [sh, elbow, hand], 7, shade(longSleeves ? look.top : look.skin, d))
  if (!longSleeves) {
    const mid = { x: (sh.x + elbow.x * 2) / 3, y: (sh.y + elbow.y * 2) / 3 }
    stroke(ctx, [sh, mid], 8, shade(look.top, d))
  }
  ctx.fillStyle = shade(look.skin, d)
  ctx.beginPath()
  ctx.arc(hand.x, hand.y, 3.8, 0, Math.PI * 2)
  ctx.fill()
  return { elbow, hand, foreAngle: limb[0] + limb[1] }
}

function drawTorso(ctx: CanvasRenderingContext2D, sy: number, look: Look) {
  const bottom = look.topStyle === 'coat' ? 7 : 3
  ctx.fillStyle = look.top
  ctx.beginPath()
  ctx.roundRect(-13, sy, 26, bottom - sy, [9, 9, 4, 4])
  ctx.fill()
  if (look.topStyle === 'coat' && look.under) {
    // Scrubs showing through the open front of the white coat, with a V-neck.
    ctx.fillStyle = look.under
    ctx.fillRect(4, sy + 1, 6, -sy - 1)
    ctx.beginPath()
    ctx.moveTo(3, sy + 1)
    ctx.lineTo(11, sy + 1)
    ctx.lineTo(7, sy + 8)
    ctx.fillStyle = look.skin
    ctx.fill()
    // Coat edge lines and breast pocket with a pen.
    ctx.strokeStyle = shade(look.top, 0.15)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(4, sy + 1)
    ctx.lineTo(4, bottom)
    ctx.moveTo(10, sy + 1)
    ctx.lineTo(10, bottom)
    ctx.strokeRect(-9, sy + 9, 7, 6)
    ctx.stroke()
    ctx.fillStyle = '#3d8bfd'
    ctx.fillRect(-6, sy + 6, 1.5, 4)
  }
  if (look.topStyle === 'hoodie') {
    ctx.fillStyle = shade(look.top, 0.12)
    ctx.beginPath()
    ctx.roundRect(-6, sy + 15, 16, 7, 3)
    ctx.fill()
  }
}

function drawHairBack(ctx: CanvasRenderingContext2D, look: Look) {
  ctx.fillStyle = look.hair
  if (look.hairStyle === 'long') {
    ctx.beginPath()
    ctx.roundRect(-HEAD_R - 2, -6, 15, 24, 6)
    ctx.fill()
  } else if (look.hairStyle === 'ponytail') {
    ctx.beginPath()
    ctx.ellipse(-HEAD_R - 2, 2, 4, 9, 0.3, 0, Math.PI * 2)
    ctx.fill()
  } else if (look.topStyle === 'hoodie') {
    ctx.fillStyle = shade(look.top, 0.12)
    ctx.beginPath()
    ctx.arc(-3, 3, HEAD_R + 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawHairFront(ctx: CanvasRenderingContext2D, look: Look) {
  ctx.fillStyle = look.hair
  const r = HEAD_R
  switch (look.hairStyle) {
    case 'bald':
      // A thin band of hair around the back of the head.
      ctx.strokeStyle = look.hair
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(0, 0, r - 1.5, 0.7 * Math.PI, 1.1 * Math.PI)
      ctx.stroke()
      return
    case 'buzz':
      ctx.beginPath()
      ctx.arc(-1, 0, r + 0.5, Math.PI * 1.05, Math.PI * 1.95)
      ctx.fill()
      return
    case 'curly':
      for (const [x, y] of [[-12, -5], [-8, -12], [0, -14], [8, -11], [-13, 3]]) {
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    default:
      // A cap of hair over the top and back of the head, with a small fringe.
      ctx.beginPath()
      ctx.arc(-1, -1, r + 1.5, Math.PI * 0.95, Math.PI * 1.9)
      ctx.quadraticCurveTo(8, -9, 2, -9.5)
      ctx.quadraticCurveTo(-8, -8, -r, 3)
      ctx.fill()
      if (look.hairStyle === 'bun') {
        ctx.beginPath()
        ctx.arc(-6, -r - 3, 6, 0, Math.PI * 2)
        ctx.fill()
      }
  }
}

function drawProp(ctx: CanvasRenderingContext2D, prop: Prop, hand: Pt, time: number, skin: string, foreAngle = 0) {
  switch (prop) {
    case 'clipboard':
      // Positioned so the hand grips its left edge.
      ctx.save()
      ctx.translate(hand.x + 6, hand.y - 3)
      ctx.rotate(0.15)
      ctx.fillStyle = '#a0703f'
      ctx.beginPath()
      ctx.roundRect(-8, -11, 16, 21, 2)
      ctx.fill()
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(-6, -8, 12, 16)
      ctx.fillStyle = '#9aa7b8'
      ctx.fillRect(-4, -5, 8, 1.2)
      ctx.fillRect(-4, -2, 8, 1.2)
      ctx.fillRect(-4, 1, 6, 1.2)
      ctx.fillStyle = '#5b6573'
      ctx.fillRect(-4, -12, 8, 3)
      ctx.restore()
      return
    case 'phone':
      ctx.fillStyle = '#23262d'
      ctx.beginPath()
      ctx.roundRect(hand.x - 3, hand.y - 11, 7, 12, 1.5)
      ctx.fill()
      ctx.fillStyle = '#7fd0ff'
      ctx.fillRect(hand.x - 2, hand.y - 10, 5, 9)
      return
    case 'note':
      ctx.save()
      ctx.translate(hand.x, hand.y - 6)
      ctx.rotate(Math.sin(time * 6) * 0.2)
      ctx.fillStyle = '#fffbe6'
      ctx.fillRect(-5, -8, 11, 13)
      ctx.fillStyle = '#b0a080'
      ctx.fillRect(-3, -5, 7, 1)
      ctx.fillRect(-3, -2, 7, 1)
      ctx.restore()
      return
    case 'tissue':
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(hand.x - 4, hand.y - 2)
      ctx.lineTo(hand.x + 5, hand.y - 6)
      ctx.lineTo(hand.x + 6, hand.y + 3)
      ctx.lineTo(hand.x - 2, hand.y + 4)
      ctx.fill()
      return
    case 'thumb': {
      // A wide fist with curled fingers facing forward and the thumb up at the back edge,
      // so it reads as a thumbs-up rather than a single raised finger.
      ctx.fillStyle = skin
      ctx.strokeStyle = shade(skin, 0.3)
      ctx.lineWidth = 0.9
      ctx.beginPath()
      ctx.roundRect(hand.x - 4.5, hand.y - 11, 3.8, 9, 1.9) // thumb
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(hand.x - 5, hand.y - 3.5, 10, 8, 3) // fist
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      for (const dy of [-1, 1.5]) {
        ctx.moveTo(hand.x + 1.5, hand.y + dy)
        ctx.lineTo(hand.x + 5, hand.y + dy)
      }
      ctx.stroke()
      return
    }
    case 'finger': {
      // Index finger pointing along the forearm.
      const tip = limbEnd(hand, 7, foreAngle)
      stroke(ctx, [hand, tip], 3.6, shade(skin, 0.3))
      stroke(ctx, [hand, tip], 2.4, skin)
      return
    }
    case 'scritch': {
      ctx.strokeStyle = '#f4f7fb'
      ctx.lineWidth = 1.2
      const o = Math.sin(time * 30) * 1.5
      for (const [dx, dy] of [[-8, -4], [7, -6], [-6, 6]]) {
        ctx.beginPath()
        ctx.moveTo(hand.x + dx, hand.y + dy + o)
        ctx.lineTo(hand.x + dx * 1.4, hand.y + dy * 1.4 + o)
        ctx.stroke()
      }
      return
    }
  }
}

function flippedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, facing: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(facing, 1)
  ctx.fillText(text, 0, 0)
  ctx.restore()
}

function drawHeadFx(ctx: CanvasRenderingContext2D, fx: Fx, hx: number, hy: number, time: number, facing: number) {
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  switch (fx.kind) {
    case 'zzz':
      ctx.fillStyle = '#c9d7ff'
      for (let i = 0; i < 3; i++) {
        const k = (time * 0.6 + i / 3) % 1
        ctx.globalAlpha = 1 - k
        ctx.font = `700 ${8 + k * 8}px system-ui, sans-serif`
        flippedText(ctx, 'z', hx + 12 + k * 12, hy - 16 - k * 22, facing)
      }
      ctx.globalAlpha = 1
      return
    case 'sweat':
      ctx.fillStyle = '#7fd0ff'
      for (let i = 0; i < fx.amount; i++) {
        const k = (time * 0.9 + i * 0.37) % 1
        const x = hx + [-13, 13, -9][i % 3]
        const y = hy - 6 + k * 14
        ctx.globalAlpha = 1 - k * 0.8
        ctx.beginPath()
        ctx.moveTo(x, y - 5)
        ctx.quadraticCurveTo(x + 3.5, y + 1, x, y + 2.5)
        ctx.quadraticCurveTo(x - 3.5, y + 1, x, y - 5)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      return
    case 'stars':
      ctx.fillStyle = '#f5d33d'
      ctx.font = '700 10px system-ui, sans-serif'
      for (let i = 0; i < 3; i++) {
        const a = time * 3 + (i * Math.PI * 2) / 3
        flippedText(ctx, '★', hx + Math.cos(a) * 17, hy - 17 + Math.sin(a) * 5, facing)
      }
      return
    case 'steam':
      for (let i = 0; i < 3; i++) {
        const k = (time * 1.4 + i / 3) % 1
        ctx.globalAlpha = (1 - k) * 0.8
        ctx.fillStyle = '#e6ecf5'
        ctx.beginPath()
        ctx.arc(hx + (i - 1) * 8 + Math.sin(time * 5 + i) * 2, hy - 18 - k * 18, 3 + k * 4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      return
    case 'achoo':
      ctx.fillStyle = '#f4f7fb'
      ctx.font = '900 11px system-ui, sans-serif'
      flippedText(ctx, 'ACHOO!', hx + 30, hy - 8, facing)
      ctx.fillStyle = '#c9e8ff'
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.arc(hx + 16 + i * 4, hy + 2 + ((i * 7) % 5) - 2, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    case 'gasp':
      ctx.fillStyle = '#f5b83d'
      ctx.font = '900 14px system-ui, sans-serif'
      flippedText(ctx, '?!', hx + 4, hy - 26, facing)
      return
    case 'sigh':
      ctx.globalAlpha = 0.7
      ctx.fillStyle = '#e6ecf5'
      ctx.beginPath()
      ctx.arc(hx + 18, hy + 8, 3, 0, Math.PI * 2)
      ctx.arc(hx + 24, hy + 5, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      return
  }
}

// Draw a character standing at (x, y) (feet), `size` pixels tall, facing 1 (right) or -1 (left).
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  facing: number,
  look: Look,
  frame: CharFrame,
) {
  const { pose, face, props, fx, time } = frame
  const k = (size / 100) * look.height
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(k * facing, k)
  ctx.scale(1 + (1 - pose.squash) * 0.6, pose.squash)

  // Legs. The body is shifted so the lowest foot rests on the ground.
  const hipF = { x: HIP_X, y: HIP_Y }
  const hipB = { x: -HIP_X, y: HIP_Y }
  const kneeF = limbEnd(hipF, THIGH, pose.legF[0])
  const footF = limbEnd(kneeF, SHIN, pose.legF[0] + pose.legF[1])
  const kneeB = limbEnd(hipB, THIGH, pose.legB[0])
  const footB = limbEnd(kneeB, SHIN, pose.legB[0] + pose.legB[1])
  ctx.translate(0, -Math.max(footF.y, footB.y) - 1.5 - pose.lift)

  // Soft shadow under the feet.
  ctx.save()
  ctx.translate(0, Math.max(footF.y, footB.y) + 2 + pose.lift)
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(2, 0, 20 - Math.min(pose.lift, 10), 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  drawLeg(ctx, hipB, kneeB, footB, look, true)
  drawLeg(ctx, hipF, kneeF, footF, look, false)
  if (fx.some((f) => f.kind === 'throb')) {
    ctx.strokeStyle = '#e5484d'
    ctx.lineWidth = 1.6
    const s = 1 + Math.sin(time * 12) * 0.25
    for (const a of [-0.6, 0, 0.6]) {
      ctx.beginPath()
      ctx.moveTo(footF.x + 3 + Math.sin(a) * 9 * s, footF.y - Math.cos(a) * 7 * s)
      ctx.lineTo(footF.x + 3 + Math.sin(a) * 13 * s, footF.y - Math.cos(a) * 11 * s)
      ctx.stroke()
    }
  }

  // Upper body, tilted by `lean` around the hips.
  ctx.save()
  ctx.translate(0, HIP_Y)
  ctx.rotate(pose.lean)
  const sy = shoulderY(pose)
  const shF = { x: SHOULDER_X, y: sy + 5 }
  const shB = { x: -SHOULDER_X, y: sy + 5 }

  const armB = drawArm(ctx, shB, pose.armB, look, true)
  drawTorso(ctx, sy, look)
  if (props.includes('stethoscope')) {
    ctx.strokeStyle = '#5b6573'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.moveTo(-7, sy + 1)
    ctx.quadraticCurveTo(-4, sy + 13, 1, sy + 13)
    ctx.quadraticCurveTo(6, sy + 13, 8, sy + 1)
    ctx.stroke()
    ctx.fillStyle = '#9aa7b8'
    ctx.beginPath()
    ctx.arc(1, sy + 15, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  if (props.includes('clipboard')) {
    // Held in the back hand but drawn in front of the chest, with the hand on top.
    drawProp(ctx, 'clipboard', armB.hand, time, look.skin)
    ctx.fillStyle = shade(look.skin, 0.1)
    ctx.beginPath()
    ctx.arc(armB.hand.x, armB.hand.y, 3.8, 0, Math.PI * 2)
    ctx.fill()
  }

  // Head, tilted around the neck.
  const hx = 0
  const hy = sy - HEAD_R + 1
  ctx.save()
  ctx.translate(0, sy)
  ctx.rotate(pose.headTilt)
  ctx.translate(0, -HEAD_R + 1)
  ctx.scale(pose.headScale, pose.headScale)
  drawHairBack(ctx, look)
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(0, 0, HEAD_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = shade(look.skin, 0.1)
  ctx.beginPath()
  ctx.arc(-5, 2, 3, 0, Math.PI * 2) // ear
  ctx.fill()
  drawHairFront(ctx, look)
  drawFace(ctx, face, look.skin, time)
  if (props.includes('thermometer')) {
    ctx.save()
    ctx.translate(7, 6)
    ctx.rotate(-0.35)
    ctx.fillStyle = '#f4f7fb'
    ctx.fillRect(0, -1.2, 13, 2.4)
    ctx.fillStyle = '#e5484d'
    ctx.beginPath()
    ctx.arc(13, 0, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()

  if (props.includes('sling')) {
    const elbow = limbEnd(shF, UPPER_ARM, pose.armF[0])
    ctx.fillStyle = '#f4f7fb'
    ctx.beginPath()
    ctx.moveTo(-3, sy + 1)
    ctx.lineTo(elbow.x - 2, elbow.y + 4)
    ctx.lineTo(elbow.x + 12, elbow.y + 3)
    ctx.lineTo(elbow.x + 11, elbow.y - 2)
    ctx.closePath()
    ctx.fill()
  }

  const armF = drawArm(ctx, shF, pose.armF, look, false)
  for (const prop of props) {
    if (prop === 'clipboard' || prop === 'stethoscope' || prop === 'thermometer' || prop === 'sling') continue
    drawProp(ctx, prop, armF.hand, time, look.skin, armF.foreAngle)
  }
  if (props.includes('sling')) {
    // Sling front band over the forearm.
    ctx.fillStyle = '#f4f7fb'
    const elbow = limbEnd(shF, UPPER_ARM, pose.armF[0])
    ctx.beginPath()
    ctx.moveTo(elbow.x - 1, elbow.y - 3)
    ctx.lineTo(elbow.x + 12, elbow.y - 3)
    ctx.lineTo(elbow.x + 12, elbow.y + 4)
    ctx.lineTo(elbow.x - 1, elbow.y + 5)
    ctx.fill()
  }

  for (const f of fx) drawHeadFx(ctx, f, hx, hy, time, facing)
  ctx.restore()
  ctx.restore()
}
