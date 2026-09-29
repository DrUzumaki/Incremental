// Game-wide economy numbers.

export const ECONOMY = {
  signOff: 1_000_000, // lifetime currency a department needs for its sign-off
  offlineCapHours: 8, // TUNE: most offline time that pays out
  offlineEfficiency: 0.5, // TUNE: offline earnings as a fraction of the idle rate
  offlineGapSeconds: 300, // a pause longer than this while open (e.g. laptop asleep) counts as offline time
  // Lifetime totals that get a celebration (per department).
  milestones: [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12],
  incomeRateSmoothing: 0.15, // how quickly the "income per second" estimate follows changes
}
