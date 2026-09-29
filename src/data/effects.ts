// Numbers for the shared effects system (particles, flying money, shake).
// Visual only: nothing here changes how much anything earns.
import type { DeptId } from './departments'

export const EFFECTS = {
  maxParticles: 400, // hard cap on live particles (keeps 60 fps)
  reducedMaxParticles: 40, // cap when "reduce effects" is on
  moneyFlightTime: 0.8, // TUNE: seconds for money to fly to the counter
  moneyStagger: 0.05, // delay between items in one burst
  textLife: 0.9, // seconds a floating "+$12" lasts
  // Money items per burst at each intensity tier (1-5).
  burstCount: [3, 5, 7, 10, 14], // TUNE
  comboItemsEvery: 5, // +1 item per this many combo, up to +5
  shakeFromCombo: 10, // TUNE: combos at or above this shake the room a little
  // Income per second at which each intensity tier starts (tier 1 = 0).
  intensityThresholds: [0, 8, 150, 4_000, 150_000], // TUNE: check against the simulator
}

export type MoneyArt = 'coin' | 'bill' | 'stack' | 'bar' | 'gem'

// Each flying item stands for this much money at most, so a big payout
// shows bigger art rather than more particles.
export const MONEY_ART: { art: MoneyArt; upTo: number }[] = [
  { art: 'coin', upTo: 10 },
  { art: 'bill', upTo: 1_000 },
  { art: 'stack', upTo: 100_000 },
  { art: 'bar', upTo: 100_000_000 },
  { art: 'gem', upTo: Infinity },
]

// Each currency flies as its own kind of art.
export type ArtStyle = 'money' | 'hearts' | 'pills' | 'thread'
export const CURRENCY_ART: Record<DeptId, ArtStyle> = {
  emergency: 'money',
  cardiology: 'hearts',
  pharmacy: 'pills',
  surgery: 'thread',
}

// Ambient "cash rain" at high intensity: items per second by tier (1-5).
export const RAIN_PER_SECOND = [0, 0, 1.5, 4, 9] // TUNE

export const CONFETTI_COLORS = ['#e5484d', '#f5b83d', '#46a758', '#3d8bfd', '#8e6cf0', '#f28cb1']
