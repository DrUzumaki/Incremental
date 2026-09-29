// Plays each organ trial with simple bots to check the difficulty is sane.
// Run with: npm run check:trials
// "perfect" reacts instantly; "human" reacts 0.25 s late and is a bit sloppy.
import { AV_NODE, HeartLogic } from '../src/trials/heart'
import { GutLogic } from '../src/trials/gut'
import { LIVER_Y, LiverLogic } from '../src/trials/liver'
import { LungsLogic } from '../src/trials/lungs'
import type { OrganLogic } from '../src/trials/types'
import { trialDuration } from '../src/core/trials'
import { codeBlueRun } from '../src/trials/bossSessions'
import type { OrganId } from '../src/data/trials'

type Bot = (logic: OrganLogic, t: number) => void

interface OrganCheck {
  name: string
  make: (difficulty: number) => OrganLogic
  bots: Record<string, () => Bot>
}

const DT = 1 / 30

function lungsBot(delay: number, sloppy: number): () => Bot {
  return () => {
    const seen: { t: number; want: boolean }[] = []
    return (logic, t) => {
      const l = logic as LungsLogic
      const target = l.bandCenter() + (Math.random() - 0.5) * sloppy
      seen.push({ t, want: l.volume < target })
      while (seen.length > 1 && seen[1].t <= t - delay) seen.shift()
      l.holding = seen[0].want
    }
  }
}

// Clicks the spark nearest the node every `every` seconds, aiming where it was `delay` ago.
function heartBot(every: number, delay: number, aimError: number): () => Bot {
  return () => {
    let next = 0
    const history: { t: number; x: number; y: number }[] = []
    return (logic, t) => {
      const h = logic as HeartLogic
      let best = null as null | { x: number; y: number }
      let bestD = Infinity
      for (const s of h.sparks) {
        if (!s.active) continue
        const d = Math.hypot(s.x - AV_NODE.x, s.y - AV_NODE.y)
        if (d < bestD) {
          bestD = d
          best = s
        }
      }
      if (best) history.push({ t, x: best.x, y: best.y })
      while (history.length > 1 && history[1].t <= t - delay) history.shift()
      if (t < next || !history.length) return
      next = t + every
      const aim = history[0]
      h.zap(aim.x + (Math.random() - 0.5) * aimError, aim.y + (Math.random() - 0.5) * aimError)
    }
  }
}

// Moves the liver under the lowest toxin (at a limited speed), dodging nutrients when it can.
function liverBot(speed: number, delay: number): () => Bot {
  return () => {
    let target = 400
    let lastPick = -1
    return (logic, t) => {
      const l = logic as LiverLogic
      if (t - lastPick >= delay) {
        lastPick = t
        const toxins = l.drops.filter((d) => d.active && d.toxin && d.y < LIVER_Y).sort((a, b) => b.y - a.y)
        target = toxins.length ? toxins[0].x : l.x
        // Dodge a nutrient that's about to land on the target spot.
        const half = 80
        const danger = l.drops.find((d) => d.active && !d.toxin && d.y > LIVER_Y - 90 && d.y < LIVER_Y && Math.abs(d.x - target) < half)
        if (danger) target = danger.x + (target >= danger.x ? half : -half)
      }
      const step = speed * DT
      l.moveTo(l.x + Math.max(-step, Math.min(step, target - l.x)))
    }
  }
}

// Clicks the bad bacterium nearest the gut's start every `every` seconds.
function gutBot(every: number, aimError: number): () => Bot {
  return () => {
    let next = 0
    return (logic, t) => {
      if (t < next) return
      next = t + every
      const g = logic as GutLogic
      const bad = g.bugs.find((b) => b.active && b.bad)
      if (bad) g.zap(bad.x + (Math.random() - 0.5) * aimError, bad.y + (Math.random() - 0.5) * aimError)
    }
  }
}

const CHECKS: OrganCheck[] = [
  {
    name: 'Liver',
    make: (d) => new LiverLogic(d),
    bots: { perfect: liverBot(900, 0), human: liverBot(500, 0.2) },
  },
  {
    name: 'Gut',
    make: (d) => new GutLogic(d),
    bots: { perfect: gutBot(0.2, 0), human: gutBot(0.4, 24) },
  },
  {
    name: 'Heart',
    make: (d) => new HeartLogic(d),
    bots: { perfect: heartBot(0.2, 0, 0), human: heartBot(0.4, 0.15, 30) },
  },
  {
    name: 'Lungs',
    make: (d) => new LungsLogic(d),
    bots: { perfect: lungsBot(0, 0), human: lungsBot(0.25, 0.15) },
  },
]

const RUNS = 40
for (const check of CHECKS) {
  console.log(`\n${check.name} trial: win rate by tier (${RUNS} runs each)`)
  for (const [botName, makeBot] of Object.entries(check.bots)) {
    const row: string[] = []
    for (let tier = 0; tier <= 8; tier++) {
      let wins = 0
      for (let run = 0; run < RUNS; run++) {
        const logic = check.make(tier)
        const bot = makeBot()
        const duration = trialDuration(tier)
        let t = 0
        let lost = false
        while (t < duration) {
          bot(logic, t)
          logic.update(DT)
          t += DT
          if (logic.failed()) {
            lost = true
            break
          }
        }
        if (!lost) wins++
      }
      row.push(`T${tier + 1}:${String(Math.round((wins / RUNS) * 100)).padStart(3)}%`)
    }
    console.log(`  ${botName.padEnd(8)} ${row.join('  ')}`)
  }
}

// Code Blue: play whole runs with each organ's human-like bot, with no research and
// with maxed trial-ease research (3 per organ).
const HUMAN: Record<OrganId, () => Bot> = {
  lungs: lungsBot(0.25, 0.15),
  heart: heartBot(0.4, 0.15, 30),
  liver: liverBot(500, 0.2),
  gut: gutBot(0.4, 24),
}
const CB_RUNS = 40
for (const ease of [0, 3]) {
  let totalStages = 0
  let wins = 0
  for (let run = 0; run < CB_RUNS; run++) {
    const cb = codeBlueRun(() => 0, () => ease)
    let organ = cb.current().organ
    let logic = cb.current().logic
    let bot = HUMAN[organ]()
    let t = 0
    while (!cb.session.done() && t < 600) {
      const cur = cb.current()
      if (cur.logic !== logic) {
        organ = cur.organ
        logic = cur.logic
        bot = HUMAN[organ]()
      }
      bot(cur.logic, t)
      cb.session.update(DT)
      t += DT
    }
    const won = cb.won()
    if (won) wins++
    const stage = Number(cb.session.hud().label.split('/')[0].replace('Stage ', ''))
    totalStages += won ? stage : stage - 1
  }
  console.log(`\nCode Blue, trial-ease ${ease} (human-like bots, ${CB_RUNS} runs): average stages cleared ${(totalStages / CB_RUNS).toFixed(1)}, discharged ${Math.round((wins / CB_RUNS) * 100)}%`)
}
