/** Text Studio design document v1 — forward-compatible: ignore unknown keys when reading. */

export const STUDIO_DESIGN_VERSION = 1 as const

export type StudioThemeV1 = {
  page: string
  panel: string
  ink: string
  muted: string
  rule: string
  accent: string
  /** Optional full CSS background for the page (e.g. linear-gradient(...)) */
  pageGradient?: string
}

export type StudioFrameV1 = {
  maxWidth: number
  padding: number
  borderRadius: number
  borderWidth: number
  borderColor: string
  /** CSS box-shadow */
  shadow: string
  matInset: number
}

export type StudioTypographyV1 = {
  fontFamily: string
  fontSize: number
  lineHeight: number
}

/** Normalized 0–1 coordinates in the editorial content box (below mat inset). */
export type StudioEditorialObjectV1 =
  | {
      id: string
      kind: 'circle'
      x: number
      y: number
      /** Radius as a fraction of min(content width, content height). */
      r: number
      fill: string
    }
  | {
      id: string
      kind: 'rect'
      x: number
      y: number
      w: number
      h: number
      fill: string
    }

/** Headline block: body text wraps around its measured bounds (like a rectangular orb). */
export type StudioEditorialTitleV1 = {
  enabled: boolean
  text: string
  /** Top-left X as a fraction of content width. */
  x: number
  /** Top-left Y as a fraction of content height. */
  y: number
  /** Max line width as a fraction of content width (title wraps inside). */
  w: number
  fontFamily: string
  fontSize: number
  lineHeight: number
  color: string
  /** Optional filled box behind the title glyphs; when enabled, body wrap uses the same padded bounds as this box. */
  backgroundEnabled: boolean
  backgroundColor: string
  /** Padding from tight title bounds to the box edge (px). */
  backgroundPad: number
  /** Corner radius for the title background (px). */
  backgroundRadius: number
}

export type StudioEditorialV1 = {
  enabled: boolean
  columnCount: 1 | 2 | 3
  /** Horizontal gap between columns (px). */
  gutter: number
  /** Fixed content height for multi-column + wrap preview (px). */
  viewportHeight: number
  /** Per-column wash behind text (CSS color); only first `columnCount` entries are used. */
  columnFills: [string, string, string]
  objects: StudioEditorialObjectV1[]
  title: StudioEditorialTitleV1
}

/** Inclusive bounds for `minWideColumns` / `maxWideColumns` in masonry preview. */
export const MASONRY_WIDE_COLUMN_MIN = 2
export const MASONRY_WIDE_COLUMN_MAX = 24

/** Preset counts for the Text Studio grid (subset of the numeric range). */
export const MASONRY_WIDE_COLUMN_PRESETS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24] as const

/** How each card shows its optional product image (URL from `cardImageUrls`). */
export type StudioMasonryCardImageModeV1 = 'none' | 'top' | 'left' | 'right'

/** Masonry card grid: each blank-line-separated paragraph in `sampleText` is one card; heights from `prepare` + `layout` (no DOM). */
export type StudioMasonryV1 = {
  enabled: boolean
  /** Space between cards (px). */
  gap: number
  /** Padding inside each card (px). */
  cardPadding: number
  /** Max width of one column (px). */
  maxColWidth: number
  /** Below this preview inner width, use a single column. */
  singleColumnBreakpoint: number
  /** 0 = no limit. Otherwise max UTF-16 code units per card; longer text is truncated with an ellipsis. */
  maxCharsPerBlock: number
  /** When inner width is above `singleColumnBreakpoint`, use at least this many columns. */
  minWideColumns: number
  /** Cap column count on wide layouts. */
  maxWideColumns: number
  /** 0 = use cards as-is. Otherwise cycles/repeats cards until this many exist. Derived from `rows × minWideColumns` in the studio UI. */
  tileCount: number
  /** Number of rows shown in the masonry preview (studio UI). Multiplied by `minWideColumns` to get the effective tile count. 1 = no tiling. */
  rows: number
  /** One image URL per line; line *i* matches card *i* (after tiling). Empty lines = no image for that slot. */
  cardImageUrls: string
  /** Layout of the photo inside each card that has a URL. */
  cardImageMode: StudioMasonryCardImageModeV1
  /** `top`: max image height (px). `left` / `right`: thumbnail column width (px). */
  cardImageSizePx: number
}

export type StudioDesignV1 = {
  studioDesignVersion: typeof STUDIO_DESIGN_VERSION
  name: string
  slug: string
  theme: StudioThemeV1
  frame: StudioFrameV1
  typography: StudioTypographyV1
  sampleText: string
  editorial: StudioEditorialV1
  masonry: StudioMasonryV1
}

export function defaultStudioDesign(overrides?: Partial<StudioDesignV1>): StudioDesignV1 {
  const base: StudioDesignV1 = {
    studioDesignVersion: STUDIO_DESIGN_VERSION,
    name: 'Untitled',
    slug: 'untitled',
    theme: {
      page: '#f5f1ea',
      panel: '#fffdf8',
      ink: '#201b18',
      muted: '#6d645d',
      rule: '#d8cec3',
      accent: '#955f3b',
      pageGradient: 'linear-gradient(180deg, #fbf7f0 0%, #f5f1ea 100%)',
    },
    frame: {
      maxWidth: 420,
      padding: 28,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#d8cec3',
      shadow: '0 10px 22px rgba(54, 40, 23, 0.14)',
      matInset: 8,
    },
    typography: {
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 17,
      lineHeight: 26,
    },
    sampleText: [
      'Pretext, created by Cheng Lou, is a lightweight JavaScript/TypeScript library that focuses on one very specific but historically difficult problem in web development: measuring and laying out text without using the DOM. Traditionally, if you wanted to know how tall a block of text would be or how it would wrap, you had to render it in the DOM and read values like offsetHeight. This triggers layout reflow, which is one of the most expensive operations in the browser and can significantly slow down dynamic interfaces.',
      'Pretext eliminates that bottleneck entirely by using the browser’s font engine through Canvas instead of the DOM. It measures text once, caches the results, and then performs all layout calculations using pure arithmetic. This means you can determine line breaks, heights, and layout behavior without ever touching the DOM, resulting in performance that is hundreds of times faster than traditional methods.',
      'The library is built around a two-phase model: a prepare() step and a layout() step. The prepare() function does the heavier work upfront—breaking text into segments, measuring character widths, and caching that data. After that, layout() becomes extremely fast, allowing you to recompute text layout instantly for different widths or conditions. This separation is what makes Pretext ideal for highly dynamic interfaces where layout needs to update frequently.',
    ].join('\n\n'),
    editorial: defaultEditorial(),
    masonry: defaultMasonry(),
  }
  if (!overrides) return base
  return {
    ...base,
    ...overrides,
    theme: { ...base.theme, ...overrides.theme },
    frame: { ...base.frame, ...overrides.frame },
    typography: { ...base.typography, ...overrides.typography },
    editorial: (() => {
      if (!overrides.editorial) return base.editorial
      const ed = { ...defaultEditorial(), ...overrides.editorial }
      ed.columnFills = normalizeColumnFills(ed.columnFills as unknown as string[] | undefined)
      ed.objects = Array.isArray(ed.objects) ? ed.objects : []
      ed.title = mergeEditorialTitle(overrides.editorial?.title)
      return ed
    })(),
    masonry: overrides.masonry ? { ...defaultMasonry(), ...overrides.masonry } : base.masonry,
  }
}

function mergeEditorialTitle(partial: Partial<StudioEditorialTitleV1> | undefined): StudioEditorialTitleV1 {
  return { ...defaultEditorial().title, ...partial }
}

export function defaultMasonry(): StudioMasonryV1 {
  return {
    enabled: false,
    gap: 12,
    cardPadding: 16,
    maxColWidth: 400,
    singleColumnBreakpoint: 520,
    maxCharsPerBlock: 0,
    minWideColumns: 2,
    maxWideColumns: 6,
    tileCount: 0,
    rows: 1,
    cardImageUrls: '',
    cardImageMode: 'none',
    cardImageSizePx: 120,
  }
}

export function defaultEditorial(): StudioEditorialV1 {
  return {
    enabled: false,
    columnCount: 2,
    gutter: 24,
    viewportHeight: 400,
    columnFills: ['#f4efe6', '#ede8df', '#e6e1d8'],
    objects: [],
    title: {
      enabled: false,
      text: 'Layout without reflow',
      x: 0.08,
      y: 0.05,
      w: 0.84,
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
      fontSize: 28,
      lineHeight: 34,
      color: '#1a1512',
      backgroundEnabled: false,
      backgroundColor: '#f5ede2',
      backgroundPad: 10,
      backgroundRadius: 8,
    },
  }
}

function normalizeColumnFills(fills: string[] | undefined): [string, string, string] {
  const d = defaultEditorial().columnFills
  if (!fills || fills.length === 0) return d
  return [
    String(fills[0] ?? d[0]),
    String(fills[1] ?? d[1]),
    String(fills[2] ?? d[2]),
  ]
}

function parseEditorialObject(raw: unknown): StudioEditorialObjectV1 | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = typeof o['id'] === 'string' ? o['id'] : ''
  const kind = o['kind'] === 'rect' ? 'rect' : o['kind'] === 'circle' ? 'circle' : ''
  const fill = typeof o['fill'] === 'string' ? o['fill'] : '#955f3b'
  if (!id || (kind !== 'circle' && kind !== 'rect')) return null
  const x = Number(o['x'])
  const y = Number(o['y'])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (kind === 'circle') {
    const r = Number(o['r'])
    if (!Number.isFinite(r)) return null
    return { id, kind: 'circle', x, y, r, fill }
  }
  const w = Number(o['w'])
  const h = Number(o['h'])
  if (!Number.isFinite(w) || !Number.isFinite(h)) return null
  return { id, kind: 'rect', x, y, w, h, fill }
}

function clamp01parse(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback
  return Math.min(1, Math.max(0, n))
}

function parseEditorialTitle(raw: unknown): StudioEditorialTitleV1 {
  const d = defaultEditorial().title
  if (raw === null || typeof raw !== 'object') return d
  const t = raw as Record<string, unknown>
  const fs = Number(t['fontSize'])
  const lh = Number(t['lineHeight'])
  return {
    enabled: Boolean(t['enabled']),
    text: typeof t['text'] === 'string' ? t['text'] : d.text,
    x: clamp01parse(Number(t['x']), d.x),
    y: clamp01parse(Number(t['y']), d.y),
    w: clamp01parse(Number(t['w']), d.w),
    fontFamily: typeof t['fontFamily'] === 'string' ? t['fontFamily'] : d.fontFamily,
    fontSize: Number.isFinite(fs) && fs > 0 ? fs : d.fontSize,
    lineHeight: Number.isFinite(lh) && lh > 0 ? lh : d.lineHeight,
    color: typeof t['color'] === 'string' ? t['color'] : d.color,
    backgroundEnabled:
      'backgroundEnabled' in t ? Boolean(t['backgroundEnabled']) : d.backgroundEnabled,
    backgroundColor:
      typeof t['backgroundColor'] === 'string' ? t['backgroundColor'] : d.backgroundColor,
    backgroundPad:
      Number.isFinite(Number(t['backgroundPad'])) && 'backgroundPad' in t
        ? Math.min(24, Math.max(0, Number(t['backgroundPad'])))
        : d.backgroundPad,
    backgroundRadius:
      Number.isFinite(Number(t['backgroundRadius'])) && 'backgroundRadius' in t
        ? Math.min(24, Math.max(0, Number(t['backgroundRadius'])))
        : d.backgroundRadius,
  }
}

export function pretexFontString(t: StudioTypographyV1): string {
  return `${t.fontSize}px ${t.fontFamily}`
}

export function parseStudioDesign(raw: unknown): StudioDesignV1 | null {
  if (raw === null || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o['studioDesignVersion'] !== STUDIO_DESIGN_VERSION) return null
  if (typeof o['name'] !== 'string' || typeof o['slug'] !== 'string') return null
  if (typeof o['sampleText'] !== 'string') return null
  if (typeof o['theme'] !== 'object' || o['theme'] === null) return null
  if (typeof o['frame'] !== 'object' || o['frame'] === null) return null
  if (typeof o['typography'] !== 'object' || o['typography'] === null) return null
  const theme = o['theme'] as Record<string, unknown>
  const frame = o['frame'] as Record<string, unknown>
  const typo = o['typography'] as Record<string, unknown>
  const d = defaultStudioDesign({
    name: o['name'],
    slug: o['slug'],
    sampleText: o['sampleText'],
    theme: {
      page: String(theme['page'] ?? ''),
      panel: String(theme['panel'] ?? ''),
      ink: String(theme['ink'] ?? ''),
      muted: String(theme['muted'] ?? ''),
      rule: String(theme['rule'] ?? ''),
      accent: String(theme['accent'] ?? ''),
      ...(typeof theme['pageGradient'] === 'string' ? { pageGradient: theme['pageGradient'] } : {}),
    },
    frame: {
      maxWidth: Number(frame['maxWidth']),
      padding: Number(frame['padding']),
      borderRadius: Number(frame['borderRadius']),
      borderWidth: Number(frame['borderWidth']),
      borderColor: String(frame['borderColor'] ?? ''),
      shadow: String(frame['shadow'] ?? ''),
      matInset: Number(frame['matInset']),
    },
    typography: {
      fontFamily: String(typo['fontFamily'] ?? ''),
      fontSize: Number(typo['fontSize']),
      lineHeight: Number(typo['lineHeight']),
    },
  })
  if (!Number.isFinite(d.frame.maxWidth)) return null
  if (!Number.isFinite(d.typography.fontSize) || d.typography.fontSize <= 0) return null
  if (!Number.isFinite(d.typography.lineHeight) || d.typography.lineHeight <= 0) return null

  const edRaw = o['editorial']
  if (edRaw !== null && typeof edRaw === 'object') {
    const ed = edRaw as Record<string, unknown>
    const cc = Number(ed['columnCount'])
    const columnCount: 1 | 2 | 3 =
      cc === 1 ? 1 : cc === 3 ? 3 : 2
    const objList = Array.isArray(ed['objects']) ? ed['objects'] : []
    const objects: StudioEditorialObjectV1[] = []
    for (let i = 0; i < objList.length; i++) {
      const p = parseEditorialObject(objList[i])
      if (p) objects.push(p)
    }
    const fillsRaw = ed['columnFills']
    const columnFills = normalizeColumnFills(
      Array.isArray(fillsRaw) ? (fillsRaw as string[]) : undefined,
    )
    d.editorial = {
      enabled: Boolean(ed['enabled']),
      columnCount,
      gutter: Number.isFinite(Number(ed['gutter'])) ? Number(ed['gutter']) : d.editorial.gutter,
      viewportHeight: Number.isFinite(Number(ed['viewportHeight']))
        ? Number(ed['viewportHeight'])
        : d.editorial.viewportHeight,
      columnFills,
      objects,
      title: parseEditorialTitle(ed['title']),
    }
    if (!Number.isFinite(d.editorial.gutter) || d.editorial.gutter < 0) d.editorial.gutter = defaultEditorial().gutter
    if (!Number.isFinite(d.editorial.viewportHeight) || d.editorial.viewportHeight < 80) {
      d.editorial.viewportHeight = defaultEditorial().viewportHeight
    }
  }

  const masonryRaw = o['masonry']
  if (masonryRaw !== null && typeof masonryRaw === 'object') {
    const m = masonryRaw as Record<string, unknown>
    const dm = defaultMasonry()
    const maxCharsRaw = Number(m['maxCharsPerBlock'])
    const minWideRaw = Number(m['minWideColumns'])
    const maxWideRaw = Number(m['maxWideColumns'])
    let minWide = Number.isFinite(minWideRaw)
      ? Math.min(MASONRY_WIDE_COLUMN_MAX, Math.max(MASONRY_WIDE_COLUMN_MIN, Math.round(minWideRaw)))
      : dm.minWideColumns
    let maxWide = Number.isFinite(maxWideRaw)
      ? Math.min(MASONRY_WIDE_COLUMN_MAX, Math.max(MASONRY_WIDE_COLUMN_MIN, Math.round(maxWideRaw)))
      : dm.maxWideColumns
    if (minWide > maxWide) [minWide, maxWide] = [maxWide, minWide]
    d.masonry = {
      enabled: Boolean(m['enabled']),
      gap: Number.isFinite(Number(m['gap'])) ? Math.min(48, Math.max(4, Number(m['gap']))) : dm.gap,
      cardPadding: Number.isFinite(Number(m['cardPadding']))
        ? Math.min(48, Math.max(4, Number(m['cardPadding'])))
        : dm.cardPadding,
      maxColWidth: Number.isFinite(Number(m['maxColWidth']))
        ? Math.min(800, Math.max(120, Number(m['maxColWidth'])))
        : dm.maxColWidth,
      singleColumnBreakpoint: Number.isFinite(Number(m['singleColumnBreakpoint']))
        ? Math.min(1200, Math.max(320, Number(m['singleColumnBreakpoint'])))
        : dm.singleColumnBreakpoint,
      maxCharsPerBlock:
        Number.isFinite(maxCharsRaw) && maxCharsRaw >= 0 ? Math.min(20000, Math.floor(maxCharsRaw)) : dm.maxCharsPerBlock,
      minWideColumns: minWide,
      maxWideColumns: maxWide,
      tileCount: (() => {
        const raw = Number(m['tileCount'])
        return Number.isFinite(raw) && raw >= 0 ? Math.min(200, Math.floor(raw)) : dm.tileCount
      })(),
      rows: (() => {
        const raw = Number(m['rows'])
        return Number.isFinite(raw) && raw >= 1 ? Math.min(24, Math.max(1, Math.floor(raw))) : dm.rows
      })(),
      cardImageUrls: (() => {
        if (typeof m['cardImageUrls'] === 'string') return m['cardImageUrls']
        const legacyUrl = typeof m['imageUrl'] === 'string' ? m['imageUrl'].trim() : ''
        if (legacyUrl && m['imageEnabled'] === true) return legacyUrl
        return dm.cardImageUrls
      })(),
      cardImageMode: ((): StudioMasonryCardImageModeV1 => {
        const v = m['cardImageMode']
        if (v === 'top' || v === 'left' || v === 'right' || v === 'none') return v
        const legacyUrl = typeof m['imageUrl'] === 'string' ? m['imageUrl'].trim() : ''
        if (legacyUrl && m['imageEnabled'] === true) return 'top'
        return dm.cardImageMode
      })(),
      cardImageSizePx: (() => {
        const raw = Number(m['cardImageSizePx'])
        if (Number.isFinite(raw)) return Math.min(280, Math.max(48, Math.round(raw)))
        const frac = Number(m['imageWidthFrac'])
        if (Number.isFinite(frac))
          return Math.min(280, Math.max(48, Math.round(60 + frac * 400)))
        return dm.cardImageSizePx
      })(),
    }
  }

  return d
}
