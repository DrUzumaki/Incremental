// Plays each organ trial with simple bots to check the difficulty is sane.
// Run with: npm run check:trials
// "perfect" reacts instantly; "human" reacts 0.25 s late and is a bit sloppy.
import { LungsLogic } from '../src/trials/lungs'
import type { OrganLogic } from '../src/trials/types'
import { trialDuration } from '../src/core/trials'

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

const CHECKS: OrganCheck[] = [
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
