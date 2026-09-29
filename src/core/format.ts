// The one shared number formatter: 999, 1.23K, 45.6M, 789B, 1.50T, then 1.23e+15.
import { DEPTS } from '../data/departments'
import type { CurrencyId } from '../data/tree'

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

// Like formatNumber, but keeps one decimal below 100 (for rates like "0.4/s").
export function formatRate(n: number): string {
  return n < 100 ? (Math.floor(n * 10) / 10).toFixed(1) : formatNumber(n)
}

// "$1.23K", "4.5M Beats", "12 Stem Cells". `rate` keeps a decimal for small per-second values.
export function formatCurrency(c: CurrencyId, n: number, rate = false): string {
  const num = rate ? formatRate(n) : formatNumber(n)
  if (c === 'stemCells') return num + ' Stem Cells'
  if (c === 'publications') return num + ' Pubs'
  const d = DEPTS[c]
  return d.prefix ? d.prefix + num : num + ' ' + d.currency
}
