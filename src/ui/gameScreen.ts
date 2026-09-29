// Builds the in-game screen (top bar, department tabs, rooms, skill tree)
// and wires it to the game loop.
import type { Game } from '../core/game'
import { anyAffordable } from '../core/tree'
import { bossStageReached } from '../core/trials'
import { startLoop } from '../core/loop'
import { DEPT_ORDER, DEPTS, type DeptId } from '../data/departments'
import { CURRENCY_ART, EFFECTS, MONEY_ART, RAIN_PER_SECOND } from '../data/effects'
import { ORGAN_OF, type OrganId } from '../data/trials'
import { intensityFor } from '../core/intensity'
import { codeBlueRun, sepsisRun } from '../trials/bossSessions'
import { showOfflineSummary, wireCelebrations } from './celebrations'
import { createAudio } from './audio'
import { createEffects } from './effects'
import { showDischarge } from './ending'
import { createHud } from './hud'
import { toast } from './overlays'
import { createPagerUi } from './pager'
import type { RoomView } from './roomKit'
import { ROOMS } from './rooms'
import { createSettingsButton } from './settings'
import { createSkillTree } from './skillTree'
import { wireSounds } from './soundHooks'
import { createTabs } from './tabs'
import { createTrialsPanel } from './trialsPanel'

// Which department each organ belongs to (for its research bonuses in Code Blue).
const DEPT_OF_ORGAN = Object.fromEntries(DEPT_ORDER.map((d) => [ORGAN_OF[d], d])) as Record<OrganId, DeptId>

export function showGameScreen(app: HTMLElement, game: Game): void {
  app.innerHTML = `
    <div class="room">
      <header class="room-header"></header>
      <nav class="dept-tabs"></nav>
      <div class="room-body">
        <div class="play-area"></div>
        <p class="play-hint"></p>
      </div>
    </div>
  `
  const fx = createEffects(game.state.settings)
  const sfx = createAudio(game.state.settings)
  wireCelebrations(game, fx)
  wireSounds(game, sfx)
  const body = app.querySelector<HTMLDivElement>('.room-body')!
  const playArea = app.querySelector<HTMLDivElement>('.play-area')!
  const hint = app.querySelector<HTMLParagraphElement>('.play-hint')!
  const tree = createSkillTree(body, game, fx)
  // Boss runs pay Publications for each new best stage, with a little fanfare.
  const payStage = (boss: 'sepsis' | 'codeBlue') => (completed: number) => {
    const pubs = bossStageReached(game, boss, completed)
    if (pubs > 0) toast(`New best stage! +${pubs} Publications`, 'big', 3)
    return pubs
  }
  const bosses = {
    sepsis: () => sepsisRun(payStage('sepsis')),
    codeBlue: () => ({
      ...codeBlueRun(payStage('codeBlue'), (organ) => game.stats(DEPT_OF_ORGAN[organ]).trialEase ?? 0),
      after: (won: boolean) => won && showDischarge(game, fx),
    }),
  }
  const trials = createTrialsPanel(body, game, fx, sfx, bosses, () => tree.open('publications'))
  const hud = createHud(app.querySelector('.room-header')!, game, {
    onTree: () => {
      trials.close()
      tree.toggle(game.viewing)
    },
    onTrials: () => {
      tree.close()
      trials.toggle()
    },
    trialsReady: () => trials.anyReady() || anyAffordable(game.state, 'publications'),
  })
  createSettingsButton(hud.actions, game.state.settings, () => sfx.applySettings())
  fx.setMoneyTarget(hud.target)
  fx.setShakeTarget(playArea)

  // Each room gets its own canvas, created the first time it's shown.
  const rooms: Partial<Record<DeptId, { canvas: HTMLCanvasElement; view: RoomView }>> = {}
  function switchTo(dept: DeptId) {
    // Going to the paged room yourself counts as responding.
    if (game.pager.page?.dept === dept) game.pager.respond()
    game.viewing = dept
    let room = rooms[dept]
    if (!room) {
      const canvas = document.createElement('canvas')
      canvas.className = 'room-canvas'
      playArea.appendChild(canvas)
      room = rooms[dept] = { canvas, view: ROOMS[dept](canvas, game, fx) }
    }
    for (const r of Object.values(rooms)) r.canvas.hidden = r !== room
    hint.textContent = DEPTS[dept].hint
    fx.setArtStyle(CURRENCY_ART[dept])
    if (tree.isOpen()) tree.open(dept)
  }
  const tabs = createTabs(app.querySelector('.dept-tabs')!, game, switchTo)
  switchTo(game.viewing)
  const pager = createPagerUi(game, switchTo)

  game.bus.on('unlock', ({ dept }) => toast(`${DEPTS[dept].name} is now open! Check the new tab.`, 'big', 6))

  window.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') tree.toggle(game.viewing)
  })

  // A long pause while open (e.g. the laptop slept) pays out like offline time.
  const onOffline = (seconds: number) => showOfflineSummary(game.applyOffline(seconds))

  // Ambient currency rain over the room at high intensity (from income rate).
  let rainDue = 0
  function ambientRain(dt: number) {
    const tier = intensityFor(game, game.viewing)
    rainDue += RAIN_PER_SECOND[tier - 1] * dt
    if (rainDue < 1) return
    const r = playArea.getBoundingClientRect()
    // Show roughly what a second of income looks like, as one piece of art.
    const art = MONEY_ART.find((m) => Math.max(1, game.incomeRate[game.viewing]) / EFFECTS.burstCount[tier - 1] <= m.upTo)!.art
    for (; rainDue >= 1; rainDue--) fx.rain(r.left + Math.random() * r.width, r.top - 10, art)
  }

  let bumpCooldown = 0
  startLoop(game, onOffline, (dt) => {
    const room = rooms[game.viewing]!
    room.view.update(dt)
    room.view.draw()
    hud.update(dt)
    tabs.update()
    pager.update()
    tree.draw(dt)
    trials.update(dt)
    ambientRain(dt)
    fx.update(dt)
    bumpCooldown -= dt
  })

  // The counter bumps as money lands (at most every 80 ms so it doesn't blur).
  fx.setOnArrive(() => {
    if (bumpCooldown > 0) return
    bumpCooldown = 0.08
    hud.bump()
    sfx.coin()
  })
}
