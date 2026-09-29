// Draws the Heart trial: a big heart with four chambers, a glowing AV node,
// and crawling sparks to click.
import { HEART } from '../data/trials'
import { AV_NODE, HEART_CENTER, type HeartLogic } from './heart'
import type { SessionView } from './types'

export function heartView(logic: HeartLogic): SessionView {
  const zaps: { x: number; y: number; age: number }[] = []
  let lastT = 0

  function heartPath(ctx: CanvasRenderingContext2D, r: number) {
    const { x, y } = HEART_CENTER
    ctx.beginPath()
    ctx.moveTo(x, y + r * 1.05)
    ctx.bezierCurveTo(x - r * 1.9, y - r * 0.15, x - r * 0.75, y - r * 1.35, x, y - r * 0.45)
    ctx.bezierCurveTo(x + r * 0.75, y - r * 1.35, x + r * 1.9, y - r * 0.15, x, y + r * 1.05)
  }

  return {
    draw(ctx) {
      const dt = logic.t - lastT
      lastT = logic.t
      ctx.fillStyle = '#2a1426'
      ctx.fillRect(0, 0, 800, 450)
      const beat = 1 + Math.max(0, Math.sin(logic.t * 7)) * 0.03
      ctx.save()
      ctx.translate(HEART_CENTER.x, HEART_CENTER.y)
      ctx.scale(beat, beat)
      ctx.translate(-HEART_CENTER.x, -HEART_CENTER.y)
      heartPath(ctx, 180)
      ctx.fillStyle = '#c9425a'
      ctx.fill()
      heartPath(ctx, 150)
      ctx.fillStyle = '#e0566f'
      ctx.fill()
      // Chamber walls.
      ctx.strokeStyle = '#9e2f45'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(HEART_CENTER.x, HEART_CENTER.y - 70)
      ctx.lineTo(HEART_CENTER.x, HEART_CENTER.y + 150)
      ctx.moveTo(HEART_CENTER.x - 170, HEART_CENTER.y + 10)
      ctx.quadraticCurveTo(HEART_CENTER.x, HEART_CENTER.y + 40, HEART_CENTER.x + 170, HEART_CENTER.y + 10)
      ctx.stroke()
      ctx.restore()
      // AV node glow.
      const glow = 0.6 + 0.4 * Math.sin(logic.t * 5)
      ctx.fillStyle = `rgba(255,236,150,${0.35 * glow})`
      ctx.beginPath()
      ctx.arc(AV_NODE.x, AV_NODE.y, 26, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffe89a'
      ctx.beginPath()
      ctx.arc(AV_NODE.x, AV_NODE.y, 10, 0, Math.PI * 2)
      ctx.fill()
      // Sparks with a short jagged tail.
      for (const s of logic.sparks) {
        if (!s.active) continue
        ctx.strokeStyle = '#fff3a0'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.vx * 0.12 + 5, s.y - s.vy * 0.12 - 4)
        ctx.lineTo(s.x - s.vx * 0.22 - 4, s.y - s.vy * 0.22 + 4)
        ctx.stroke()
        ctx.fillStyle = '#ffe14d'
        ctx.beginPath()
        ctx.arc(s.x, s.y, 7 + Math.sin(logic.t * 20 + s.wiggle) * 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
      // Zap rings.
      for (let i = zaps.length - 1; i >= 0; i--) {
        const z = zaps[i]
        z.age += dt
        if (z.age > 0.3) {
          zaps.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(159,216,255,${1 - z.age / 0.3})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(z.x, z.y, 8 + z.age * 90, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Leak counter: one small heart per allowed leak.
      for (let i = 0; i < HEART.maxLeaks; i++) {
        ctx.fillStyle = i < HEART.maxLeaks - logic.leaks ? '#ff5f7a' : '#4a3040'
        const x = 40 + i * 30
        ctx.beginPath()
        ctx.moveTo(x, 44)
        ctx.bezierCurveTo(x - 14, 32, x - 8, 20, x, 28)
        ctx.bezierCurveTo(x + 8, 20, x + 14, 32, x, 44)
        ctx.fill()
      }
      ctx.fillStyle = '#c9d4e3'
      ctx.font = '14px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Click the sparks before they reach the glowing node!', 40, 420)
    },
    pointer(kind, x, y) {
      if (kind !== 'down') return
      logic.zap(x, y)
      zaps.push({ x, y, age: 0 })
    },
    key() {},
  }
}
