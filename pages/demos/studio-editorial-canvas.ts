import {
  layoutNextLine,
  layoutWithLines,
  prepareWithSegments,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '../../src/layout.ts'
import { drawStudioFrame, getStudioCanvas2d, roundRect } from './studio-canvas.ts'
import {
  pretexFontString,
  type StudioDesignV1,
  type StudioEditorialObjectV1,
  type StudioEditorialTitleV1,
} from './text-studio.schema.ts'

const MIN_SLOT_WIDTH = 24
const CIRCLE_H_PAD = 8
const CIRCLE_V_PAD = 4

type Interval = { left: number; right: number }

type PositionedLine = {
  x: number
  y: number
  width: number
  text: string
}

type CircleObstacle = {
  cx: number
  cy: number
  r: number
  hPad: number
  vPad: number
}

type RectObstacle = {
  x: number
  y: number
  w: number
  h: number
}

function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base]
  for (let blockedIndex = 0; blockedIndex < blocked.length; blockedIndex++) {
    const interval = blocked[blockedIndex]!
    const next: Interval[] = []
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH)
}

function circleIntervalForBand(
  cx: number,
  cy: number,
  r: number,
  bandTop: number,
  bandBottom: number,
  hPad: number,
  vPad: number,
): Interval | null {
  const top = bandTop - vPad
  const bottom = bandBottom + vPad
  if (top >= cy + r || bottom <= cy - r) return null
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom
  if (minDy >= r) return null
  const maxDx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad }
}

function layoutColumn(
  prepared: PreparedTextWithSegments,
  startCursor: LayoutCursor,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  lineHeight: number,
  circleObstacles: CircleObstacle[],
  rectObstacles: RectObstacle[],
): { lines: PositionedLine[]; cursor: LayoutCursor } {
  let cursor: LayoutCursor = startCursor
  let lineTop = regionY
  const lines: PositionedLine[] = []
  let textExhausted = false

  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop
    const bandBottom = lineTop + lineHeight
    const blocked: Interval[] = []

    for (let obstacleIndex = 0; obstacleIndex < circleObstacles.length; obstacleIndex++) {
      const obstacle = circleObstacles[obstacleIndex]!
      const interval = circleIntervalForBand(
        obstacle.cx,
        obstacle.cy,
        obstacle.r,
        bandTop,
        bandBottom,
        obstacle.hPad,
        obstacle.vPad,
      )
      if (interval !== null) blocked.push(interval)
    }

    for (let rectIndex = 0; rectIndex < rectObstacles.length; rectIndex++) {
      const rect = rectObstacles[rectIndex]!
      if (bandBottom <= rect.y || bandTop >= rect.y + rect.h) continue
      blocked.push({ left: rect.x, right: rect.x + rect.w })
    }

    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked)
    if (slots.length === 0) {
      lineTop += lineHeight
      continue
    }

    const orderedSlots = [...slots].sort((a, b) => a.left - b.left)

    for (let slotIndex = 0; slotIndex < orderedSlots.length; slotIndex++) {
      const slot = orderedSlots[slotIndex]!
      const slotWidth = slot.right - slot.left
      const line = layoutNextLine(prepared, cursor, slotWidth)
      if (line === null) {
        textExhausted = true
        break
      }
      lines.push({
        x: Math.round(slot.left),
        y: Math.round(lineTop),
        text: line.text,
        width: line.width,
      })
      cursor = line.end
    }

    lineTop += lineHeight
  }

  return { lines, cursor }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

const TITLE_WRAP_PAD = 6

function titleObstacleAndLines(
  title: StudioEditorialTitleV1,
  contentX: number,
  contentY: number,
  contentW: number,
  contentH: number,
): {
  rect: RectObstacle
  lines: { text: string; x: number; y: number }[]
  color: string
  fontCss: string
  titleBackground: { x: number; y: number; w: number; h: number; radius: number; color: string } | null
} | null {
  if (!title.enabled || title.text.trim() === '') return null
  const titleFont = `${title.fontSize}px ${title.fontFamily}`
  let prepared: PreparedTextWithSegments
  try {
    prepared = prepareWithSegments(title.text.trim(), titleFont)
  } catch {
    return null
  }
  const maxLineW = Math.max(40, clamp01(title.w) * contentW)
  const { lines } = layoutWithLines(prepared, maxLineW, title.lineHeight)
  if (lines.length === 0) return null

  let measuredW = 0
  for (let i = 0; i < lines.length; i++) {
    measuredW = Math.max(measuredW, lines[i]!.width)
  }
  const boxW = Math.min(maxLineW, Math.max(measuredW, 8))
  const boxH = lines.length * title.lineHeight

  const titleX = contentX + clamp01(title.x) * contentW
  const titleY = contentY + clamp01(title.y) * contentH

  const bgPad = Math.max(0, title.backgroundPad)
  const bgR = Math.max(0, title.backgroundRadius)

  /** Body text wraps around this rect. Match the background box when enabled so padding clears the fill outline. */
  const rect: RectObstacle = title.backgroundEnabled
    ? {
        x: titleX - bgPad,
        y: titleY - bgPad,
        w: boxW + 2 * bgPad,
        h: boxH + 2 * bgPad,
      }
    : {
        x: titleX - TITLE_WRAP_PAD,
        y: titleY - TITLE_WRAP_PAD,
        w: boxW + 2 * TITLE_WRAP_PAD,
        h: boxH + 2 * TITLE_WRAP_PAD,
      }

  const positioned: { text: string; x: number; y: number }[] = []
  let y = titleY
  for (let i = 0; i < lines.length; i++) {
    positioned.push({ text: lines[i]!.text, x: titleX, y })
    y += title.lineHeight
  }

  const titleBackground =
    title.backgroundEnabled && lines.length > 0
      ? {
          x: titleX - bgPad,
          y: titleY - bgPad,
          w: boxW + 2 * bgPad,
          h: boxH + 2 * bgPad,
          radius: bgR,
          color: title.backgroundColor,
        }
      : null

  return { rect, lines: positioned, color: title.color, fontCss: titleFont, titleBackground }
}

function obstaclesFromObjects(
  objects: StudioEditorialObjectV1[],
  contentX: number,
  contentY: number,
  contentW: number,
  contentH: number,
): { circles: CircleObstacle[]; rects: RectObstacle[] } {
  const minDim = Math.min(contentW, contentH)
  const circles: CircleObstacle[] = []
  const rects: RectObstacle[] = []
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i]!
    if (o.kind === 'circle') {
      circles.push({
        cx: contentX + clamp01(o.x) * contentW,
        cy: contentY + clamp01(o.y) * contentH,
        r: Math.max(4, clamp01(o.r) * minDim),
        hPad: CIRCLE_H_PAD,
        vPad: CIRCLE_V_PAD,
      })
    } else {
      rects.push({
        x: contentX + clamp01(o.x) * contentW,
        y: contentY + clamp01(o.y) * contentH,
        w: Math.max(4, clamp01(o.w) * contentW),
        h: Math.max(4, clamp01(o.h) * contentH),
      })
    }
  }
  return { circles, rects }
}

/** Multi-column `layoutNextLine` preview with optional filled obstacles (editorial-engine style). */
export function renderEditorialStudioDesign(canvas: HTMLCanvasElement, d: StudioDesignV1): void {
  const ed = d.editorial
  const pad = d.frame.padding
  const mat = d.frame.matInset
  const innerPad = pad + mat
  const frameW = d.frame.maxWidth
  const contentW = Math.max(40, frameW - 2 * innerPad)
  const contentH = Math.max(80, ed.viewportHeight)
  const frameH = Math.ceil(contentH + 2 * innerPad)

  const ctx = getStudioCanvas2d(canvas, frameW, frameH)
  if (!ctx) return

  drawStudioFrame(ctx, d, frameW, frameH)

  const contentX = innerPad
  const contentY = innerPad
  const cols = ed.columnCount
  const gutter = Math.max(0, ed.gutter)
  const colW = cols <= 1 ? contentW : Math.max(40, (contentW - (cols - 1) * gutter) / cols)

  /** Column washes: outer inset = `padding` only; extend `mat` past each text column so mat insets text from the tint, not the card. */
  const washY = pad
  const washH = contentH + 2 * mat
  for (let c = 0; c < cols; c++) {
    const textColLeft = contentX + c * (colW + gutter)
    const rx = textColLeft - mat
    const rw = colW + 2 * mat
    ctx.fillStyle = ed.columnFills[c] ?? d.theme.panel
    ctx.fillRect(rx, washY, rw, washH)
  }

  const font = pretexFontString(d.typography)
  let prepared: PreparedTextWithSegments
  try {
    prepared = prepareWithSegments(d.sampleText, font)
  } catch {
    return
  }

  const { circles, rects } = obstaclesFromObjects(ed.objects, contentX, contentY, contentW, contentH)
  const titleBlock = titleObstacleAndLines(ed.title, contentX, contentY, contentW, contentH)
  if (titleBlock !== null) rects.push(titleBlock.rect)

  const lh = d.typography.lineHeight
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 }
  const allLines: PositionedLine[] = []

  for (let c = 0; c < cols; c++) {
    const regionX = contentX + c * (colW + gutter)
    const { lines, cursor: next } = layoutColumn(
      prepared,
      cursor,
      regionX,
      contentY,
      colW,
      contentH,
      lh,
      circles,
      rects,
    )
    allLines.push(...lines)
    cursor = next
  }

  ctx.fillStyle = d.theme.ink
  ctx.font = `${d.typography.fontSize}px ${d.typography.fontFamily}`
  ctx.textBaseline = 'top'
  for (let i = 0; i < allLines.length; i++) {
    const ln = allLines[i]!
    ctx.fillText(ln.text, ln.x, ln.y)
  }

  const minDim = Math.min(contentW, contentH)
  for (let i = 0; i < ed.objects.length; i++) {
    const o = ed.objects[i]!
    ctx.fillStyle = o.fill
    if (o.kind === 'circle') {
      const cx = contentX + clamp01(o.x) * contentW
      const cy = contentY + clamp01(o.y) * contentH
      const r = Math.max(4, clamp01(o.r) * minDim)
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const rx = contentX + clamp01(o.x) * contentW
      const ry = contentY + clamp01(o.y) * contentH
      const rw = Math.max(4, clamp01(o.w) * contentW)
      const rh = Math.max(4, clamp01(o.h) * contentH)
      ctx.fillRect(rx, ry, rw, rh)
    }
  }

  if (titleBlock !== null) {
    const tb = titleBlock.titleBackground
    if (tb !== null) {
      ctx.fillStyle = tb.color
      ctx.beginPath()
      roundRect(ctx, tb.x, tb.y, tb.w, tb.h, tb.radius)
      ctx.fill()
    }
    ctx.fillStyle = titleBlock.color
    ctx.font = titleBlock.fontCss
    ctx.textBaseline = 'top'
    for (let ti = 0; ti < titleBlock.lines.length; ti++) {
      const ln = titleBlock.lines[ti]!
      ctx.fillText(ln.text, ln.x, ln.y)
    }
  }
}
