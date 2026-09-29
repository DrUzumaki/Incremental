// Dev-only character preview page (open /characters.html while `npm run dev` is running).
import '../../style.css'
import type { ComplaintAct } from '../../data/emergency'
import { drawCharacter, type Look } from './body'
import { randomPatientLook, RESIDENT_LOOK } from './looks'
import { GESTURE_DURATION, patientFrame, residentFrame, type Gesture, type GestureState, type PatientMode } from './poses'

const ACTS: { act: ComplaintAct; label: string }[] = [
  { act: 'clutchChest', label: 'Chest pain' },
  { act: 'clutchThroat', label: 'Not breathing / asthma' },
  { act: 'dozing', label: 'Unresponsive' },
  { act: 'dizzy', label: 'Slurred speech' },
  { act: 'puffy', label: 'Peanut reaction' },
  { act: 'holdArm', label: 'Broken arm / cut / bite' },
  { act: 'limp', label: 'Stubbed toe / ladder' },
  { act: 'fever', label: 'High fever' },
  { act: 'holdSide', label: 'Kidney stone' },
  { act: 'sneeze', label: 'Runny nose' },
  { act: 'scratch', label: 'Sunburn / splinter' },
  { act: 'phone', label: 'Googled symptoms' },
  { act: 'note', label: 'Needs a sick note' },
]

const root = document.querySelector<HTMLDivElement>('#preview')!
root.innerHTML = `
  <style>
    .pv { max-width: 920px; margin: 0 auto; padding: 16px; }
    .pv h1 { margin: 0 0 4px; font-size: 1.5rem; }
    .pv h2 { margin: 28px 0 8px; font-size: 1.15rem; }
    .pv p { margin: 0 0 12px; color: #8ea3bf; }
    .pv canvas { display: block; width: 100%; background: #16263d; border-radius: 12px; }
    .pv .controls { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
    .pv button, .pv label { font: inherit; font-size: 0.9rem; }
    .pv button { padding: 6px 12px; border-radius: 8px; border: 1px solid #3a4d68; background: #1d304b; color: #f4f7fb; cursor: pointer; }
    .pv button:hover { border-color: #3d8bfd; }
    .pv label { color: #c9d4e3; display: flex; gap: 6px; align-items: center; }
  </style>
  <div class="pv">
    <h1>Character preview</h1>
    <p>Dev-only page. Nothing here affects the game.</p>

    <h2>The resident</h2>
    <div class="controls">
      <button data-g="point" data-a="0.85">Point: Red</button>
      <button data-g="point" data-a="1.45">Point: Yellow</button>
      <button data-g="point" data-a="2.05">Point: Green</button>
      <button data-g="thumbsUp">Thumbs up</button>
      <button data-g="facepalm">Facepalm</button>
      <button data-g="yawn">Yawn</button>
      <label>Combo sweat <input id="sweat" type="range" min="0" max="3" step="1" value="0"></label>
    </div>
    <canvas id="resident"></canvas>

    <h2>Patients</h2>
    <div class="controls">
      <label><input type="radio" name="mode" value="waiting" checked> Waiting</label>
      <label><input type="radio" name="mode" value="walking"> Walking in</label>
      <label>Patience <input id="patience" type="range" min="0" max="100" value="100"></label>
      <button id="shuffle">Shuffle looks</button>
    </div>
    <canvas id="patients"></canvas>

    <h2>In motion</h2>
    <p>A patient walks in, waits, then either walks off to a bay or storms out.</p>
    <canvas id="lane"></canvas>
  </div>
`

function setupCanvas(id: string, w: number, h: number) {
  const canvas = document.getElementById(id) as HTMLCanvasElement
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.aspectRatio = `${w} / ${h}`
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 13, color = '#c9d4e3') {
  ctx.fillStyle = color
  ctx.font = `600 ${size}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x, y)
}

// --- Resident ---

const RW = 880
const RH = 300
const residentCtx = setupCanvas('resident', RW, RH)
let gesture: GestureState | null = null
let sweat = 0

for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-g]')) {
  btn.addEventListener('click', () => {
    gesture = { kind: btn.dataset.g as Gesture, age: 0, pointAngle: Number(btn.dataset.a) || undefined }
  })
}
document.getElementById('sweat')!.addEventListener('input', (e) => {
  sweat = Number((e.target as HTMLInputElement).value)
})

// --- Patients grid ---

const COLS = 4
const CELL_W = 220
const CELL_H = 230
const PW = COLS * CELL_W
const PH = 4 * CELL_H
const patientsCtx = setupCanvas('patients', PW, PH)
let mode: PatientMode = 'waiting'
let patience = 1
let looks: Look[] = []
const shuffle = () => (looks = Array.from({ length: 16 }, randomPatientLook))
shuffle()

for (const r of root.querySelectorAll<HTMLInputElement>('input[name=mode]')) {
  r.addEventListener('change', () => (mode = r.value as PatientMode))
}
document.getElementById('patience')!.addEventListener('input', (e) => {
  patience = Number((e.target as HTMLInputElement).value) / 100
})
document.getElementById('shuffle')!.addEventListener('click', shuffle)

// --- Lane ---

const LW = 880
const LH = 220
const laneCtx = setupCanvas('lane', LW, LH)
const LANE_CYCLE = 7
let laneLook = randomPatientLook()
let laneAct = ACTS[0].act
let laneCount = -1

function drawLane(t: number) {
  const ctx = laneCtx
  ctx.clearRect(0, 0, LW, LH)
  ctx.fillStyle = '#1d304b'
  ctx.fillRect(0, LH - 40, LW, 40)
  const n = Math.floor(t / LANE_CYCLE)
  if (n !== laneCount) {
    laneCount = n
    laneLook = randomPatientLook()
    laneAct = ACTS[n % ACTS.length].act
  }
  const c = t % LANE_CYCLE
  const storms = n % 2 === 1
  const groundY = LH - 30
  const size = 130
  if (c < 2) {
    const x = -40 + (c / 2) * 480
    drawCharacter(ctx, x, groundY, size, 1, laneLook, patientFrame(laneAct, t, 'walking'))
  } else if (c < 4.5) {
    const mood = storms ? 1 - (c - 2) / 2.5 : 0.9
    drawCharacter(ctx, 440, groundY, size, 1, laneLook, patientFrame(laneAct, t, 'waiting', mood))
  } else if (storms) {
    const x = 440 - ((c - 4.5) / 2.5) * 560
    drawCharacter(ctx, x, groundY, size, -1, laneLook, patientFrame(laneAct, t, 'stormOut'))
  } else {
    const x = 440 + ((c - 4.5) / 2.5) * 520
    drawCharacter(ctx, x, groundY, size, 1, laneLook, patientFrame(laneAct, t, 'toBay'))
  }
  label(ctx, storms ? 'Patience runs out → storms out' : 'Sorted → walks to bay', LW / 2, 22, 14, '#8ea3bf')
}

// --- Loop ---

let last = performance.now()
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  const t = now / 1000

  if (gesture) {
    gesture.age += dt
    if (gesture.age >= GESTURE_DURATION[gesture.kind]) gesture = null
  }
  residentCtx.clearRect(0, 0, RW, RH)
  drawCharacter(residentCtx, 300, RH - 30, 230, 1, RESIDENT_LOOK, residentFrame(t, gesture, sweat))
  label(residentCtx, 'Idle: breathing, blinking, tired eyes', 620, 120, 14, '#8ea3bf')
  label(residentCtx, 'Use the buttons above to trigger gestures', 620, 145, 14, '#8ea3bf')

  const ctx = patientsCtx
  ctx.clearRect(0, 0, PW, PH)
  for (let i = 0; i < 16; i++) {
    const cx = (i % COLS) * CELL_W + CELL_W / 2
    const cy = Math.floor(i / COLS) * CELL_H
    const phase = t + i * 0.37 // so they don't all move in sync
    const feet = cy + 170
    if (i < ACTS.length) {
      const { act, label: text } = ACTS[i]
      drawCharacter(ctx, cx, feet, 120, 1, looks[i], patientFrame(act, phase, mode, patience))
      label(ctx, text, cx, cy + 195)
      label(ctx, act, cx, cy + 213, 11, '#6f84a0')
    } else if (i === 13) {
      drawCharacter(ctx, cx, feet, 120, 1, looks[i], patientFrame('holdArm', phase, 'toBay'))
      label(ctx, 'Walking to bay (relieved)', cx, cy + 195)
    } else if (i === 14) {
      drawCharacter(ctx, cx, feet, 120, -1, looks[i], patientFrame('holdArm', phase, 'stormOut'))
      label(ctx, 'Storming out', cx, cy + 195)
    } else {
      drawCharacter(ctx, cx, feet, 120, 1, RESIDENT_LOOK, residentFrame(phase, null, 0))
      label(ctx, 'Resident, same scale', cx, cy + 195)
    }
  }

  drawLane(t)
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
