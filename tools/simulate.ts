// Auto-plays the economy with simple bot players to check pacing.
// Run with: npm run simulate
// Uses the real game rules (src/core/game.ts). The simulated player:
// - actively plays the first department that hasn't signed off yet,
// - buys the cheapest affordable upgrade in every currency every few seconds,
// - answers pages, sends caffeine IVs to the room it's playing,
// - plays organ trials when ready (tiers 1-4 only), and fights Sepsis every 10 minutes.
// Targets (CLAUDE.md): ~30 min per department, ~2 h total; active play ~3-5x idle.
import { Game } from '../src/core/game'
import { createNewState } from '../src/core/state'
import { bossStageReached, finishTrial, trialStatus } from '../src/core/trials'
import { canBuy, nodeCosts, levelOf } from '../src/core/tree'
import { DEPT_ORDER, DEPTS, type DeptId } from '../src/data/departments'
import { JARS } from '../src/data/pharmacy'
import { TREES } from '../src/data/trees'
import type { CurrencyId, TreeId } from '../src/data/tree'
import { formatNumber } from '../src/core/format'

declare const process: { env: Record<string, string | undefined> }

// The simulation runs its own clock (trial cooldowns use Date.now()).
let simNow = 1_000_000
Date.now = () => simNow

const DT = 0.05
const MAX_HOURS = 4
const BUY_EVERY = 3 // seconds between shopping trips
const REPORT_EVERY = 120 // seconds between snapshots

const rand = () => Math.random()
const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5 // roughly -1..1

// --- Bots, one per room: each is called every tick while that room is being played. ---

type Bot = (game: Game, dt: number) => void

function erBot(): Bot {
  let frontId = -1
  let wait = 0
  return (game, dt) => {
    const f = game.triage.queue[0]
    if (!f) return
    if (f.id !== frontId) {
      frontId = f.id
      wait = 0.55 + rand() * 0.35 // reading + deciding
    }
    wait -= dt
    if (wait > 0) return
    const correct = rand() < 0.95
    const wrong = f.severity === 'red' ? 'yellow' : 'red'
    game.triage.sort(correct ? f.severity : wrong)
  }
}

function ecgBot(): Bot {
  let plannedId = -1
  let tapAt = Infinity
  return (game) => {
    const ecg = game.ecg
    if (ecg.vf && ecg.inVf()) {
      if (ecg.time >= ecg.vf.chargedAt + 0.25) ecg.tap()
      return
    }
    const next = ecg.beats.find((b) => b.state === 'coming')
    if (next && next.id !== plannedId) {
      plannedId = next.id
      tapAt = next.t + gauss() * 0.07
      if (rand() < 0.05) tapAt = Infinity // sometimes zone out and miss one
    }
    if (ecg.time >= tapAt) {
      ecg.tap()
      tapAt = Infinity
    }
  }
}

function pharmacyBot(): Bot {
  let orderId = -1
  let doneAt = 0
  let t = 0
  return (game, dt) => {
    t += dt
    const rx = game.pharmacy
    if (rx.order.id !== orderId) {
      orderId = rx.order.id
      doneAt = t + 0.8 + 0.45 * rx.order.total
    }
    if (t < doneAt) return
    rx.clearTray()
    rx.order.counts.forEach((n, i) => {
      for (let k = 0; k < n; k++) rx.addPill(i)
    })
    if (rand() < 0.04) rx.addPill(Math.floor(rand() * JARS.length)) // a slip
    rx.dispense(rand() < 0.3)
    doneAt = Infinity
  }
}

function surgeryBot(): Bot {
  let opId = -1
  let pos = 0
  return (game, dt) => {
    const op = game.surgery
    const s = game.stats('surgery')
    if (op.op.id !== opId) {
      opId = op.op.id
      pos = 0
      op.pointerDown(op.op.points[0])
    }
    if (!op.tracing) op.pointerDown(op.op.points[op.progress])
    pos = Math.min(op.op.points.length - 1, pos + dt * 26) // ~2.7 s per incision
    const p = op.op.points[Math.floor(pos)]
    const wobble = s.tolerance * 0.3
    op.pointerMove({ x: p.x + gauss() * wobble, y: p.y + gauss() * wobble })
  }
}

const BOTS: Record<DeptId, () => Bot> = { emergency: erBot, cardiology: ecgBot, pharmacy: pharmacyBot, surgery: surgeryBot }

// --- Shopping: buy the cheapest affordable node in each tree, repeatedly. ---

function shop(game: Game) {
  const trees: TreeId[] = [...DEPT_ORDER.filter((d) => game.state.depts[d].unlocked), 'publications']
  for (let guard = 0; guard < 200; guard++) {
    let best: { tree: TreeId; node: string; cost: number } | null = null
    for (const t of trees) {
      const tree = TREES[t]
      for (const n of tree.nodes) {
        if (!canBuy(game.state, tree, n)) continue
        const costs = nodeCosts(n, levelOf(game.state, t, n.id))
        // Compare costs as a fraction of what we hold, so currencies are comparable.
        const cost = Math.max(...costs.map((c) => c.amount / Math.max(1, holding(game, c.currency))))
        if (!best || cost < best.cost) best = { tree: t, node: n.id, cost }
      }
    }
    if (!best) return
    game.buy(best.tree, best.node)
  }
}

function holding(game: Game, c: CurrencyId): number {
  if (c === 'stemCells') return game.state.stemCells
  if (c === 'publications') return game.state.publications
  return game.state.depts[c].currency
}

// --- The run ---

const game = new Game(createNewState())
const bots = Object.fromEntries(DEPT_ORDER.map((d) => [d, BOTS[d]()])) as Record<DeptId, Bot>
const activeEarned: Record<DeptId, number> = { emergency: 0, cardiology: 0, pharmacy: 0, surgery: 0 }
const idleEarned: Record<DeptId, number> = { emergency: 0, cardiology: 0, pharmacy: 0, surgery: 0 }
game.bus.on('earn', (e) => {
  if (e.source === 'active') activeEarned[e.dept] += e.amount
  if (e.source === 'idle') idleEarned[e.dept] += e.amount
})
const events: string[] = []
const at = (t: number) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, '0')}s`
let time = 0
game.bus.on('unlock', (e) => events.push(`${at(time)}  ${DEPTS[e.dept].name} unlocked`))
if (process.env.DEBUG_EARN) {
  game.bus.on('earn', (e) => {
    if (e.amount > Number(process.env.DEBUG_EARN)) events.push(`${at(time)}  big earn ${DEPTS[e.dept].short} ${formatNumber(e.amount)} (${e.source}) mult x${game.incomeMultiplier(e.dept).toFixed(1)}`)
  })
}
game.bus.on('signOff', (e) => events.push(`${at(time)}  ${DEPTS[e.dept].name} SIGNED OFF`))

let trialBusy = 0 // seconds left in a (simulated) trial, during which rooms aren't played
let nextBuy = 0
let nextReport = REPORT_EVERY
let nextSepsis = 0
let boostUntil = 0
let boostDept: DeptId | null = null
const snapshots: string[] = []
// Active vs idle, per room, measured while that room is the one being played.
const window_: Record<DeptId, { active: number; idle: number }> = {
  emergency: { active: 0, idle: 0 }, cardiology: { active: 0, idle: 0 }, pharmacy: { active: 0, idle: 0 }, surgery: { active: 0, idle: 0 },
}

while (time < MAX_HOURS * 3600) {
  const focus = DEPT_ORDER.find((d) => game.state.depts[d].unlocked && !game.state.depts[d].signedOff) ?? 'surgery'
  // Answer pages right away and play the paged room while its boost lasts.
  if (game.pager.page) {
    const to = game.pager.respond()
    if (to) {
      boostDept = to
      boostUntil = time + 25
    }
  }
  if (time > boostUntil) boostDept = null
  game.viewing = boostDept ?? focus
  const beforeA = activeEarned[game.viewing]
  const beforeI = idleEarned[game.viewing]
  if (trialBusy > 0) {
    trialBusy -= DT
    game.inTrial = true
  } else {
    game.inTrial = false
    bots[game.viewing](game, DT)
  }
  game.update(DT, true)
  if (!game.inTrial) {
    window_[game.viewing].active += activeEarned[game.viewing] - beforeA
    window_[game.viewing].idle += idleEarned[game.viewing] - beforeI
  }
  if (game.pharmacy.buffReady()) game.sendBuff(focus === 'pharmacy' ? 'emergency' : focus)
  time += DT
  simNow += DT * 1000

  if (time >= nextBuy) {
    nextBuy = time + BUY_EVERY
    shop(game)
    // Organ trials: play one when ready (a 60-90 s break from the rooms).
    if (trialBusy <= 0) {
      for (const d of DEPT_ORDER) {
        if (trialStatus(game, d).kind !== 'ready') continue
        const tier = game.state.depts[d].trialClears
        if (tier >= 4) continue // the bot player stops at tiers it can't win
        const won = true
        trialBusy = 60 + tier * 5
        const r = finishTrial(game, d, won)
        events.push(`${at(time)}  ${DEPTS[d].organ} trial tier ${tier + 1} ${won ? `cleared (x${r!.mult.toFixed(2)}, +${r!.stemCells} SC)` : 'lost'}`)
        break
      }
    }
    // Sepsis: a run every 10 minutes, one stage further each time (up to 8).
    if (game.state.depts.cardiology.signedOff && time >= nextSepsis) {
      nextSepsis = time + 600
      const stage = Math.min(8, game.state.bosses.sepsis.best + 1)
      const pubs = bossStageReached(game, 'sepsis', stage)
      trialBusy = Math.max(trialBusy, stage * 20)
      events.push(`${at(time)}  Sepsis run: stage ${stage} (+${pubs} Pubs)`)
    }
  }

  if (time >= nextReport) {
    nextReport += REPORT_EVERY
    const cols = DEPT_ORDER.filter((d) => game.state.depts[d].unlocked && !game.state.depts[d].signedOff).map((d) => {
      const w = window_[d]
      const ratio = w.idle > 0 ? (w.active / w.idle).toFixed(1) : '∞'
      return `${DEPTS[d].short}: ${formatNumber(game.state.depts[d].lifetime).padStart(6)} life, active ${formatNumber(w.active / REPORT_EVERY).padStart(5)}/s, idle ${formatNumber(game.idleRate(d)).padStart(5)}/s (${ratio}x)`
    })
    snapshots.push(`${at(time).padEnd(8)} ${cols.join(' | ')}`)
    for (const d of DEPT_ORDER) window_[d] = { active: 0, idle: 0 }
  }
  if (DEPT_ORDER.every((d) => game.state.depts[d].signedOff)) {
    events.push(`${at(time)}  ALL FOUR SIGNED OFF (Code Blue unlocked)`)
    break
  }
}

console.log('\nTimeline')
for (const e of events) console.log('  ' + e)
console.log('\nSnapshots every 2 minutes for rooms not yet signed off (lifetime, active and idle income per second)')
for (const s of snapshots) console.log('  ' + s)
console.log(`\nFinished at ${at(time)} of game time. Publications ${game.state.publications}, Stem Cells ${Math.floor(game.state.stemCells)}.`)
