// Draws the triage minigame on a canvas and turns clicks / key presses into sorts.
import { formatNumber } from '../../core/format'
import type { GameState } from '../../core/state'
import type { Severity } from '../../data/emergency'
import { getTriageStats, type Patient, type Triage, type TriageResult } from './triage'

// The canvas is drawn at this logical size and scaled by CSS to fit.
const W = 800
const H = 450

const COLORS = {
  floor: '#16263d',
  ink: '#f4f7fb',
  muted: '#8ea3bf',
  skin: '#f1d3b3',
  red: '#e5484d',
  yellow: '#f5b83d',
  green: '#46a758',
}

const FRONT = { x: 400, y: 200, r: 38 }
const QUEUE_SPACING = 80
const BAY_Y = 340
const BAY_W = 240
const BAY_H = 90

const BAYS: { severity: Severity; key: string; label: string; x: number }[] = [
  { severity: 'red', key: '1', label: 'Immediate', x: 20 },
  { severity: 'yellow', key: '2', label: 'Urgent', x: 280 },
  { severity: 'green', key: '3', label: 'Can wait', x: 540 },
]

const POPUP_COUNT = 16
const POPUP_LIFETIME = 0.9
const MESSAGE_LIFETIME = 2.5
const FLASH_LIFETIME = 0.15

// Floating "+$12" text. A fixed pool of these is reused instead of creating new ones.
interface Popup {
  active: boolean
  text: string
  x: number
  y: number
  age: number
}

export function mountTriageView(canvas: HTMLCanvasElement, triage: Triage, state: GameState) {
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const popups: Popup[] = Array.from({ length: POPUP_COUNT }, () => ({
    active: false, text: '', x: 0, y: 0, age: 0,
  }))
  let message = ''
  let messageAge = MESSAGE_LIFETIME
  let flashBay: Severity | null = null
  let flashAge = FLASH_LIFETIME

  function spawnPopup(text: string) {
    const p = popups.find((p) => !p.active)
    if (!p) return
    p.active = true
    p.text = text
    p.x = FRONT.x + (Math.random() - 0.5) * 40
    p.y = FRONT.y - FRONT.r
    p.age = 0
  }

  function handleResult(result: TriageResult | null) {
    if (!result) return
    if (result.kind === 'correct') {
      spawnPopup('+$' + formatNumber(result.pay))
    } else {
      message = result.message
      messageAge = 0
    }
  }

  function sort(severity: Severity) {
    flashBay = severity
    flashAge = 0
    handleResult(triage.sort(severity))
  }

  // --- Input ---

  function toCanvas(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    }
  }

  function bayAt(x: number, y: number) {
    return BAYS.find((b) => x >= b.x && x <= b.x + BAY_W && y >= BAY_Y && y <= BAY_Y + BAY_H)
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
    const bay = BAYS.find((b) => b.key === e.key)
    if (bay && !e.repeat) sort(bay.severity)
  })

  // --- Drawing ---

  function drawPatient(p: Patient, x: number, y: number, r: number, showHint: boolean) {
    if (showHint) {
      ctx.globalAlpha = 0.35
      ctx.fillStyle = COLORS[p.severity]
      ctx.beginPath()
      ctx.arc(x, y + r * 0.2, r * 1.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // Body (shirt) then head.
    ctx.fillStyle = p.tint
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.6, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = COLORS.skin
    ctx.beginPath()
    ctx.arc(x, y, r * 0.6, 0, Math.PI * 2)
    ctx.fill()
    // Eyes.
    ctx.fillStyle = '#1b1b1b'
    for (const dx of [-0.2, 0.2]) {
      ctx.beginPath()
      ctx.arc(x + dx * r, y - r * 0.08, r * 0.06, 0, Math.PI * 2)
      ctx.fill()
    }
    // Mouth: smiles when patient, frowns as patience runs out.
    const mood = p.patience / p.maxPatience
    ctx.strokeStyle = '#1b1b1b'
    ctx.lineWidth = Math.max(1.5, r * 0.06)
    ctx.beginPath()
    const my = y + r * 0.22
    if (mood > 0.6) ctx.arc(x, my - r * 0.08, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI)
    else if (mood > 0.3) { ctx.moveTo(x - r * 0.16, my); ctx.lineTo(x + r * 0.16, my) }
    else ctx.arc(x, my + r * 0.12, r * 0.18, 1.15 * Math.PI, 1.85 * Math.PI)
    ctx.stroke()
  }

  function drawBubble(text: string) {
    ctx.font = '600 20px system-ui, sans-serif'
    const w = ctx.measureText(text).width + 32
    const h = 44
    const x = FRONT.x - w / 2
    const y = 70
    ctx.fillStyle = COLORS.ink
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, 12)
    ctx.moveTo(FRONT.x - 10, y + h)
    ctx.lineTo(FRONT.x, y + h + 14)
    ctx.lineTo(FRONT.x + 10, y + h)
    ctx.fill()
    ctx.fillStyle = '#1b1b1b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, FRONT.x, y + h / 2)
  }

  function draw() {
    const { showHint } = getTriageStats(state)
    ctx.fillStyle = COLORS.floor
    ctx.fillRect(0, 0, W, H)

    // Waiting patients, drawn back to front so the front one sits on top.
    for (let i = triage.queue.length - 1; i >= 1; i--) {
      drawPatient(triage.queue[i], FRONT.x - i * QUEUE_SPACING, FRONT.y + 20, 26, false)
    }

    const front = triage.queue[0]
    if (front) {
      drawPatient(front, FRONT.x, FRONT.y, FRONT.r, showHint)
      drawBubble(front.complaint)
      // Patience bar.
      const barW = 120
      const fill = Math.max(0, front.patience / front.maxPatience)
      ctx.fillStyle = '#0b1422'
      ctx.fillRect(FRONT.x - barW / 2, FRONT.y + 70, barW, 8)
      ctx.fillStyle = fill > 0.3 ? COLORS.ink : COLORS.red
      ctx.fillRect(FRONT.x - barW / 2, FRONT.y + 70, barW * fill, 8)
    } else {
      ctx.fillStyle = COLORS.muted
      ctx.font = 'italic 20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('The waiting room is empty. Suspicious.', FRONT.x, FRONT.y)
    }

    // Combo, top right.
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillStyle = COLORS.ink
    ctx.font = '700 22px system-ui, sans-serif'
    ctx.fillText(`Combo x${triage.multiplier.toFixed(1)}`, W - 20, 16)
    ctx.fillStyle = COLORS.muted
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText(`${triage.combo} in a row · best ${state.bestCombo}`, W - 20, 44)

    // Joke message for wrong sorts / patients leaving, fading out.
    if (messageAge < MESSAGE_LIFETIME) {
      ctx.globalAlpha = 1 - messageAge / MESSAGE_LIFETIME
      ctx.fillStyle = COLORS.yellow
      ctx.font = 'italic 18px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(message, W / 2, 305)
      ctx.globalAlpha = 1
    }

    // Bays.
    for (const bay of BAYS) {
      ctx.fillStyle = COLORS[bay.severity]
      ctx.beginPath()
      ctx.roundRect(bay.x, BAY_Y, BAY_W, BAY_H, 14)
      ctx.fill()
      if (flashBay === bay.severity && flashAge < FLASH_LIFETIME) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fill()
      }
      ctx.fillStyle = '#1b1b1b'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = '800 24px system-ui, sans-serif'
      ctx.fillText(bay.severity.toUpperCase(), bay.x + BAY_W / 2, BAY_Y + 34)
      ctx.font = '15px system-ui, sans-serif'
      ctx.fillText(`[${bay.key}] ${bay.label}`, bay.x + BAY_W / 2, BAY_Y + 62)
    }

    // Pay pop-ups.
    ctx.font = '800 24px system-ui, sans-serif'
    ctx.textAlign = 'center'
    for (const p of popups) {
      if (!p.active) continue
      ctx.globalAlpha = 1 - p.age / POPUP_LIFETIME
      ctx.fillStyle = COLORS.green
      ctx.fillText(p.text, p.x, p.y)
    }
    ctx.globalAlpha = 1
  }

  return {
    update(dt: number) {
      handleResult(triage.update(dt))
      messageAge += dt
      flashAge += dt
      for (const p of popups) {
        if (!p.active) continue
        p.age += dt
        p.y -= 50 * dt
        if (p.age >= POPUP_LIFETIME) p.active = false
      }
      draw()
    },
  }
}
