// Emergency upgrades. Cost of the next level = baseCost * growth ** level.
// `effect` means something different per upgrade; see `description`.

export type UpgradeId = 'stethoscopes' | 'chairs' | 'training' | 'fastTrack' | 'cards'

export interface UpgradeDef {
  id: UpgradeId
  name: string
  description: string
  baseCost: number
  growth: number
  maxLevel: number
  effect: number
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  stethoscopes: {
    id: 'stethoscopes',
    name: 'Better Stethoscopes',
    description: '+$1 base pay per patient',
    baseCost: 10,
    growth: 1.12,
    maxLevel: 50,
    effect: 1, // dollars added to base pay per level
  },
  chairs: {
    id: 'chairs',
    name: 'Comfier Waiting Chairs',
    description: 'Patients wait 0.4 s longer',
    baseCost: 25,
    growth: 1.13,
    maxLevel: 25,
    effect: 0.4, // seconds of patience per level
  },
  training: {
    id: 'training',
    name: 'Triage Training',
    description: 'Combo cap +10%',
    baseCost: 50,
    growth: 1.14,
    maxLevel: 25,
    effect: 0.1, // added to the combo cap per level
  },
  fastTrack: {
    id: 'fastTrack',
    name: 'Fast-Track Lane',
    description: 'Patients arrive 4% faster',
    baseCost: 40,
    growth: 1.13,
    maxLevel: 25,
    effect: 0.96, // spawn interval is multiplied by this per level
  },
  cards: {
    id: 'cards',
    name: 'Laminated Triage Cards',
    description: 'Shows a faint colour hint on each patient',
    baseCost: 500,
    growth: 1,
    maxLevel: 1, // one-time unlock
    effect: 0,
  },
}

export const UPGRADE_LIST: UpgradeDef[] = Object.values(UPGRADES)
