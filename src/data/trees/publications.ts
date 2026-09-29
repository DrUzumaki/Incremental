// The global Publications tree: big permanent upgrades paid with Publications from bosses.
import type { TreeDef } from '../tree'

const P = (base: number, growth: number) => [{ currency: 'publications' as const, base, growth }]

export const PUBLICATIONS_TREE: TreeDef = {
  id: 'publications',
  baseStats: {
    globalIncome: 1, // every department's income
    stemCellMult: 1, // Stem Cells from trials
    trialCooldown: 1, // every trial's cooldown
    offlineMult: 1, // offline earnings
    pubMult: 1, // Publications from bosses
  },
  nodes: [
    { id: 'firstPaper', name: 'First Paper', desc: 'Your name, in print, spelled almost right.', branch: 'root',
      x: 0, y: 0, links: [], maxLevel: 1, costs: [], effects: [], root: true },
    { id: 'caseReport', name: 'Case Report', desc: 'Every room earns x1.25', branch: 'global',
      x: 0, y: -110, links: ['firstPaper'], maxLevel: 10, costs: P(2, 1.6), effects: [{ stat: 'globalIncome', mult: 1.25 }] },
    { id: 'reviewArticle', name: 'Review Article', desc: 'Trials pay x1.5 Stem Cells', branch: 'trial',
      x: 110, y: 0, links: ['firstPaper'], maxLevel: 5, costs: P(4, 1.8), effects: [{ stat: 'stemCellMult', mult: 1.5 }] },
    { id: 'metaAnalysis', name: 'Meta-analysis', desc: 'All trial cooldowns 15% shorter', branch: 'trial',
      x: 200, y: -70, links: ['reviewArticle'], maxLevel: 5, costs: P(8, 1.8), effects: [{ stat: 'trialCooldown', mult: 0.85 }] },
    { id: 'researchGrant', name: 'Research Grant', desc: 'Offline earnings x1.25', branch: 'special',
      x: -110, y: 0, links: ['firstPaper'], maxLevel: 4, costs: P(6, 1.9), effects: [{ stat: 'offlineMult', mult: 1.25 }] },
    { id: 'citationClassic', name: 'Citation Classic', desc: 'Bosses pay x1.5 Publications', branch: 'special',
      x: -200, y: -70, links: ['researchGrant'], maxLevel: 5, costs: P(10, 2), effects: [{ stat: 'pubMult', mult: 1.5 }] },
    { id: 'tenure', name: 'Tenure', desc: 'Every room earns x2. Unfireable!', branch: 'global',
      x: 0, y: -220, links: ['caseReport'], maxLevel: 1, costs: P(60, 1), effects: [{ stat: 'globalIncome', mult: 2 }] },
    { id: 'namedSyndrome', name: 'A Syndrome Named After You', desc: 'Every room earns x3', branch: 'global',
      x: 0, y: -330, links: ['tenure'], maxLevel: 1, costs: P(250, 1), effects: [{ stat: 'globalIncome', mult: 3 }] },
  ],
}
