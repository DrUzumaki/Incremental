// Every department's room view, and small helpers the views share.
import type { Game } from '../core/game'
import type { DeptId } from '../data/departments'
import { mountEcgView } from '../departments/cardiology/ecgView'
import { mountTriageView } from '../departments/emergency/triageView'
import { mountCompoundingView } from '../departments/pharmacy/compoundingView'
import type { Effects } from './effects'
import { setupCanvas, type RoomView } from './roomKit'

type Mount = (canvas: HTMLCanvasElement, game: Game, fx: Effects) => RoomView

// Rooms not built yet show a placeholder.
const placeholder: Mount = (canvas) => {
  const ctx = setupCanvas(canvas, 800, 450)
  return {
    update() {},
    draw() {
      ctx.fillStyle = '#16263d'
      ctx.fillRect(0, 0, 800, 450)
      ctx.fillStyle = '#8ea3bf'
      ctx.font = '20px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Under construction. Mind the wet floor sign.', 400, 225)
    },
  }
}

export const ROOMS: Record<DeptId, Mount> = {
  emergency: mountTriageView,
  cardiology: mountEcgView,
  pharmacy: mountCompoundingView,
  surgery: placeholder,
}
