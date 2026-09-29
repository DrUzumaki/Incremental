// Draws the Sepsis boss: a body map whose regions turn green-purple as infection grows,
// with cartoon germs. Click a region to spray it with antibiotics.
import { SEPSIS_REGIONS, type Region } from '../data/sepsisMap'
import { BOSSES } from '../data/trials'
import type { SepsisLogic } from './sepsis'
import type { SessionView } from './types'

const SKIN = [232, 185, 143]
const SEPTIC = [120, 176, 70]

function mix(a: number[], b: number[], k: number) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`
}

export function sepsisView(logic: SepsisLogic): SessionView {
  const sprays: { x: number; y: number; age: number }[] = []
  const banners: { text: string; age: number }[] = []
  let lastT = 0
  let lastStage = 1

  function regionAt(x: number, y: number): Region | undefined {
    return SEPSIS_REGIONS.find((r) => Math.abs(x - r.x) <= r.w / 2 + 4 && Math.abs(y - r.y) <= r.h / 2 + 4)
  }

  return {
    draw(ctx) {
      const dt = logic.t - lastT
      lastT = logic.t
      if (logic.stage !== lastStage) {
        lastStage = logic.stage
        banners.push({ text: `Stage ${logic.stage}!`, age: 0 })
      }
      ctx.fillStyle = '#18202e'
      ctx.fillRect(0, 0, 800, 450)
      for (const r of SEPSIS_REGIONS) {
        const v = logic.infection.get(r.id)!
        ctx.fillStyle = mix(SKIN, SEPTIC, v)
        ctx.beginPath()
        ctx.roundRect(r.x - r.w / 2, r.y - r.h / 2, r.w, r.h, Math.min(r.w, r.h) / 2.2)
        ctx.fill()
        // Germs: more of them the worse the region is.
        const germs = Math.ceil(v * 4)
        for (let i = 0; i < germs; i++) {
          const gx = r.x + Math.sin(logic.t * 2 + i * 2.1 + r.x) * r.w * 0.25
          const gy = r.y + Math.cos(logic.t * 1.7 + i * 1.3 + r.y) * r.h * 0.25
          ctx.fillStyle = '#7b3fa0'
          ctx.beginPath()
          ctx.arc(gx, gy, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.fillRect(gx - 2.5, gy - 1.5, 1.5, 1.5)
          ctx.fillRect(gx + 1, gy - 1.5, 1.5, 1.5)
        }
      }
      // Antibiotic sprays.
      for (let i = sprays.length - 1; i >= 0; i--) {
        const s = sprays[i]
        s.age += dt
        if (s.age > 0.4) {
          sprays.splice(i, 1)
          continue
        }
        ctx.fillStyle = `rgba(95,224,240,${1 - s.age / 0.4})`
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(s.x + Math.cos(a) * s.age * 70, s.y + Math.sin(a) * s.age * 70, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Infection meter with the "lose" line.
      const total = logic.total()
      const lose = BOSSES.sepsis.loseAt
      ctx.fillStyle = '#0b1422'
      ctx.fillRect(40, 30, 200, 16)
      ctx.fillStyle = total > lose * 0.75 ? '#ff5f5f' : '#9bd44a'
      ctx.fillRect(40, 30, (200 * total) / lose, 16)
      ctx.fillStyle = '#c9d4e3'
      ctx.font = '700 12px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('INFECTION (full bar = septic shock)', 40, 62)
      ctx.font = '14px system-ui, sans-serif'
      ctx.fillText('Click infected areas to treat them.', 40, 420)
      ctx.textAlign = 'right'
      ctx.font = '800 22px system-ui, sans-serif'
      ctx.fillStyle = '#f4f7fb'
      ctx.fillText(`Stage ${logic.stage}`, 760, 46)
      for (let i = banners.length - 1; i >= 0; i--) {
        const b = banners[i]
        b.age += dt
        if (b.age > 1.5) {
          banners.splice(i, 1)
          continue
        }
        ctx.globalAlpha = 1 - b.age / 1.5
        ctx.fillStyle = '#f5b83d'
        ctx.font = '900 44px system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(b.text, 400, 200 - b.age * 30)
        ctx.globalAlpha = 1
      }
    },
    pointer(kind, x, y) {
      if (kind !== 'down') return
      const r = regionAt(x, y)
      if (!r) return
      logic.treat(r.id)
      sprays.push({ x, y, age: 0 })
    },
    key() {},
  }
}
