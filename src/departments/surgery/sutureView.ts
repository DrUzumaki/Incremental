// Draws the Surgery room: an operating light, the draped patient with a dotted incision
// line to trace, the resident, surgical residents and (later) the robot.
// Visual only: rules are in suture.ts.
import { formatCurrency } from '../../core/format'
import type { Game } from '../../core/game'
import { intensityFor } from '../../core/intensity'
import { EFFECTS } from '../../data/effects'
import { SURGERY_COLORS as C, SURGERY_SCENE as S, SUTURE } from '../../data/surgery'
import { ResidentActor, StaffCrew } from '../../ui/characters/actors'
import { drawCharacter } from '../../ui/characters/body'
import { RESIDENT_LOOK, staffLook } from '../../ui/characters/looks'
import { residentFrame } from '../../ui/characters/poses'
import type { Effects } from '../../ui/effects'
import { toast } from '../../ui/overlays'
import { screenMapper, setupCanvas, type RoomView } from '../../ui/roomKit'
import type { SurgeryResult } from './suture'

const W = S.width
const H = S.height
const F = SUTURE.field

export function mountSutureView(canvas: HTMLCanvasElement, game: Game, fx: Effects): RoomView {
  const op = game.surgery
  const ctx = setupCanvas(canvas, W, H)
  const toScreen = screenMapper(canvas, W, H)
  const resident = new ResidentActor()
  const residentLooks = S.residentSpots.map((_, i) => staffLook(C.scrubs, i + 11))
  const crew = new StaffCrew(S.residentSpots.length, S.staffBurstEvery)
  const robotCrew = new StaffCrew(1, S.staffBurstEvery / 2)
  let time = 0
  let message = ''
  let messageColor = C.ink
  let messageAge = 99

  game.bus.on('earn', (e) => {
    if (e.dept !== 'surgery' || e.source !== 'idle') return
    if (game.stats('surgery').robots > 0) robotCrew.add(e.amount)
    else crew.add(e.amount)
  })
  game.bus.on('milestone', (e) => {
    if (e.dept === 'surgery') resident.cheer()
  })
  game.bus.on('surgery', (r) => handle(r))

  function say(text: string, color = C.ink) {
    message = text
    messageColor = color
    messageAge = 0
  }

  function handle(r: SurgeryResult) {
    const tier = intensityFor(game, 'surgery')
    const end = toScreen(F.x + F.w / 2, F.y + F.h / 2)
    switch (r.kind) {
      case 'done': {
        const perfect = r.quality === 'perfect'
        fx.money(end.x, end.y, r.pay, EFFECTS.burstCount[tier - 1] + (perfect ? 4 : 0))
        fx.text(end.x, end.y - 50, `${Math.round(r.accuracy * 100)}% · +${formatCurrency('surgery', r.pay)}`, perfect ? '#f5d33d' : '#9bd44a', perfect ? 24 : 20)
        fx.sparks(end.x, end.y, perfect ? 24 : 10, '#f5d33d', 260)
        if (perfect) fx.shake(3)
        resident.play({ kind: 'point', age: 0, pointAngle: 1.9 }, r.quality === 'messy' ? 'facepalm' : 'thumbsUp')
        say(r.message, perfect ? '#f5d33d' : r.quality === 'messy' ? '#f5b83d' : '#9bd44a')
        if (r.perk) {
          toast(`New permanent perk! Every room now earns x${game.perkMult().toFixed(2)}`, 'big')
          fx.confetti(end.x, end.y, 30)
        }
        break
      }
      case 'slip':
        say(r.message, '#f5b83d')
        fx.shake(2)
        break
      case 'timeout':
        resident.play({ kind: 'facepalm', age: 0 })
        say(r.message, '#f5b83d')
        if (r.lostCombo >= 3) {
          fx.text(end.x, end.y, `Combo x${r.lostCombo} lost!`, '#ff5f5f', 22)
          fx.shake(4)
        }
        break
    }
  }

  // --- Input ---

  function toCanvas(e: PointerEvent) {
    const r = canvas.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId)
    op.pointerDown(toCanvas(e))
  })
  canvas.addEventListener('pointermove', (e) => op.pointerMove(toCanvas(e)))
  canvas.addEventListener('pointerup', () => op.pointerUp())
  canvas.style.touchAction = 'none'

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
    ctx.fillText('SURGERY', 110, 30)
    ctx.fillStyle = C.muted
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('Measure twice, cut once.', 110, 48)
    // Operating light glow over the field.
    const g = ctx.createRadialGradient(F.x + F.w / 2, F.y + F.h / 2, 20, F.x + F.w / 2, F.y + F.h / 2, 300)
    g.addColorStop(0, 'rgba(255,250,220,0.18)')
    g.addColorStop(1, 'rgba(255,250,220,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    // Perk counter.
    const s = game.stats('surgery')
    const perks = game.perks()
    const toNext = Math.ceil(s.perkEvery * (perks + 1) - game.state.surgeryOps)
    ctx.fillStyle = C.muted
    ctx.font = '700 12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Operations: ${game.state.surgeryOps} · Perks: ${perks} (every room x${game.perkMult().toFixed(2)}) · next in ${toNext}`, 170, 436)
  }

  function drawField() {
    // Blue drapes around the patch of skin being operated on.
    ctx.fillStyle = C.drape
    ctx.beginPath()
    ctx.roundRect(F.x - 26, F.y - 26, F.w + 52, F.h + 52, 18)
    ctx.fill()
    ctx.fillStyle = C.skin
    ctx.beginPath()
    ctx.roundRect(F.x, F.y, F.w, F.h, 30)
    ctx.fill()
    ctx.fillStyle = C.skinDark
    ctx.beginPath()
    ctx.ellipse(F.x + F.w / 2, F.y + F.h / 2 + 10, 6, 4, 0, 0, Math.PI * 2) // belly button
    ctx.fill()
    const pts = op.op.points
    // The line still to trace (dotted) and the part already stitched.
    ctx.strokeStyle = C.path
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    for (let i = op.progress; i < pts.length; i++) {
      if (i === op.progress) ctx.moveTo(pts[i].x, pts[i].y)
      else ctx.lineTo(pts[i].x, pts[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    if (op.progress > 0) {
      ctx.strokeStyle = C.done
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i <= op.progress; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y)
        else ctx.lineTo(pts[i].x, pts[i].y)
      }
      ctx.stroke()
      // Little cross stitches.
      ctx.strokeStyle = '#1b1b1b'
      ctx.lineWidth = 1.5
      for (let i = 2; i <= op.progress; i += 4) {
        const a = pts[i - 1]
        const b = pts[i]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const len = Math.hypot(dx, dy) || 1
        const nx = (-dy / len) * 6
        const ny = (dx / len) * 6
        ctx.beginPath()
        ctx.moveTo(b.x - nx, b.y - ny)
        ctx.lineTo(b.x + nx, b.y + ny)
        ctx.stroke()
      }
    }
    // Where to press next (pulses) and the finish flag.
    const at = pts[op.progress]
    const pulse = 1 + 0.25 * Math.sin(time * 8)
    ctx.strokeStyle = op.tracing ? '#5fe0f0' : '#46a758'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(at.x, at.y, SUTURE.startRadius * 0.6 * (op.tracing ? 1 : pulse), 0, Math.PI * 2)
    ctx.stroke()
    const endPt = pts[pts.length - 1]
    ctx.fillStyle = '#e5484d'
    ctx.beginPath()
    ctx.arc(endPt.x, endPt.y, 6, 0, Math.PI * 2)
    ctx.fill()
    // Scalpel following the pointer while tracing.
    if (op.pen) {
      ctx.save()
      ctx.translate(op.pen.x, op.pen.y)
      ctx.rotate(-0.8)
      ctx.fillStyle = '#c9d4e3'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(8, -4)
      ctx.lineTo(20, -3)
      ctx.lineTo(20, 3)
      ctx.lineTo(4, 3)
      ctx.fill()
      ctx.fillStyle = '#3d8bfd'
      ctx.fillRect(20, -3, 26, 6)
      ctx.restore()
    }
    // Timer and live accuracy.
    const k = Math.max(0, op.timeLeft / op.maxTime)
    ctx.fillStyle = '#0b1422'
    ctx.fillRect(F.x, F.y + F.h + 32, F.w, 8)
    ctx.fillStyle = k > 0.3 ? '#46a758' : '#e5484d'
    ctx.fillRect(F.x, F.y + F.h + 32, F.w * k, 8)
    ctx.fillStyle = C.ink
    ctx.font = '700 13px system-ui, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`Accuracy ${Math.round(op.accuracy() * 100)}% · combo x${op.multiplier.toFixed(1)}`, F.x + F.w, F.y - 36)
    ctx.textAlign = 'left'
    if (op.progress === 0 && !op.tracing) ctx.fillText('Press on the green circle and trace the line →', F.x, F.y - 36)
  }

  function drawStaff() {
    const s = game.stats('surgery')
    const n = Math.min(S.residentSpots.length, s.residents)
    for (let i = 0; i < n; i++) {
      const frame = residentFrame(time + i * 1.1, crew.gestures[i], 0)
      frame.props = []
      frame.face.tired = false
      drawCharacter(ctx, S.residentSpots[i], S.residentY, S.residentSize, -1, residentLooks[i], frame)
    }
    if (s.residents > n) {
      ctx.fillStyle = '#f5b83d'
      ctx.font = '800 14px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`x${s.residents}`, S.residentSpots[n - 1], S.residentY - S.residentSize - 10)
    }
    if (s.robots > 0) {
      // A robot arm hanging from the ceiling, waving over the field.
      const r = S.robot
      const swing = Math.sin(time * 2) * 0.25
      ctx.fillStyle = '#9aa7b8'
      ctx.fillRect(r.x - 30, r.y - 14, 60, 16)
      ctx.save()
      ctx.translate(r.x, r.y)
      ctx.rotate(0.6 + swing)
      ctx.fillStyle = '#c9d4e3'
      ctx.fillRect(-6, 0, 12, 70)
      ctx.translate(0, 70)
      ctx.rotate(-1 - swing * 1.5)
      ctx.fillRect(-5, 0, 10, 50)
      ctx.fillStyle = robotCrew.gestures[0] ? '#46a758' : '#5fe0f0'
      ctx.beginPath()
      ctx.arc(0, 52, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  function crewBurst(i: number, amount: number) {
    const tier = intensityFor(game, 'surgery')
    const at = toScreen(S.residentSpots[i] - 10, S.residentY - S.residentSize * 0.7)
    fx.money(at.x, at.y, amount, Math.max(1, Math.ceil(EFFECTS.burstCount[tier - 1] / 2)))
  }

  function robotBurst(_i: number, amount: number) {
    const tier = intensityFor(game, 'surgery')
    const at = toScreen(S.robot.x + 40, S.robot.y + 100)
    fx.money(at.x, at.y, amount, EFFECTS.burstCount[tier - 1])
  }

  return {
    update(dt: number) {
      time += dt
      messageAge += dt
      resident.update(dt)
      const s = game.stats('surgery')
      if (s.robots > 0) robotCrew.update(dt, 1, robotBurst)
      else crew.update(dt, Math.min(S.residentSpots.length, s.residents), crewBurst, 2)
    },
    draw() {
      drawRoom()
      drawField()
      drawStaff()
      const r = S.resident
      const sweat = op.combo >= 12 ? 3 : op.combo >= 8 ? 2 : op.combo >= 4 ? 1 : 0
      drawCharacter(ctx, r.x, r.y, r.size, 1, RESIDENT_LOOK, residentFrame(time, resident.gesture, sweat))
      if (messageAge < 2.5) {
        ctx.globalAlpha = 1 - messageAge / 2.5
        ctx.fillStyle = messageColor
        ctx.font = 'italic 16px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(message, 420, 330)
        ctx.globalAlpha = 1
      }
    },
  }
}
