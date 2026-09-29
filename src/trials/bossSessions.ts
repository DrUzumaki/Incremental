// Boss sessions. Each returns the Session to play and a summary for the result card.
import { formatNumber } from '../core/format'
import { SEPSIS_LINES } from '../data/sepsisMap'
import { BOSSES } from '../data/trials'
import { SepsisLogic } from './sepsis'
import { sepsisView } from './sepsisView'
import type { Session } from './types'

export interface BossRun {
  session: Session
  summary(): string
}

// `onStage(completed)` pays Publications for new best stages and returns how many were paid.
export function sepsisRun(onStage: (completed: number) => number): BossRun {
  const logic = new SepsisLogic()
  const view = sepsisView(logic)
  let pubs = 0
  let result: { won: boolean } | null = null
  logic.onStageCleared = (completed) => {
    pubs += onStage(completed)
  }
  return {
    session: {
      title: 'Boss: Sepsis',
      instructions: 'Infection is spreading across the body. Click infected areas to treat them. Each stage lasts 20 seconds and spreads faster. Hold out as long as you can: every new best stage pays Publications.',
      update(dt) {
        if (result) return
        logic.update(dt)
        if (logic.failed()) result = { won: false }
      },
      hud: () => ({
        label: `Stage ${logic.stage}`,
        progress: logic.stageTime / BOSSES.sepsis.stageDuration,
        status: `Infection ${Math.round(logic.total() * 100)}%`,
      }),
      done: () => result,
      view: () => view,
    },
    summary() {
      const line = SEPSIS_LINES.end[Math.floor(Math.random() * SEPSIS_LINES.end.length)]
      const held = logic.stage - 1
      return `${line}<br>You held Sepsis for <strong>${held} stage${held === 1 ? '' : 's'}</strong>.` +
        (pubs > 0 ? `<br>New personal best: +${formatNumber(pubs)} Publications!` : '<br>No new best this time.')
    },
  }
}
