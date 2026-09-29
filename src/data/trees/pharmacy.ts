// Pharmacy skill tree. Branches: Compounding (up: pay, order size, patience, combo),
// Special (left: risky trial drugs), Staff (down: pill dispensers),
// Buffs (right: the caffeine IV sent to other rooms), Trial research (Stem Cells).
import type { TreeDef } from '../tree'

// Later rooms arrive with bigger hospital-wide bonuses, so their prices are scaled up.
const COST_SCALE = 8 // TUNE: checked with npm run simulate
const D = (base: number, growth: number) => [{ currency: 'pharmacy' as const, base: base * COST_SCALE, growth }]
const SC = (base: number, growth: number) => [{ currency: 'stemCells' as const, base, growth }]

export const PHARMACY_TREE: TreeDef = {
  id: 'pharmacy',
  baseStats: {
    dosesPerPill: 2, // doses paid per pill in a correct order
    doseMult: 1,
    comboStep: 0.08,
    comboCap: 1,
    orderTime: 9, // TUNE: seconds before a waiting customer gives up
    minPills: 2,
    maxPills: 3, // order size is random between min and max
    riskyChance: 0.6, // chance a risky trial drug works (x riskyMult)
    riskyMult: 3,
    jackpotChance: 0.12, // chance of a risky jackpot (x jackpotMult)
    jackpotMult: 6,
    dispensers: 0,
    dispenserRate: 0.55, // TUNE: doses per second per dispenser
    dispenserMult: 1,
    buffMult: 2, // a caffeine IV multiplies the target room's income by this
    buffDuration: 45, // seconds
    buffCost: 8, // correct orders needed to fill the IV bag
    incomeMult: 1,
    trialCooldown: 1,
    trialReward: 0,
    trialEase: 0,
  },
  nodes: [
    { id: 'counter', name: 'Pharmacy Counter', desc: 'Please form an orderly queue.', branch: 'root',
      x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true },

    // Compounding
    { id: 'scales', name: 'Precision Scales', desc: '+1 dose per pill', branch: 'compounding',
      x: 0, y: -110, links: ['counter'], maxLevel: 50, costs: D(10, 1.12), effects: [{ stat: 'dosesPerPill', add: 1 }] },
    { id: 'labels', name: 'Pre-printed Labels', desc: 'Customers wait 1 s longer', branch: 'compounding',
      x: -90, y: -200, links: ['scales'], maxLevel: 10, costs: D(40, 1.2), effects: [{ stat: 'orderTime', add: 1 }] },
    { id: 'countingTray', name: 'Pill Counting Tray', desc: 'Combo cap +10%', branch: 'compounding',
      x: 90, y: -200, links: ['scales'], maxLevel: 25, costs: D(400, 1.16), effects: [{ stat: 'comboCap', add: 0.1 }] },
    { id: 'polypharmacy', name: 'Polypharmacy', desc: 'Orders can have one more pill (and pay more)', branch: 'compounding',
      x: -90, y: -300, links: ['labels'], maxLevel: 3, costs: D(300, 2.2), effects: [{ stat: 'maxPills', add: 1 }] },
    { id: 'pharmD', name: 'PharmD Degree', desc: 'All dispensing pay x2', branch: 'compounding',
      x: 90, y: -300, links: ['countingTray'], maxLevel: 1, costs: D(250_000, 1), effects: [{ stat: 'doseMult', mult: 2 }] },

    // Special: risky trial drugs
    { id: 'trialBudget', name: 'Trial Drug Budget', desc: 'Risky drugs work 5% more often', branch: 'special',
      x: -110, y: 0, links: ['counter'], maxLevel: 6, costs: D(200, 1.4), effects: [{ stat: 'riskyChance', add: 0.05 }] },
    { id: 'serendipity', name: 'Serendipity', desc: 'Risky jackpots x1.15', branch: 'special',
      x: -200, y: -70, links: ['trialBudget'], maxLevel: 10, costs: D(1500, 1.35), effects: [{ stat: 'jackpotMult', mult: 1.15 }] },
    { id: 'luckyCharm', name: 'Lucky Lab Coat', desc: 'Risky jackpots 3% more likely', branch: 'special',
      x: -200, y: 70, links: ['trialBudget'], maxLevel: 5, costs: D(2500, 1.5), effects: [{ stat: 'jackpotChance', add: 0.03 }] },

    // Staff: pill dispensers
    { id: 'dispensers', name: 'Install Pill Dispenser', desc: '+1 dispenser that fills orders for you', branch: 'staff',
      x: 0, y: 110, links: ['counter'], maxLevel: 50, costs: D(25, 1.15), effects: [{ stat: 'dispensers', add: 1 }] },
    { id: 'motors', name: 'Faster Motors', desc: 'Dispensers x1.1', branch: 'staff',
      x: -90, y: 200, links: ['dispensers'], maxLevel: 25, costs: D(400, 1.25), effects: [{ stat: 'dispenserMult', mult: 1.1 }] },
    { id: 'barcodes', name: 'Barcode Scanners', desc: 'Dispensers x1.2', branch: 'staff',
      x: 90, y: 200, links: ['dispensers'], maxLevel: 10, costs: D(8000, 1.45), effects: [{ stat: 'dispenserMult', mult: 1.2 }] },
    { id: 'robotPharmacy', name: 'Robot Pharmacy', desc: 'Dispensers x2. Beep boop.', branch: 'staff',
      x: 0, y: 290, links: ['motors', 'barcodes'], maxLevel: 1, costs: D(400_000, 1), effects: [{ stat: 'dispenserMult', mult: 2 }] },

    // Buffs: caffeine IVs for other rooms
    { id: 'strongerIv', name: 'Double Espresso IV', desc: 'Caffeine IVs give +0.5x more', branch: 'flow',
      x: 110, y: 0, links: ['counter'], maxLevel: 10, costs: D(2000, 1.3), effects: [{ stat: 'buffMult', add: 0.5 }] },
    { id: 'slowRelease', name: 'Slow-Release Formula', desc: 'Caffeine IVs last 20% longer', branch: 'flow',
      x: 200, y: -70, links: ['strongerIv'], maxLevel: 10, costs: D(1500, 1.3), effects: [{ stat: 'buffDuration', mult: 1.2 }] },
    { id: 'bulkOrdering', name: 'Bulk Ordering', desc: 'IV bag fills with 15% fewer orders', branch: 'flow',
      x: 200, y: 70, links: ['strongerIv'], maxLevel: 5, costs: D(800, 1.5), effects: [{ stat: 'buffCost', mult: 0.85 }] },

    { id: 'surgicalPharmacy', name: 'Surgical Pharmacy', desc: 'Synergy: Pharmacy and Surgery both earn +10%', branch: 'synergy',
      x: 300, y: 0, links: ['slowRelease', 'bulkOrdering'], maxLevel: 10, towards: 'surgery',
      costs: [{ currency: 'pharmacy', base: 50_000, growth: 1.4 }, { currency: 'surgery', base: 5_000, growth: 1.4 }],
      effects: [{ stat: 'synergy', add: 0.1 }] },

    // Trial research (Stem Cells)
    { id: 'hepatology', name: 'Hepatology Lab', desc: 'Liver trial comes back 10% sooner', branch: 'trial',
      x: -310, y: 0, links: ['serendipity', 'luckyCharm'], maxLevel: 5, costs: SC(10, 1.6), effects: [{ stat: 'trialCooldown', mult: 0.9 }] },
    { id: 'liverGrant', name: 'Liver Foundation Grant', desc: 'Liver trial rewards +20%', branch: 'trial',
      x: -400, y: -70, links: ['hepatology'], maxLevel: 5, costs: SC(25, 1.8), effects: [{ stat: 'trialReward', add: 0.2 }] },
    { id: 'detoxDrills', name: 'Detox Drills', desc: 'Liver trial plays one tier easier', branch: 'trial',
      x: -400, y: 70, links: ['hepatology'], maxLevel: 3, costs: SC(40, 2), effects: [{ stat: 'trialEase', add: 1 }] },
  ],
}
