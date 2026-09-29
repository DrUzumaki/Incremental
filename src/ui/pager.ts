// The pager device in the corner: shows a page from another room with a countdown.
// Respond (click or P) to jump there for a temporary payout boost.
import type { Game } from '../core/game'
import { DEPTS, type DeptId } from '../data/departments'
import { PAGER } from '../data/pager'
import { toast } from './overlays'

export function createPagerUi(game: Game, goTo: (dept: DeptId) => void) {
  const el = document.createElement('div')
  el.className = 'pager'
  el.hidden = true
  el.innerHTML = `
    <div class="pager-screen">
      <span class="pager-dept"></span>
      <span class="pager-text"></span>
    </div>
    <div class="pager-timer"><div class="pager-bar"></div></div>
    <button class="pager-respond" type="button">Respond (P)</button>
  `
  document.body.appendChild(el)
  const dept = el.querySelector<HTMLSpanElement>('.pager-dept')!
  const text = el.querySelector<HTMLSpanElement>('.pager-text')!
  const bar = el.querySelector<HTMLDivElement>('.pager-bar')!
  const button = el.querySelector<HTMLButtonElement>('.pager-respond')!

  function respond() {
    const to = game.pager.respond()
    if (to) goTo(to)
  }
  button.addEventListener('click', respond)
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'p' || e.key === 'P') && game.pager.page) respond()
  })

  game.bus.on('page', (page) => {
    el.classList.toggle('pager-high', page.priority === 'high')
    dept.textContent = `${page.priority === 'high' ? 'URGENT' : 'Page'} · ${DEPTS[page.dept].name}`
    text.textContent = page.text + (page.autoAt !== null ? ' (charge nurse on it)' : '')
    el.classList.remove('buzz')
    void el.offsetWidth // restart the buzz animation
    el.classList.add('buzz')
  })
  game.bus.on('boost', ({ boost, auto }) => {
    const secs = Math.round(boost.until - game.pager.time)
    const who = auto ? 'Your charge nurse answered a page: ' : ''
    toast(`${who}x${boost.mult} payout in ${DEPTS[boost.dept].name} for ${secs}s!`, auto ? 'info' : 'big')
  })

  return {
    update() {
      const page = game.pager.page
      el.hidden = !page
      if (!page) return
      const left = Math.max(0, page.expiresAt - game.pager.time)
      bar.style.width = `${(left / PAGER.respondTime) * 100}%`
    },
  }
}
