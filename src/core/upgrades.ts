// Upgrade cost math and buying.
import { UPGRADES, type UpgradeId } from '../data/upgrades'
import type { GameState } from './state'

export function upgradeCost(id: UpgradeId, level: number): number {
  const def = UPGRADES[id]
  return Math.ceil(def.baseCost * def.growth ** level)
}

export function isMaxed(state: GameState, id: UpgradeId): boolean {
  return state.upgrades[id] >= UPGRADES[id].maxLevel
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  return !isMaxed(state, id) && state.dollars >= upgradeCost(id, state.upgrades[id])
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!canBuy(state, id)) return false
  state.dollars -= upgradeCost(id, state.upgrades[id])
  state.upgrades[id] += 1
  return true
}
