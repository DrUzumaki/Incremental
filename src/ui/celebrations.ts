// Offline summaries and milestone / sign-off celebrations.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { ECONOMY } from '../data/economy'
import { ORGAN_OF, TRIALS } from '../data/trials'
import { ORGAN_GAMES } from '../trials/organs'
import type { Effects } from './effects'
import { formatDuration, modal, toast } from './overlays'

export function showOfflineSummary(result: { seconds: number; earned: Partial<Record<DeptId, number>> }) {
  const lines = Object.entries(result.earned)
    .map(([id, amount]) => `<div class="earn-line">+${formatCurrency(id as DeptId, amount!)}</div>`)
    .join('')
  if (!lines) return
  const capped = result.seconds > ECONOMY.offlineCapHours * 3600 ? ` (paid up to ${ECONOMY.offlineCapHours}h)` : ''
  modal(
    'While you were on break…',
    `<p>You were away for ${formatDuration(result.seconds)}${capped}. Your staff kept working:</p>${lines}`,
    'Back to work',
  )
}

function confettiShower(fx: Effects) {
  const w = window.innerWidth
  for (let i = 0; i < 5; i++) fx.confetti((w * (i + 0.5)) / 5, window.innerHeight * 0.35, 18)
}

export function wireCelebrations(game: Game, fx: Effects) {
  // Trials already open when the game loads don't get announced again.
  const announced = new Set(DEPT_ORDER.filter((d) => game.state.depts[d].lifetime >= TRIALS.unlockAt))
  game.bus.on('milestone', ({ dept, value }) => {
    if (value === ECONOMY.signOff) return // the sign-off gets its own, bigger moment
    const first = value === ECONOMY.milestones[0]
    const label = formatCurrency(dept, value)
    toast(first ? `First ${label} in ${DEPTS[dept].name}!` : `${label} earned in ${DEPTS[dept].name}!`, 'big')
    confettiShower(fx)
  })
  game.bus.on('signOff', ({ dept }) => {
    toast(`${DEPTS[dept].name} signed off! 1,000,000 ${DEPTS[dept].currency}`, 'big', 6)
    confettiShower(fx)
    setTimeout(() => confettiShower(fx), 500)
    fx.shake(6)
    if (dept === 'cardiology') setTimeout(() => toast('Boss unlocked: Sepsis! Find it under Trials.', 'big', 6), 1500)
    if (dept === 'surgery') setTimeout(() => toast('Final boss unlocked: CODE BLUE! Find it under Trials.', 'big', 8), 1500)
  })
  // Tell the player when a department's organ trial opens.
  game.bus.on('earn', ({ dept }) => {
    const d = game.state.depts[dept]
    if (d.lifetime < TRIALS.unlockAt || announced.has(dept)) return
    announced.add(dept)
    toast(`${ORGAN_GAMES[ORGAN_OF[dept]].name} trial is open! Check Trials.`, 'info', 5)
  })
}
