// The one shared number formatter: 999, 1.23K, 45.6M, 789B, 1.50T, then 1.23e+15.

const SUFFIXES = ['', 'K', 'M', 'B', 'T']

// Rounds down rather than to nearest, so we never show more money than the player has.
function truncate(value: number, decimals: number): string {
  const factor = 10 ** decimals
  return (Math.floor(value * factor) / factor).toFixed(decimals)
}

export function formatNumber(n: number): string {
  if (n < 1000) return Math.floor(n).toString()
  const tier = Math.floor(Math.log10(n) / 3)
  if (tier >= SUFFIXES.length) return n.toExponential(2)
  const scaled = n / 1000 ** tier
  const decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0
  return truncate(scaled, decimals) + SUFFIXES[tier]
}
