// How skill trees look: branch colours, icons and node sizes. Visual only.

export const BRANCH_STYLE: Record<string, { color: string; icon: string; label: string }> = {
  root: { color: '#f4f7fb', icon: '✚', label: 'Start' },
  diagnosis: { color: '#3d8bfd', icon: '✚', label: 'Diagnosis' },
  flow: { color: '#46a758', icon: '»', label: 'Flow' },
  staff: { color: '#8e6cf0', icon: '☻', label: 'Staff' },
  special: { color: '#f5b83d', icon: '★', label: 'Special' },
  trial: { color: '#2ec4b6', icon: '⚗', label: 'Trial research' },
  synergy: { color: '#ff5fa2', icon: '∞', label: 'Synergy' },
  // Other departments' branches reuse these by name; add more here as trees grow.
  rhythm: { color: '#e5484d', icon: '♥', label: 'Rhythm' },
  devices: { color: '#8e6cf0', icon: '⚙', label: 'Devices' },
  compounding: { color: '#8e6cf0', icon: '℞', label: 'Compounding' },
  research: { color: '#2ec4b6', icon: '⚗', label: 'Research' },
  technique: { color: '#3d8bfd', icon: '✂', label: 'Technique' },
  global: { color: '#f5b83d', icon: '✎', label: 'Global' },
}

export const TREE_VIEW = {
  nodeRadius: 26, // in tree units
  minZoom: 0.35,
  maxZoom: 2.2,
  fitPadding: 90, // tree units of space around the visible nodes when the tree opens
  popTime: 0.35, // seconds a node "pops" after being bought
}
