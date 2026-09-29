// The ending: reaching the final stage of Code Blue with all four sign-offs discharges
// the resident. Shows a celebration and some stats; the game carries on afterwards.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { DEPT_ORDER, DEPTS } from '../data/departments'
import type { Effects } from './effects'
import { formatDuration, modal } from './overlays'

export function showDischarge(game: Game, fx: Effects) {
  const s = game.state
  if (!DEPT_ORDER.every((d) => s.depts[d].signedOff)) {
    modal('Almost!', '<p>The patient is stable, but you still need every department’s sign-off before you can be discharged.</p>', 'Back to work')
    return
  }
  const first = !s.discharged
  s.discharged = true
  const w = window.innerWidth
  for (let i = 0; i < 8; i++) setTimeout(() => fx.confetti((w * ((i % 4) + 0.5)) / 4, window.innerHeight * 0.4, 30), i * 250)
  const rows = DEPT_ORDER.map((d) => `<div>${DEPTS[d].name}: ${formatCurrency(d, s.depts[d].lifetime)} earned · ${s.depts[d].trialClears} trials</div>`).join('')
  modal(
    first ? 'DISCHARGED!' : 'Discharged. Again!',
    `<p><strong>You survived the night shift.</strong> The attending signs your paperwork without looking up.</p>
     <div class="ending-stats">
       <div>Shift length: ${formatDuration(s.playTime)}</div>
       ${rows}
       <div>Publications: ${s.publications} · Stem Cells: ${Math.floor(s.stemCells)}</div>
       <div>Best Sepsis stage: ${s.bosses.sepsis.best} · Best Code Blue stage: ${s.bosses.codeBlue.best}</div>
     </div>
     <p class="muted">The hospital keeps running. Numbers keep going up. You could… stay a little longer?</p>`,
    'Keep playing',
  )
}
