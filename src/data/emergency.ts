// Balance numbers and text for the Emergency triage minigame.

export type Severity = 'red' | 'yellow' | 'green'

export const SEVERITIES: Severity[] = ['red', 'yellow', 'green']

// How a patient acts out their complaint while walking in and waiting.
export type ComplaintAct =
  | 'clutchChest'
  | 'clutchThroat'
  | 'dozing'
  | 'dizzy'
  | 'puffy'
  | 'holdArm'
  | 'limp'
  | 'fever'
  | 'holdSide'
  | 'sneeze'
  | 'scratch'
  | 'phone'
  | 'note'

export const TRIAGE = {
  // Dollars paid for a correct sort, before upgrades and combo.
  basePay: { red: 5, yellow: 3, green: 1 } as Record<Severity, number>,
  // How likely each severity is to walk in (should add up to 1).
  severityWeights: { red: 0.25, yellow: 0.35, green: 0.4 } as Record<Severity, number>,
  spawnInterval: 1.6, // seconds between new arrivals
  queueSize: 5, // most patients waiting at once
  patience: 6, // seconds the front patient waits before leaving
  comboStep: 0.1, // +10% pay per correct sort in a row
  comboCap: 1.0, // combo bonus stops at +100% (x2), before upgrades
}

export const COMPLAINTS: Record<Severity, string[]> = {
  red: [
    'Not breathing',
    'Chest pain, very sweaty',
    'Unresponsive',
    'Face swelling after peanuts',
    'Sudden slurred speech',
    'Severe asthma attack',
  ],
  yellow: [
    'Broken arm',
    'High fever for 3 days',
    'Cut that needs stitches',
    'Kidney stone (loudly)',
    'Fell off a ladder',
    'Dog bite on the hand',
  ],
  green: [
    'Stubbed toe (very dramatic)',
    'Needs a sick note',
    'Runny nose since Tuesday',
    'Splinter',
    'Mild sunburn',
    'Googled symptoms, now worried',
  ],
}

// Shown when the player sorts a patient into the wrong bay.
export const WRONG_LINES = [
  'The stubbed toe is now in resus. Everyone is confused.',
  'Radiology would like a word.',
  'The charge nurse sighs audibly.',
  "That's... a bold call, doctor.",
  'Someone page the attending. For you, not the patient.',
]

// Shown when the front patient runs out of patience.
export const LEFT_LINES = [
  'Left against medical advice. Took a pillow.',
  "Got bored and went to urgent care.",
  "Decided to 'walk it off'.",
  'Left a one-star review on the way out.',
]

// Shirt colours for patients, just for variety.
export const PATIENT_TINTS = ['#8fb3ff', '#c9a3ff', '#7fd6c2', '#ffb38a', '#f28cb1', '#b8c4d6']
