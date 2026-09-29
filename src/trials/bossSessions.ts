// Boss sessions. Each returns the Session to play and a summary for the result card.
import { formatNumber } from '../core/format'
import { SEPSIS_LINES } from '../data/sepsisMap'
import { BOSSES, type OrganId } from '../data/trials'
import { ORGAN_GAMES } from './organs'
import { SepsisLogic } from './sepsis'
import { sepsisView } from './sepsisView'
import type { OrganLogic, Session, SessionView } from './types'

export interface BossRun {
  session: Session
  summary(): string
  after?(won: boolean): void // runs once the result card is closed
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

const ROTATION: OrganId[] = ['lungs', 'heart', 'liver', 'gut']
const BANNER_TIME = 1.4 // seconds between stages

// Code Blue: all four organ minigames in rotation, shorter and harder each stage.
// Surviving the final stage wins the game. `onStage(completed)` pays Publications;
// `ease(organ)` is that organ's trial-ease research, which makes it easier here too.
export function codeBlueRun(onStage: (completed: number) => number, ease: (organ: OrganId) => number = () => 0): BossRun & { won(): boolean; current(): { organ: OrganId; logic: OrganLogic } } {
  const cfg = BOSSES.codeBlue
  let stage = 1
  let stageTime = 0
  let banner = BANNER_TIME // counts down before each stage starts
  let pubs = 0
  let result: { won: boolean } | null = null
  let current = start(stage)

  function duration(n: number) {
    return Math.max(cfg.minDuration, cfg.stageDuration - cfg.durationDrop * (n - 1))
  }

  function start(n: number): { organ: OrganId; logic: OrganLogic; view: SessionView } {
    const organ = ROTATION[(n - 1) % ROTATION.length]
    const difficulty = Math.max(0, Math.floor((n - 1) * cfg.difficultyPerStage) - ease(organ))
    return { organ, ...ORGAN_GAMES[organ].create(difficulty) }
  }

  // Wraps the organ's view to draw the "Stage N" banner on top between stages.
  const view: SessionView = {
    draw(ctx, time) {
      current.view.draw(ctx, time)
      if (banner > 0) {
        ctx.fillStyle = 'rgba(5,10,20,0.7)'
        ctx.fillRect(0, 0, 800, 450)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#5fa8ff'
        ctx.font = '900 30px system-ui, sans-serif'
        ctx.fillText(`CODE BLUE · STAGE ${stage} / ${cfg.finalStage}`, 400, 170)
        ctx.fillStyle = '#f4f7fb'
        ctx.font = '900 56px system-ui, sans-serif'
        ctx.fillText(ORGAN_GAMES[current.organ].name.toUpperCase() + '!', 400, 240)
        ctx.fillStyle = '#c9d4e3'
        ctx.font = '15px system-ui, sans-serif'
        ctx.fillText(ORGAN_GAMES[current.organ].instructions.split('.')[0] + '.', 400, 300)
      }
    },
    pointer(kind, x, y) {
      if (banner <= 0) current.view.pointer(kind, x, y)
    },
    key(key, down) {
      if (banner <= 0) current.view.key(key, down)
    },
  }

  return {
    session: {
      title: 'Boss: Code Blue',
      instructions: `The whole patient is crashing! All four organ minigames come in turn, faster each stage. Survive stage ${cfg.finalStage} to be discharged. Every new best stage pays Publications.`,
      update(dt) {
        if (result) return
        if (banner > 0) {
          banner -= dt
          return
        }
        stageTime += dt
        current.logic.update(dt)
        if (current.logic.failed()) {
          result = { won: false }
          return
        }
        if (stageTime >= duration(stage)) {
          pubs += onStage(stage)
          if (stage >= cfg.finalStage) {
            result = { won: true }
            return
          }
          stage++
          stageTime = 0
          banner = BANNER_TIME
          current = start(stage)
        }
      },
      hud: () => ({
        label: `Stage ${stage}/${cfg.finalStage} · ${ORGAN_GAMES[current.organ].name}`,
        progress: banner > 0 ? 0 : stageTime / duration(stage),
        status: banner > 0 ? 'Get ready…' : current.logic.status(),
      }),
      done: () => result,
      view: () => view,
    },
    won: () => !!result?.won,
    current: () => current, // for tools/checkTrials.ts
    summary() {
      const held = result?.won ? stage : stage - 1
      const pubLine = pubs > 0 ? `<br>New personal best: +${formatNumber(pubs)} Publications!` : '<br>No new best this time.'
      if (result?.won) return `You stabilised the patient through all ${cfg.finalStage} stages!${pubLine}`
      return `The patient crashed on stage ${stage} (${ORGAN_GAMES[current.organ].name}). You cleared ${held} stage${held === 1 ? '' : 's'}.${pubLine}`
    },
  }
}
