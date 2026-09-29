// Draws the Lungs trial: a big pair of lungs that inflate, a breath gauge with the
// green band, and an oxygen meter. Hold the mouse or Space to breathe in.
import type { LungsLogic } from './lungs'
import type { SessionView } from './types'

const GAUGE = { x: 600, y: 60, w: 50, h: 330 }

export function lungsView(logic: LungsLogic): SessionView {
  return {
    draw(ctx) {
      ctx.fillStyle = '#2a1a2e'
      ctx.fillRect(0, 0, 800, 450)
      // Lungs, sized by the current volume.
      const s = 0.75 + logic.volume * 0.45
      const cough = logic.t - logic.coughAt < 0.4
      ctx.save()
      ctx.translate(300 + (cough ? Math.sin(logic.t * 80) * 6 : 0), 250)
      ctx.scale(s, s)
      ctx.fillStyle = '#d9a3a8'
      ctx.fillRect(-10, -170, 20, 90) // trachea
      for (const side of [-1, 1]) {
        ctx.fillStyle = logic.inBand() ? '#ff9aa8' : '#c77b8a'
        ctx.beginPath()
        ctx.ellipse(side * 78, 10, 70, 120, side * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#a45a6a'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.moveTo(0, -90)
        ctx.quadraticCurveTo(side * 30, -60, side * 60, -20)
        ctx.moveTo(side * 40, -45)
        ctx.lineTo(side * 70, 40)
        ctx.stroke()
      }
      ctx.restore()
      if (cough) {
        ctx.fillStyle = '#f5b83d'
        ctx.font = '900 28px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('*COUGH*', 300, 70)
      }
      // Breath gauge with the green target band and the current volume marker.
      const g = GAUGE
      ctx.fillStyle = '#12101a'
      ctx.fillRect(g.x, g.y, g.w, g.h)
      const center = logic.bandCenter()
      const top = g.y + (1 - center - logic.bandHalf) * g.h
      ctx.fillStyle = logic.inBand() ? '#46a758' : '#2f7d44'
      ctx.fillRect(g.x, top, g.w, logic.bandHalf * 2 * g.h)
      const vy = g.y + (1 - logic.volume) * g.h
      ctx.fillStyle = '#f4f7fb'
      ctx.fillRect(g.x - 10, vy - 3, g.w + 20, 6)
      ctx.fillStyle = '#c9d4e3'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FULL', g.x + g.w / 2, g.y - 8)
      ctx.fillText('EMPTY', g.x + g.w / 2, g.y + g.h + 16)
      // Oxygen meter.
      ctx.fillStyle = '#12101a'
      ctx.fillRect(40, 30, 200, 16)
      ctx.fillStyle = logic.oxygen > 0.3 ? '#5fe0f0' : '#ff5f5f'
      ctx.fillRect(40, 30, 200 * Math.max(0, logic.oxygen), 16)
      ctx.fillStyle = '#f4f7fb'
      ctx.textAlign = 'left'
      ctx.fillText('OXYGEN', 40, 62)
      ctx.fillStyle = '#c9d4e3'
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText(logic.holding ? 'Breathing in…' : 'Breathing out…', 40, 420)
    },
    pointer(kind) {
      if (kind === 'down') logic.holding = true
      if (kind === 'up') logic.holding = false
    },
    key(key, down) {
      if (key === ' ') logic.holding = down
    },
  }
}
