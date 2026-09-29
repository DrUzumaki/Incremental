// Organ trials and bosses: unlocks, cooldowns, rewards, and each minigame's difficulty.
import type { DeptId } from './departments'

export type OrganId = 'lungs' | 'heart' | 'liver' | 'gut'

export const ORGAN_OF: Record<DeptId, OrganId> = {
  emergency: 'lungs',
  cardiology: 'heart',
  pharmacy: 'liver',
  surgery: 'gut',
}

export const TRIALS = {
  unlockAt: 25_000, // TUNE: lifetime currency in a department before its trial opens
  cooldown: 600, // TUNE: seconds between trials after a clear (reduced by research)
  lossCooldown: 60, // seconds to wait after a loss ("losing costs only time")
  baseDuration: 60, // seconds for tier 1
  durationPerTier: 5,
  maxDuration: 90,
  rewardBase: 0.5, // a clear multiplies the department's income by 1 + this...
  rewardPerTier: 0.25, // ...plus this per tier already cleared
  stemCellsBase: 10, // TUNE: Stem Cells for clearing tier 1
  stemCellsGrowth: 2.5, // each tier pays this much more
}

// Lungs: hold to breathe in, release to breathe out, keep the lungs in the green band.
export const LUNGS = {
  rise: 0.9, // lung fill per second while holding
  fall: 0.7, // ...while released
  bandHalf: 0.17, // half-height of the green band (0..1 scale)
  bandShrink: 0.012, // per tier
  minBandHalf: 0.07,
  bandSpeed: 0.9, // how fast the band drifts (per tier: + bandSpeedUp)
  bandSpeedUp: 0.12,
  regen: 0.22, // oxygen gained per second inside the band
  drain: 0.13, // oxygen lost per second outside it (per tier: + drainUp)
  drainUp: 0.015,
  coughEvery: 8, // seconds between coughs that jolt the lungs
}

// Heart: click stray sparks before they reach the AV node.
export const HEART = {
  spawnEvery: 1.1, // seconds between sparks (per tier: - spawnFaster, down to minSpawn)
  spawnFaster: 0.08,
  minSpawn: 0.38,
  speed: 55, // pixels per second (per tier: + speedUp)
  speedUp: 8,
  maxLeaks: 5, // sparks that may reach the node before the trial is lost
  hitRadius: 24,
}

// Liver: move the liver to catch toxins, let nutrients pass.
export const LIVER = {
  spawnEvery: 1.15, // seconds between drops (per tier: - spawnFaster, down to minSpawn)
  spawnFaster: 0.06,
  minSpawn: 0.4,
  fallSpeed: 88, // pixels per second (per tier: + fallSpeedUp)
  fallSpeedUp: 10,
  toxinChance: 0.72,
  maxDamage: 7, // missed toxins + caught nutrients before the trial is lost
  paddleWidth: 150,
}

// Gut: zap bad bacteria before they take over.
export const GUT = {
  spawnEvery: 1.2,
  spawnFaster: 0.08,
  minSpawn: 0.4,
  growEvery: 3.5, // seconds before an unzapped bad bacterium splits
  growFaster: 0.2,
  maxBad: 14, // bad bacteria on screen before the trial is lost
  hitRadius: 22,
}

export const BOSSES = {
  sepsis: {
    stageDuration: 20, // TUNE: seconds to survive per stage
    loseAt: 0.7, // lose when this fraction of the body is infected
    spreadBase: 0.05, // infection spread per second (per stage: + spreadUp)
    spreadUp: 0.012,
    seedsBase: 1, // new infection sites at the start of each stage (+1 every seedsEvery stages)
    seedsEvery: 2,
    treat: 0.45, // infection removed by one click
    pubsPerStage: 1, // Publications for each new best stage...
    pubsGrowth: 1.35, // ...growing each stage
  },
  codeBlue: {
    finalStage: 12, // TUNE: reach this stage to be discharged
    stageDuration: 14, // seconds per stage at stage 1 (per stage: - durationDrop)
    durationDrop: 0.4,
    minDuration: 8,
    difficultyPerStage: 0.9, // TUNE: organ difficulty = stage x this, minus that organ's trial-ease research
    pubsPerStage: 3,
    pubsGrowth: 1.35,
  },
}

export const TRIAL_LINES = {
  win: ['Textbook!', 'The organ thanks you. Silently.', 'Somebody write this up!'],
  lose: ['The organ needs a minute.', 'Well, that was educational.', 'Nobody saw that. Probably.'],
}
