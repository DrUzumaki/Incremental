// The four hospital departments, in unlock order, with their currencies.

export type DeptId = 'emergency' | 'cardiology' | 'pharmacy' | 'surgery'

export const DEPT_ORDER: DeptId[] = ['emergency', 'cardiology', 'pharmacy', 'surgery']

export interface DeptInfo {
  name: string
  currency: string // plural name, e.g. "Beats"
  prefix: string // shown before the number ("$"), or '' to use the name after it
  color: string
  organ: string // this department's organ trial
}

export const DEPTS: Record<DeptId, DeptInfo> = {
  emergency: { name: 'Emergency', currency: 'Dollars', prefix: '$', color: '#46a758', organ: 'Lungs' },
  cardiology: { name: 'Cardiology', currency: 'Beats', prefix: '', color: '#e5484d', organ: 'Heart' },
  pharmacy: { name: 'Pharmacy', currency: 'Doses', prefix: '', color: '#8e6cf0', organ: 'Liver' },
  surgery: { name: 'Surgery', currency: 'Sutures', prefix: '', color: '#3d8bfd', organ: 'Gut' },
}
