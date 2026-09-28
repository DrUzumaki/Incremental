// The whole game state. Everything here is saved, so keep it plain data.
import { UPGRADE_LIST, type UpgradeId } from '../data/upgrades'

export const SAVE_VERSION = 1

export interface GameState {
  version: number
  dollars: number
  upgrades: Record<UpgradeId, number> // current level of each upgrade
  bestCombo: number
}

export function createNewState(): GameState {
  const upgrades = {} as Record<UpgradeId, number>
  for (const def of UPGRADE_LIST) upgrades[def.id] = 0
  return { version: SAVE_VERSION, dollars: 0, upgrades, bestCombo: 0 }
}
