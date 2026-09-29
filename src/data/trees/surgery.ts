// Surgery skill tree. Branches: Technique (up: pay, tolerance, time, combo),
// Special (left: precision and speed bonuses), Staff (down: surgical residents, robot),
// Perks (right: permanent hospital-wide perks from completed operations), Trial research.
import type { TreeDef } from '../tree'

const S = (base: number, growth: number) => [{ currency: 'surgery' as const, base, growth }]
const SC = (base: number, growth: number) => [{ currency: 'stemCells' as const, base, growth }]

export const SURGERY_TREE: TreeDef = {
  id: 'surgery',
  baseStats: {
    sutureValue: 3, // sutures paid per 100 px of incision at perfect accuracy
    sutureMult: 1,
    tolerance: 18, // TUNE: pixels you may stray from the line before slipping
    opTime: 10, // seconds per operation
    comboStep: 0.1,
    comboCap: 1,
    perfectMult: 1.3, // extra pay for a perfect operation
    timeBonus: 0, // extra pay per fraction of time left
    residents: 0,
    residentRate: 4, // TUNE: sutures per second per surgical resident
    residentMult: 1,
    robots: 0,
    robotRate: 300, // TUNE: sutures per second from the surgical robot
    perkEvery: 20, // completed operations per permanent perk
    perkPower: 0.05, // each perk: every room earns this much more
    incomeMult: 1,
    trialCooldown: 1,
    trialReward: 0,
    trialEase: 0,
  },
  nodes: [
    { id: 'scrubSink', name: 'Scrub Sink', desc: 'Wash for two minutes. Sing if you must.', branch: 'root',
      x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true },

    // Technique
    { id: 'sharpScalpels', name: 'Sharper Scalpels', desc: '+1 suture per 100 px traced', branch: 'technique',
      x: 0, y: -110, links: ['scrubSink'], maxLevel: 50, costs: S(10, 1.12), effects: [{ stat: 'sutureValue', add: 1 }] },
    { id: 'steadyGrip', name: 'Steady Grip', desc: 'You can stray 10% further from the line', branch: 'technique',
      x: -90, y: -200, links: ['sharpScalpels'], maxLevel: 10, costs: S(150, 1.3), effects: [{ stat: 'tolerance', mult: 1.1 }] },
    { id: 'loupes', name: 'Surgical Loupes', desc: '+1.5 s per operation', branch: 'technique',
      x: 90, y: -200, links: ['sharpScalpels'], maxLevel: 8, costs: S(40, 1.25), effects: [{ stat: 'opTime', add: 1.5 }] },
    { id: 'suturePractice', name: 'Suture Practice', desc: 'Combo cap +10%', branch: 'technique',
      x: -90, y: -300, links: ['steadyGrip'], maxLevel: 25, costs: S(400, 1.16), effects: [{ stat: 'comboCap', add: 0.1 }] },
    { id: 'surgFellowship', name: 'Surgical Fellowship', desc: 'All suturing pay x2', branch: 'technique',
      x: 90, y: -300, links: ['loupes'], maxLevel: 1, costs: S(250_000, 1), effects: [{ stat: 'sutureMult', mult: 2 }] },

    // Special
    { id: 'precision', name: 'Precision Bonus', desc: 'Perfect operations pay +20% more', branch: 'special',
      x: -110, y: 0, links: ['scrubSink'], maxLevel: 10, costs: S(200, 1.25), effects: [{ stat: 'perfectMult', add: 0.2 }] },
    { id: 'fastHands', name: 'Fast Hands', desc: 'Finishing early pays up to +10% more', branch: 'special',
      x: -200, y: -70, links: ['precision'], maxLevel: 10, costs: S(800, 1.3), effects: [{ stat: 'timeBonus', add: 0.1 }] },

    // Staff
    { id: 'surgResidents', name: 'Hire Surgical Resident', desc: '+1 resident who operates for you', branch: 'staff',
      x: 0, y: 110, links: ['scrubSink'], maxLevel: 50, costs: S(25, 1.15), effects: [{ stat: 'residents', add: 1 }] },
    { id: 'mmConference', name: 'M&M Conference', desc: 'Residents earn x1.25', branch: 'staff',
      x: -90, y: 200, links: ['surgResidents'], maxLevel: 25, costs: S(300, 1.18), effects: [{ stat: 'residentMult', mult: 1.25 }] },
    { id: 'orCoffee', name: 'OR Coffee Machine', desc: 'Residents earn x1.3', branch: 'staff',
      x: 90, y: 200, links: ['surgResidents'], maxLevel: 10, costs: S(5000, 1.4), effects: [{ stat: 'residentMult', mult: 1.3 }] },
    { id: 'surgicalRobot', name: 'Surgical Robot', desc: 'A robot that operates nonstop (300 sutures/s)', branch: 'staff',
      x: 0, y: 290, links: ['mmConference', 'orCoffee'], maxLevel: 1, costs: S(200_000, 1), effects: [{ stat: 'robots', add: 1 }] },

    // Perks: permanent hospital-wide bonuses from completed operations
    { id: 'caseLog', name: 'Case Log', desc: 'Perks come 15% sooner (fewer operations)', branch: 'global',
      x: 110, y: 0, links: ['scrubSink'], maxLevel: 5, costs: S(1000, 1.5), effects: [{ stat: 'perkEvery', mult: 0.85 }] },
    { id: 'teachingHospital', name: 'Teaching Hospital', desc: 'Each perk gives +2% more', branch: 'global',
      x: 200, y: -70, links: ['caseLog'], maxLevel: 10, costs: S(3000, 1.35), effects: [{ stat: 'perkPower', add: 0.02 }] },
    { id: 'traumaTeam', name: 'Trauma Team', desc: 'Synergy: Surgery and Emergency both earn +10%', branch: 'synergy',
      x: 300, y: 0, links: ['caseLog', 'teachingHospital'], maxLevel: 10, towards: 'emergency',
      costs: [{ currency: 'surgery', base: 50_000, growth: 1.4 }, { currency: 'emergency', base: 500_000, growth: 1.4 }],
      effects: [{ stat: 'synergy', add: 0.1 }] },

    // Trial research (Stem Cells)
    { id: 'gutLab', name: 'Gastro Lab', desc: 'Gut trial comes back 10% sooner', branch: 'trial',
      x: -310, y: 0, links: ['fastHands', 'precision'], maxLevel: 5, costs: SC(10, 1.6), effects: [{ stat: 'trialCooldown', mult: 0.9 }] },
    { id: 'gutGrant', name: 'Microbiome Grant', desc: 'Gut trial rewards +20%', branch: 'trial',
      x: -400, y: -70, links: ['gutLab'], maxLevel: 5, costs: SC(25, 1.8), effects: [{ stat: 'trialReward', add: 0.2 }] },
    { id: 'probiotics', name: 'Probiotics', desc: 'Gut trial plays one tier easier', branch: 'trial',
      x: -400, y: 70, links: ['gutLab'], maxLevel: 3, costs: SC(40, 2), effects: [{ stat: 'trialEase', add: 1 }] },
  ],
}
