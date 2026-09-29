// How "busy" a room should look (tier 1 to 5), from how fast it earns.
// Visuals read this; it never changes game rules.
import type { DeptId } from '../data/departments'
import { EFFECTS } from '../data/effects'
import type { Game } from './game'

export function intensityFor(game: Game, dept: DeptId): number {
  const rate = Math.max(game.incomeRate[dept], game.idleRate(dept))
  let tier = 1
  EFFECTS.intensityThresholds.forEach((t, i) => {
    if (rate >= t) tier = i + 1
  })
  return tier
}
