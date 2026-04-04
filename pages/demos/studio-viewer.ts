import { renderStudioDesign } from './studio-canvas.ts'
import { renderEditorialStudioDesign } from './studio-editorial-canvas.ts'
import {
  listUniqueMasonryImageUrls,
  renderMasonryStudioDesign,
  whenAllMasonryImagesReady,
} from './studio-masonry-canvas.ts'
import { parseStudioDesign, type StudioDesignV1 } from './text-studio.schema.ts'

const canvasEl = document.getElementById('canvas')
const titleEl0 = document.getElementById('title')
const metaEl0 = document.getElementById('meta')
const errEl0 = document.getElementById('err')

if (
  !(canvasEl instanceof HTMLCanvasElement) ||
  titleEl0 === null ||
  metaEl0 === null ||
  errEl0 === null
) {
  throw new Error('studio-viewer DOM missing')
}

const canvas = canvasEl
const titleEl = titleEl0
const metaEl = metaEl0
const errEl = errEl0

/**
 * JSON lives as a sibling of the viewer folder: …/studio-designs/<slug>.json
 * (dev: pages/demos/studio-designs; static site: site/studio-designs).
 * Resolve from pathname so /studio-viewer vs /studio-viewer/ vs …/studio-viewer/index.html all work.
 */
function designJsonHref(slug: string): string {
  const u = new URL(location.href)
  u.search = ''
  u.hash = ''
  let path = u.pathname.replace(/\/$/, '')
  if (path.endsWith('/index.html')) path = path.slice(0, -'/index.html'.length)
  if (path.endsWith('/studio-viewer')) {
    path = path.slice(0, -'/studio-viewer'.length)
  }
  const safe = encodeURIComponent(slug)
  if (path === '' || path === '/') {
    u.pathname = `/studio-designs/${safe}.json`
  } else {
    u.pathname = `${path}/studio-designs/${safe}.json`
  }
  return u.href
}

function applyPageBackground(d: StudioDesignV1): void {
  const root = document.documentElement
  root.style.setProperty('--page', d.theme.page)
  root.style.setProperty('--ink', d.theme.ink)
  root.style.setProperty('--muted', d.theme.muted)
  root.style.setProperty('--accent', d.theme.accent)
  if (d.theme.pageGradient) {
    document.body.style.background = d.theme.pageGradient
  } else {
    document.body.style.background = d.theme.page
  }
}

async function load(): Promise<void> {
  const params = new URLSearchParams(location.search)
  const slug = params.get('design')?.trim() || 'example'
  errEl.hidden = true
  metaEl.textContent = `Loading ${slug}.json…`

  let res: Response
  try {
    res = await fetch(designJsonHref(slug), { cache: 'no-store' })
  } catch (e) {
    errEl.hidden = false
    errEl.textContent = `Network error loading design: ${e instanceof Error ? e.message : String(e)}`
    metaEl.textContent = ''
    return
  }

  if (!res.ok) {
    errEl.hidden = false
    const tried = designJsonHref(slug)
    errEl.textContent = `Could not load design (${res.status}). Tried ${tried}. Use ?design=<slug> with pages/demos/studio-designs/<slug>.json (e.g. ?design=example).`
    metaEl.textContent = ''
    titleEl.textContent = 'Studio viewer'
    return
  }

  let raw: unknown
  try {
    raw = await res.json()
  } catch {
    errEl.hidden = false
    errEl.textContent = 'Invalid JSON'
    metaEl.textContent = ''
    return
  }

  const d = parseStudioDesign(raw)
  if (!d) {
    errEl.hidden = false
    errEl.textContent = 'Invalid studio design document (expected studioDesignVersion: 1)'
    metaEl.textContent = ''
    return
  }

  titleEl.textContent = d.name
  metaEl.textContent = `Slug: ${d.slug} · Open in Text Studio at /demos/text-studio?design=${encodeURIComponent(d.slug)}`
  applyPageBackground(d)
  if (d.masonry.enabled) {
    const urls = listUniqueMasonryImageUrls(d.masonry.cardImageUrls)
    if (d.masonry.cardImageMode !== 'none' && urls.length > 0) {
      await whenAllMasonryImagesReady(urls)
    }
    renderMasonryStudioDesign(canvas, d)
  } else if (d.editorial.enabled) renderEditorialStudioDesign(canvas, d)
  else renderStudioDesign(canvas, d)
}

document.fonts.ready
  .then(() => load())
  .catch(e => {
    errEl.hidden = false
    errEl.textContent = e instanceof Error ? e.message : String(e)
    metaEl.textContent = ''
  })
