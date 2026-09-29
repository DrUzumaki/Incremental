// Draws the Emergency room: the resident, walking patients, bays, and feedback.
// Turns clicks / key presses into sorts. Visual only: all rules live in triage.ts.
import { formatNumber } from '../../core/format'
import type { GameState } from '../../core/state'
import type { ComplaintAct, Severity } from '../../data/emergency'
import { SCENE, SCENE_COLORS, SCENE_TIMING, SWEAT_AT_COMBO } from '../../data/emergencyScene'
import { drawCharacter, type Look } from '../../ui/characters/body'
import { randomPatientLook, RESIDENT_LOOK } from '../../ui/characters/looks'
import {
  GESTURE_DURATION,
  patientFrame,
  residentFrame,
  type Gesture,
  type GestureState,
  type PatientMode,
} from '../../ui/characters/poses'
import { getTriageStats, type Triage, type TriageResult } from './triage'

const { width: W, height: H } = SCENE
const C = SCENE_COLORS
const ACTOR_COUNT = 16
const POPUP_COUNT = 16

// A walking patient on screen. A fixed pool of these is reused.
interface Actor {
  active: boolean
  patientId: number
  look: Look
  act: ComplaintAct
  mode: PatientMode
  x: number
  y: number
  tx: number // walk target
  ty: number
  facing: number
  fade: number // 1 = fully visible
  phase: number // animation time offset so patients don't move in sync
}

interface Popup {
  active: boolean
  text: string
  x: number
  y: number
  age: number
}

// Patients further up the screen are further away, so draw them smaller.
function depthScale(y: number) {
  return 0.62 + 0.38 * (y / SCENE.queueY)
}

export function mountTriageView(canvas: HTMLCanvasElement, triage: Triage, state: GameState) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const actors: Actor[] = Array.from({ length: ACTOR_COUNT }, () => ({
    active: false, patientId: 0, look: randomPatientLook(), act: 'note', mode: 'walking',
    x: 0, y: 0, tx: 0, ty: 0, facing: 1, fade: 1, phase: 0,
  }))
  const popups: Popup[] = Array.from({ length: POPUP_COUNT }, () => ({ active: false, text: '', x: 0, y: 0, age: 0 }))

  let time = 0
  let message = ''
  let messageAge = SCENE_TIMING.messageLife
  let flashBay: Severity | null = null
  let flashAge = SCENE_TIMING.flashLife
  let gesture: GestureState | null = null
  let reaction: Gesture | null = null // plays after the point finishes
  let yawnIn = SCENE_TIMING.yawnMin

  function actorFor(id: number) {
    return actors.find((a) => a.active && a.patientId === id)
  }

  function spawnPopup(text: string, x: number, y: number) {
    const p = popups.find((p) => !p.active)
    if (!p) return
    Object.assign(p, { active: true, text, x, y, age: 0 })
  }

  // Keep one actor per queued patient, walking to their spot in line.
  function syncQueue() {
    triage.queue.forEach((patient, i) => {
      let a = actorFor(patient.id)
      if (!a) {
        a = actors.find((x) => !x.active)
        if (!a) return
        Object.assign(a, {
          active: true, patientId: patient.id, look: randomPatientLook(), act: patient.act, mode: 'walking',
          x: SCENE.doorX, y: SCENE.queueY, facing: 1, fade: 1, phase: Math.random() * 10,
        })
      }
      if (a.mode === 'walking' || a.mode === 'waiting') {
        a.tx = SCENE.queueFrontX - i * SCENE.queueSpacing
        a.ty = SCENE.queueY
      }
    })
  }

  function sendToBay(id: number, severity: Severity) {
    const a = actorFor(id)
    const bay = SCENE.bays.find((b) => b.severity === severity)!
    if (!a) return
    a.mode = 'toBay'
    a.tx = bay.x + bay.w / 2
    a.ty = bay.y + bay.h - 6
    a.facing = 1
  }

  function stormOut(id: number) {
    const a = actorFor(id)
    if (!a) return
    a.mode = 'stormOut'
    a.tx = SCENE.exitX
    a.ty = SCENE.queueY
    a.facing = -1
  }

  function handleResult(result: TriageResult | null, frontId: number, choice?: Severity) {
    if (!result) return
    if (result.kind === 'left') {
      stormOut(frontId)
      message = result.message
      messageAge = 0
      return
    }
    sendToBay(frontId, choice!)
    const bay = SCENE.bays.find((b) => b.severity === choice)!
    gesture = { kind: 'point', age: 0, pointAngle: bay.pointAngle }
    if (result.kind === 'correct') {
      reaction = 'thumbsUp'
      spawnPopup('+$' + formatNumber(result.pay), SCENE.queueFrontX, SCENE.bubbleY - 6)
    } else {
      reaction = 'facepalm'
      message = result.message
      messageAge = 0
    }
  }

  function sort(severity: Severity) {
    const front = triage.queue[0]
    if (!front) return
    flashBay = severity
    flashAge = 0
    handleResult(triage.sort(severity), front.id, severity)
  }

  // --- Input ---

  function toCanvas(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H }
  }

  function bayAt(x: number, y: number) {
    return SCENE.bays.find((b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
  }

  canvas.addEventListener('click', (e) => {
    const { x, y } = toCanvas(e)
    const bay = bayAt(x, y)
    if (bay) sort(bay.severity)
  })
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = toCanvas(e)
    canvas.style.cursor = bayAt(x, y) ? 'pointer' : 'default'
  })
  window.addEventListener('keydown', (e) => {
    const bay = SCENE.bays.find((b) => b.key === e.key)
    if (bay && !e.repeat) sort(bay.severity)
  })

  // --- Update ---

  function updateActors(dt: number) {
    for (const a of actors) {
      if (!a.active) continue
      const speed = a.mode === 'toBay' ? SCENE.toBaySpeed : a.mode === 'stormOut' ? SCENE.stormSpeed : SCENE.walkSpeed
      const dx = a.tx - a.x
      const dy = a.ty - a.y
      const dist = Math.hypot(dx, dy)
      const step = speed * dt
      if (dist > step) {
        a.x += (dx / dist) * step
        a.y += (dy / dist) * step
        if (a.mode === 'waiting') a.mode = 'walking'
      } else {
        a.x = a.tx
        a.y = a.ty
        if (a.mode === 'walking') a.mode = 'waiting'
        if (a.mode === 'toBay' || a.mode === 'stormOut') a.fade -= dt * 4
      }
      if (a.mode === 'stormOut' && a.x < 0) a.fade -= dt * 3
      if (a.fade <= 0) a.active = false
    }
  }

  function updateResident(dt: number) {
    if (gesture) {
      gesture.age += dt
      if (gesture.age >= GESTURE_DURATION[gesture.kind]) {
        gesture = reaction ? { kind: reaction, age: 0 } : null
        reaction = null
      }
    } else {
      yawnIn -= dt
      if (yawnIn <= 0) {
        gesture = { kind: 'yawn', age: 0 }
        yawnIn = SCENE_TIMING.yawnMin + Math.random() * (SCENE_TIMING.yawnMax - SCENE_TIMING.yawnMin)
      }
    }
  }

  // --- Drawing ---

  function drawRoom() {
    ctx.fillStyle = C.wall
    ctx.fillRect(0, 0, W, SCENE.wallHeight)
    ctx.fillStyle = C.wallTrim
    ctx.fillRect(0, SCENE.wallHeight - 10, W, 10)
    ctx.fillStyle = C.floor
    ctx.fillRect(0, SCENE.wallHeight, W, H - SCENE.wallHeight)
    // Queue line markings on the floor.
    ctx.strokeStyle = C.floorLine
    ctx.lineWidth = 3
    ctx.setLineDash([14, 10])
    ctx.beginPath()
    ctx.moveTo(40, SCENE.queueY + 6)
    ctx.lineTo(SCENE.queueFrontX + 40, SCENE.queueY + 6)
    ctx.stroke()
    ctx.setLineDash([])
    // Entrance door on the left wall.
    ctx.fillStyle = C.doorFrame
    ctx.fillRect(0, 110, 64, SCENE.wallHeight - 110)
    ctx.fillStyle = C.door
    ctx.fillRect(0, 118, 56, SCENE.wallHeight - 118)
    ctx.fillStyle = C.green
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('ENTRANCE', 30, 100)
    // Sign on the wall.
    ctx.fillStyle = C.ink
    ctx.font = '800 22px system-ui, sans-serif'
    ctx.fillText('EMERGENCY', 330, 44)
    ctx.fillStyle = C.muted
    ctx.font = '13px system-ui, sans-serif'
    ctx.fillText('Please take a number. Or don\'t.', 330, 68)
  }

  function drawBays() {
    for (const bay of SCENE.bays) {
      const col = C[bay.severity]
      ctx.fillStyle = C.door
      ctx.beginPath()
      ctx.roundRect(bay.x, bay.y, bay.w, bay.h, 10)
      ctx.fill()
      // Curtain: coloured folds hanging from a rail.
      ctx.fillStyle = col
      for (let i = 0; i < 5; i++) {
        const fx = bay.x + 8 + i * ((bay.w - 16) / 5)
        ctx.globalAlpha = i % 2 ? 0.85 : 1
        ctx.fillRect(fx, bay.y + 10, (bay.w - 16) / 5 + 1, bay.h - 44)
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#9aa7b8'
      ctx.fillRect(bay.x + 4, bay.y + 6, bay.w - 8, 4)
      if (flashBay === bay.severity && flashAge < SCENE_TIMING.flashLife) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.beginPath()
        ctx.roundRect(bay.x, bay.y, bay.w, bay.h, 10)
        ctx.fill()
      }
      ctx.fillStyle = C.ink
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '800 16px system-ui, sans-serif'
      ctx.fillText(`[${bay.key}] ${bay.severity.toUpperCase()}`, bay.x + bay.w / 2, bay.y + bay.h - 24)
      ctx.fillStyle = C.muted
      ctx.font = '12px system-ui, sans-serif'
      ctx.fillText(bay.label, bay.x + bay.w / 2, bay.y + bay.h - 9)
    }
  }

  function drawActors(showHint: boolean) {
    const front = triage.queue[0]
    const visible = actors.filter((a) => a.active).sort((a, b) => a.y - b.y || b.x - a.x)
    for (const a of visible) {
      const isFront = front && a.patientId === front.id && a.mode !== 'toBay' && a.mode !== 'stormOut'
      const mood = isFront ? front.patience / front.maxPatience : 1
      const size = (isFront ? SCENE.frontPatientSize : SCENE.patientSize) * depthScale(a.y)
      if (isFront && showHint) {
        ctx.fillStyle = C[front.severity]
        ctx.globalAlpha = 0.45
        ctx.beginPath()
        ctx.ellipse(a.x, a.y, 34, 9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.globalAlpha = Math.max(0, a.fade)
      drawCharacter(ctx, a.x, a.y, size, a.facing, a.look, patientFrame(a.act, time + a.phase, a.mode, mood))
      ctx.globalAlpha = 1
    }
  }

  function drawBubble() {
    const front = triage.queue[0]
    if (!front) {
      ctx.fillStyle = C.muted
      ctx.font = 'italic 18px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('The waiting room is empty. Suspicious.', SCENE.queueFrontX - 80, 300)
      return
    }
    const cx = SCENE.queueFrontX
    const y = SCENE.bubbleY
    ctx.font = '600 17px system-ui, sans-serif'
    const w = ctx.measureText(front.complaint).width + 28
    const h = 36
    ctx.fillStyle = C.ink
    ctx.beginPath()
    ctx.roundRect(cx - w / 2, y, w, h, 10)
    ctx.moveTo(cx - 8, y + h)
    ctx.lineTo(cx, y + h + 10)
    ctx.lineTo(cx + 8, y + h)
    ctx.fill()
    ctx.fillStyle = '#1b1b1b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(front.complaint, cx, y + h / 2)
    // Patience bar under the text.
    const fill = Math.max(0, front.patience / front.maxPatience)
    ctx.fillStyle = '#d6dde8'
    ctx.fillRect(cx - w / 2 + 10, y + h - 6, w - 20, 3)
    ctx.fillStyle = fill > 0.3 ? C.green : C.red
    ctx.fillRect(cx - w / 2 + 10, y + h - 6, (w - 20) * fill, 3)
  }

  function drawHud() {
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = C.ink
    ctx.font = '700 20px system-ui, sans-serif'
    ctx.fillText(`Combo x${triage.multiplier.toFixed(1)}`, 90, 14)
    ctx.fillStyle = C.muted
    ctx.font = '13px system-ui, sans-serif'
    ctx.fillText(`${triage.combo} in a row · best ${state.bestCombo}`, 90, 40)

    if (messageAge < SCENE_TIMING.messageLife) {
      ctx.globalAlpha = 1 - messageAge / SCENE_TIMING.messageLife
      ctx.fillStyle = C.yellow
      ctx.font = 'italic 16px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(message, 330, SCENE.messageY)
      ctx.globalAlpha = 1
    }

    ctx.font = '800 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    for (const p of popups) {
      if (!p.active) continue
      ctx.globalAlpha = 1 - p.age / SCENE_TIMING.popupLife
      ctx.fillStyle = C.green
      ctx.fillText(p.text, p.x, p.y)
    }
    ctx.globalAlpha = 1
  }

  function sweatLevel() {
    return SWEAT_AT_COMBO.filter((c) => triage.combo >= c).length
  }

  return {
    update(dt: number) {
      time += dt
      const front = triage.queue[0]
      const frontId = front ? front.id : -1
      handleResult(triage.update(dt), frontId)
      syncQueue()
      updateActors(dt)
      updateResident(dt)
      messageAge += dt
      flashAge += dt
      for (const p of popups) {
        if (!p.active) continue
        p.age += dt
        p.y -= 50 * dt
        if (p.age >= SCENE_TIMING.popupLife) p.active = false
      }
    },
    draw() {
      const { showHint } = getTriageStats(state)
      drawRoom()
      drawBays()
      drawActors(showHint)
      const r = SCENE.resident
      drawCharacter(ctx, r.x, r.y, r.size, 1, RESIDENT_LOOK, residentFrame(time, gesture, sweatLevel()))
      drawBubble()
      drawHud()
    },
  }
}
