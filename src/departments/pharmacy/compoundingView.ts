// Draws the Pharmacy: a prescription card, shelves of pill jars, the customer at the
// counter, a tray, Dispense / Risky buttons, pill dispensers and the caffeine IV bag.
// Keys: 1-5 add pills, Enter dispenses, R dispenses with a risky trial drug,
// Backspace clears. Visual only: rules are in compounding.ts.
import { formatCurrency } from '../../core/format'
import type { Game } from '../../core/game'
import { intensityFor } from '../../core/intensity'
import { DEPT_ORDER, DEPTS, type DeptId } from '../../data/departments'
import { EFFECTS } from '../../data/effects'
import { JARS, PHARMACY_COLORS as C, PHARMACY_SCENE as S } from '../../data/pharmacy'
import { ResidentActor, StaffCrew } from '../../ui/characters/actors'
import { drawCharacter, type Look } from '../../ui/characters/body'
import { randomPatientLook, RESIDENT_LOOK } from '../../ui/characters/looks'
import { patientFrame, residentFrame } from '../../ui/characters/poses'
import type { Effects } from '../../ui/effects'
import { toast } from '../../ui/overlays'
import { roomKeysAllowed, screenMapper, setupCanvas, type RoomView } from '../../ui/roomKit'
import type { PharmacyResult } from './compounding'

const W = S.width
const H = S.height

type Rect = { x: number; y: number; w: number; h: number }
const inside = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
const jarRect = (i: number): Rect => ({ x: S.jarX + i * (S.jarW + S.jarGap), y: S.jarY, w: S.jarW, h: 72 })

export function mountCompoundingView(canvas: HTMLCanvasElement, game: Game, fx: Effects): RoomView {
  const rx = game.pharmacy
  const ctx = setupCanvas(canvas, W, H)
  const toScreen = screenMapper(canvas, W, H)
  const resident = new ResidentActor()
  const dispensers = new StaffCrew(S.dispenserSpots.length, S.staffBurstEvery)
  let customer: Look = randomPatientLook()
  let orderId = rx.order.id
  let time = 0
  let message = ''
  let messageColor = C.ink
  let messageAge = 99
  const flying: { jar: number; age: number }[] = [] // pills flying from a jar to the tray

  game.bus.on('earn', (e) => {
    if (e.dept === 'pharmacy' && e.source === 'idle') dispensers.add(e.amount)
  })
  game.bus.on('milestone', (e) => {
    if (e.dept === 'pharmacy') resident.cheer()
  })
  game.bus.on('pharmacy', (r) => handle(r))
  game.bus.on('buff', (b) => toast(`Caffeine IV sent to ${DEPTS[b.dept].name}: x${b.mult} for ${Math.round(b.until - game.state.playTime)}s!`, 'big'))

  function say(text: string, color = C.ink) {
    message = text
    messageColor = color
    messageAge = 0
  }

  function handle(r: PharmacyResult) {
    const tier = intensityFor(game, 'pharmacy')
    const at = toScreen(S.tray.x + S.tray.w / 2, S.tray.y)
    switch (r.kind) {
      case 'correct': {
        const big = r.risky === 'jackpot'
        fx.money(at.x, at.y, r.pay, EFFECTS.burstCount[tier - 1] + (big ? 8 : 0))
        fx.text(at.x, at.y - 40, '+' + formatCurrency('pharmacy', r.pay), big ? '#f5d33d' : C.good, big ? 28 : 20)
        fx.sparks(at.x, at.y, big ? 30 : 8, big ? '#f5d33d' : C.risky)
        if (big) {
          fx.shake(6)
          fx.confetti(at.x, at.y, 24)
        }
        resident.play({ kind: 'point', age: 0, pointAngle: 1.5 }, big ? 'cheer' : 'thumbsUp')
        if (r.message) say(r.message, r.risky === 'side' ? '#f5b83d' : big ? '#f5d33d' : C.good)
        break
      }
      case 'wrong':
      case 'expired':
        resident.play({ kind: 'facepalm', age: 0 })
        say(r.message, '#f5b83d')
        if (r.lostCombo >= 3) {
          fx.text(at.x, at.y - 60, `Combo x${r.lostCombo} lost!`, '#ff5f5f', 22)
          fx.shake(4)
        }
        break
      case 'buffReady':
        say('The caffeine IV is full! Send it to another room.', '#5fe0f0')
        break
    }
  }

  // The other rooms a full IV bag can be sent to, with their button boxes.
  function buffTargets(): { dept: DeptId; r: Rect }[] {
    const targets = DEPT_ORDER.filter((d) => d !== 'pharmacy' && game.state.depts[d].unlocked)
    return targets.map((dept, i) => ({ dept, r: { x: 604 + i * 64, y: 402, w: 60, h: 30 } }))
  }

  // --- Input ---

  function addPill(i: number) {
    rx.addPill(i)
    flying.push({ jar: i, age: 0 })
  }

  function click(x: number, y: number) {
    for (let i = 0; i < JARS.length; i++) if (inside(jarRect(i), x, y)) return addPill(i)
    const b = S.buttons
    if (inside(b.dispense, x, y)) return rx.dispense(false)
    if (inside(b.risky, x, y)) return rx.dispense(true)
    if (inside(b.clear, x, y)) return rx.clearTray()
    if (rx.buffReady()) for (const t of buffTargets()) if (inside(t.r, x, y)) return game.sendBuff(t.dept)
  }

  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect()
    click(((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H)
  })
  window.addEventListener('keydown', (e) => {
    if (e.repeat || !roomKeysAllowed(game, 'pharmacy', canvas, e)) return
    const n = Number(e.key)
    if (n >= 1 && n <= JARS.length) addPill(n - 1)
    else if (e.key === 'Enter') rx.dispense(false)
    else if (e.key === 'r' || e.key === 'R') rx.dispense(true)
    else if (e.key === 'Backspace') {
      e.preventDefault()
      rx.clearTray()
    }
  })

  // --- Drawing ---

  function pill(x: number, y: number, color: string, r = 7) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.4, r, 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  function button(r: Rect, label: string, color: string, textColor = '#0f1b2d') {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(r.x, r.y, r.w, r.h, 10)
    ctx.fill()
    ctx.fillStyle = textColor
    ctx.font = '800 13px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1)
  }

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
    ctx.fillText('PHARMACY', 620, 30)
    ctx.fillStyle = C.muted
    ctx.font = '11px system-ui, sans-serif'
    ctx.fillText('Take as directed. Directions may vary.', 620, 48)
    // Shelf and jars.
    ctx.fillStyle = C.shelf
    ctx.fillRect(S.jarX - 10, S.jarY + 72, JARS.length * (S.jarW + S.jarGap) + 12, 8)
    JARS.forEach((jar, i) => {
      const r = jarRect(i)
      ctx.fillStyle = 'rgba(220,235,255,0.35)'
      ctx.beginPath()
      ctx.roundRect(r.x, r.y + 10, r.w, r.h - 10, 10)
      ctx.fill()
      ctx.fillStyle = jar.color
      ctx.fillRect(r.x + 4, r.y, r.w - 8, 12) // lid
      for (let k = 0; k < 6; k++) pill(r.x + 14 + (k % 3) * 14, r.y + 44 + Math.floor(k / 3) * 14, jar.color, 5)
      ctx.fillStyle = C.ink
      ctx.font = '700 11px system-ui, sans-serif'
      ctx.fillText(`[${i + 1}]`, r.x + r.w / 2, r.y + r.h + 18)
    })
  }

  function drawRx() {
    const r = S.rx
    const o = rx.order
    ctx.save()
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2)
    ctx.rotate(-0.03)
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2))
    ctx.fillStyle = C.paper
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.fillStyle = '#1b1b1b'
    ctx.font = 'italic 900 30px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('℞', r.x + 12, r.y + 36)
    ctx.font = '700 12px system-ui, sans-serif'
    ctx.fillText(`Order #${o.id}`, r.x + 50, r.y + 30)
    let line = 0
    o.counts.forEach((n, i) => {
      if (!n) return
      const y = r.y + 64 + line * 24
      pill(r.x + 24, y - 4, JARS[i].color)
      ctx.fillStyle = '#1b1b1b'
      ctx.font = '600 15px system-ui, sans-serif'
      const have = rx.tray[i]
      ctx.fillText(`${JARS[i].name} x${n}`, r.x + 42, y)
      ctx.fillStyle = have === n ? C.good : have > n ? C.bad : '#888'
      ctx.fillText(`${have}/${n}`, r.x + 140, y)
      line++
    })
    // Extra pills that aren't on the order.
    rx.tray.forEach((n, i) => {
      if (!n || o.counts[i]) return
      ctx.fillStyle = C.bad
      ctx.font = '600 13px system-ui, sans-serif'
      ctx.fillText(`${JARS[i].name} x${n} (not ordered!)`, r.x + 16, r.y + 64 + line * 24)
      line++
    })
    const k = Math.max(0, o.timeLeft / o.maxTime)
    ctx.fillStyle = '#ddd'
    ctx.fillRect(r.x + 12, r.y + r.h - 16, r.w - 24, 6)
    ctx.fillStyle = k > 0.3 ? C.good : C.bad
    ctx.fillRect(r.x + 12, r.y + r.h - 16, (r.w - 24) * k, 6)
    ctx.restore()
  }

  function drawCounterAndTray() {
    // The customer stands behind the counter holding their prescription.
    const c = S.customer
    const mood = rx.order.timeLeft / rx.order.maxTime
    drawCharacter(ctx, c.x, c.y, c.size, 1, customer, patientFrame('note', time, 'waiting', mood))
    ctx.fillStyle = C.counter
    ctx.fillRect(130, S.counterY, W - 130, 48)
    ctx.fillStyle = C.counterTop
    ctx.fillRect(126, S.counterY - 6, W - 122, 8)
    // Tray with the pills added so far.
    const t = S.tray
    ctx.fillStyle = '#d6dde8'
    ctx.beginPath()
    ctx.roundRect(t.x, t.y, t.w, t.h, 12)
    ctx.fill()
    let k = 0
    rx.tray.forEach((n, i) => {
      for (let j = 0; j < n; j++, k++) pill(t.x + 16 + (k % 9) * 16, t.y + 13 - Math.floor(k / 9) * 8, JARS[i].color, 6)
    })
    // Pills in flight from their jar to the tray.
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]
      const j = jarRect(f.jar)
      const p = Math.min(1, f.age / 0.25)
      const x = j.x + j.w / 2 + (t.x + t.w / 2 - j.x - j.w / 2) * p
      const y = j.y + 40 + (t.y - j.y - 40) * p - Math.sin(p * Math.PI) * 40
      pill(x, y, JARS[f.jar].color, 6)
      if (p >= 1) flying.splice(i, 1)
    }
    const b = S.buttons
    button(b.dispense, 'Dispense (Enter)', C.good)
    button(b.risky, 'Risky trial drug (R)', C.risky, C.ink)
    button(b.clear, 'Clear ⌫', '#6b7a90', C.ink)
  }

  function drawIvBag() {
    const s = game.stats('pharmacy')
    const fill = Math.min(1, rx.charge / s.buffCost)
    const x = S.ivBag.x
    const y = S.ivBag.y - 70
    ctx.strokeStyle = '#9aa7b8'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 20, y - 12)
    ctx.lineTo(x + 20, y)
    ctx.stroke()
    ctx.fillStyle = 'rgba(220,235,255,0.25)'
    ctx.beginPath()
    ctx.roundRect(x, y, 40, 56, 10)
    ctx.fill()
    ctx.fillStyle = '#6b4a2a'
    ctx.fillRect(x + 3, y + 3 + 50 * (1 - fill), 34, 50 * fill)
    ctx.fillStyle = C.ink
    ctx.font = '700 10px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('CAFFEINE IV', x + 20, y + 68)
    if (rx.buffReady()) {
      ctx.fillStyle = '#5fe0f0'
      ctx.font = '800 12px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText('Send IV →', 598, 418)
      for (const t of buffTargets()) button(t.r, DEPTS[t.dept].short, '#5fe0f0')
    }
  }

  function drawDispensers() {
    const n = Math.min(S.dispenserSpots.length, game.stats('pharmacy').dispensers)
    for (let i = 0; i < n; i++) {
      const x = S.dispenserSpots[i]
      const busy = dispensers.gestures[i] !== null
      ctx.fillStyle = '#6b7a90'
      ctx.beginPath()
      ctx.roundRect(x, S.dispenserY, 44, 72, 8)
      ctx.fill()
      ctx.fillStyle = '#12101a'
      ctx.fillRect(x + 8, S.dispenserY + 10, 28, 24)
      pill(x + 22, S.dispenserY + 22 + (busy ? Math.sin(time * 20) * 3 : 0), JARS[i % JARS.length].color, 5)
      ctx.fillStyle = busy ? '#46a758' : '#2f5d3a'
      ctx.beginPath()
      ctx.arc(x + 22, S.dispenserY + 50, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    const total = game.stats('pharmacy').dispensers
    if (total > n) {
      ctx.fillStyle = '#f5b83d'
      ctx.font = '800 13px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`x${total}`, S.dispenserSpots[n - 1] + 50, S.dispenserY + 40)
    }
  }

  function dispenserBurst(i: number, amount: number) {
    const tier = intensityFor(game, 'pharmacy')
    const at = toScreen(S.dispenserSpots[i] + 22, S.dispenserY + 30)
    fx.money(at.x, at.y, amount, Math.max(1, Math.ceil(EFFECTS.burstCount[tier - 1] / 2)))
  }

  return {
    update(dt: number) {
      time += dt
      messageAge += dt
      for (const f of flying) f.age += dt
      if (rx.order.id !== orderId) {
        orderId = rx.order.id
        customer = randomPatientLook() // a new customer for each order
      }
      resident.update(dt)
      dispensers.update(dt, Math.min(S.dispenserSpots.length, game.stats('pharmacy').dispensers), dispenserBurst)
    },
    draw() {
      drawRoom()
      drawDispensers()
      drawRx()
      drawCounterAndTray()
      drawIvBag()
      const r = S.resident
      const sweat = rx.combo >= 15 ? 3 : rx.combo >= 10 ? 2 : rx.combo >= 5 ? 1 : 0
      drawCharacter(ctx, r.x, r.y, r.size, 1, RESIDENT_LOOK, residentFrame(time, resident.gesture, sweat))
      ctx.fillStyle = C.ink
      ctx.font = '700 16px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(`Combo x${rx.multiplier.toFixed(2)}`, 250, 240)
      if (messageAge < 2.5) {
        ctx.globalAlpha = 1 - messageAge / 2.5
        ctx.fillStyle = messageColor
        ctx.font = 'italic 15px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(message, 330, 272)
        ctx.globalAlpha = 1
      }
    },
  }
}
