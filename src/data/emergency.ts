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

export interface Complaint {
  text: string
  act: ComplaintAct
}

export const COMPLAINTS: Record<Severity, Complaint[]> = {
  red: [
    { text: 'Not breathing', act: 'clutchThroat' },
    { text: 'Chest pain, very sweaty', act: 'clutchChest' },
    { text: 'Unresponsive', act: 'dozing' },
    { text: 'Face swelling after peanuts', act: 'puffy' },
    { text: 'Sudden slurred speech', act: 'dizzy' },
    { text: 'Severe asthma attack', act: 'clutchThroat' },
  ],
  yellow: [
    { text: 'Broken arm', act: 'holdArm' },
    { text: 'High fever for 3 days', act: 'fever' },
    { text: 'Cut that needs stitches', act: 'holdArm' },
    { text: 'Kidney stone (loudly)', act: 'holdSide' },
    { text: 'Fell off a ladder', act: 'limp' },
    { text: 'Dog bite on the hand', act: 'holdArm' },
  ],
  green: [
    { text: 'Stubbed toe (very dramatic)', act: 'limp' },
    { text: 'Needs a sick note', act: 'note' },
    { text: 'Runny nose since Tuesday', act: 'sneeze' },
    { text: 'Splinter', act: 'scratch' },
    { text: 'Mild sunburn', act: 'scratch' },
    { text: 'Googled symptoms, now worried', act: 'phone' },
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
