// Organ trial and boss rules: when trials open, cooldowns, and rewards.
import type { DeptId } from '../data/departments'
import { BOSSES, TRIALS } from '../data/trials'
import type { Game } from './game'
import type { GameState } from './state'

export type TrialStatus =
  | { kind: 'locked'; needs: number } // lifetime currency still needed
  | { kind: 'cooldown'; secondsLeft: number }
  | { kind: 'ready' }

export function trialStatus(game: Game, dept: DeptId): TrialStatus {
  const d = game.state.depts[dept]
  if (!d.unlocked || d.lifetime < TRIALS.unlockAt) return { kind: 'locked', needs: Math.max(0, TRIALS.unlockAt - d.lifetime) }
  const left = (d.trialReadyAt - Date.now()) / 1000
  return left > 0 ? { kind: 'cooldown', secondsLeft: left } : { kind: 'ready' }
}

export function trialDuration(tier: number): number {
  return Math.min(TRIALS.maxDuration, TRIALS.baseDuration + tier * TRIALS.durationPerTier)
}

// What clearing the next tier pays.
export function trialReward(game: Game, dept: DeptId) {
  const tier = game.state.depts[dept].trialClears
  const s = game.stats(dept)
  const bonus = (TRIALS.rewardBase + TRIALS.rewardPerTier * tier) * (1 + (s.trialReward ?? 0))
  const stemCells = Math.round(TRIALS.stemCellsBase * TRIALS.stemCellsGrowth ** tier * (game.stats('publications').stemCellMult ?? 1))
  return { mult: 1 + bonus, stemCells }
}

// The permanent income multiplier a department has from its cleared trials.
// Each clear is stored as its multiplier so later upgrades don't change past rewards.
export function trialMult(state: GameState, dept: DeptId): number {
  return state.depts[dept].trialMultiplier
}

export function finishTrial(game: Game, dept: DeptId, won: boolean) {
  const d = game.state.depts[dept]
  if (!won) {
    d.trialReadyAt = Date.now() + TRIALS.lossCooldown * 1000
    return null
  }
  const reward = trialReward(game, dept)
  d.trialClears++
  d.trialMultiplier *= reward.mult
  game.state.stemCells += reward.stemCells
  const cooldown = TRIALS.cooldown * (game.stats(dept).trialCooldown ?? 1) * (game.stats('publications').trialCooldown ?? 1)
  d.trialReadyAt = Date.now() + cooldown * 1000
  return reward
}

export function bossUnlocked(state: GameState, boss: 'sepsis' | 'codeBlue'): boolean {
  return boss === 'sepsis' ? state.depts.cardiology.signedOff : state.depts.surgery.signedOff
}

// A boss run reached `stage`. New best stages pay Publications. Returns Publications earned.
export function bossStageReached(game: Game, boss: 'sepsis' | 'codeBlue', stage: number): number {
  const b = game.state.bosses[boss]
  const cfg = BOSSES[boss]
  let pubs = 0
  while (b.best < stage) {
    b.best++
    pubs += Math.round(cfg.pubsPerStage * cfg.pubsGrowth ** (b.best - 1) * (game.stats('publications').pubMult ?? 1))
  }
  game.state.publications += pubs
  return pubs
}
