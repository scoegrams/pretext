import { PAGE_BACKGROUND_CHOICES, pageBgPresetIdForCss } from './studio-background-presets.ts'
import { renderStudioDesign } from './studio-canvas.ts'
import { renderEditorialStudioDesign } from './studio-editorial-canvas.ts'
import {
  invalidateMasonryImageCacheEntry,
  listUniqueMasonryImageUrls,
  renderMasonryStudioDesign,
  requestMasonryImage,
} from './studio-masonry-canvas.ts'
import { STUDIO_FONT_PRESETS } from './studio-font-presets.ts'
import { formatStudioShadow, parseStudioShadow } from './studio-shadow.ts'
import {
  defaultStudioDesign,
  MASONRY_WIDE_COLUMN_MAX,
  MASONRY_WIDE_COLUMN_MIN,
  type StudioDesignV1,
  type StudioEditorialObjectV1,
} from './text-studio.schema.ts'

const FONT_OTHER = '__other__'

const DB_NAME = 'pretext-text-studio'
const DB_VERSION = 1
const STORE = 'designs'

const TOOL_ICON_MODE_KEY = 'pretext-text-studio-tool-icons'
const DRAWER_COLLAPSED_KEY = 'pretext-text-studio-drawer-collapsed'

const FRAME_W_MIN = 120
const FRAME_W_MAX = 960

let prevMasonryCardImageBlock = ''

function byId<E extends HTMLElement>(id: string): E {
  const n = document.getElementById(id)
  if (!n) throw new Error(`Missing #${id}`)
  return n as E
}

const els = {
  drawer: byId<HTMLElement>('drawer'),
  toolIconMode: byId<HTMLInputElement>('tool-icon-mode'),
  drawerCollapse: byId<HTMLButtonElement>('drawer-collapse'),
  drawerExpandTab: byId<HTMLButtonElement>('drawer-expand-tab'),
  drawerBackdrop: byId<HTMLElement>('drawer-backdrop'),
  drawerToggle: byId<HTMLButtonElement>('drawer-toggle'),
  designSelect: byId<HTMLSelectElement>('design-select'),
  btnNew: byId<HTMLButtonElement>('btn-new'),
  btnSave: byId<HTMLButtonElement>('btn-save'),
  designName: byId<HTMLInputElement>('design-name'),
  designSlug: byId<HTMLInputElement>('design-slug'),
  cPage: byId<HTMLInputElement>('c-page'),
  cPanel: byId<HTMLInputElement>('c-panel'),
  cInk: byId<HTMLInputElement>('c-ink'),
  cMuted: byId<HTMLInputElement>('c-muted'),
  cRule: byId<HTMLInputElement>('c-rule'),
  cAccent: byId<HTMLInputElement>('c-accent'),
  pageBgPreset: byId<HTMLSelectElement>('page-bg-preset'),
  pageGradientCustomWrap: byId<HTMLElement>('page-gradient-custom-wrap'),
  pageGradientCustom: byId<HTMLTextAreaElement>('page-gradient-custom'),
  fMaxw: byId<HTMLInputElement>('f-maxw'),
  fMaxwVal: byId<HTMLSpanElement>('f-maxw-val'),
  fPad: byId<HTMLInputElement>('f-pad'),
  fPadVal: byId<HTMLSpanElement>('f-pad-val'),
  fRadius: byId<HTMLInputElement>('f-radius'),
  fRadiusVal: byId<HTMLSpanElement>('f-radius-val'),
  fBorder: byId<HTMLInputElement>('f-border'),
  fBorderVal: byId<HTMLSpanElement>('f-border-val'),
  fBorderc: byId<HTMLInputElement>('f-borderc'),
  shadowEnabled: byId<HTMLInputElement>('shadow-enabled'),
  shadowControls: byId<HTMLElement>('shadow-controls'),
  shadowColor: byId<HTMLInputElement>('shadow-color'),
  shadowBlur: byId<HTMLInputElement>('shadow-blur'),
  shadowBlurVal: byId<HTMLSpanElement>('shadow-blur-val'),
  shadowOffset: byId<HTMLInputElement>('shadow-offset'),
  shadowOffsetVal: byId<HTMLSpanElement>('shadow-offset-val'),
  shadowOpacity: byId<HTMLInputElement>('shadow-opacity'),
  shadowOpacityVal: byId<HTMLSpanElement>('shadow-opacity-val'),
  fMat: byId<HTMLInputElement>('f-mat'),
  fMatVal: byId<HTMLSpanElement>('f-mat-val'),
  fInsetSum: byId<HTMLSpanElement>('f-inset-sum'),
  tyFontSelect: byId<HTMLSelectElement>('ty-font-select'),
  tyFontCustomWrap: byId<HTMLElement>('ty-font-custom-wrap'),
  tyFontCustom: byId<HTMLInputElement>('ty-font-custom'),
  tySize: byId<HTMLInputElement>('ty-size'),
  tySizeVal: byId<HTMLSpanElement>('ty-size-val'),
  tyLh: byId<HTMLInputElement>('ty-lh'),
  tyLhVal: byId<HTMLSpanElement>('ty-lh-val'),
  sampleText: byId<HTMLTextAreaElement>('sample-text'),
  editEnabled: byId<HTMLInputElement>('edit-enabled'),
  editControls: byId<HTMLFieldSetElement>('edit-controls'),
  editBoxW: byId<HTMLInputElement>('edit-box-w'),
  editBoxWVal: byId<HTMLSpanElement>('edit-box-w-val'),
  editCols: byId<HTMLSelectElement>('edit-cols'),
  editGutter: byId<HTMLInputElement>('edit-gutter'),
  editGutterVal: byId<HTMLSpanElement>('edit-gutter-val'),
  editVh: byId<HTMLInputElement>('edit-vh'),
  editVhVal: byId<HTMLSpanElement>('edit-vh-val'),
  editCol0: byId<HTMLInputElement>('edit-col0'),
  editCol1: byId<HTMLInputElement>('edit-col1'),
  editCol2: byId<HTMLInputElement>('edit-col2'),
  editObjects: byId<HTMLElement>('edit-objects'),
  btnEditCircle: byId<HTMLButtonElement>('btn-edit-circle'),
  btnEditRect: byId<HTMLButtonElement>('btn-edit-rect'),
  btnEditSample: byId<HTMLButtonElement>('btn-edit-sample'),
  titleEnabled: byId<HTMLInputElement>('title-enabled'),
  titleText: byId<HTMLInputElement>('title-text'),
  titleColor: byId<HTMLInputElement>('title-color'),
  titleFontSelect: byId<HTMLSelectElement>('title-font-select'),
  titleFontCustomWrap: byId<HTMLElement>('title-font-custom-wrap'),
  titleFontCustom: byId<HTMLInputElement>('title-font-custom'),
  titleSize: byId<HTMLInputElement>('title-size'),
  titleSizeVal: byId<HTMLSpanElement>('title-size-val'),
  titleLh: byId<HTMLInputElement>('title-lh'),
  titleLhVal: byId<HTMLSpanElement>('title-lh-val'),
  titleX: byId<HTMLInputElement>('title-x'),
  titleXVal: byId<HTMLSpanElement>('title-x-val'),
  titleY: byId<HTMLInputElement>('title-y'),
  titleYVal: byId<HTMLSpanElement>('title-y-val'),
  titleW: byId<HTMLInputElement>('title-w'),
  titleWVal: byId<HTMLSpanElement>('title-w-val'),
  titleBgWrap: byId<HTMLElement>('title-bg-wrap'),
  titleBgEnabled: byId<HTMLInputElement>('title-bg-enabled'),
  titleBgControls: byId<HTMLElement>('title-bg-controls'),
  titleBgColor: byId<HTMLInputElement>('title-bg-color'),
  titleBgPad: byId<HTMLInputElement>('title-bg-pad'),
  titleBgPadVal: byId<HTMLSpanElement>('title-bg-pad-val'),
  titleBgRadius: byId<HTMLInputElement>('title-bg-radius'),
  titleBgRadiusVal: byId<HTMLSpanElement>('title-bg-radius-val'),
  masonryEnabled: byId<HTMLInputElement>('masonry-enabled'),
  masonryControls: byId<HTMLFieldSetElement>('masonry-controls'),
  masonryGap: byId<HTMLInputElement>('masonry-gap'),
  masonryGapVal: byId<HTMLSpanElement>('masonry-gap-val'),
  masonryCardPad: byId<HTMLInputElement>('masonry-card-pad'),
  masonryCardPadVal: byId<HTMLSpanElement>('masonry-card-pad-val'),
  masonryMaxCol: byId<HTMLInputElement>('masonry-max-col'),
  masonryMaxColVal: byId<HTMLSpanElement>('masonry-max-col-val'),
  masonryMaxChars: byId<HTMLInputElement>('masonry-max-chars'),
  masonryMaxCharsVal: byId<HTMLSpanElement>('masonry-max-chars-val'),
  masonryColsGrid: byId<HTMLElement>('masonry-cols-grid'),
  masonryRowsGrid: byId<HTMLElement>('masonry-rows-grid'),
  masonryGridHint: byId<HTMLElement>('masonry-grid-hint'),
  masonryCardSplit: byId<HTMLSelectElement>('masonry-card-split'),
  btnMasonryFullWidth: byId<HTMLButtonElement>('btn-masonry-full-width'),
  masonryCardImageMode: byId<HTMLSelectElement>('masonry-card-image-mode'),
  masonryCardImageUrls: byId<HTMLTextAreaElement>('masonry-card-image-urls'),
  masonryCardImageSize: byId<HTMLInputElement>('masonry-card-image-size'),
  masonryCardImageSizeVal: byId<HTMLSpanElement>('masonry-card-image-size-val'),
  btnDownloadJson: byId<HTMLButtonElement>('btn-download-json'),
  btnCopyCli: byId<HTMLButtonElement>('btn-copy-cli'),
  canvas: byId<HTMLCanvasElement>('preview-canvas'),
  stageWrap: byId<HTMLElement>('stage-wrap'),
  stageHint: byId<HTMLElement>('stage-hint'),
}

let current: StudioDesignV1 = defaultStudioDesign()
let dbPromise: Promise<IDBDatabase> | null = null
let renderRaf: number | null = null

function fillFontPresetSelect(select: HTMLSelectElement): void {
  select.innerHTML = ''
  for (const p of STUDIO_FONT_PRESETS) {
    const o = document.createElement('option')
    o.value = p.value
    o.textContent = p.label
    select.appendChild(o)
  }
  {
    const o = document.createElement('option')
    o.value = FONT_OTHER
    o.textContent = 'Other (custom)…'
    select.appendChild(o)
  }
}

function initSelects(): void {
  const bg = els.pageBgPreset
  bg.innerHTML = ''
  for (const c of PAGE_BACKGROUND_CHOICES) {
    if (c.id === 'custom') continue
    const o = document.createElement('option')
    o.value = c.id
    o.textContent = c.label
    bg.appendChild(o)
  }
  {
    const o = document.createElement('option')
    o.value = 'custom'
    o.textContent = 'Custom…'
    bg.appendChild(o)
  }

  fillFontPresetSelect(els.tyFontSelect)
  fillFontPresetSelect(els.titleFontSelect)
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slug' })
    }
  })
  return dbPromise
}

type Row = { slug: string; design: StudioDesignV1 }

async function idbGetAll(): Promise<Row[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const rows = (req.result as Row[]).filter(r => r && typeof r.slug === 'string' && r.design)
      resolve(rows)
    }
  })
}

async function idbPut(row: Row): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.objectStore(STORE).put(row)
  })
}

async function idbGet(slug: string): Promise<StudioDesignV1 | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(slug)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const row = req.result as Row | undefined
      resolve(row?.design ?? null)
    }
  })
}

function clampInt(parsed: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(1, Math.max(0, n))
}

function newObjId(): string {
  const c = globalThis.crypto
  return c?.randomUUID?.() ?? `obj-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function axisFromRow(row: Element, axis: string): number {
  const el = row.querySelector<HTMLInputElement>(`input[data-axis="${axis}"]`)
  if (!el) return 0
  return clamp01(Number.parseInt(el.value, 10) / 100)
}

function readEditorialObjectsFromDom(): StudioEditorialObjectV1[] {
  const rows = [...els.editObjects.querySelectorAll('.edit-obj-row')]
  const out: StudioEditorialObjectV1[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!
    const id = row.getAttribute('data-obj-id') || newObjId()
    const kind = row.getAttribute('data-obj-kind') === 'rect' ? 'rect' : 'circle'
    const fillEl = row.querySelector<HTMLInputElement>('.edit-obj-fill')
    const fill = fillEl?.value && /^#/.test(fillEl.value) ? fillEl.value : '#955f3b'
    if (kind === 'circle') {
      out.push({
        id,
        kind: 'circle',
        x: axisFromRow(row, 'x'),
        y: axisFromRow(row, 'y'),
        r: axisFromRow(row, 'r'),
        fill,
      })
    } else {
      out.push({
        id,
        kind: 'rect',
        x: axisFromRow(row, 'x'),
        y: axisFromRow(row, 'y'),
        w: axisFromRow(row, 'w'),
        h: axisFromRow(row, 'h'),
        fill,
      })
    }
  }
  return out
}

function createEditObjRow(o: StudioEditorialObjectV1): HTMLElement {
  const row = document.createElement('div')
  row.className = 'edit-obj-row'
  row.dataset['objId'] = o.id
  row.dataset['objKind'] = o.kind

  const head = document.createElement('div')
  head.className = 'edit-obj-row-head'
  const kindLabel = document.createElement('span')
  kindLabel.textContent = o.kind === 'circle' ? 'Circle' : 'Rectangle'
  const fill = document.createElement('input')
  fill.type = 'color'
  fill.className = 'edit-obj-fill'
  fill.value = toColorInput(o.fill)
  const rm = document.createElement('button')
  rm.type = 'button'
  rm.className = 'btn btn-tiny edit-obj-remove'
  rm.textContent = 'Remove'
  rm.addEventListener('click', () => {
    current = readFormIntoDesign()
    current.editorial.objects = current.editorial.objects.filter(x => x.id !== o.id)
    rebuildEditObjectRows(current.editorial.objects)
    scheduleRender()
  })
  head.append(kindLabel, fill, rm)
  row.appendChild(head)

  const sliders = document.createElement('div')
  sliders.className = 'edit-obj-sliders'

  const addSlider = (axis: string, letter: string, frac: number): void => {
    const lab = document.createElement('label')
    const cap = document.createElement('span')
    cap.textContent = `${letter} ${Math.round(frac * 100)}%`
    const r = document.createElement('input')
    r.type = 'range'
    r.dataset['axis'] = axis
    r.min = '0'
    r.max = '100'
    r.step = '1'
    r.value = String(Math.round(frac * 100))
    r.addEventListener('input', () => {
      cap.textContent = `${letter} ${r.value}%`
      scheduleRender()
    })
    lab.append(cap, r)
    sliders.appendChild(lab)
  }

  if (o.kind === 'circle') {
    addSlider('x', 'X', o.x)
    addSlider('y', 'Y', o.y)
    addSlider('r', 'R', o.r)
  } else {
    addSlider('x', 'X', o.x)
    addSlider('y', 'Y', o.y)
    addSlider('w', 'W', o.w)
    addSlider('h', 'H', o.h)
  }

  row.appendChild(sliders)
  return row
}

function rebuildEditObjectRows(objects: StudioEditorialObjectV1[]): void {
  els.editObjects.innerHTML = ''
  for (let i = 0; i < objects.length; i++) {
    els.editObjects.appendChild(createEditObjRow(objects[i]!))
  }
}

function syncEditControlsDisabled(): void {
  const masOn = els.masonryEnabled.checked
  const edOn = els.editEnabled.checked
  els.editControls.disabled = !edOn || masOn
  els.masonryControls.disabled = !masOn || edOn
}

function sampleEditorialOrbs(): StudioEditorialObjectV1[] {
  return [
    {
      id: newObjId(),
      kind: 'circle',
      x: 0.22,
      y: 0.32,
      r: 0.11,
      fill: '#c4785a',
    },
    {
      id: newObjId(),
      kind: 'circle',
      x: 0.78,
      y: 0.48,
      r: 0.09,
      fill: '#6b9bac',
    },
    {
      id: newObjId(),
      kind: 'circle',
      x: 0.5,
      y: 0.72,
      r: 0.07,
      fill: '#8aa657',
    },
  ]
}

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'design'
}

function readPageBackgroundFromForm(): string | undefined {
  const preset = els.pageBgPreset.value
  if (preset === 'custom') {
    const t = els.pageGradientCustom.value.trim()
    return t || undefined
  }
  const c = PAGE_BACKGROUND_CHOICES.find(x => x.id === preset)
  if (!c || c.id === 'custom') return undefined
  return c.css ? c.css : undefined
}

function readFormIntoDesign(): StudioDesignV1 {
  const d: StudioDesignV1 = JSON.parse(JSON.stringify(current)) as StudioDesignV1
  d.name = els.designName.value.trim() || 'Untitled'
  d.slug = slugify(els.designSlug.value || d.name)
  d.theme.page = els.cPage.value
  d.theme.panel = els.cPanel.value
  d.theme.ink = els.cInk.value
  d.theme.muted = els.cMuted.value
  d.theme.rule = els.cRule.value
  d.theme.accent = els.cAccent.value
  const bg = readPageBackgroundFromForm()
  if (bg) d.theme.pageGradient = bg
  else delete d.theme.pageGradient

  d.frame.maxWidth = clampInt(Number.parseInt(els.fMaxw.value, 10), FRAME_W_MIN, FRAME_W_MAX, 420)
  d.frame.padding = clampInt(Number.parseInt(els.fPad.value, 10), 0, 80, 0)
  d.frame.borderRadius = clampInt(Number.parseInt(els.fRadius.value, 10), 0, 48, 0)
  d.frame.borderWidth = clampInt(Number.parseInt(els.fBorder.value, 10), 0, 8, 0)
  d.frame.borderColor = els.fBorderc.value
  d.frame.shadow = formatStudioShadow({
    enabled: els.shadowEnabled.checked,
    colorHex: els.shadowColor.value,
    blurPx: clampInt(Number.parseInt(els.shadowBlur.value, 10), 0, 60, 22),
    offsetYPx: clampInt(Number.parseInt(els.shadowOffset.value, 10), 0, 32, 10),
    opacity: clampInt(Number.parseInt(els.shadowOpacity.value, 10), 0, 100, 14) / 100,
  })
  d.frame.matInset = clampInt(Number.parseInt(els.fMat.value, 10), 0, 48, 0)

  d.typography.fontFamily =
    els.tyFontSelect.value === FONT_OTHER
      ? els.tyFontCustom.value.trim() || 'sans-serif'
      : els.tyFontSelect.value
  d.typography.fontSize = clampInt(Number.parseInt(els.tySize.value, 10), 10, 36, 16)
  d.typography.lineHeight = clampInt(Number.parseInt(els.tyLh.value, 10), 14, 52, 20)
  d.sampleText = els.sampleText.value

  const cc = Number.parseInt(els.editCols.value, 10)
  d.editorial.enabled = els.editEnabled.checked
  d.editorial.columnCount = cc === 1 ? 1 : cc === 3 ? 3 : 2
  d.editorial.gutter = clampInt(Number.parseInt(els.editGutter.value, 10), 0, 56, 24)
  d.editorial.viewportHeight = clampInt(Number.parseInt(els.editVh.value, 10), 160, 640, 400)
  d.editorial.columnFills = [
    els.editCol0.value,
    els.editCol1.value,
    els.editCol2.value,
  ] as [string, string, string]
  d.editorial.objects = readEditorialObjectsFromDom()

  const ti = d.editorial.title
  ti.enabled = els.titleEnabled.checked
  ti.text = els.titleText.value
  ti.color = els.titleColor.value
  ti.fontFamily =
    els.titleFontSelect.value === FONT_OTHER
      ? els.titleFontCustom.value.trim() || 'serif'
      : els.titleFontSelect.value
  ti.fontSize = clampInt(Number.parseInt(els.titleSize.value, 10), 14, 56, 28)
  ti.lineHeight = clampInt(Number.parseInt(els.titleLh.value, 10), 16, 64, 34)
  ti.x = clampInt(Number.parseInt(els.titleX.value, 10), 0, 100, 8) / 100
  ti.y = clampInt(Number.parseInt(els.titleY.value, 10), 0, 100, 5) / 100
  ti.w = clampInt(Number.parseInt(els.titleW.value, 10), 20, 100, 84) / 100
  ti.backgroundEnabled = els.titleBgEnabled.checked
  ti.backgroundColor = els.titleBgColor.value
  ti.backgroundPad = clampInt(Number.parseInt(els.titleBgPad.value, 10), 0, 24, 10)
  ti.backgroundRadius = clampInt(Number.parseInt(els.titleBgRadius.value, 10), 0, 24, 8)

  d.masonry.enabled = els.masonryEnabled.checked
  d.masonry.gap = clampInt(Number.parseInt(els.masonryGap.value, 10), 4, 48, 12)
  d.masonry.cardPadding = clampInt(Number.parseInt(els.masonryCardPad.value, 10), 4, 48, 16)
  d.masonry.maxColWidth = clampInt(Number.parseInt(els.masonryMaxCol.value, 10), 120, 800, 400)
  d.masonry.maxCharsPerBlock = clampInt(Number.parseInt(els.masonryMaxChars.value, 10), 0, 20000, 0)
  d.masonry.rows = readActiveMasonryRows()
  const cols = readActiveMasonryCols()
  d.masonry.minWideColumns = cols
  d.masonry.maxWideColumns = cols
  d.masonry.tileCount = d.masonry.rows > 1 ? d.masonry.rows * cols : 0
  d.masonry.singleColumnBreakpoint = 520
  const splitRaw = els.masonryCardSplit.value
  d.masonry.cardSplit =
    splitRaw === 'paragraphs' || splitRaw === 'lines' || splitRaw === 'sentences'
      ? splitRaw
      : 'paragraphs'
  const modeRaw = els.masonryCardImageMode.value
  d.masonry.cardImageMode =
    modeRaw === 'top' || modeRaw === 'left' || modeRaw === 'right' || modeRaw === 'none'
      ? modeRaw
      : 'none'
  d.masonry.cardImageUrls = els.masonryCardImageUrls.value
  d.masonry.cardImageSizePx = clampInt(
    Number.parseInt(els.masonryCardImageSize.value, 10),
    56,
    280,
    120,
  )

  if (d.masonry.enabled) {
    d.editorial.enabled = false
  } else if (d.editorial.enabled) {
    d.masonry.enabled = false
  }

  return d
}

function writeFormFromDesign(d: StudioDesignV1): void {
  if (d.masonry.enabled && d.editorial.enabled) {
    d = { ...d, editorial: { ...d.editorial, enabled: false } }
  }
  els.designName.value = d.name
  els.designSlug.value = d.slug
  els.cPage.value = toColorInput(d.theme.page)
  els.cPanel.value = toColorInput(d.theme.panel)
  els.cInk.value = toColorInput(d.theme.ink)
  els.cMuted.value = toColorInput(d.theme.muted)
  els.cRule.value = toColorInput(d.theme.rule)
  els.cAccent.value = toColorInput(d.theme.accent)

  const bgId = pageBgPresetIdForCss(d.theme.pageGradient)
  els.pageBgPreset.value = bgId
  if (bgId === 'custom') {
    els.pageGradientCustomWrap.hidden = false
    els.pageGradientCustom.value = d.theme.pageGradient?.trim() ?? ''
  } else {
    els.pageGradientCustomWrap.hidden = true
    els.pageGradientCustom.value = ''
  }

  const maxW = clampInt(d.frame.maxWidth, FRAME_W_MIN, FRAME_W_MAX, 420)
  const maxWS = String(maxW)
  els.fMaxw.value = maxWS
  els.editBoxW.value = maxWS
  els.fPad.value = String(clampInt(d.frame.padding, 0, 80, 0))
  els.fRadius.value = String(clampInt(d.frame.borderRadius, 0, 48, 0))
  els.fBorder.value = String(clampInt(d.frame.borderWidth, 0, 8, 0))
  els.fBorderc.value = toColorInput(d.frame.borderColor)

  const sh = parseStudioShadow(d.frame.shadow)
  els.shadowEnabled.checked = sh.enabled
  els.shadowColor.value = toColorInput(sh.colorHex)
  els.shadowBlur.value = String(clampInt(sh.blurPx, 0, 60, 22))
  els.shadowOffset.value = String(clampInt(sh.offsetYPx, 0, 32, 10))
  els.shadowOpacity.value = String(
    Math.round(clampInt(sh.opacity * 100, 0, 100, 14)),
  )

  els.fMat.value = String(clampInt(d.frame.matInset, 0, 48, 0))

  const presetFont = STUDIO_FONT_PRESETS.some(p => p.value === d.typography.fontFamily)
  if (presetFont) {
    els.tyFontSelect.value = d.typography.fontFamily
    els.tyFontCustomWrap.hidden = true
    els.tyFontCustom.value = ''
  } else {
    els.tyFontSelect.value = FONT_OTHER
    els.tyFontCustomWrap.hidden = false
    els.tyFontCustom.value = d.typography.fontFamily
  }

  els.tySize.value = String(clampInt(d.typography.fontSize, 10, 36, 16))
  els.tyLh.value = String(clampInt(d.typography.lineHeight, 14, 52, 20))
  els.sampleText.value = d.sampleText

  const ed = d.editorial
  els.editEnabled.checked = ed.enabled
  els.editCols.value = String(ed.columnCount)
  els.editGutter.value = String(clampInt(ed.gutter, 0, 56, 24))
  els.editVh.value = String(clampInt(ed.viewportHeight, 160, 640, 400))
  els.editCol0.value = toColorInput(ed.columnFills[0] ?? '#f4efe6')
  els.editCol1.value = toColorInput(ed.columnFills[1] ?? '#ede8df')
  els.editCol2.value = toColorInput(ed.columnFills[2] ?? '#e6e1d8')

  const tit = ed.title
  els.titleEnabled.checked = tit.enabled
  els.titleText.value = tit.text
  els.titleColor.value = toColorInput(tit.color)
  const titlePreset = STUDIO_FONT_PRESETS.some(p => p.value === tit.fontFamily)
  if (titlePreset) {
    els.titleFontSelect.value = tit.fontFamily
    els.titleFontCustomWrap.hidden = true
    els.titleFontCustom.value = ''
  } else {
    els.titleFontSelect.value = FONT_OTHER
    els.titleFontCustomWrap.hidden = false
    els.titleFontCustom.value = tit.fontFamily
  }
  els.titleSize.value = String(clampInt(tit.fontSize, 14, 56, 28))
  els.titleLh.value = String(clampInt(tit.lineHeight, 16, 64, 34))
  els.titleX.value = String(clampInt(Math.round(tit.x * 100), 0, 100, 8))
  els.titleY.value = String(clampInt(Math.round(tit.y * 100), 0, 100, 5))
  els.titleW.value = String(clampInt(Math.round(tit.w * 100), 20, 100, 84))

  els.titleBgWrap.hidden = !tit.enabled
  els.titleBgEnabled.checked = tit.backgroundEnabled
  els.titleBgColor.value = toColorInput(tit.backgroundColor)
  els.titleBgPad.value = String(clampInt(tit.backgroundPad, 0, 24, 10))
  els.titleBgRadius.value = String(clampInt(tit.backgroundRadius, 0, 24, 8))
  els.titleBgControls.classList.toggle('title-bg-controls--off', !tit.backgroundEnabled)

  const mas = d.masonry
  els.masonryEnabled.checked = mas.enabled
  setActiveMasonryCols(mas.minWideColumns)
  setActiveMasonryRows(mas.rows > 0 ? mas.rows : 1)
  els.masonryGap.value = String(clampInt(mas.gap, 4, 48, 12))
  els.masonryCardPad.value = String(clampInt(mas.cardPadding, 4, 48, 16))
  els.masonryMaxCol.value = String(clampInt(mas.maxColWidth, 120, 800, 400))
  els.masonryMaxChars.value = String(clampInt(mas.maxCharsPerBlock, 0, 20000, 0))
  els.masonryCardSplit.value = mas.cardSplit
  els.masonryCardImageMode.value = mas.cardImageMode
  els.masonryCardImageUrls.value = mas.cardImageUrls
  els.masonryCardImageSize.value = String(clampInt(mas.cardImageSizePx, 56, 280, 120))

  rebuildEditObjectRows(ed.objects)
  syncEditControlsDisabled()
  syncShadowControlsDisabled()
  syncSliderValueLabels()
}

function toColorInput(css: string): string {
  const s = css.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const a = s.slice(1).split('')
    return `#${a[0]}${a[0]}${a[1]}${a[1]}${a[2]}${a[2]}`
  }
  return '#888888'
}

/** Preview-stage only: drawer UI keeps fixed --ui-* theme in CSS. */
function applyStageChrome(d: StudioDesignV1): void {
  if (d.theme.pageGradient) els.stageWrap.style.background = d.theme.pageGradient
  else els.stageWrap.style.background = d.theme.page
  els.stageHint.style.color = d.theme.muted
}

function syncShadowControlsDisabled(): void {
  const on = els.shadowEnabled.checked
  els.shadowControls.classList.toggle('shadow-controls--disabled', !on)
}

function syncSliderValueLabels(): void {
  els.fMaxwVal.textContent = els.fMaxw.value
  els.fPadVal.textContent = els.fPad.value
  els.fRadiusVal.textContent = els.fRadius.value
  els.fBorderVal.textContent = els.fBorder.value
  els.fMatVal.textContent = els.fMat.value
  const padPx = clampInt(Number.parseInt(els.fPad.value, 10), 0, 80, 0)
  const matPx = clampInt(Number.parseInt(els.fMat.value, 10), 0, 48, 0)
  els.fInsetSum.textContent = String(padPx + matPx)
  els.tySizeVal.textContent = els.tySize.value
  els.tyLhVal.textContent = els.tyLh.value
  els.shadowBlurVal.textContent = els.shadowBlur.value
  els.shadowOffsetVal.textContent = els.shadowOffset.value
  els.shadowOpacityVal.textContent = els.shadowOpacity.value
  els.editGutterVal.textContent = els.editGutter.value
  els.editVhVal.textContent = els.editVh.value
  els.editBoxWVal.textContent = els.editBoxW.value
  els.titleSizeVal.textContent = els.titleSize.value
  els.titleLhVal.textContent = els.titleLh.value
  els.titleXVal.textContent = els.titleX.value
  els.titleYVal.textContent = els.titleY.value
  els.titleWVal.textContent = els.titleW.value
  els.titleBgPadVal.textContent = els.titleBgPad.value
  els.titleBgRadiusVal.textContent = els.titleBgRadius.value
  els.masonryGapVal.textContent = els.masonryGap.value
  els.masonryCardPadVal.textContent = els.masonryCardPad.value
  els.masonryMaxColVal.textContent = els.masonryMaxCol.value
  const mc = els.masonryMaxChars.value
  els.masonryMaxCharsVal.textContent = mc === '0' ? 'Off' : mc
  els.masonryCardImageSizeVal.textContent = els.masonryCardImageSize.value
  syncMasonryGridHighlight()
  syncMasonryCardImageControls()
}

function syncMasonryCardImageControls(): void {
  const mode = els.masonryCardImageMode.value
  const on = mode !== 'none'
  els.masonryCardImageUrls.disabled = !on
  els.masonryCardImageSize.disabled = !on
  const lab = document.getElementById('masonry-card-image-size-label')
  if (lab) {
    lab.textContent =
      mode === 'top'
        ? 'Photo band height'
        : mode === 'left' || mode === 'right'
          ? 'Thumbnail width'
          : 'Photo size'
  }
  const hint = document.getElementById('masonry-card-image-size-hint')
  if (hint) {
    hint.textContent = on
      ? mode === 'top'
        ? 'Fixed-height strip; photo is cover-cropped. Layout reserves this band while images load (shaded until decoded).'
        : 'Slider sets column width; height follows aspect ratio (capped), cover-cropped. Light fill shows the slot while loading.'
      : 'Choose a layout to enable URLs. The slider sets band height (top) or thumb width (sides).'
  }
}

function readActiveMasonryCols(): number {
  const btn = els.masonryColsGrid.querySelector<HTMLButtonElement>('.masonry-cols-btn--active')
  const n = Number(btn?.dataset['cols'])
  return Number.isFinite(n) && n >= MASONRY_WIDE_COLUMN_MIN ? n : MASONRY_WIDE_COLUMN_MIN
}

function readActiveMasonryRows(): number {
  const btn = els.masonryRowsGrid.querySelector<HTMLButtonElement>('.masonry-cols-btn--active')
  const n = Number(btn?.dataset['rows'])
  return Number.isFinite(n) && n >= 1 ? n : 1
}

function setActiveMasonryCols(cols: number): void {
  const c = clampInt(cols, MASONRY_WIDE_COLUMN_MIN, MASONRY_WIDE_COLUMN_MAX, MASONRY_WIDE_COLUMN_MIN)
  for (const btn of els.masonryColsGrid.querySelectorAll<HTMLButtonElement>('.masonry-cols-btn')) {
    const on = Number(btn.dataset['cols']) === c
    btn.classList.toggle('masonry-cols-btn--active', on)
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
  }
}

function setActiveMasonryRows(rows: number): void {
  const r = clampInt(rows, 1, 24, 1)
  let matched = false
  for (const btn of els.masonryRowsGrid.querySelectorAll<HTMLButtonElement>('.masonry-rows-btn')) {
    const on = Number(btn.dataset['rows']) === r
    btn.classList.toggle('masonry-cols-btn--active', on)
    btn.setAttribute('aria-pressed', on ? 'true' : 'false')
    if (on) matched = true
  }
  if (!matched) {
    // Nearest preset
    let best: HTMLButtonElement | null = null
    let bestDiff = Infinity
    for (const btn of els.masonryRowsGrid.querySelectorAll<HTMLButtonElement>('.masonry-rows-btn')) {
      const diff = Math.abs(Number(btn.dataset['rows']) - r)
      if (diff < bestDiff) { bestDiff = diff; best = btn }
    }
    if (best) { best.classList.add('masonry-cols-btn--active'); best.setAttribute('aria-pressed', 'true') }
  }
}

function syncMasonryGridHighlight(): void {
  const cols = readActiveMasonryCols()
  const rows = readActiveMasonryRows()
  const total = cols * rows
  els.masonryGridHint.textContent = rows > 1 ? `— ${total} cards` : ''
}

function syncTitleBackgroundChrome(): void {
  els.titleBgWrap.hidden = !els.titleEnabled.checked
  els.titleBgControls.classList.toggle('title-bg-controls--off', !els.titleBgEnabled.checked)
}

function syncStudioPanelsForIconMode(): void {
  const expand = !els.toolIconMode.checked
  for (const el of els.drawer.querySelectorAll('details.studio-panel')) {
    if (expand) el.setAttribute('open', '')
    else el.removeAttribute('open')
  }
  for (const el of els.drawer.querySelectorAll('details.studio-subpanel')) {
    if (expand) el.setAttribute('open', '')
    else el.removeAttribute('open')
  }
}

function isDesktopDrawerLayout(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 721px)').matches
}

function applyDrawerCollapsed(collapsed: boolean, opts?: { persist?: boolean; skipPanelSync?: boolean }): void {
  const persist = opts?.persist !== false
  const skipPanelSync = opts?.skipPanelSync === true
  const effective = collapsed && isDesktopDrawerLayout()
  els.drawer.classList.toggle('drawer--collapsed', effective)
  els.drawerExpandTab.hidden = true
  els.drawerCollapse.setAttribute('aria-expanded', effective ? 'false' : 'true')
  els.drawerCollapse.textContent = effective ? '›' : '‹'
  els.drawerCollapse.title = effective
    ? 'Expand tools panel'
    : 'Shrink to icon rail — more room for preview'
  if (effective) {
    for (const el of els.drawer.querySelectorAll('details.studio-panel')) {
      el.removeAttribute('open')
    }
  } else if (!skipPanelSync) {
    syncStudioPanelsForIconMode()
  }
  if (persist) {
    try {
      localStorage.setItem(DRAWER_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore quota / private mode */
    }
  }
  scheduleRender()
}

function syncPanelSummaryTitles(): void {
  for (const el of els.drawer.querySelectorAll('details.studio-panel > summary')) {
    const t = el.querySelector('.studio-panel-title')?.textContent?.trim()
    if (t) el.setAttribute('title', t)
  }
}

function openPanelFromRail(panel: HTMLDetailsElement): void {
  applyDrawerCollapsed(false, { persist: true, skipPanelSync: true })
  for (const d of els.drawer.querySelectorAll('details.studio-panel')) {
    const det = d as HTMLDetailsElement
    det.open = det === panel
  }
  scheduleRender()
}

function applyToolIconMode(): void {
  els.drawer.classList.toggle('drawer--tool-icons', els.toolIconMode.checked)
  try {
    localStorage.setItem(TOOL_ICON_MODE_KEY, els.toolIconMode.checked ? '1' : '0')
  } catch {
    /* ignore quota / private mode */
  }
  syncStudioPanelsForIconMode()
}

function scheduleRender(): void {
  if (renderRaf !== null) return
  renderRaf = requestAnimationFrame(() => {
    renderRaf = null
    current = readFormIntoDesign()
    applyStageChrome(current)
    syncShadowControlsDisabled()
    syncSliderValueLabels()
    syncTitleBackgroundChrome()
    renderCanvas(current)
  })
}

function prefetchMasonryCardImages(d: StudioDesignV1): void {
  const block = d.masonry.cardImageMode === 'none' ? '' : d.masonry.cardImageUrls
  if (block !== prevMasonryCardImageBlock) {
    const prev = new Set(listUniqueMasonryImageUrls(prevMasonryCardImageBlock))
    const next = new Set(listUniqueMasonryImageUrls(block))
    for (const u of prev) {
      if (!next.has(u)) invalidateMasonryImageCacheEntry(u)
    }
    prevMasonryCardImageBlock = block
  }
  if (d.masonry.cardImageMode === 'none') return
  for (const u of listUniqueMasonryImageUrls(d.masonry.cardImageUrls)) {
    requestMasonryImage(u, () => scheduleRender())
  }
}

function renderCanvas(d: StudioDesignV1): void {
  if (d.masonry.enabled) {
    prefetchMasonryCardImages(d)
    renderMasonryStudioDesign(els.canvas, d)
  } else if (d.editorial.enabled) renderEditorialStudioDesign(els.canvas, d)
  else renderStudioDesign(els.canvas, d)
}

async function refreshDesignList(selectedSlug?: string): Promise<void> {
  const rows = await idbGetAll()
  const select = els.designSelect
  select.innerHTML = ''
  if (rows.length === 0) {
    const opt = document.createElement('option')
    opt.value = ''
    opt.textContent = '(no saves yet)'
    select.appendChild(opt)
    return
  }
  rows.sort((a, b) => a.design.name.localeCompare(b.design.name))
  for (const row of rows) {
    const opt = document.createElement('option')
    opt.value = row.slug
    opt.textContent = row.design.name
    select.appendChild(opt)
  }
  const want = selectedSlug && rows.some(r => r.slug === selectedSlug) ? selectedSlug : rows[0]!.slug
  select.value = want
}

function setUrlDesign(slug: string): void {
  const u = new URL(location.href)
  u.searchParams.set('design', slug)
  history.replaceState(null, '', u.toString())
}

async function loadSlug(slug: string): Promise<void> {
  const d = slug ? await idbGet(slug) : null
  current = d ? defaultStudioDesign(d as Partial<StudioDesignV1>) : defaultStudioDesign()
  writeFormFromDesign(current)
  applyStageChrome(current)
  scheduleRender()
  setUrlDesign(current.slug)
}

function wireInputs(): void {
  const inputs = document.querySelectorAll(
    '#drawer input, #drawer textarea, #drawer select',
  )
  inputs.forEach(el => {
    el.addEventListener('input', () => scheduleRender())
    el.addEventListener('change', () => scheduleRender())
  })

  els.pageBgPreset.addEventListener('change', () => {
    const custom = els.pageBgPreset.value === 'custom'
    els.pageGradientCustomWrap.hidden = !custom
    scheduleRender()
  })

  els.tyFontSelect.addEventListener('change', () => {
    const other = els.tyFontSelect.value === FONT_OTHER
    els.tyFontCustomWrap.hidden = !other
    scheduleRender()
  })

  els.titleFontSelect.addEventListener('change', () => {
    const other = els.titleFontSelect.value === FONT_OTHER
    els.titleFontCustomWrap.hidden = !other
    scheduleRender()
  })

  els.titleEnabled.addEventListener('change', () => {
    syncTitleBackgroundChrome()
  })

  els.titleBgEnabled.addEventListener('change', () => {
    syncTitleBackgroundChrome()
    scheduleRender()
  })

  els.toolIconMode.addEventListener('change', () => {
    applyToolIconMode()
  })

  els.shadowEnabled.addEventListener('change', () => {
    syncShadowControlsDisabled()
    scheduleRender()
  })

  els.editEnabled.addEventListener('change', () => {
    if (els.editEnabled.checked) {
      els.masonryEnabled.checked = false
      els.editBoxW.value = els.fMaxw.value
    } else els.fMaxw.value = els.editBoxW.value
    syncEditControlsDisabled()
    scheduleRender()
  })

  els.masonryEnabled.addEventListener('change', () => {
    if (els.masonryEnabled.checked) els.editEnabled.checked = false
    syncEditControlsDisabled()
    scheduleRender()
  })

  els.masonryColsGrid.addEventListener('click', ev => {
    const t = ev.target as HTMLElement | null
    const btn = t?.closest?.('.masonry-cols-btn') as HTMLButtonElement | null
    if (!btn || !els.masonryColsGrid.contains(btn)) return
    const n = Number(btn.dataset['cols'])
    if (!Number.isFinite(n)) return
    const c = clampInt(n, MASONRY_WIDE_COLUMN_MIN, MASONRY_WIDE_COLUMN_MAX, MASONRY_WIDE_COLUMN_MIN)
    setActiveMasonryCols(c)
    // Auto full-width for dense grids so columns have room
    if (c >= 4) {
      els.fMaxw.value = String(FRAME_W_MAX)
      if (els.editEnabled.checked) els.editBoxW.value = els.fMaxw.value
    }
    scheduleRender()
  })

  els.masonryRowsGrid.addEventListener('click', ev => {
    const t = ev.target as HTMLElement | null
    const btn = t?.closest?.('.masonry-rows-btn') as HTMLButtonElement | null
    if (!btn || !els.masonryRowsGrid.contains(btn)) return
    const n = Number(btn.dataset['rows'])
    if (!Number.isFinite(n)) return
    setActiveMasonryRows(n)
    scheduleRender()
  })

  els.btnMasonryFullWidth.addEventListener('click', () => {
    els.fMaxw.value = String(FRAME_W_MAX)
    if (els.editEnabled.checked) els.editBoxW.value = els.fMaxw.value
    scheduleRender()
  })

  const syncEditBoxFromFrame = (): void => {
    if (els.editEnabled.checked) els.editBoxW.value = els.fMaxw.value
  }
  const syncFrameFromEditBox = (): void => {
    els.fMaxw.value = els.editBoxW.value
  }
  els.fMaxw.addEventListener('input', syncEditBoxFromFrame)
  els.fMaxw.addEventListener('change', syncEditBoxFromFrame)
  els.editBoxW.addEventListener('input', syncFrameFromEditBox)
  els.editBoxW.addEventListener('change', syncFrameFromEditBox)

  els.editObjects.addEventListener('input', () => scheduleRender())
  els.editObjects.addEventListener('change', () => scheduleRender())

  els.btnEditCircle.addEventListener('click', () => {
    current = readFormIntoDesign()
    current.editorial.objects.push({
      id: newObjId(),
      kind: 'circle',
      x: 0.5,
      y: 0.45,
      r: 0.08,
      fill: '#955f3b',
    })
    rebuildEditObjectRows(current.editorial.objects)
    scheduleRender()
  })

  els.btnEditRect.addEventListener('click', () => {
    current = readFormIntoDesign()
    current.editorial.objects.push({
      id: newObjId(),
      kind: 'rect',
      x: 0.55,
      y: 0.35,
      w: 0.35,
      h: 0.18,
      fill: '#6d645d',
    })
    rebuildEditObjectRows(current.editorial.objects)
    scheduleRender()
  })

  els.btnEditSample.addEventListener('click', () => {
    current = readFormIntoDesign()
    current.masonry.enabled = false
    current.editorial.enabled = true
    current.editorial.columnCount = 2
    current.editorial.objects = sampleEditorialOrbs()
    writeFormFromDesign(current)
    scheduleRender()
  })

  els.masonryCardImageMode.addEventListener('change', () => {
    syncMasonryCardImageControls()
    scheduleRender()
  })

  syncPanelSummaryTitles()

  els.drawer.addEventListener(
    'click',
    ev => {
      if (!isDesktopDrawerLayout()) return
      if (!els.drawer.classList.contains('drawer--collapsed')) return
      const el = ev.target as HTMLElement | null
      if (!el) return
      const summary = el.closest('details.studio-panel > summary')
      if (!summary || !els.drawer.contains(summary)) return
      ev.preventDefault()
      const panel = summary.parentElement as HTMLDetailsElement
      openPanelFromRail(panel)
    },
    true,
  )
}

els.designSelect.addEventListener('change', async () => {
  const slug = els.designSelect.value
  if (!slug) return
  await loadSlug(slug)
  await refreshDesignList(slug)
})

els.btnNew.addEventListener('click', async () => {
  const base = defaultStudioDesign({
    name: 'Untitled',
    slug: `untitled-${Date.now()}`,
  })
  current = base
  writeFormFromDesign(current)
  applyStageChrome(current)
  scheduleRender()
  await idbPut({ slug: base.slug, design: base })
  await refreshDesignList(base.slug)
  els.designSelect.value = base.slug
  setUrlDesign(base.slug)
})

els.btnSave.addEventListener('click', async () => {
  current = readFormIntoDesign()
  if (els.designSlug.value.trim() === '') {
    current.slug = slugify(current.name)
    els.designSlug.value = current.slug
  }
  await idbPut({ slug: current.slug, design: { ...current, slug: current.slug } })
  await refreshDesignList(current.slug)
  els.designSelect.value = current.slug
  setUrlDesign(current.slug)
})

els.btnDownloadJson.addEventListener('click', () => {
  current = readFormIntoDesign()
  const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${current.slug}.studio.json`
  a.click()
  URL.revokeObjectURL(a.href)
})

els.btnCopyCli.addEventListener('click', async () => {
  current = readFormIntoDesign()
  const line = `bun run studio-export -- ./${current.slug}.studio.json`
  try {
    await navigator.clipboard.writeText(line)
    els.btnCopyCli.textContent = 'Copied!'
    setTimeout(() => {
      els.btnCopyCli.textContent = 'Copy export CLI'
    }, 2000)
  } catch {
    els.btnCopyCli.textContent = 'Copy failed'
  }
})

els.drawerToggle.addEventListener('click', () => {
  els.drawer.classList.toggle('open')
})
els.drawerBackdrop.addEventListener('click', () => {
  els.drawer.classList.remove('open')
})

els.drawerCollapse.addEventListener('click', () => {
  const isRail = els.drawer.classList.contains('drawer--collapsed')
  applyDrawerCollapsed(!isRail)
})

els.drawerExpandTab.addEventListener('click', () => {
  applyDrawerCollapsed(false)
})

function syncDrawerCollapsedFromStorage(): void {
  try {
    applyDrawerCollapsed(localStorage.getItem(DRAWER_COLLAPSED_KEY) === '1', { persist: false })
  } catch {
    applyDrawerCollapsed(false, { persist: false })
  }
}

window.addEventListener('resize', () => {
  syncDrawerCollapsedFromStorage()
  scheduleRender()
})

async function boot(): Promise<void> {
  initSelects()
  try {
    if (localStorage.getItem(TOOL_ICON_MODE_KEY) === '1') els.toolIconMode.checked = true
  } catch {
    /* ignore */
  }
  applyToolIconMode()
  syncDrawerCollapsedFromStorage()
  wireInputs()
  const rows = await idbGetAll()
  const param = new URLSearchParams(location.search).get('design')
  const slugFromUrl = param && rows.some(r => r.slug === param) ? param : undefined
  const slug = slugFromUrl ?? rows[0]?.slug
  await refreshDesignList(slug ?? rows[0]?.slug)
  if (slug) {
    await loadSlug(slug)
  } else {
    current = defaultStudioDesign()
    writeFormFromDesign(current)
    applyStageChrome(current)
    scheduleRender()
  }
  document.fonts.ready.then(() => scheduleRender())
}

boot().catch(err => {
  console.error(err)
  initSelects()
  try {
    if (localStorage.getItem(TOOL_ICON_MODE_KEY) === '1') els.toolIconMode.checked = true
  } catch {
    /* ignore */
  }
  applyToolIconMode()
  syncDrawerCollapsedFromStorage()
  writeFormFromDesign(current)
  applyStageChrome(current)
  scheduleRender()
})
