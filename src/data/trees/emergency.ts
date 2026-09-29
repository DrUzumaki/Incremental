// Emergency skill tree. Root in the centre; branches grow outward:
// Diagnosis (up: pay, combo), Flow (right: arrivals, patience),
// Staff (down: automation), Special (left: hints, pager, trials).
import type { TreeDef } from '../tree'

const $ = (base: number, growth: number) => [{ currency: 'emergency' as const, base, growth }]
const SC = (base: number, growth: number) => [{ currency: 'stemCells' as const, base, growth }]

export const EMERGENCY_TREE: TreeDef = {
  id: 'emergency',
  // Starting values for every stat the tree can change.
  baseStats: {
    payFlat: 0, // dollars added to every patient's base pay
    payMult: 1, // multiplies all active (sorting) pay
    redMult: 1, // extra multiplier for red patients
    patience: 6, // seconds the front patient waits
    comboStep: 0.1, // pay bonus per correct sort in a row
    comboCap: 1, // most combo bonus (1 = +100%)
    spawnInterval: 1.6, // seconds between arrivals
    queueSize: 5,
    hint: 0, // 1 = show colour hint
    nurses: 0,
    nurseRate: 0.4, // TUNE: dollars per second per nurse, before multipliers
    nurseMult: 1,
    incomeMult: 1, // multiplies everything this department earns
    flowExport: 0, // exported: other rooms earn x(1 + flowExport)
    autoPage: 0, // 1 = staff answer low-priority pages
    pagerDuration: 1, // pager boosts last this much longer
    trialCooldown: 1, // multiplies the Lungs trial cooldown
    trialReward: 0, // extra fraction on trial income rewards
    trialEase: 0, // plays the trial this many tiers easier
  },
  nodes: [
    { id: 'desk', name: 'Triage Desk', desc: 'Where it all begins. Mostly paperwork.', branch: 'root',
      x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true },

    // Diagnosis
    { id: 'stethoscopes', name: 'Better Stethoscopes', desc: '+$1 base pay per patient', branch: 'diagnosis',
      x: 0, y: -110, links: ['desk'], maxLevel: 50, costs: $(10, 1.12), effects: [{ stat: 'payFlat', add: 1 }] },
    { id: 'training', name: 'Triage Training', desc: 'Combo cap +10%', branch: 'diagnosis',
      x: -90, y: -200, links: ['stethoscopes'], maxLevel: 25, costs: $(50, 1.14), effects: [{ stat: 'comboCap', add: 0.1 }] },
    { id: 'patternRecognition', name: 'Pattern Recognition', desc: 'Each combo step pays +1% more', branch: 'diagnosis',
      x: 90, y: -200, links: ['stethoscopes'], maxLevel: 10, costs: $(250, 1.3), effects: [{ stat: 'comboStep', add: 0.01 }] },
    { id: 'resusBonus', name: 'Resus Bonus', desc: 'Red patients pay x1.25', branch: 'diagnosis',
      x: -90, y: -300, links: ['training'], maxLevel: 20, costs: $(1500, 1.2), effects: [{ stat: 'redMult', mult: 1.25 }] },
    { id: 'differential', name: 'Differential Diagnosis', desc: 'All sorting pay x1.15', branch: 'diagnosis',
      x: 90, y: -300, links: ['patternRecognition'], maxLevel: 25, costs: $(5000, 1.22), effects: [{ stat: 'payMult', mult: 1.15 }] },
    { id: 'boardCert', name: 'Board Certification', desc: 'Sorting pay x2. You passed! Barely.', branch: 'diagnosis',
      x: 0, y: -390, links: ['resusBonus', 'differential'], maxLevel: 1, costs: $(250_000, 1), effects: [{ stat: 'payMult', mult: 2 }] },

    // Flow
    { id: 'chairs', name: 'Comfier Waiting Chairs', desc: 'Patients wait 0.4 s longer', branch: 'flow',
      x: 110, y: 0, links: ['desk'], maxLevel: 25, costs: $(25, 1.13), effects: [{ stat: 'patience', add: 0.4 }] },
    { id: 'fastTrack', name: 'Fast-Track Lane', desc: 'Patients arrive 4% faster', branch: 'flow',
      x: 200, y: -70, links: ['chairs'], maxLevel: 25, costs: $(40, 1.13), effects: [{ stat: 'spawnInterval', mult: 0.96 }] },
    { id: 'waitingRoom', name: 'Bigger Waiting Room', desc: '+1 patient can queue', branch: 'flow',
      x: 200, y: 70, links: ['chairs'], maxLevel: 4, costs: $(150, 1.8), effects: [{ stat: 'queueSize', add: 1 }] },
    { id: 'ambulanceBay', name: 'Ambulance Bay', desc: 'Patients arrive 15% faster. Sirens included.', branch: 'flow',
      x: 300, y: -70, links: ['fastTrack'], maxLevel: 5, costs: $(20_000, 2), effects: [{ stat: 'spawnInterval', mult: 0.85 }] },

    { id: 'admissions', name: 'Admissions Desk', desc: 'Patient flow: every other room earns +5%', branch: 'flow',
      x: 300, y: 70, links: ['waitingRoom'], maxLevel: 20, costs: $(20_000, 1.25), effects: [{ stat: 'flowExport', add: 0.05 }] },
    { id: 'cardiacFastTrack', name: 'Cardiac Fast-Track', desc: 'Synergy: Emergency and Cardiology both earn +10%', branch: 'synergy',
      x: 410, y: 0, links: ['ambulanceBay', 'admissions'], maxLevel: 10, towards: 'cardiology',
      costs: [{ currency: 'emergency', base: 50_000, growth: 1.4 }, { currency: 'cardiology', base: 5_000, growth: 1.4 }],
      effects: [{ stat: 'synergy', add: 0.1 }] },

    // Staff
    { id: 'nurses', name: 'Hire Triage Nurse', desc: '+1 nurse who sorts patients for you', branch: 'staff',
      x: 0, y: 110, links: ['desk'], maxLevel: 50, costs: $(25, 1.15), effects: [{ stat: 'nurses', add: 1 }] },
    { id: 'nurseTraining', name: 'Nurse Training', desc: 'Nurses earn x1.25', branch: 'staff',
      x: -90, y: 200, links: ['nurses'], maxLevel: 25, costs: $(300, 1.18), effects: [{ stat: 'nurseMult', mult: 1.25 }] },
    { id: 'breakRoom', name: 'Break Room Coffee', desc: 'Nurses earn x1.3. Decaf is banned.', branch: 'staff',
      x: 90, y: 200, links: ['nurses'], maxLevel: 10, costs: $(5000, 1.4), effects: [{ stat: 'nurseMult', mult: 1.3 }] },
    { id: 'nightFloat', name: 'Night Float Team', desc: 'Nurses earn x2', branch: 'staff',
      x: 0, y: 290, links: ['nurseTraining', 'breakRoom'], maxLevel: 1, costs: $(400_000, 1), effects: [{ stat: 'nurseMult', mult: 2 }] },

    // Special
    { id: 'cards', name: 'Laminated Triage Cards', desc: 'Shows a faint colour hint on each patient', branch: 'special',
      x: -110, y: 0, links: ['desk'], maxLevel: 1, costs: $(500, 1), effects: [{ stat: 'hint', add: 1 }] },
    { id: 'louderPager', name: 'Louder Pager', desc: 'Pager boosts last 20% longer', branch: 'special',
      x: -200, y: 70, links: ['cards'], maxLevel: 10, costs: $(8_000, 1.35), effects: [{ stat: 'pagerDuration', mult: 1.2 }] },
    { id: 'chargeNurse', name: 'Charge Nurse', desc: 'Staff answer low-priority pages for you', branch: 'special',
      x: -200, y: -70, links: ['cards'], maxLevel: 1, costs: $(60_000, 1), effects: [{ stat: 'autoPage', add: 1 }] },

    // Trial research (paid in Stem Cells from organ trials)
    { id: 'lungResearch', name: 'Pulmonary Research', desc: 'Lungs trial comes back 10% sooner', branch: 'trial',
      x: -310, y: 0, links: ['louderPager', 'chargeNurse'], maxLevel: 5, costs: SC(10, 1.6), effects: [{ stat: 'trialCooldown', mult: 0.9 }] },
    { id: 'respiratoryGrant', name: 'Respiratory Grant', desc: 'Lungs trial rewards +20%', branch: 'trial',
      x: -400, y: -70, links: ['lungResearch'], maxLevel: 5, costs: SC(25, 1.8), effects: [{ stat: 'trialReward', add: 0.2 }] },
    { id: 'biggerTank', name: 'Bigger Oxygen Tank', desc: 'Lungs trial plays one tier easier', branch: 'trial',
      x: -400, y: 70, links: ['lungResearch'], maxLevel: 3, costs: SC(40, 2), effects: [{ stat: 'trialEase', add: 1 }] },
  ],
}
