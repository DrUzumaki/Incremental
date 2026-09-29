// Draws the Gut trial: a winding pink gut with wiggling bacteria. Click the red ones.
import { GUT } from '../data/trials'
import { gutY, type GutLogic } from './gut'
import type { SessionView } from './types'

export function gutView(logic: GutLogic): SessionView {
  const zaps: { x: number; y: number; t: number; good: boolean }[] = []
  return {
    draw(ctx) {
      ctx.fillStyle = '#2a1a22'
      ctx.fillRect(0, 0, 800, 450)
      // The gut: a thick wavy tube.
      for (const [width, color] of [[86, '#b8566a'], [70, '#e68a9c']] as [number, string][]) {
        ctx.strokeStyle = color
        ctx.lineWidth = width
        ctx.lineCap = 'round'
        ctx.beginPath()
        for (let x = 40; x <= 760; x += 8) {
          if (x === 40) ctx.moveTo(x, gutY(x))
          else ctx.lineTo(x, gutY(x))
        }
        ctx.stroke()
      }
      for (const b of logic.bugs) {
        if (!b.active) continue
        const wob = Math.sin(b.phase * 6) * 2
        ctx.save()
        ctx.translate(b.x + wob, b.y)
        if (b.bad) {
          ctx.fillStyle = '#d93a3a'
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + b.phase
            const r = i % 2 ? 8 : 12
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.fillRect(-4, -3, 2.5, 2.5)
          ctx.fillRect(2, -3, 2.5, 2.5)
          ctx.fillStyle = '#1b1b1b'
          ctx.fillRect(-3, 3, 6, 1.5)
        } else {
          ctx.fillStyle = '#5bbf6a'
          ctx.beginPath()
          ctx.ellipse(0, 0, 12, 7, b.phase * 0.2, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#1b1b1b'
          ctx.beginPath()
          ctx.arc(-3, -1, 1.2, 0, Math.PI * 2)
          ctx.arc(3, -1, 1.2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
      for (let i = zaps.length - 1; i >= 0; i--) {
        const z = zaps[i]
        const age = logic.t - z.t
        if (age > 0.4) {
          zaps.splice(i, 1)
          continue
        }
        ctx.strokeStyle = z.good ? `rgba(255,95,95,${1 - age / 0.4})` : `rgba(159,216,255,${1 - age / 0.4})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(z.x, z.y, 6 + age * 60, 0, Math.PI * 2)
        ctx.stroke()
        if (z.good) {
          ctx.fillStyle = '#ff8a8a'
          ctx.font = '800 14px system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('That was a good one!', z.x, z.y - 24)
        }
      }
      // Takeover meter.
      const k = logic.badCount() / GUT.maxBad
      ctx.fillStyle = '#12101a'
      ctx.fillRect(40, 28, 200, 14)
      ctx.fillStyle = k > 0.7 ? '#ff5f5f' : '#f5b83d'
      ctx.fillRect(40, 28, 200 * Math.min(1, k), 14)
      ctx.fillStyle = '#e8cdd6'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('BAD BACTERIA', 40, 58)
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText('Click the red bacteria before they multiply. Leave the green ones alone!', 40, 432)
    },
    pointer(kind, x, y) {
      if (kind !== 'down') return
      const hit = logic.zap(x, y)
      if (hit) zaps.push({ x, y, t: logic.t, good: hit === 'good' })
    },
    key() {},
  }
}
