// Emergency escalation: the room looks busier as it earns more. Reads the intensity tier
// (from income rate) and never changes game rules.
import { ESCALATION as E, SCENE } from '../../data/emergencyScene'
import type { Effects } from '../../ui/effects'

type ToScreen = (x: number, y: number) => { x: number; y: number }

export function createEscalation(ctx: CanvasRenderingContext2D, fx: Effects, toScreen: ToScreen) {
  let tier = 1
  let time = 0
  let ambulanceX = -1 // -1 = not on screen
  let nextAmbulance = 2
  let heliX = -1
  let nextHeli = 6
  let conveyor = 0
  let parade = 0
  let goldDue = 0
  let jarCoins = 0 // how full the tip jar looks
  let jarWobble = 0
  const coinArcs: { x: number; y: number; age: number }[] = []

  function update(dt: number, newTier: number) {
    tier = newTier
    time += dt
    jarWobble = Math.max(0, jarWobble - dt * 3)
    for (let i = coinArcs.length - 1; i >= 0; i--) {
      coinArcs[i].age += dt
      if (coinArcs[i].age >= 0.5) {
        coinArcs.splice(i, 1)
        jarCoins = Math.min(40, jarCoins + 1)
        jarWobble = 1
      }
    }
    const w = E.window
    if (tier >= 3) {
      if (ambulanceX < 0) {
        nextAmbulance -= dt
        if (nextAmbulance <= 0) {
          ambulanceX = w.x - 70
          nextAmbulance = E.ambulanceEvery * (0.7 + Math.random() * 0.6)
        }
      } else {
        ambulanceX += E.ambulanceSpeed * dt
        if (ambulanceX > w.x + w.w + 70) ambulanceX = -1
      }
    }
    if (tier >= 4) {
      conveyor = (conveyor + E.conveyorSpeed * dt) % 90
      if (heliX < 0) {
        nextHeli -= dt
        if (nextHeli <= 0) {
          heliX = w.x + w.w + 60
          nextHeli = E.heliEvery * (0.7 + Math.random() * 0.6)
        }
      } else {
        heliX -= E.heliSpeed * dt
        if (heliX < w.x - 60) heliX = -1
      }
    }
    if (tier >= 5) {
      parade = (parade + E.paradeSpeed * dt) % 24
      goldDue += dt
      if (goldDue >= E.goldEvery) {
        goldDue = 0
        const at = toScreen(160 + Math.random() * 140, 200)
        fx.rain(at.x, at.y, 'bar')
      }
    }
  }

  // A coin arcs from the sorted patient into the tip jar (tier 2+).
  function tip() {
    if (tier >= 2) coinArcs.push({ x: SCENE.queueFrontX, y: SCENE.queueY - 60, age: 0 })
  }

  function drawWindow() {
    const w = E.window
    ctx.fillStyle = '#0b1830'
    ctx.fillRect(w.x, w.y, w.w, w.h)
    ctx.save()
    ctx.beginPath()
    ctx.rect(w.x, w.y, w.w, w.h)
    ctx.clip()
    // Street lights.
    ctx.fillStyle = 'rgba(245,211,61,0.5)'
    for (let x = w.x + 30; x < w.x + w.w; x += 80) {
      ctx.beginPath()
      ctx.arc(x, w.y + 12, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#1a2a44'
    ctx.fillRect(w.x, w.y + w.h - 12, w.w, 12) // road
    if (tier >= 5) {
      // A river of patients streaming past.
      ctx.fillStyle = '#8fb3ff'
      for (let x = w.x - 24 + parade; x < w.x + w.w; x += 24) {
        const bob = Math.abs(Math.sin((x + time * 60) / 10)) * 2
        ctx.beginPath()
        ctx.arc(x, w.y + w.h - 26 - bob, 4, 0, Math.PI * 2)
        ctx.fillRect(x - 3, w.y + w.h - 22 - bob, 6, 9)
        ctx.fill()
      }
    }
    if (ambulanceX >= 0) {
      const x = ambulanceX
      const y = w.y + w.h - 30
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(x, y, 56, 20)
      ctx.fillRect(x + 40, y - 8, 16, 10)
      ctx.fillStyle = '#e5484d'
      ctx.fillRect(x + 10, y + 6, 16, 4)
      ctx.fillRect(x + 16, y + 2, 4, 12)
      const flash = Math.sin(time * 20) > 0
      ctx.fillStyle = flash ? '#ff3b3b' : '#3d8bfd'
      ctx.fillRect(x + 42, y - 11, 6, 3)
      ctx.fillStyle = '#1b1b1b'
      ctx.beginPath()
      ctx.arc(x + 12, y + 20, 5, 0, Math.PI * 2)
      ctx.arc(x + 44, y + 20, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    if (heliX >= 0) {
      const x = heliX
      const y = w.y + 20
      ctx.fillStyle = '#e5484d'
      ctx.beginPath()
      ctx.ellipse(x, y, 16, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillRect(x + 12, y - 2, 18, 3)
      ctx.strokeStyle = '#c9d4e3'
      ctx.lineWidth = 2
      const blade = Math.sin(time * 40) * 18
      ctx.beginPath()
      ctx.moveTo(x - blade, y - 11)
      ctx.lineTo(x + blade, y - 11)
      ctx.stroke()
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(x - 4, y - 3, 8, 3)
    }
    ctx.restore()
    ctx.strokeStyle = '#3a5580'
    ctx.lineWidth = 4
    ctx.strokeRect(w.x, w.y, w.w, w.h)
    ctx.beginPath()
    ctx.moveTo(w.x + w.w / 2, w.y)
    ctx.lineTo(w.x + w.w / 2, w.y + w.h)
    ctx.stroke()
  }

  function drawForeground() {
    if (tier >= 4) {
      // Stretchers gliding along a conveyor belt at the bottom.
      const y = E.conveyorY
      ctx.save()
      ctx.beginPath()
      ctx.rect(E.conveyorX, y - 20, 800 - E.conveyorX, 34)
      ctx.clip()
      ctx.fillStyle = '#2b3a52'
      ctx.fillRect(E.conveyorX, y, 800 - E.conveyorX, 12)
      ctx.strokeStyle = '#3f5577'
      ctx.lineWidth = 2
      for (let x = E.conveyorX - 90 + conveyor; x < 800; x += 18) {
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 6, y + 12)
        ctx.stroke()
      }
      for (let x = E.conveyorX - 90 + conveyor * 2; x < 800; x += 180) {
        ctx.fillStyle = '#c9d4e3'
        ctx.fillRect(x, y - 8, 60, 8)
        ctx.fillStyle = '#8fb3ff'
        ctx.fillRect(x + 12, y - 12, 44, 6)
        ctx.fillStyle = '#e8b98f'
        ctx.beginPath()
        ctx.arc(x + 8, y - 11, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (tier >= 2) {
      // Tip jar, filling up, wobbling as coins land.
      const j = E.tipJar
      ctx.save()
      ctx.translate(j.x, j.y)
      ctx.rotate(Math.sin(time * 30) * 0.06 * jarWobble)
      const fill = Math.min(1, jarCoins / 40)
      ctx.fillStyle = 'rgba(220,235,255,0.25)'
      ctx.beginPath()
      ctx.roundRect(-16, -34, 32, 38, 6)
      ctx.fill()
      ctx.fillStyle = '#f5c542'
      ctx.fillRect(-13, 1 - 32 * fill, 26, 32 * fill)
      ctx.fillStyle = '#f4f7fb'
      ctx.font = '800 8px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('TIPS', 0, -38)
      ctx.restore()
      for (const c of coinArcs) {
        const k = c.age / 0.5
        const x = c.x + (j.x - c.x) * k
        const y = c.y + (j.y - 30 - c.y) * k - Math.sin(k * Math.PI) * 60
        ctx.fillStyle = '#f5c542'
        ctx.beginPath()
        ctx.arc(x, y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (ambulanceX >= 0) {
      // Siren light washing over the room.
      ctx.fillStyle = Math.sin(time * 20) > 0 ? 'rgba(255,59,59,0.07)' : 'rgba(61,139,253,0.07)'
      ctx.fillRect(0, 0, 800, 450)
    }
  }

  return { update, tip, drawWindow, drawForeground }
}
