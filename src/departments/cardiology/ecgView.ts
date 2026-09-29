// Draws the Cardiology room: a scrolling ECG monitor, the patient in bed, the resident,
// telemetry techs and a pacemaker shelf. Click or Space taps. Visual only: rules are in ecg.ts.
import { formatCurrency } from '../../core/format'
import type { Game } from '../../core/game'
import { intensityFor } from '../../core/intensity'
import { CARDIO_COLORS as C, CARDIO_SCENE as S } from '../../data/cardiology'
import { EFFECTS } from '../../data/effects'
import { ResidentActor, StaffCrew } from '../../ui/characters/actors'
import { drawCharacter } from '../../ui/characters/body'
import { randomPatientLook, RESIDENT_LOOK, staffLook } from '../../ui/characters/looks'
import { residentFrame } from '../../ui/characters/poses'
import type { Effects } from '../../ui/effects'
import { roomKeysAllowed, screenMapper, setupCanvas, type RoomView } from '../../ui/roomKit'
import type { EcgResult } from './ecg'

const W = S.width
const H = S.height
const HIT_X = S.monitor.x + S.hitOffset
const BASELINE = S.monitor.y + S.monitor.h * 0.62

const gauss = (x: number, w: number) => Math.exp(-(x * x) / (2 * w * w))

// One heartbeat's shape (P wave, QRS spike, T wave), by seconds from the R peak.
function pqrst(d: number): number {
  return 0.12 * gauss(d + 0.17, 0.035) - 0.15 * gauss(d + 0.025, 0.008) + gauss(d, 0.011)
    - 0.3 * gauss(d - 0.025, 0.01) + 0.25 * gauss(d - 0.22, 0.05)
}

// VF: a chaotic squiggle.
function vfWave(t: number): number {
  return 0.45 * Math.sin(t * 31) + 0.3 * Math.sin(t * 47 + 1) + 0.2 * Math.sin(t * 13 + 2)
}

export function mountEcgView(canvas: HTMLCanvasElement, game: Game, fx: Effects): RoomView {
  const ecg = game.ecg
  const ctx = setupCanvas(canvas, W, H)
  const toScreen = screenMapper(canvas, W, H)
  const resident = new ResidentActor()
  const techLooks = S.techSpots.map((_, i) => staffLook(C.tech, i + 5))
  const techs = new StaffCrew(S.techSpots.length, S.staffBurstEvery)
  const shelf = new StaffCrew(1, S.staffBurstEvery)
  const patientLook = randomPatientLook()
  let time = 0
  let jolt = 0 // seconds since the last shock, for the patient's jump
  let message = ''
  let messageAge = 99

  game.bus.on('earn', (e) => {
    if (e.dept !== 'cardiology' || e.source !== 'idle') return
    if (game.stats('cardiology').techs > 0) techs.add(e.amount)
    else shelf.add(e.amount)
  })
  game.bus.on('milestone', (e) => {
    if (e.dept === 'cardiology') resident.cheer()
  })
  game.bus.on('ecg', (r) => handle(r))

  const chest = () => toScreen(S.bed.x + S.bed.w - 24 - S.patientSize * 0.55, S.bed.y - 20)

  function handle(r: EcgResult) {
    const tier = intensityFor(game, 'cardiology')
    switch (r.kind) {
      case 'hit': {
        const at = chest()
        fx.money(at.x, at.y, r.pay, Math.max(1, Math.ceil(EFFECTS.burstCount[tier - 1] / 3)))
        const perfect = r.quality === 'perfect'
        const line = toScreen(HIT_X, S.monitor.y + 30)
        fx.text(line.x, line.y, (perfect ? 'Perfect +' : '+') + formatCurrency('cardiology', r.pay), perfect ? '#f5d33d' : '#5dff9a', perfect ? 18 : 15)
        if (ecg.combo > 0 && ecg.combo % S.thumbsEvery === 0) resident.play({ kind: 'thumbsUp', age: 0 })
        break
      }
      case 'miss':
        if (r.lostCombo >= 3) {
          resident.play({ kind: 'facepalm', age: 0 })
          const at = toScreen(HIT_X, S.monitor.y + S.monitor.h + 16)
          fx.text(at.x, at.y, `Combo x${r.lostCombo} lost!`, '#ff5f5f', 20)
          fx.shake(3)
        }
        say(r.message)
        break
      case 'early':
        say(r.message)
        break
      case 'converted':
        resident.play({ kind: 'facepalm', age: 0 })
        say(r.message)
        break
      case 'shock': {
        jolt = 0
        resident.play({ kind: 'point', age: 0, pointAngle: 1.35 }, 'cheer')
        const at = chest()
        fx.money(at.x, at.y, r.pay, EFFECTS.burstCount[tier - 1] + 6)
        fx.sparks(at.x, at.y, 24, '#9fd8ff', 320)
        fx.text(at.x, at.y - 50, `${r.message} +${formatCurrency('cardiology', r.pay)}`, '#f5d33d', 26)
        fx.shake(6)
        break
      }
    }
  }

  function say(text: string) {
    message = text
    messageAge = 0
  }

  // --- Input: click or Space ---

  canvas.addEventListener('pointerdown', () => ecg.tap())
  window.addEventListener('keydown', (e) => {
    if (e.key !== ' ' || !roomKeysAllowed(game, 'cardiology', canvas, e)) return
    e.preventDefault() // don't scroll the page
    if (!e.repeat) ecg.tap()
  })

  // --- Drawing ---

  function drawRoom() {
    ctx.fillStyle = C.wall
    ctx.fillRect(0, 0, W, S.wallHeight)
    ctx.fillStyle = C.wallTrim
    ctx.fillRect(0, S.wallHeight - 10, W, 10)
    ctx.fillStyle = C.floor
    ctx.fillRect(0, S.wallHeight, W, H - S.wallHeight)
    ctx.fillStyle = C.ink
    ctx.font = '800 16px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CARDIOLOGY', 720, 30)
    ctx.fillStyle = C.muted
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('Hearts mended. Mostly.', 720, 48)
  }

  function drawMonitor() {
    const m = S.monitor
    const s = game.stats('cardiology')
    ctx.fillStyle = '#2b2f3a'
    ctx.beginPath()
    ctx.roundRect(m.x - 10, m.y - 10, m.w + 20, m.h + 20, 14)
    ctx.fill()
    ctx.fillStyle = C.screen
    ctx.fillRect(m.x, m.y, m.w, m.h)
    // Grid.
    ctx.strokeStyle = C.grid
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = m.x; x <= m.x + m.w; x += 20) {
      ctx.moveTo(x, m.y)
      ctx.lineTo(x, m.y + m.h)
    }
    for (let y = m.y; y <= m.y + m.h; y += 20) {
      ctx.moveTo(m.x, y)
      ctx.lineTo(m.x + m.w, y)
    }
    ctx.stroke()

    // The trace: past (left of the line) is dimmer.
    const vf = ecg.vf
    ctx.save()
    ctx.beginPath()
    ctx.rect(m.x, m.y, m.w, m.h)
    ctx.clip()
    for (const past of [true, false]) {
      ctx.strokeStyle = past ? C.traceOld : vf && ecg.inVf() ? C.vf : C.trace
      ctx.lineWidth = past ? 2 : 2.5
      ctx.beginPath()
      const from = past ? m.x : HIT_X
      const to = past ? HIT_X : m.x + m.w
      for (let x = from; x <= to; x += 2) {
        const t = ecg.time + (x - HIT_X) / S.pxPerSecond
        let v = 0
        if (vf && t >= vf.start && t <= vf.end) v = vfWave(t)
        else for (const b of ecg.beats) if (Math.abs(t - b.t) < 0.45) v += pqrst(t - b.t)
        const y = BASELINE - v * S.waveHeight
        if (x === from) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    // Markers over each beat's spike.
    for (const b of ecg.beats) {
      const x = HIT_X + (b.t - ecg.time) * S.pxPerSecond
      if (x < m.x || x > m.x + m.w) continue
      const y = BASELINE - S.waveHeight - 14
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      if (b.state === 'coming') {
        ctx.strokeStyle = C.line
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = b.state === 'missed' ? C.vf : b.quality === 'perfect' ? '#f5d33d' : C.trace
        ctx.fill()
      }
    }
    ctx.restore()

    // The "now" line and the timing window around it.
    ctx.fillStyle = 'rgba(244,247,251,0.08)'
    ctx.fillRect(HIT_X - s.goodWindow * S.pxPerSecond, m.y, s.goodWindow * 2 * S.pxPerSecond, m.h)
    ctx.fillStyle = 'rgba(245,211,61,0.12)'
    ctx.fillRect(HIT_X - s.perfectWindow * S.pxPerSecond, m.y, s.perfectWindow * 2 * S.pxPerSecond, m.h)
    ctx.strokeStyle = C.line
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(HIT_X, m.y)
    ctx.lineTo(HIT_X, m.y + m.h)
    ctx.stroke()

    // Heart icon that thumps on each beat, plus BPM readout.
    const sinceBeat = Math.min(...ecg.beats.map((b) => (ecg.time >= b.t ? ecg.time - b.t : 9)), 9)
    const thump = 1 + Math.max(0, 0.35 - sinceBeat * 2)
    ctx.save()
    ctx.translate(m.x + m.w - 36, m.y + 30)
    ctx.scale(thump, thump)
    drawHeart(0, 0, 11, ecg.inVf() ? C.vf : '#ff6b81')
    ctx.restore()
    ctx.fillStyle = C.trace
    ctx.font = '700 14px ui-monospace, monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(s.bpm)} BPM`, m.x + m.w - 56, m.y + 31)
    ctx.textAlign = 'left'
    ctx.fillText(`x${ecg.multiplier.toFixed(2)}  combo ${ecg.combo}`, m.x + 10, m.y + 16)

    // VF warning and defibrillator charge bar.
    if (vf) {
      const barY = m.y + m.h + 14
      const active = ecg.inVf()
      const charge = active ? Math.min(1, (ecg.time - vf.start) / (vf.chargedAt - vf.start)) : 0
      ctx.fillStyle = '#1b1b1b'
      ctx.fillRect(m.x + 60, barY, m.w - 120, 12)
      ctx.fillStyle = charge >= 1 ? C.charge : '#9fd8ff'
      ctx.fillRect(m.x + 60, barY, (m.w - 120) * charge, 12)
      const blink = Math.sin(time * 12) > 0
      ctx.fillStyle = charge >= 1 ? C.charge : C.vf
      ctx.font = '900 18px system-ui, sans-serif'
      ctx.textAlign = 'center'
      const label = !active ? 'VF incoming!' : charge >= 1 ? 'SHOCK NOW!  (click / Space)' : 'VF! Charging…'
      if (active || blink) ctx.fillText(label, m.x + m.w / 2, m.y + 44)
    }
  }

  function drawHeart(x: number, y: number, r: number, color: string) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y + r)
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.4)
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r)
    ctx.fill()
  }

  // The patient lies on their back with their feet at the right end of the bed.
  const feetX = S.bed.x + S.bed.w - 24
  const headX = feetX - S.patientSize * 0.8
  const chestX = feetX - S.patientSize * 0.55

  function drawPatient() {
    const b = S.bed
    const jump = jolt < 0.4 ? Math.sin((jolt / 0.4) * Math.PI) * 16 : 0 // a shock makes them jump
    // Bed frame, mattress and pillow.
    ctx.fillStyle = '#6b7a90'
    ctx.fillRect(b.x + 8, b.y + b.h, 8, 30)
    ctx.fillRect(b.x + b.w - 16, b.y + b.h, 8, 30)
    ctx.fillStyle = C.bed
    ctx.beginPath()
    ctx.roundRect(b.x, b.y, b.w, b.h, 8)
    ctx.fill()
    ctx.fillStyle = '#f4f7fb'
    ctx.beginPath()
    ctx.roundRect(headX - 30, b.y - 10, 56, 16, 8)
    ctx.fill()
    const frame = residentFrame(time, null, 0)
    frame.props = []
    frame.face = { eyes: ecg.inVf() ? 'swirl' : jolt < 1.2 ? 'wide' : 'closed', mouth: jolt < 1.2 ? 'open' : 'small', brows: 'none' }
    frame.pose.armF = [0.1, 0.1]
    ctx.save()
    ctx.translate(feetX, b.y - 2 - jump)
    ctx.rotate(-Math.PI / 2)
    drawCharacter(ctx, 0, 0, S.patientSize, 1, patientLook, frame)
    ctx.restore()
    // Blanket over the legs.
    ctx.fillStyle = C.sheet
    ctx.beginPath()
    ctx.roundRect(feetX - S.patientSize * 0.42, b.y - 22 - jump, S.patientSize * 0.42 + 14, 26, 8)
    ctx.fill()
    // ECG lead from the chest up to the monitor.
    ctx.strokeStyle = '#e5484d'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(chestX, b.y - 26 - jump)
    ctx.quadraticCurveTo(chestX - 40, S.monitor.y + S.monitor.h + 50, S.monitor.x + S.monitor.w / 2, S.monitor.y + S.monitor.h + 10)
    ctx.stroke()
  }

  function drawStaff() {
    const s = game.stats('cardiology')
    // Pacemaker shelf, LEDs blinking.
    const sh = S.pacemakerShelf
    if (s.pacemakers > 0) {
      ctx.fillStyle = '#3b2c55'
      ctx.fillRect(sh.x, sh.y + sh.h, sh.w, 6)
      const shown = Math.min(S.pacemakerSlots, s.pacemakers)
      for (let i = 0; i < shown; i++) {
        const col = i % 5
        const row = Math.floor(i / 5)
        const x = sh.x + 4 + col * 25
        const y = sh.y + sh.h - 26 - row * 30
        ctx.fillStyle = '#9aa7b8'
        ctx.beginPath()
        ctx.roundRect(x, y, 20, 24, 6)
        ctx.fill()
        const on = (time * (s.bpm / 60) + i * 0.13) % 1 < 0.15
        ctx.fillStyle = on ? '#ff5f5f' : '#5a2a2a'
        ctx.beginPath()
        ctx.arc(x + 10, y + 7, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = C.muted
      ctx.font = '700 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(s.pacemakers > shown ? `PACEMAKERS x${s.pacemakers}` : 'PACEMAKERS', sh.x + sh.w / 2, sh.y + sh.h + 18)
    }
    // Telemetry techs behind their desk.
    const n = Math.min(S.techSpots.length, s.techs)
    for (let i = 0; i < n; i++) {
      const frame = residentFrame(time + i * 1.7, techs.gestures[i], 0)
      frame.props = []
      frame.face.tired = false
      drawCharacter(ctx, S.techSpots[i], S.techY, S.techSize, -1, techLooks[i], frame)
    }
    if (s.techs > 0) {
      const d = S.techDesk
      ctx.fillStyle = '#3b2c55'
      ctx.fillRect(d.x, d.y, d.w, d.h)
      // Little monitors on the desk.
      for (let i = 0; i < 3; i++) {
        const mx = d.x + 12 + i * 50
        ctx.fillStyle = '#111'
        ctx.fillRect(mx, d.y - 22, 36, 22)
        ctx.strokeStyle = C.trace
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let k = 0; k <= 34; k += 2) {
          const v = pqrst((((time + i * 0.3 + k / 40) % 1) - 0.5) * 1.2)
          const y = d.y - 8 - v * 8
          if (k === 0) ctx.moveTo(mx + 1 + k, y)
          else ctx.lineTo(mx + 1 + k, y)
        }
        ctx.stroke()
      }
      ctx.fillStyle = C.ink
      ctx.font = '700 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(s.techs > n ? `TELEMETRY x${s.techs}` : 'TELEMETRY', d.x + d.w / 2, d.y + d.h / 2 + 3)
    }
  }

  function techBurst(i: number, amount: number) {
    const tier = intensityFor(game, 'cardiology')
    const at = toScreen(S.techSpots[i] - 10, S.techY - 60)
    fx.money(at.x, at.y, amount, Math.max(1, Math.ceil(EFFECTS.burstCount[tier - 1] / 2)))
  }

  function shelfBurst(_i: number, amount: number) {
    const tier = intensityFor(game, 'cardiology')
    const sh = S.pacemakerShelf
    const at = toScreen(sh.x + sh.w / 2, sh.y + sh.h / 2)
    fx.money(at.x, at.y, amount, Math.max(1, Math.ceil(EFFECTS.burstCount[tier - 1] / 2)))
  }

  return {
    update(dt: number) {
      time += dt
      jolt += dt
      messageAge += dt
      resident.update(dt)
      const s = game.stats('cardiology')
      techs.update(dt, Math.min(S.techSpots.length, s.techs), techBurst, 1.4)
      if (s.techs === 0) shelf.update(dt, s.pacemakers > 0 ? 1 : 0, shelfBurst)
    },
    draw() {
      drawRoom()
      drawStaff()
      drawMonitor()
      drawPatient()
      const r = S.resident
      const sweat = ecg.combo >= 30 ? 3 : ecg.combo >= 20 ? 2 : ecg.combo >= 10 ? 1 : 0
      drawCharacter(ctx, r.x, r.y, r.size, 1, RESIDENT_LOOK, residentFrame(time, resident.gesture, sweat))
      if (messageAge < 2.5) {
        ctx.globalAlpha = 1 - messageAge / 2.5
        ctx.fillStyle = '#f5b83d'
        ctx.font = 'italic 16px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(message, 400, 290)
        ctx.globalAlpha = 1
      }
    },
  }
}
