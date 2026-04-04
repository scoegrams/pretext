import { layout, layoutWithLines, prepare, prepareWithSegments, type PreparedText } from '../../src/layout.ts'
import { drawStudioFrame, getStudioCanvas2d, roundRect } from './studio-canvas.ts'
import {
  pretexFontString,
  type StudioDesignV1,
  type StudioMasonryCardImageModeV1,
  type StudioMasonryCardSplitV1,
} from './text-studio.schema.ts'

function splitSampleTextIntoSentences(text: string): string[] {
  const t = text.trim()
  if (!t) return [' ']
  try {
    const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter
    if (typeof Seg === 'function') {
      const seg = new Seg(undefined, { granularity: 'sentence' })
      const out: string[] = []
      for (const { segment } of seg.segment(text)) {
        const s = segment.trim()
        if (s.length > 0) out.push(s)
      }
      if (out.length > 0) return out
    }
  } catch {
    /* fall through */
  }
  const rough = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 0)
  return rough.length > 0 ? rough : [t]
}

/**
 * Splits sample copy into one masonry card per unit (paragraph, line, or sentence).
 * Order is always reading order through `sampleText`; use rows × columns to tile the sequence.
 */
export function splitSampleIntoMasonryCards(
  sampleText: string,
  split: StudioMasonryCardSplitV1 = 'paragraphs',
): string[] {
  const fallback = sampleText.trim() || ' '
  if (split === 'lines') {
    const parts = sampleText.split(/\n/).map(s => s.trim()).filter(s => s.length > 0)
    return parts.length > 0 ? parts : [fallback]
  }
  if (split === 'sentences') {
    return splitSampleTextIntoSentences(sampleText)
  }
  const parts = sampleText.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0)
  return parts.length > 0 ? parts : [fallback]
}

/** When `maxChars` > 0, truncate to UTF-16 length and append an ellipsis. */
export function truncateMasonryBlockText(text: string, maxChars: number): string {
  if (maxChars <= 0 || text.length <= maxChars) return text
  return text.slice(0, maxChars) + '…'
}

/** One trimmed URL string per line; line *i* is paired with masonry card *i*. */
export function splitCardImageUrlLines(block: string): string[] {
  return block.split(/\n/).map(s => s.trim())
}

/** Unique non-empty URLs (for prefetch). Order preserved. */
export function listUniqueMasonryImageUrls(block: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of block.split(/\n/)) {
    const u = line.trim()
    if (!u || seen.has(u)) continue
    seen.add(u)
    out.push(u)
  }
  return out
}

const masonryImageCache = new Map<string, HTMLImageElement>()
const masonryImageFailed = new Set<string>()
const masonryImageCallbacks = new Map<string, (() => void)[]>()

function flushMasonryImageCallbacks(u: string): void {
  const list = masonryImageCallbacks.get(u)
  if (!list) return
  masonryImageCallbacks.delete(u)
  for (const cb of list) cb()
}

/** Cross-origin images need CORS headers to decode on canvas; same-origin and data URLs always work. */
export function requestMasonryImage(url: string, onReady: () => void): HTMLImageElement | null {
  const u = url.trim()
  if (!u) return null
  if (masonryImageFailed.has(u)) {
    queueMicrotask(onReady)
    return null
  }
  const cached = masonryImageCache.get(u)
  if (cached?.complete && cached.naturalWidth > 0) {
    queueMicrotask(onReady)
    return cached
  }

  const list = masonryImageCallbacks.get(u) ?? []
  list.push(onReady)
  masonryImageCallbacks.set(u, list)

  if (!masonryImageCache.has(u)) {
    const im = new Image()
    im.crossOrigin = 'anonymous'
    im.onload = () => {
      if (im.naturalWidth > 0) masonryImageCache.set(u, im)
      else masonryImageFailed.add(u)
      flushMasonryImageCallbacks(u)
    }
    im.onerror = () => {
      masonryImageFailed.add(u)
      flushMasonryImageCallbacks(u)
    }
    im.src = u
    masonryImageCache.set(u, im)
  }

  const cur = masonryImageCache.get(u)
  return cur?.complete && cur.naturalWidth > 0 ? cur : null
}

export function invalidateMasonryImageCacheEntry(url: string): void {
  const u = url.trim()
  masonryImageCache.delete(u)
  masonryImageFailed.delete(u)
  masonryImageCallbacks.delete(u)
}

export function getCachedMasonryImage(url: string): HTMLImageElement | null {
  const im = masonryImageCache.get(url.trim())
  return im?.complete && im.naturalWidth > 0 ? im : null
}

export function whenMasonryImageReady(url: string): Promise<HTMLImageElement | null> {
  const u = url.trim()
  if (!u) return Promise.resolve(null)
  const hit = getCachedMasonryImage(u)
  if (hit) return Promise.resolve(hit)
  if (masonryImageFailed.has(u)) return Promise.resolve(null)
  return new Promise(resolve => {
    requestMasonryImage(u, () => {
      resolve(getCachedMasonryImage(u))
    })
  })
}

export async function whenAllMasonryImagesReady(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.map(u => u.trim()).filter(u => u.length > 0))]
  await Promise.all(unique.map(u => whenMasonryImageReady(u)))
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export type CardDrawSpec = {
  outerH: number
  innerW: number
  image: null | { x: number; y: number; w: number; h: number }
  textX: number
  textY: number
  textW: number
}

/** When the bitmap is not decoded yet, assume ~4:3 so masonry height does not jump after load. */
const CARD_IMAGE_PLACEHOLDER_AR = 3 / 4
const CARD_IMAGE_TEXT_GAP = 8
const CARD_IMAGE_SIDE_MIN_H = 56
const CARD_IMAGE_SIDE_MAX_H = 240

function buildCardDrawSpec(
  prepared: PreparedText,
  colWidth: number,
  cardPadding: number,
  lh: number,
  mode: StudioMasonryCardImageModeV1,
  sizePx: number,
  url: string,
): CardDrawSpec {
  const innerW = Math.max(40, colWidth - cardPadding * 2)
  const u = url.trim()

  if (mode === 'none' || !u) {
    const textH = layout(prepared, innerW, lh).height
    return {
      outerH: textH + cardPadding * 2,
      innerW,
      image: null,
      textX: 0,
      textY: 0,
      textW: innerW,
    }
  }

  const imgEl = getCachedMasonryImage(u)
  const nw = imgEl?.naturalWidth ?? 0
  const nh = imgEl?.naturalHeight ?? 0
  const ar = nw > 0 && nh > 0 ? nh / nw : CARD_IMAGE_PLACEHOLDER_AR
  const g = CARD_IMAGE_TEXT_GAP

  if (mode === 'top') {
    const bandH = clamp(sizePx, 56, 280)
    const iw = innerW
    const ih = bandH
    const textW = innerW
    const textH = layout(prepared, textW, lh).height
    const innerH = ih + g + textH
    return {
      outerH: innerH + cardPadding * 2,
      innerW,
      image: { x: 0, y: 0, w: iw, h: ih },
      textX: 0,
      textY: ih + g,
      textW,
    }
  }

  if (mode === 'left') {
    const thumbW = clamp(sizePx, 56, Math.floor(innerW * 0.48))
    const ih = clamp(thumbW * ar, CARD_IMAGE_SIDE_MIN_H, CARD_IMAGE_SIDE_MAX_H)
    const textW = Math.max(40, innerW - thumbW - g)
    const textH = layout(prepared, textW, lh).height
    const innerH = Math.max(ih, textH)
    return {
      outerH: innerH + cardPadding * 2,
      innerW,
      image: { x: 0, y: 0, w: thumbW, h: ih },
      textX: thumbW + g,
      textY: 0,
      textW,
    }
  }

  const thumbW = clamp(sizePx, 56, Math.floor(innerW * 0.48))
  const ih = clamp(thumbW * ar, CARD_IMAGE_SIDE_MIN_H, CARD_IMAGE_SIDE_MAX_H)
  const textW = Math.max(40, innerW - thumbW - g)
  const textH = layout(prepared, textW, lh).height
  const innerH = Math.max(ih, textH)
  return {
    outerH: innerH + cardPadding * 2,
    innerW,
    image: { x: innerW - thumbW, y: 0, w: thumbW, h: ih },
    textX: 0,
    textY: 0,
    textW,
  }
}

type PositionedCard = {
  cardIndex: number
  x: number
  y: number
  spec: CardDrawSpec
}

type ColumnGeometry = {
  colCount: number
  colWidth: number
  contentWidth: number
  offsetLeft: number
}

type LayoutState = ColumnGeometry & {
  contentHeight: number
  positionedCards: PositionedCard[]
}

function computeMasonryColumnGeometry(
  viewportWidth: number,
  gap: number,
  maxColWidth: number,
  singleColumnBreakpoint: number,
  minWideColumns: number,
  maxWideColumns: number,
): ColumnGeometry {
  let colCount: number
  let colWidth: number
  if (viewportWidth <= singleColumnBreakpoint && minWideColumns <= 1) {
    colCount = 1
    colWidth = Math.min(maxColWidth, viewportWidth - gap * 2)
  } else {
    const heuristicMinCol = 100 + viewportWidth * 0.1
    const computed = Math.max(2, Math.floor((viewportWidth + gap) / (heuristicMinCol + gap)))
    let col = Math.min(maxWideColumns, Math.max(minWideColumns, computed))
    const minReadable = 40
    colWidth = Math.min(maxColWidth, (viewportWidth - (col + 1) * gap) / col)
    while (col > minWideColumns && colWidth < minReadable) {
      col--
      colWidth = Math.min(maxColWidth, (viewportWidth - (col + 1) * gap) / col)
    }
    colCount = col
  }
  const contentWidth = colCount * colWidth + (colCount - 1) * gap
  const offsetLeft = Math.max(0, (viewportWidth - contentWidth) / 2)
  return { colCount, colWidth, contentWidth, offsetLeft }
}

function packMasonryCards(
  geom: ColumnGeometry,
  gap: number,
  cardSpecs: CardDrawSpec[],
): { positionedCards: PositionedCard[]; contentHeight: number } {
  const { colCount, colWidth, offsetLeft } = geom
  const colHeights = new Float64Array(colCount)
  for (let c = 0; c < colCount; c++) colHeights[c] = gap

  const positionedCards: PositionedCard[] = []
  for (let i = 0; i < cardSpecs.length; i++) {
    const spec = cardSpecs[i]!
    const totalH = spec.outerH

    let bestCol = 0
    let bestBottom = Infinity
    let bestY = 0
    for (let c = 0; c < colCount; c++) {
      const y0 = colHeights[c]!
      const bottom = y0 + totalH + gap
      if (bottom < bestBottom) {
        bestBottom = bottom
        bestCol = c
        bestY = y0
      }
    }

    const x = offsetLeft + bestCol * (colWidth + gap)
    positionedCards.push({
      cardIndex: i,
      x,
      y: bestY,
      spec,
    })
    colHeights[bestCol] = bestY + totalH + gap
  }

  let contentHeight = 0
  for (let c = 0; c < colCount; c++) {
    if (colHeights[c]! > contentHeight) contentHeight = colHeights[c]!
  }

  return { positionedCards, contentHeight }
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  cornerRadius: number,
): void {
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (nw <= 0 || nh <= 0) return
  const scale = Math.max(dw / nw, dh / nh)
  const sw = dw / scale
  const sh = dh / scale
  const sx = (nw - sw) / 2
  const sy = (nh - sh) / 2
  ctx.save()
  ctx.beginPath()
  roundRect(ctx, dx, dy, dw, dh, cornerRadius)
  ctx.clip()
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
  ctx.restore()
}

function buildPreparedCards(d: StudioDesignV1, font: string): { cardsText: string[]; prepared: PreparedText[] } | null {
  const m = d.masonry
  const rawCards = splitSampleIntoMasonryCards(d.sampleText, m.cardSplit)
  const baseCards = rawCards.map(t => truncateMasonryBlockText(t, m.maxCharsPerBlock))

  let tileTarget = 0
  if (m.rows > 1) {
    tileTarget = m.rows * m.minWideColumns
  } else if (m.tileCount > 0) {
    tileTarget = m.tileCount
  }

  let cardsText: string[]
  if (tileTarget > 0 && baseCards.length > 0) {
    const target = Math.min(200, tileTarget)
    cardsText = []
    for (let i = 0; i < target; i++) cardsText.push(baseCards[i % baseCards.length]!)
  } else {
    cardsText = baseCards
  }

  const prepared: PreparedText[] = []
  for (let i = 0; i < cardsText.length; i++) {
    try {
      prepared.push(prepare(cardsText[i]!, font))
    } catch {
      return null
    }
  }
  return { cardsText, prepared }
}

/** Masonry card grid with optional per-card product images. */
export function renderMasonryStudioDesign(canvas: HTMLCanvasElement, d: StudioDesignV1): void {
  const m = d.masonry
  const pad = d.frame.padding
  const mat = d.frame.matInset
  const innerPad = pad + mat
  const frameW = d.frame.maxWidth
  const innerW = Math.max(80, frameW - 2 * innerPad)

  const font = pretexFontString(d.typography)
  const lh = d.typography.lineHeight
  const built = buildPreparedCards(d, font)
  if (!built || built.prepared.length === 0) return

  const urlLines = splitCardImageUrlLines(m.cardImageUrls)

  const geom = computeMasonryColumnGeometry(
    innerW,
    m.gap,
    m.maxColWidth,
    m.singleColumnBreakpoint,
    m.minWideColumns,
    m.maxWideColumns,
  )

  const specs: CardDrawSpec[] = []
  for (let i = 0; i < built.prepared.length; i++) {
    const cardUrl = urlLines[i] ?? ''
    specs.push(
      buildCardDrawSpec(
        built.prepared[i]!,
        geom.colWidth,
        m.cardPadding,
        lh,
        m.cardImageMode,
        m.cardImageSizePx,
        cardUrl,
      ),
    )
  }

  const packed = packMasonryCards(geom, m.gap, specs)
  const layoutState: LayoutState = {
    ...geom,
    contentHeight: packed.contentHeight,
    positionedCards: packed.positionedCards,
  }

  const frameH = Math.ceil(layoutState.contentHeight + 2 * innerPad)
  const ctx = getStudioCanvas2d(canvas, frameW, frameH)
  if (!ctx) return

  drawStudioFrame(ctx, d, frameW, frameH)

  const cardsText = built.cardsText
  const imgCorner = 6

  for (let i = 0; i < layoutState.positionedCards.length; i++) {
    const pc = layoutState.positionedCards[i]!
    const absX = innerPad + pc.x
    const absY = innerPad + pc.y
    const { spec } = pc
    const colW = layoutState.colWidth
    const outerH = spec.outerH

    ctx.fillStyle = d.theme.panel
    ctx.beginPath()
    roundRect(ctx, absX, absY, colW, outerH, 8)
    ctx.fill()

    ctx.strokeStyle = d.theme.rule
    ctx.lineWidth = 1
    ctx.beginPath()
    roundRect(ctx, absX + 0.5, absY + 0.5, colW - 1, outerH - 1, 8)
    ctx.stroke()

    const originX = absX + m.cardPadding
    const originY = absY + m.cardPadding
    const idx = pc.cardIndex
    const cardUrl = (urlLines[idx] ?? '').trim()

    if (spec.image && m.cardImageMode !== 'none' && cardUrl) {
      const { x: ix, y: iy, w: iw, h: ih } = spec.image
      const px = originX + ix
      const py = originY + iy
      const im = getCachedMasonryImage(cardUrl)
      if (im) {
        drawImageCover(ctx, im, px, py, iw, ih, imgCorner)
      } else {
        ctx.save()
        ctx.globalAlpha = 0.2
        ctx.fillStyle = d.theme.rule
        ctx.beginPath()
        roundRect(ctx, px, py, iw, ih, imgCorner)
        ctx.fill()
        ctx.restore()
      }
    }

    let innerPrepared: ReturnType<typeof prepareWithSegments>
    try {
      innerPrepared = prepareWithSegments(cardsText[idx]!, font)
    } catch {
      continue
    }
    const { lines } = layoutWithLines(innerPrepared, Math.max(40, spec.textW), lh)
    ctx.fillStyle = d.theme.ink
    ctx.font = `${d.typography.fontSize}px ${d.typography.fontFamily}`
    ctx.textBaseline = 'top'
    let ty = originY + spec.textY
    for (let li = 0; li < lines.length; li++) {
      ctx.fillText(lines[li]!.text, originX + spec.textX, ty)
      ty += lh
    }
  }
}
