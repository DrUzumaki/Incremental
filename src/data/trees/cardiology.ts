// Cardiology skill tree. Branches: Rhythm (up: beat pay, tempo, timing),
// Devices (right: pacemakers, hospital tempo export), Staff (down: telemetry techs),
// Special (left: defibrillator jackpots).
import type { TreeDef } from '../tree'

const B = (base: number, growth: number) => [{ currency: 'cardiology' as const, base, growth }]
const SC = (base: number, growth: number) => [{ currency: 'stemCells' as const, base, growth }]

export const CARDIOLOGY_TREE: TreeDef = {
  id: 'cardiology',
  baseStats: {
    beatValue: 2, // beats paid per hit, before multipliers
    beatMult: 1,
    bpm: 60, // how often beats come
    perfectWindow: 0.07, // seconds either side of the line that count as "perfect"
    goodWindow: 0.16, // ...and as "good"
    perfectMult: 1.5,
    comboStep: 0.05,
    comboCap: 1,
    vfEvery: 40, // TUNE: seconds between VF episodes
    vfDuration: 4.5,
    chargeTime: 1.2, // seconds the defibrillator takes to charge once VF starts
    jackpotMult: 30, // a shock pays this many beats' worth
    techs: 0,
    techRate: 1.5, // TUNE: beats per second per telemetry tech
    techMult: 1,
    pacemakers: 0,
    pacemakerRate: 15, // TUNE: beats per second per pacemaker
    pacemakerMult: 1,
    tempo: 0, // exported: every room's idle income x(1 + tempo)
    incomeMult: 1,
    trialCooldown: 1, // multiplies the Heart trial cooldown
    trialReward: 0, // extra fraction on trial income rewards
    trialEase: 0, // plays the trial this many tiers easier
  },
  nodes: [
    { id: 'monitor', name: 'Cardiac Monitor', desc: 'Beep. Beep. Beep. Forever.', branch: 'root',
      x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true },

    // Rhythm
    { id: 'electrodes', name: 'Better Electrodes', desc: '+1 beat per hit', branch: 'rhythm',
      x: 0, y: -110, links: ['monitor'], maxLevel: 50, costs: B(10, 1.12), effects: [{ stat: 'beatValue', add: 1 }] },
    { id: 'metronome', name: 'Metronome', desc: '+5 BPM (more beats to hit)', branch: 'rhythm',
      x: -90, y: -200, links: ['electrodes'], maxLevel: 20, costs: B(40, 1.15), effects: [{ stat: 'bpm', add: 5 }] },
    { id: 'steadyHands', name: 'Steady Hands', desc: 'Timing windows 10% wider', branch: 'rhythm',
      x: 90, y: -200, links: ['electrodes'], maxLevel: 10, costs: B(150, 1.3),
      effects: [{ stat: 'perfectWindow', mult: 1.1 }, { stat: 'goodWindow', mult: 1.1 }] },
    { id: 'perfectPitch', name: 'Perfect Pitch', desc: 'Perfect hits pay +25% more', branch: 'rhythm',
      x: -90, y: -300, links: ['metronome'], maxLevel: 20, costs: B(800, 1.2), effects: [{ stat: 'perfectMult', add: 0.25 }] },
    { id: 'rhythmSection', name: 'Rhythm Section', desc: 'Combo cap +10%', branch: 'rhythm',
      x: 90, y: -300, links: ['steadyHands'], maxLevel: 25, costs: B(400, 1.16), effects: [{ stat: 'comboCap', add: 0.1 }] },
    { id: 'fellowship', name: 'Cardiology Fellowship', desc: 'All beats from hits x2', branch: 'rhythm',
      x: 0, y: -390, links: ['perfectPitch', 'rhythmSection'], maxLevel: 1, costs: B(250_000, 1), effects: [{ stat: 'beatMult', mult: 2 }] },

    // Devices
    { id: 'pacemakers', name: 'Implant Pacemaker', desc: '+1 pacemaker (15 beats/s)', branch: 'devices',
      x: 110, y: 0, links: ['monitor'], maxLevel: 50, costs: B(500, 1.17), effects: [{ stat: 'pacemakers', add: 1 }] },
    { id: 'batteries', name: 'Longer Batteries', desc: 'Pacemakers x1.25', branch: 'devices',
      x: 200, y: -70, links: ['pacemakers'], maxLevel: 25, costs: B(3000, 1.2), effects: [{ stat: 'pacemakerMult', mult: 1.25 }] },
    { id: 'wireless', name: 'Wireless Pacing', desc: 'Pacemakers x2. Bluetooth hearts.', branch: 'devices',
      x: 200, y: 70, links: ['pacemakers'], maxLevel: 1, costs: B(150_000, 1), effects: [{ stat: 'pacemakerMult', mult: 2 }] },
    { id: 'hospitalTempo', name: 'Hospital Tempo', desc: 'Every room earns +5% idle income', branch: 'devices',
      x: 300, y: 0, links: ['batteries', 'wireless'], maxLevel: 20, costs: B(20_000, 1.25), effects: [{ stat: 'tempo', add: 0.05 }] },

    // Staff
    { id: 'techs', name: 'Hire Telemetry Tech', desc: '+1 tech who watches monitors for you', branch: 'staff',
      x: 0, y: 110, links: ['monitor'], maxLevel: 50, costs: B(25, 1.15), effects: [{ stat: 'techs', add: 1 }] },
    { id: 'techTraining', name: 'Telemetry Training', desc: 'Techs earn x1.25', branch: 'staff',
      x: -90, y: 200, links: ['techs'], maxLevel: 25, costs: B(300, 1.18), effects: [{ stat: 'techMult', mult: 1.25 }] },
    { id: 'secondMonitor', name: 'Second Monitor', desc: 'Techs earn x1.3', branch: 'staff',
      x: 90, y: 200, links: ['techs'], maxLevel: 10, costs: B(5000, 1.4), effects: [{ stat: 'techMult', mult: 1.3 }] },
    { id: 'nightTechs', name: 'Night Telemetry Team', desc: 'Techs earn x2', branch: 'staff',
      x: 0, y: 290, links: ['techTraining', 'secondMonitor'], maxLevel: 1, costs: B(400_000, 1), effects: [{ stat: 'techMult', mult: 2 }] },

    // Special
    { id: 'defib', name: 'Bigger Defibrillator', desc: 'Shock jackpots x1.3', branch: 'special',
      x: -110, y: 0, links: ['monitor'], maxLevel: 20, costs: B(200, 1.22), effects: [{ stat: 'jackpotMult', mult: 1.3 }] },
    { id: 'arrhythmiaMagnet', name: 'Arrhythmia Magnet', desc: 'VF comes 10% more often', branch: 'special',
      x: -200, y: -70, links: ['defib'], maxLevel: 10, costs: B(1000, 1.35), effects: [{ stat: 'vfEvery', mult: 0.9 }] },
    { id: 'fastCharge', name: 'Fast Charge', desc: 'Defibrillator charges 15% faster', branch: 'special',
      x: -200, y: 70, links: ['defib'], maxLevel: 5, costs: B(600, 1.5), effects: [{ stat: 'chargeTime', mult: 0.85 }] },

    // Trial research (paid in Stem Cells from organ trials)
    { id: 'cardiacResearch', name: 'Electrophysiology Lab', desc: 'Heart trial comes back 10% sooner', branch: 'trial',
      x: -310, y: 0, links: ['arrhythmiaMagnet', 'fastCharge'], maxLevel: 5, costs: SC(10, 1.6), effects: [{ stat: 'trialCooldown', mult: 0.9 }] },
    { id: 'heartGrant', name: 'Heart Foundation Grant', desc: 'Heart trial rewards +20%', branch: 'trial',
      x: -400, y: -70, links: ['cardiacResearch'], maxLevel: 5, costs: SC(25, 1.8), effects: [{ stat: 'trialReward', add: 0.2 }] },
    { id: 'crashCartDrills', name: 'Crash Cart Drills', desc: 'Heart trial plays one tier easier', branch: 'trial',
      x: -400, y: 70, links: ['cardiacResearch'], maxLevel: 3, costs: SC(40, 2), effects: [{ stat: 'trialEase', add: 1 }] },
  ],
}
