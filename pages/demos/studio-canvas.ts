import { layoutWithLines, prepareWithSegments } from '../../src/layout.ts'
import { shadowStyleForCanvas } from './studio-shadow.ts'
import { pretexFontString, type StudioDesignV1 } from './text-studio.schema.ts'

export function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2)
  if (rad <= 0) {
    c.rect(x, y, w, h)
    return
  }
  c.moveTo(x + rad, y)
  c.arcTo(x + w, y, x + w, y + h, rad)
  c.arcTo(x + w, y + h, x, y + h, rad)
  c.arcTo(x, y + h, x, y, rad)
  c.arcTo(x, y, x + w, y, rad)
  c.closePath()
}

/** Panel fill, optional shadow, and border — shared by simple and editorial previews. */
export function drawStudioFrame(
  ctx: CanvasRenderingContext2D,
  d: StudioDesignV1,
  frameW: number,
  frameH: number,
): void {
  const sh = shadowStyleForCanvas(d.frame.shadow)
  if (sh.draw) {
    ctx.save()
    ctx.shadowColor = sh.shadowColor
    ctx.shadowBlur = sh.shadowBlur
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = sh.shadowOffsetY
    ctx.fillStyle = d.theme.panel
    ctx.beginPath()
    roundRect(ctx, 0, 0, frameW, frameH, d.frame.borderRadius)
    ctx.fill()
    ctx.restore()
  } else {
    ctx.fillStyle = d.theme.panel
    ctx.beginPath()
    roundRect(ctx, 0, 0, frameW, frameH, d.frame.borderRadius)
    ctx.fill()
  }

  ctx.strokeStyle = d.frame.borderColor
  ctx.lineWidth = d.frame.borderWidth
  if (d.frame.borderWidth > 0) {
    ctx.beginPath()
    roundRect(
      ctx,
      d.frame.borderWidth / 2,
      d.frame.borderWidth / 2,
      frameW - d.frame.borderWidth,
      frameH - d.frame.borderWidth,
      Math.max(0, d.frame.borderRadius - d.frame.borderWidth / 2),
    )
    ctx.stroke()
  }
}

/** Hi-DPI backing store + CSS size; returns scaled 2d context cleared to transparent. */
export function getStudioCanvas2d(
  canvas: HTMLCanvasElement,
  frameW: number,
  frameH: number,
): CanvasRenderingContext2D | null {
  const dpr = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)
  canvas.width = Math.floor(frameW * dpr)
  canvas.height = Math.floor(frameH * dpr)
  canvas.style.width = `${frameW}px`
  canvas.style.height = `${frameH}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, frameW, frameH)
  return ctx
}

/** Draw the framed text block for a studio design (Pretext layout + canvas). */
export function renderStudioDesign(canvas: HTMLCanvasElement, d: StudioDesignV1): void {
  const pad = d.frame.padding
  const mat = d.frame.matInset
  const innerPad = pad + mat
  const textMaxW = Math.max(40, d.frame.maxWidth - 2 * innerPad)
  const font = pretexFontString(d.typography)
  let prepared: ReturnType<typeof prepareWithSegments>
  try {
    prepared = prepareWithSegments(d.sampleText, font)
  } catch {
    return
  }
  const { lines, lineCount } = layoutWithLines(prepared, textMaxW, d.typography.lineHeight)
  const lh = d.typography.lineHeight
  const textHeight = Math.max(lh, lineCount * lh)
  const frameW = d.frame.maxWidth
  const frameH = Math.ceil(textHeight + 2 * innerPad)

  const ctx = getStudioCanvas2d(canvas, frameW, frameH)
  if (!ctx) return

  drawStudioFrame(ctx, d, frameW, frameH)

  ctx.fillStyle = d.theme.ink
  ctx.font = `${d.typography.fontSize}px ${d.typography.fontFamily}`
  ctx.textBaseline = 'top'
  let y = innerPad
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!.text, innerPad, y)
    y += lh
  }
}
