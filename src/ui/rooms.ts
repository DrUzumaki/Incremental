// Every department's room view, by department.
import type { Game } from '../core/game'
import type { DeptId } from '../data/departments'
import { mountEcgView } from '../departments/cardiology/ecgView'
import { mountTriageView } from '../departments/emergency/triageView'
import { mountCompoundingView } from '../departments/pharmacy/compoundingView'
import { mountSutureView } from '../departments/surgery/sutureView'
import type { Effects } from './effects'
import type { RoomView } from './roomKit'

type Mount = (canvas: HTMLCanvasElement, game: Game, fx: Effects) => RoomView

export const ROOMS: Record<DeptId, Mount> = {
  emergency: mountTriageView,
  cardiology: mountEcgView,
  pharmacy: mountCompoundingView,
  surgery: mountSutureView,
}
