// The shared effects system: one full-screen overlay canvas with a fixed pool of
// particles (flying money, sparks, confetti, floating text) and a screen shake.
// Everything is in screen (CSS pixel) coordinates. Visual only.
import { CONFETTI_COLORS, EFFECTS, MONEY_ART, type ArtStyle, type MoneyArt } from '../data/effects'
import type { Settings } from '../core/state'

type Kind = 'money' | 'spark' | 'confetti' | 'text' | 'rain'

interface Particle {
  active: boolean
  kind: Kind
  age: number
  life: number
  delay: number
  x: number
  y: number
  vx: number
  vy: number
  // Money flight: a curve from (x0, y0) via (cx, cy) to the target.
  x0: number
  y0: number
  cx: number
  cy: number
  rot: number
  spin: number
  size: number
  color: string
  text: string
  art: MoneyArt
  style: ArtStyle
  onArrive: (() => void) | null
}

function blank(): Particle {
  return {
    active: false, kind: 'spark', age: 0, life: 1, delay: 0, x: 0, y: 0, vx: 0, vy: 0,
    x0: 0, y0: 0, cx: 0, cy: 0, rot: 0, spin: 0, size: 1, color: '#fff', text: '', art: 'coin', style: 'money', onArrive: null,
  }
}

export function artFor(value: number): MoneyArt {
  return MONEY_ART.find((m) => value <= m.upTo)!.art
}

export type Effects = ReturnType<typeof createEffects>

export function createEffects(settings: Settings) {
  const canvas = document.createElement('canvas')
  canvas.className = 'effects-layer'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  let w = 0
  let h = 0
  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = window.innerWidth
    h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const pool: Particle[] = Array.from({ length: EFFECTS.maxParticles }, blank)
  let live = 0
  let shakeAmp = 0
  let shakeTarget: HTMLElement | null = null
  let moneyTarget: () => { x: number; y: number } = () => ({ x: w / 2, y: 0 })
  let onAnyArrive: () => void = () => {}
  let style: ArtStyle = 'money' // the current room's currency art

  function cap() {
    return settings.reduceEffects ? EFFECTS.reducedMaxParticles : EFFECTS.maxParticles
  }

  function take(kind: Kind): Particle | null {
    if (live >= cap()) return null
    const p = pool.find((q) => !q.active)
    if (!p) return null
    Object.assign(p, blank(), { active: true, kind })
    live++
    return p
  }

  // --- Spawners ---

  // Money bursts out of (x, y) and flies to the currency counter.
  // `items` art pieces share the value; `onArrive` runs as each one lands.
  function money(x: number, y: number, value: number, items: number, onArrive?: () => void) {
    const n = settings.reduceEffects ? 1 : Math.max(1, items)
    const art = artFor(value / n)
    for (let i = 0; i < n; i++) {
      const p = take('money')
      if (!p) return
      p.x0 = p.x = x
      p.y0 = p.y = y
      p.cx = x + (Math.random() - 0.5) * 180
      p.cy = y - 90 - Math.random() * 110
      p.life = EFFECTS.moneyFlightTime * (0.85 + Math.random() * 0.3)
      p.delay = i * EFFECTS.moneyStagger
      p.rot = (Math.random() - 0.5) * 0.8
      p.spin = (Math.random() - 0.5) * 6
      p.art = art
      p.style = style
      p.onArrive = onArrive ?? null
    }
  }

  function sparks(x: number, y: number, count: number, color: string, speed = 180) {
    const n = settings.reduceEffects ? Math.min(count, 3) : count
    for (let i = 0; i < n; i++) {
      const p = take('spark')
      if (!p) return
      const a = Math.random() * Math.PI * 2
      const s = speed * (0.4 + Math.random() * 0.8)
      Object.assign(p, { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, life: 0.5 + Math.random() * 0.3, color, size: 2 + Math.random() * 2.5 })
    }
  }

  function confetti(x: number, y: number, count: number) {
    const n = settings.reduceEffects ? Math.min(count, 8) : count
    for (let i = 0; i < n; i++) {
      const p = take('confetti')
      if (!p) return
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8
      const s = 300 + Math.random() * 400
      Object.assign(p, {
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 2 + Math.random(),
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], size: 5 + Math.random() * 4,
        rot: Math.random() * 6, spin: (Math.random() - 0.5) * 12,
      })
    }
  }

  function text(x: number, y: number, str: string, color: string, size = 22) {
    const p = take('text')
    if (!p) return
    Object.assign(p, { x, y, vy: -45, life: EFFECTS.textLife, text: str, color, size })
  }

  // Decorative falling currency (high intensity only). Doesn't fly to the counter.
  function rain(x: number, y: number, art: MoneyArt) {
    if (settings.reduceEffects) return
    const p = take('rain')
    if (!p) return
    Object.assign(p, { x, y, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 60, life: 3, art, style, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 4 })
  }

  function shake(amount: number) {
    if (settings.reduceEffects) return
    shakeAmp = Math.max(shakeAmp, amount)
  }

  // --- Drawing money art (flat vector, centred on 0, 0) ---

  function drawArt(art: MoneyArt, st: ArtStyle) {
    if (st === 'hearts') return drawHeartArt(art)
    if (st === 'pills') return drawPillArt(art)
    if (st === 'thread') return drawThreadArt(art)
    switch (art) {
      case 'coin':
        ctx.fillStyle = '#f5c542'
        ctx.beginPath()
        ctx.arc(0, 0, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#d99e1e'
        ctx.beginPath()
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff3c4'
        ctx.font = '800 8px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('$', 0, 0.5)
        return
      case 'bill':
      case 'stack': {
        const layers = art === 'stack' ? 3 : 1
        for (let i = layers - 1; i >= 0; i--) {
          ctx.fillStyle = i ? '#2f7d44' : '#46a758'
          ctx.fillRect(-13 + i * 2, -7 - i * 3, 26, 14)
        }
        ctx.fillStyle = '#b7e4c2'
        ctx.beginPath()
        ctx.arc(0, 0, 4, 0, Math.PI * 2)
        ctx.fill()
        return
      }
      case 'bar':
        ctx.fillStyle = '#f5c542'
        ctx.beginPath()
        ctx.moveTo(-14, 7)
        ctx.lineTo(14, 7)
        ctx.lineTo(9, -7)
        ctx.lineTo(-9, -7)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fff3c4'
        ctx.fillRect(-7, -5, 10, 2)
        return
      case 'gem':
        ctx.fillStyle = '#5fe0f0'
        ctx.beginPath()
        ctx.moveTo(0, -10)
        ctx.lineTo(10, -2)
        ctx.lineTo(0, 11)
        ctx.lineTo(-10, -2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#c8f7ff'
        ctx.beginPath()
        ctx.moveTo(0, -10)
        ctx.lineTo(4, -2)
        ctx.lineTo(-4, -2)
        ctx.closePath()
        ctx.fill()
        return
    }
  }

  // Bigger value = bigger or fancier item; 'bar' is gold and 'gem' is crystal in every style.
  const tierColor = (art: MoneyArt, base: string) => (art === 'bar' ? '#f5c542' : art === 'gem' ? '#5fe0f0' : base)
  const tierScale = (art: MoneyArt) => ({ coin: 0.8, bill: 1, stack: 1.25, bar: 1.4, gem: 1.5 })[art]

  function drawHeartArt(art: MoneyArt) {
    const s = tierScale(art)
    const copies = art === 'stack' ? 3 : 1
    for (let i = copies - 1; i >= 0; i--) {
      ctx.save()
      ctx.translate(i * 5, -i * 4)
      ctx.scale(s, s)
      ctx.fillStyle = tierColor(art, i ? '#b83a4d' : '#ff5f7a')
      ctx.beginPath()
      ctx.moveTo(0, 8)
      ctx.bezierCurveTo(-13, -1, -6, -11, 0, -4)
      ctx.bezierCurveTo(6, -11, 13, -1, 0, 8)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(-4 * s, -3 * s, 2 * s, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawPillArt(art: MoneyArt) {
    const s = tierScale(art)
    if (art === 'stack') {
      // A little pill bottle.
      ctx.fillStyle = '#f5a623'
      ctx.fillRect(-7, -9, 14, 18)
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(-8, -12, 16, 5)
      ctx.fillRect(-5, -3, 10, 6)
      return
    }
    ctx.save()
    ctx.scale(s, s)
    ctx.rotate(0.5)
    ctx.fillStyle = tierColor(art, '#8e6cf0')
    ctx.beginPath()
    ctx.roundRect(-11, -5, 11, 10, [5, 0, 0, 5])
    ctx.fill()
    ctx.fillStyle = tierColor(art, '#f4f7fb')
    ctx.beginPath()
    ctx.roundRect(0, -5, 11, 10, [0, 5, 5, 0])
    ctx.fill()
    ctx.restore()
  }

  function drawThreadArt(art: MoneyArt) {
    const s = tierScale(art)
    ctx.save()
    ctx.scale(s, s)
    // A spool of suture thread.
    ctx.fillStyle = '#c9a36a'
    ctx.fillRect(-9, -10, 18, 4)
    ctx.fillRect(-9, 6, 18, 4)
    ctx.fillStyle = tierColor(art, '#3d8bfd')
    ctx.fillRect(-7, -6, 14, 12)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    for (let y = -4; y <= 4; y += 3) {
      ctx.beginPath()
      ctx.moveTo(-7, y)
      ctx.lineTo(7, y + 1)
      ctx.stroke()
    }
    ctx.restore()
  }

  // --- Frame ---

  function update(dt: number) {
    ctx.clearRect(0, 0, w, h)
    const target = moneyTarget()
    for (const p of pool) {
      if (!p.active) continue
      if (p.delay > 0) {
        p.delay -= dt
        continue
      }
      p.age += dt
      const k = p.age / p.life
      if (k >= 1) {
        p.active = false
        live--
        if (p.kind === 'money') {
          ;(p.onArrive ?? onAnyArrive)()
          sparks(target.x, target.y, 2, '#f5d33d', 90)
        }
        continue
      }
      ctx.save()
      switch (p.kind) {
        case 'money': {
          // Ease in so the money speeds up as it's pulled toward the counter.
          const t = k * k
          const u = 1 - t
          p.x = u * u * p.x0 + 2 * u * t * p.cx + t * t * target.x
          p.y = u * u * p.y0 + 2 * u * t * p.cy + t * t * target.y
          const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.6 : 1.2 - k * 0.5
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot + p.spin * p.age)
          ctx.scale(pop, pop)
          drawArt(p.art, p.style)
          break
        }
        case 'rain':
          p.x += p.vx * dt
          p.y += p.vy * dt
          ctx.globalAlpha = k > 0.75 ? (1 - k) * 4 : 0.85
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot + p.spin * p.age)
          drawArt(p.art, p.style)
          break
        case 'spark':
          p.vy += 500 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          ctx.globalAlpha = 1 - k
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          break
        case 'confetti':
          p.vy += 600 * dt
          p.vx *= 1 - dt * 1.5
          p.x += p.vx * dt
          p.y += p.vy * dt
          ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot + p.spin * p.age)
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
          break
        case 'text':
          p.y += p.vy * dt
          ctx.globalAlpha = k > 0.6 ? (1 - k) / 0.4 : 1
          ctx.font = `800 ${p.size}px system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.lineWidth = 4
          ctx.strokeStyle = 'rgba(15,27,45,0.8)'
          ctx.strokeText(p.text, p.x, p.y)
          ctx.fillStyle = p.color
          ctx.fillText(p.text, p.x, p.y)
          break
      }
      ctx.restore()
    }

    if (shakeTarget) {
      if (shakeAmp > 0.3) {
        const sx = (Math.random() - 0.5) * 2 * shakeAmp
        const sy = (Math.random() - 0.5) * 2 * shakeAmp
        shakeTarget.style.transform = `translate(${sx}px, ${sy}px)`
        shakeAmp *= Math.max(0, 1 - dt * 10)
      } else if (shakeAmp > 0) {
        shakeAmp = 0
        shakeTarget.style.transform = ''
      }
    }
  }

  return {
    money,
    rain,
    sparks,
    confetti,
    text,
    shake,
    update,
    liveCount: () => live,
    setMoneyTarget(fn: () => { x: number; y: number }) {
      moneyTarget = fn
    },
    // Runs whenever a money item lands and it has no callback of its own.
    setArtStyle(s: ArtStyle) {
      style = s
    },
    setOnArrive(fn: () => void) {
      onAnyArrive = fn
    },
    setShakeTarget(el: HTMLElement) {
      shakeTarget = el
    },
  }
}
