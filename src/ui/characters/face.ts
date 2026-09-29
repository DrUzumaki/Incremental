// Faces: eyes, brows and mouth, drawn on a head centred at (0, 0) facing +x.

export type Eyes = 'open' | 'closed' | 'happy' | 'squint' | 'wide' | 'swirl' | 'sleepy'
export type Mouth = 'smile' | 'grin' | 'flat' | 'frown' | 'open' | 'small' | 'wavy' | 'yawn'
export type Brows = 'none' | 'angry' | 'worried' | 'raised'

export interface Face {
  eyes: Eyes
  mouth: Mouth
  brows: Brows
  blush?: boolean // pink cheeks
  flush?: number // 0..1 red face (anger, fever)
  tired?: boolean // bags under the eyes
  blink?: boolean // blinks now and then when eyes are open
}

const INK = '#1b1b1b'
const FX = 4 // face is shifted toward the facing side
const EYE_DX = 4.8
const EYE_Y = -1

export function drawFace(ctx: CanvasRenderingContext2D, face: Face, skin: string, time: number) {
  if (face.flush) {
    ctx.fillStyle = `rgba(229,72,77,${0.4 * face.flush})`
    ctx.beginPath()
    ctx.arc(0, 0, 15, 0, Math.PI * 2)
    ctx.fill()
  }
  if (face.blush) {
    ctx.fillStyle = 'rgba(242,120,150,0.55)'
    for (const dx of [-EYE_DX - 1.5, EYE_DX + 1.5]) {
      ctx.beginPath()
      ctx.ellipse(FX + dx, 5, 3, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  let eyes = face.eyes
  if (face.blink && eyes === 'open' && time % 3.7 < 0.13) eyes = 'closed'

  ctx.strokeStyle = INK
  ctx.fillStyle = INK
  ctx.lineCap = 'round'
  ctx.lineWidth = 1.5
  for (const side of [-1, 1]) {
    const x = FX + side * EYE_DX
    drawEye(ctx, eyes, x, EYE_Y, side, skin, time)
    if (face.tired) {
      ctx.strokeStyle = 'rgba(120,90,160,0.55)'
      ctx.lineWidth = 1.1
      ctx.beginPath()
      ctx.arc(x, EYE_Y + 1.5, 2.6, 0.2 * Math.PI, 0.8 * Math.PI)
      ctx.stroke()
      ctx.strokeStyle = INK
      ctx.lineWidth = 1.5
    }
    drawBrow(ctx, face.brows, x, side)
  }
  drawMouth(ctx, face.mouth, FX, 7)
}

function drawEye(
  ctx: CanvasRenderingContext2D, eyes: Eyes, x: number, y: number, side: number, skin: string, time: number,
) {
  ctx.beginPath()
  switch (eyes) {
    case 'open':
      ctx.arc(x, y, 1.9, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'closed':
      ctx.arc(x, y - 1, 2.2, 0.15 * Math.PI, 0.85 * Math.PI)
      ctx.stroke()
      return
    case 'happy':
      ctx.arc(x, y + 1, 2.2, 1.15 * Math.PI, 1.85 * Math.PI)
      ctx.stroke()
      return
    case 'squint':
      // ">" and "<" pointing inward.
      ctx.moveTo(x - 2 * side, y - 2)
      ctx.lineTo(x + 1.5 * side, y)
      ctx.lineTo(x - 2 * side, y + 2)
      ctx.stroke()
      return
    case 'wide':
      ctx.fillStyle = '#ffffff'
      ctx.arc(x, y, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.arc(x + 0.5, y, 1.5, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'swirl': {
      ctx.lineWidth = 1
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const r = a * 0.24
        const px = x + Math.cos(a + time * 6) * r
        const py = y + Math.sin(a + time * 6) * r
        if (a === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.lineWidth = 1.5
      return
    }
    case 'sleepy':
      // Half-closed: pupil with a heavy lid over the top.
      ctx.arc(x, y, 1.9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = skin
      ctx.fillRect(x - 2.5, y - 2.5, 5, 2.4)
      ctx.fillStyle = INK
      ctx.beginPath()
      ctx.moveTo(x - 2.4, y - 0.2)
      ctx.lineTo(x + 2.4, y - 0.2)
      ctx.stroke()
      return
  }
}

function drawBrow(ctx: CanvasRenderingContext2D, brows: Brows, x: number, side: number) {
  if (brows === 'none') return
  const y = EYE_Y - 5
  ctx.beginPath()
  if (brows === 'raised') {
    ctx.arc(x, y + 1, 2.6, 1.2 * Math.PI, 1.8 * Math.PI)
  } else {
    // Inner end (toward the nose) goes down for angry, up for worried.
    const inner = brows === 'angry' ? 1 : -1
    ctx.moveTo(x - 2.6 * side, y + inner)
    ctx.lineTo(x + 2.6 * side, y - inner)
  }
  ctx.stroke()
}

function drawMouth(ctx: CanvasRenderingContext2D, mouth: Mouth, x: number, y: number) {
  ctx.beginPath()
  switch (mouth) {
    case 'smile':
      ctx.arc(x, y - 2.5, 3.6, 0.2 * Math.PI, 0.8 * Math.PI)
      ctx.stroke()
      return
    case 'grin':
      ctx.moveTo(x - 4, y - 1)
      ctx.lineTo(x + 4, y - 1)
      ctx.arc(x, y - 1, 4, 0, Math.PI)
      ctx.fill()
      return
    case 'flat':
      ctx.moveTo(x - 2.5, y)
      ctx.lineTo(x + 2.5, y)
      ctx.stroke()
      return
    case 'frown':
      ctx.arc(x, y + 2.5, 3.4, 1.2 * Math.PI, 1.8 * Math.PI)
      ctx.stroke()
      return
    case 'open':
      ctx.ellipse(x, y, 2.4, 3, 0, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'small':
      ctx.arc(x, y, 1.4, 0, Math.PI * 2)
      ctx.fill()
      return
    case 'wavy':
      ctx.moveTo(x - 4, y)
      ctx.lineTo(x - 2, y - 1.2)
      ctx.lineTo(x, y)
      ctx.lineTo(x + 2, y - 1.2)
      ctx.lineTo(x + 4, y)
      ctx.stroke()
      return
    case 'yawn':
      ctx.ellipse(x, y + 1, 3.4, 4.6, 0, 0, Math.PI * 2)
      ctx.fill()
      return
  }
}
