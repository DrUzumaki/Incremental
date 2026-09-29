// Draws the Liver trial: falling purple toxins and green nutrients over a big liver
// that follows the mouse (or arrow keys).
import { LIVER } from '../data/trials'
import { LIVER_Y, type LiverLogic } from './liver'
import type { SessionView } from './types'

export function liverView(logic: LiverLogic): SessionView {
  return {
    draw(ctx) {
      ctx.fillStyle = '#2b1a14'
      ctx.fillRect(0, 0, 800, 450)
      // Drops.
      for (const d of logic.drops) {
        if (!d.active) continue
        ctx.save()
        ctx.translate(d.x, d.y)
        if (d.toxin) {
          ctx.rotate(d.spin)
          ctx.fillStyle = '#8e4cc9'
          ctx.beginPath()
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2
            const r = i % 2 ? 9 : 14
            ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
          }
          ctx.fill()
          ctx.rotate(-d.spin)
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1.5
          for (const ex of [-4, 4]) {
            ctx.beginPath()
            ctx.moveTo(ex - 2, -3)
            ctx.lineTo(ex + 2, 1)
            ctx.moveTo(ex + 2, -3)
            ctx.lineTo(ex - 2, 1)
            ctx.stroke()
          }
        } else {
          ctx.fillStyle = '#46a758'
          ctx.beginPath()
          ctx.ellipse(0, 0, 9, 13, d.spin * 0.3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#b7e4c2'
          ctx.fillRect(-1, -12, 2, 8)
        }
        ctx.restore()
      }
      // The liver.
      const w = LIVER.paddleWidth
      ctx.fillStyle = '#9e3b2e'
      ctx.beginPath()
      ctx.moveTo(logic.x - w / 2, LIVER_Y + 6)
      ctx.quadraticCurveTo(logic.x - w / 2, LIVER_Y - 22, logic.x - w * 0.1, LIVER_Y - 20)
      ctx.quadraticCurveTo(logic.x + w / 2 + 10, LIVER_Y - 22, logic.x + w / 2, LIVER_Y + 8)
      ctx.quadraticCurveTo(logic.x, LIVER_Y + 30, logic.x - w / 2, LIVER_Y + 6)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(logic.x - 12, LIVER_Y - 4, 3, 0, Math.PI * 2)
      ctx.arc(logic.x + 12, LIVER_Y - 4, 3, 0, Math.PI * 2)
      ctx.fill()
      // A quick flash of feedback on the last catch or miss.
      if (logic.lastHit && logic.t - logic.lastHit.t < 0.5) {
        ctx.fillStyle = logic.lastHit.good ? '#9bd44a' : '#ff5f5f'
        ctx.font = '900 20px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(logic.lastHit.good ? 'Filtered!' : 'Ouch!', logic.lastHit.x, LIVER_Y - 50 - (logic.t - logic.lastHit.t) * 60)
      }
      for (let i = 0; i < LIVER.maxDamage; i++) {
        ctx.fillStyle = i < LIVER.maxDamage - logic.damage ? '#c9563f' : '#4a2a22'
        ctx.beginPath()
        ctx.ellipse(40 + i * 30, 36, 11, 8, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#e8cdb8'
      ctx.font = '14px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Catch the purple toxins. Let the green nutrients fall past.', 40, 432)
    },
    pointer(kind, x) {
      if (kind === 'move' || kind === 'down') logic.moveTo(x)
    },
    key(key, down) {
      if (key === 'ArrowLeft' || key === 'a') logic.keys.left = down
      if (key === 'ArrowRight' || key === 'd') logic.keys.right = down
    },
  }
}
