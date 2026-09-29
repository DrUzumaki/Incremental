// The four hospital departments, in unlock order, with their currencies.

export type DeptId = 'emergency' | 'cardiology' | 'pharmacy' | 'surgery'

export const DEPT_ORDER: DeptId[] = ['emergency', 'cardiology', 'pharmacy', 'surgery']

export interface DeptInfo {
  name: string
  hint: string // how to play, shown under the room
  unlockAfter: DeptId | null // unlocks when this department gets its sign-off
  currency: string // plural name, e.g. "Beats"
  prefix: string // shown before the number ("$"), or '' to use the name after it
  color: string
  organ: string // this department's organ trial
}

export const DEPTS: Record<DeptId, DeptInfo> = {
  emergency: {
    name: 'Emergency', currency: 'Dollars', prefix: '$', color: '#46a758', organ: 'Lungs', unlockAfter: null,
    hint: 'Read the complaint, then click a bay or press 1 / 2 / 3. Press T for the skill tree.',
  },
  cardiology: {
    name: 'Cardiology', currency: 'Beats', prefix: '', color: '#e5484d', organ: 'Heart', unlockAfter: 'emergency',
    hint: 'Click or press Space as each beat crosses the line. When it goes into VF, wait for the charge, then shock!',
  },
  pharmacy: {
    name: 'Pharmacy', currency: 'Doses', prefix: '', color: '#8e6cf0', organ: 'Liver', unlockAfter: 'cardiology',
    hint: 'Click the pill jars to match the prescription, then Dispense. Risky trial drugs pay more… usually.',
  },
  surgery: {
    name: 'Surgery', currency: 'Sutures', prefix: '', color: '#3d8bfd', organ: 'Gut', unlockAfter: 'pharmacy',
    hint: 'Hold the mouse button and trace the dotted incision line. The closer you stay, the more it pays.',
  },
}
