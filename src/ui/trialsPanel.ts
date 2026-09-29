// The organ trials panel: a giant patient with one organ per department, plus the bosses.
// Shows each trial's status (locked / cooling down / ready) and starts trials.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import { bossUnlocked, finishTrial, trialDuration, trialReward, trialStatus } from '../core/trials'
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { ORGAN_OF, TRIAL_LINES } from '../data/trials'
import { ORGAN_GAMES } from '../trials/organs'
import { organSession } from '../trials/trialSession'
import type { BossRun } from '../trials/bossSessions'
import type { Effects } from './effects'
import { formatDuration, toast } from './overlays'
import { runSession } from './sessionRunner'

export type BossId = 'sepsis' | 'codeBlue'

const BODY_SVG = `
  <svg class="giant-patient" viewBox="0 0 200 330" aria-hidden="true">
    <circle cx="100" cy="40" r="28" class="gp-skin"/>
    <rect x="52" y="74" width="96" height="150" rx="38" class="gp-gown"/>
    <rect x="22" y="84" width="26" height="110" rx="13" class="gp-skin"/>
    <rect x="152" y="84" width="26" height="110" rx="13" class="gp-skin"/>
    <rect x="62" y="214" width="30" height="104" rx="15" class="gp-skin"/>
    <rect x="108" y="214" width="30" height="104" rx="15" class="gp-skin"/>
    <g class="organ organ-lungs"><ellipse cx="82" cy="118" rx="16" ry="24"/><ellipse cx="118" cy="118" rx="16" ry="24"/></g>
    <path class="organ organ-heart" d="M104 146 C 92 136, 96 124, 104 130 C 112 124, 116 136, 104 146 Z"/>
    <ellipse class="organ organ-liver" cx="84" cy="164" rx="22" ry="11"/>
    <path class="organ organ-gut" d="M78 184 q 12 -8 24 0 t 24 0 q 0 10 -12 12 t -24 0 q -12 4 -12 12 q 12 8 24 0 t 24 0" fill="none"/>
  </svg>`

export function createTrialsPanel(
  host: HTMLElement,
  game: Game,
  fx: Effects,
  bosses: Partial<Record<BossId, () => BossRun>>,
  onPublications: () => void,
) {
  const overlay = document.createElement('div')
  overlay.className = 'trials-overlay'
  overlay.hidden = true
  overlay.innerHTML = `
    <div class="tree-header">
      <h3 class="tree-title">Organ trials &amp; bosses</h3>
      <div class="tree-wallet trials-wallet"></div>
      <span class="tree-help">Inside a giant patient. Clearing a trial permanently boosts its department.</span>
      <button class="pubs-btn" type="button">Publications tree</button>
      <button class="tree-close" type="button">Close ✕</button>
    </div>
    <div class="trials-body">
      ${BODY_SVG}
      <div class="trials-cards"></div>
    </div>
  `
  host.appendChild(overlay)
  const cards = overlay.querySelector<HTMLDivElement>('.trials-cards')!
  const wallet = overlay.querySelector<HTMLDivElement>('.trials-wallet')!
  const svg = overlay.querySelector<SVGElement>('.giant-patient')!
  overlay.querySelector('.tree-close')!.addEventListener('click', () => close())
  overlay.querySelector('.pubs-btn')!.addEventListener('click', () => {
    close()
    onPublications()
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close()
  })

  // Buttons are re-drawn often, so clicks are handled on the container.
  cards.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-start]')
    if (!btn) return
    const id = btn.dataset.start!
    if (id === 'sepsis' || id === 'codeBlue') startBoss(id)
    else startTrial(id as DeptId)
  })

  function startTrial(dept: DeptId) {
    const organ = ORGAN_OF[dept]
    const minigame = ORGAN_GAMES[organ]
    if (trialStatus(game, dept).kind !== 'ready') return
    const tier = game.state.depts[dept].trialClears
    const difficulty = Math.max(0, tier - (game.stats(dept).trialEase ?? 0))
    const session = organSession(minigame, difficulty, trialDuration(tier), `${minigame.name} trial · Tier ${tier + 1}`)
    close()
    game.inTrial = true
    runSession(session, (won) => {
      game.inTrial = false
      const reward = finishTrial(game, dept, won)
      const line = (won ? TRIAL_LINES.win : TRIAL_LINES.lose)[Math.floor(Math.random() * 3)]
      if (!reward) return `${line}<br>You can try again in a minute.`
      fx.confetti(window.innerWidth / 2, window.innerHeight / 2, 40)
      toast(`${minigame.name} trial cleared! ${DEPTS[dept].name} income x${reward.mult.toFixed(2)}`, 'big')
      return `${line}<br><strong>${DEPTS[dept].name} income x${reward.mult.toFixed(2)}</strong> (permanent)<br>+${reward.stemCells} Stem Cells`
    })
  }

  function startBoss(id: BossId) {
    const make = bosses[id]
    if (!make || !bossUnlocked(game.state, id)) return
    close()
    const run = make()
    game.inTrial = true
    runSession(run.session, () => {
      game.inTrial = false
      return run.summary()
    }).then((won) => run.after?.(won))
  }

  function trialCard(dept: DeptId): string {
    const d = game.state.depts[dept]
    const organ = ORGAN_OF[dept]
    const name = ORGAN_GAMES[organ].name
    const st = trialStatus(game, dept)
    let body = ''
    if (!d.unlocked) body = `<p class="muted">Opens with ${DEPTS[dept].name}.</p>`
    else if (st.kind === 'locked') body = `<p class="muted">Earn ${formatCurrency(dept, st.needs)} more in ${DEPTS[dept].name} to open.</p>`
    else if (st.kind === 'cooldown') body = `<p class="muted">Ready in ${formatDuration(st.secondsLeft)}</p>`
    else {
      const r = trialReward(game, dept)
      body = `<p>Reward: <strong>x${r.mult.toFixed(2)}</strong> ${DEPTS[dept].name} income, +${r.stemCells} Stem Cells</p>
        <button class="trial-start" type="button" data-start="${dept}">Start Tier ${d.trialClears + 1}</button>`
    }
    const mult = d.trialMultiplier > 1 ? ` · now x${d.trialMultiplier.toFixed(2)}` : ''
    return `<div class="trial-card" style="--dept:${DEPTS[dept].color}">
      <strong>${name}</strong> <span class="muted">${DEPTS[dept].name} · ${d.trialClears} cleared${mult}</span>${body}</div>`
  }

  function bossCard(id: BossId): string {
    const name = id === 'sepsis' ? 'Sepsis' : 'Code Blue'
    const b = game.state.bosses[id]
    const open = bossUnlocked(game.state, id)
    const needs = id === 'sepsis' ? 'Cardiology' : 'Surgery'
    const desc = id === 'sepsis'
      ? 'Contain an infection spreading across the body. How many stages can you hold it?'
      : 'All four organs, in rotation, faster each stage. Reach the final stage to be discharged.'
    const body = !open ? `<p class="muted">Unlocks with the ${needs} sign-off.</p>`
      : !bosses[id] ? `<p class="muted">Still being scrubbed in.</p>`
      : `<p class="muted">Best stage: ${b.best}. New best stages pay Publications.</p>
         <button class="trial-start boss" type="button" data-start="${id}">Fight</button>`
    return `<div class="trial-card boss-card"><strong>${name}</strong><p>${desc}</p>${body}</div>`
  }

  function render() {
    cards.innerHTML = DEPT_ORDER.map(trialCard).join('') + bossCard('sepsis') + bossCard('codeBlue')
    wallet.textContent = `${formatCurrency('stemCells', game.state.stemCells)}  ·  ${formatCurrency('publications', game.state.publications)}`
    for (const dept of DEPT_ORDER) {
      const el = svg.querySelector(`.organ-${ORGAN_OF[dept]}`)!
      const st = trialStatus(game, dept)
      el.classList.toggle('ready', st.kind === 'ready')
      el.classList.toggle('cooldown', st.kind === 'cooldown')
    }
  }

  let renderIn = 0
  function open() {
    overlay.hidden = false
    render()
  }
  function close() {
    overlay.hidden = true
  }

  return {
    open,
    close,
    toggle() {
      if (overlay.hidden) open()
      else close()
    },
    // True if any trial can be started (for the button badge).
    anyReady(): boolean {
      return DEPT_ORDER.some((d) => trialStatus(game, d).kind === 'ready')
    },
    update(dt: number) {
      if (overlay.hidden) return
      renderIn -= dt
      if (renderIn <= 0) {
        renderIn = 0.5
        render()
      }
    },
  }
}
