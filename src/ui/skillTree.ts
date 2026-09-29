// The skill tree overlay: a pannable, zoomable canvas of upgrade nodes.
// Drag to pan, scroll to zoom, hover for details, click to buy. Esc closes.
// The room keeps running underneath while it's open.
import { formatCurrency } from '../core/format'
import type { Game } from '../core/game'
import {
  canAfford,
  currencyAmount,
  isMaxed,
  isRevealed,
  isSilhouette,
  levelOf,
  nodeCosts,
} from '../core/tree'
import { DEPTS } from '../data/departments'
import type { TreeId, TreeNodeDef } from '../data/tree'
import { TREES } from '../data/trees'
import { BRANCH_STYLE, TREE_VIEW } from '../data/treeStyle'
import type { Effects } from './effects'

type NodeState = 'hidden' | 'silhouette' | 'maxed' | 'affordable' | 'expensive'

function treeTitle(id: TreeId) {
  return id === 'publications' ? 'Publications' : DEPTS[id].name
}

export function createSkillTree(host: HTMLElement, game: Game, fx: Effects) {
  const overlay = document.createElement('div')
  overlay.className = 'tree-overlay'
  overlay.hidden = true
  overlay.innerHTML = `
    <div class="tree-header">
      <h3 class="tree-title"></h3>
      <div class="tree-wallet"></div>
      <span class="tree-help">Drag to move · scroll to zoom · click to buy</span>
      <button class="tree-close" type="button" aria-label="Close skill tree">Close ✕</button>
    </div>
    <canvas class="tree-canvas"></canvas>
    <div class="tree-info" hidden></div>
  `
  host.appendChild(overlay)
  const canvas = overlay.querySelector<HTMLCanvasElement>('.tree-canvas')!
  const ctx = canvas.getContext('2d')!
  const title = overlay.querySelector<HTMLHeadingElement>('.tree-title')!
  const wallet = overlay.querySelector<HTMLDivElement>('.tree-wallet')!
  const info = overlay.querySelector<HTMLDivElement>('.tree-info')!
  overlay.querySelector('.tree-close')!.addEventListener('click', () => close())

  let treeId: TreeId = 'emergency'
  let cam = { x: 0, y: 0, zoom: 1 }
  let w = 0
  let h = 0
  let hover: TreeNodeDef | null = null
  let mouse = { x: 0, y: 0 }
  let time = 0
  const pops = new Map<string, number>() // node id -> seconds since bought

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.clientWidth
    h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  new ResizeObserver(resize).observe(canvas)

  const tree = () => TREES[treeId]

  function stateOf(node: TreeNodeDef): NodeState {
    const t = tree()
    if (!isRevealed(game.state, t, node)) return isSilhouette(game.state, t, node) ? 'silhouette' : 'hidden'
    if (isMaxed(game.state, t.id, node)) return 'maxed'
    return canAfford(game.state, t.id, node) ? 'affordable' : 'expensive'
  }

  const toScreen = (x: number, y: number) => ({ x: (x - cam.x) * cam.zoom + w / 2, y: (y - cam.y) * cam.zoom + h / 2 })
  const toTree = (x: number, y: number) => ({ x: (x - w / 2) / cam.zoom + cam.x, y: (y - h / 2) / cam.zoom + cam.y })

  // Frame everything that's visible, so the tree "starts small and grows large".
  function fit() {
    const shown = tree().nodes.filter((n) => stateOf(n) !== 'hidden')
    const xs = shown.map((n) => n.x)
    const ys = shown.map((n) => n.y)
    const pad = TREE_VIEW.fitPadding
    const minX = Math.min(...xs) - pad
    const maxX = Math.max(...xs) + pad
    const minY = Math.min(...ys) - pad
    const maxY = Math.max(...ys) + pad
    cam.x = (minX + maxX) / 2
    cam.y = (minY + maxY) / 2
    const zoom = Math.min(w / (maxX - minX), h / (maxY - minY))
    cam.zoom = Math.max(TREE_VIEW.minZoom, Math.min(1.4, zoom))
  }

  function nodeAt(sx: number, sy: number): TreeNodeDef | null {
    const p = toTree(sx, sy)
    const r = TREE_VIEW.nodeRadius + 4
    for (const n of tree().nodes) {
      const s = stateOf(n)
      if (s === 'hidden') continue
      if ((n.x - p.x) ** 2 + (n.y - p.y) ** 2 <= r * r) return n
    }
    return null
  }

  function buy(node: TreeNodeDef) {
    if (!game.buy(treeId, node.id)) {
      const r = canvas.getBoundingClientRect()
      const s = toScreen(node.x, node.y)
      fx.text(r.left + s.x, r.top + s.y - 36, stateOf(node) === 'maxed' ? 'Maxed!' : 'Not enough', '#ff8a8a', 16)
      return
    }
    pops.set(node.id, 0)
    const r = canvas.getBoundingClientRect()
    const s = toScreen(node.x, node.y)
    const color = BRANCH_STYLE[node.branch]?.color ?? '#fff'
    fx.sparks(r.left + s.x, r.top + s.y, 14, color, 240)
    fx.text(r.left + s.x, r.top + s.y - 40, `Lv ${levelOf(game.state, treeId, node.id)}`, color, 20)
    fx.shake(2)
  }

  // --- Input: drag to pan, scroll to zoom, click to buy ---

  let drag: { x: number; y: number; camX: number; camY: number; moved: boolean } | null = null
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId)
    drag = { x: e.offsetX, y: e.offsetY, camX: cam.x, camY: cam.y, moved: false }
  })
  canvas.addEventListener('pointermove', (e) => {
    mouse = { x: e.offsetX, y: e.offsetY }
    if (drag) {
      const dx = e.offsetX - drag.x
      const dy = e.offsetY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
      if (drag.moved) {
        cam.x = drag.camX - dx / cam.zoom
        cam.y = drag.camY - dy / cam.zoom
      }
    }
    hover = drag?.moved ? null : nodeAt(e.offsetX, e.offsetY)
    canvas.style.cursor = drag?.moved ? 'grabbing' : hover ? 'pointer' : 'grab'
  })
  canvas.addEventListener('pointerup', (e) => {
    if (drag && !drag.moved) {
      const n = nodeAt(e.offsetX, e.offsetY)
      if (n && stateOf(n) !== 'silhouette') buy(n)
    }
    drag = null
  })
  canvas.addEventListener('pointerleave', () => (hover = null))
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()
      const before = toTree(e.offsetX, e.offsetY)
      cam.zoom = Math.max(TREE_VIEW.minZoom, Math.min(TREE_VIEW.maxZoom, cam.zoom * Math.exp(-e.deltaY * 0.0015)))
      const after = toTree(e.offsetX, e.offsetY)
      cam.x += before.x - after.x
      cam.y += before.y - after.y
    },
    { passive: false },
  )
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close()
  })

  // --- Drawing ---

  function drawLinks() {
    const t = tree()
    for (const n of t.nodes) {
      for (const l of n.links) {
        const m = t.nodes.find((x) => x.id === l)
        if (!m) continue
        const sa = stateOf(n)
        const sb = stateOf(m)
        if (sa === 'hidden' || sb === 'hidden') continue
        const owned = levelOf(game.state, treeId, n.id) > 0 && levelOf(game.state, treeId, m.id) > 0
        const a = toScreen(n.x, n.y)
        const b = toScreen(m.x, m.y)
        ctx.strokeStyle = owned ? BRANCH_STYLE[n.branch]?.color ?? '#fff' : 'rgba(142,163,191,0.35)'
        ctx.lineWidth = (owned ? 5 : 3) * cam.zoom
        ctx.setLineDash(sa === 'silhouette' || sb === 'silhouette' ? [6 * cam.zoom, 6 * cam.zoom] : [])
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    }
    ctx.setLineDash([])
  }

  function drawNode(n: TreeNodeDef, dt: number) {
    const s = stateOf(n)
    if (s === 'hidden') return
    const p = toScreen(n.x, n.y)
    const style = BRANCH_STYLE[n.branch] ?? BRANCH_STYLE.special
    let r = TREE_VIEW.nodeRadius * cam.zoom
    const pop = pops.get(n.id)
    if (pop !== undefined) {
      const k = pop / TREE_VIEW.popTime
      r *= 1 + Math.sin(k * Math.PI) * 0.3
      if (k >= 1) pops.delete(n.id)
      else pops.set(n.id, pop + dt)
    }
    const lv = levelOf(game.state, treeId, n.id)

    if (s === 'silhouette') {
      ctx.fillStyle = '#1a2a42'
      ctx.strokeStyle = 'rgba(142,163,191,0.5)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = 'rgba(142,163,191,0.7)'
      ctx.font = `800 ${Math.round(r * 0.9)}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', p.x, p.y + 1)
      return
    }

    // Affordable nodes glow and pulse.
    if (s === 'affordable') {
      const pulse = 0.5 + 0.5 * Math.sin(time * 5)
      ctx.fillStyle = style.color
      ctx.globalAlpha = 0.18 + pulse * 0.22
      ctx.beginPath()
      ctx.arc(p.x, p.y, r * (1.35 + pulse * 0.15), 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // Body: filled in the branch colour once owned, dark while not.
    ctx.fillStyle = lv > 0 ? style.color : '#16263d'
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = s === 'expensive' ? 'rgba(142,163,191,0.6)' : style.color
    ctx.stroke()
    // Level progress ring.
    if (n.maxLevel > 1 && lv > 0) {
      ctx.strokeStyle = s === 'maxed' ? '#f5d33d' : '#f4f7fb'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 5, -Math.PI / 2, -Math.PI / 2 + (lv / n.maxLevel) * Math.PI * 2)
      ctx.stroke()
    }
    if (s === 'maxed') {
      ctx.strokeStyle = '#f5d33d'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = lv > 0 ? '#0f1b2d' : s === 'expensive' ? 'rgba(142,163,191,0.8)' : style.color
    ctx.font = `700 ${Math.round(r * 0.85)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(n.root ? '✚' : style.icon, p.x, p.y + 1)
    // Name under the node when zoomed in enough to read it.
    if (cam.zoom > 0.45) {
      ctx.font = `600 ${Math.max(10, Math.round(11 * Math.min(1.3, cam.zoom)))}px system-ui, sans-serif`
      ctx.fillStyle = s === 'expensive' ? '#8ea3bf' : '#f4f7fb'
      ctx.fillText(n.name, p.x, p.y + r + 14 * Math.min(1.3, cam.zoom))
      if (n.maxLevel > 1) {
        ctx.fillStyle = '#8ea3bf'
        ctx.fillText(`${lv}/${n.maxLevel}`, p.x, p.y + r + 28 * Math.min(1.3, cam.zoom))
      }
    }
  }

  function updateInfo() {
    if (!hover) {
      info.hidden = true
      return
    }
    const n = hover
    const s = stateOf(n)
    info.hidden = false
    if (s === 'silhouette') {
      info.innerHTML = `<strong>???</strong><p>Buy a neighbouring upgrade to reveal this one.</p>`
    } else {
      const lv = levelOf(game.state, treeId, n.id)
      const style = BRANCH_STYLE[n.branch] ?? BRANCH_STYLE.special
      const costs = s === 'maxed' ? '<span class="maxed">Maxed</span>'
        : nodeCosts(n, lv).map((c) => {
          const ok = currencyAmount(game.state, c.currency) >= c.amount
          return `<span class="${ok ? 'ok' : 'short'}">${formatCurrency(c.currency, c.amount)}</span>`
        }).join(' + ')
      const level = n.maxLevel === 1 ? (lv ? 'Owned' : 'One-time') : `Level ${lv} / ${n.maxLevel}`
      info.innerHTML = `
        <strong>${n.name}</strong>
        <span class="info-branch" style="color:${style.color}">${style.label} · ${level}</span>
        <p>${n.desc}</p>
        <div class="info-cost">${costs}</div>
        ${n.towards ? `<p class="info-note">Synergy with ${DEPTS[n.towards].name}</p>` : ''}
      `
    }
    const x = Math.min(mouse.x + 18, w - info.offsetWidth - 8)
    const y = Math.min(mouse.y + 18, h - info.offsetHeight + 40)
    info.style.left = `${x}px`
    info.style.top = `${y}px`
  }

  function draw(dt: number) {
    if (overlay.hidden) return
    time += dt
    ctx.clearRect(0, 0, w, h)
    drawLinks()
    for (const n of tree().nodes) drawNode(n, dt)
    const t = tree()
    const shown = new Set(t.nodes.flatMap((n) => n.costs.map((c) => c.currency)))
    if (t.id !== 'publications') shown.add(t.id)
    wallet.textContent = [...shown].map((c) => formatCurrency(c, currencyAmount(game.state, c))).join('  ·  ')
    updateInfo()
  }

  function open(id: TreeId) {
    treeId = id
    title.textContent = `${treeTitle(id)} skill tree`
    overlay.hidden = false
    resize()
    fit()
  }

  function close() {
    overlay.hidden = true
    hover = null
  }

  return {
    open,
    close,
    toggle(id: TreeId) {
      if (overlay.hidden) open(id)
      else close()
    },
    isOpen: () => !overlay.hidden,
    draw,
  }
}
