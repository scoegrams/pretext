/**
 * Coffee Shop starter — Pretext drives the hero headline on canvas (resize-safe, no DOM text metrics).
 * Copy this pair of files to spin up a new static page in the same stack.
 */
import { prepareWithSegments, layoutWithLines } from '../../src/layout.ts'

const HERO =
  'Single-origin pour-overs, warm pastries, and a quiet corner to read—or code—the afternoon away.'

const FONT_SIZE = 26
const FONT_FAMILY = 'Georgia, "Times New Roman", Times, serif'
const LINE_HEIGHT = 34
const FONT = `${FONT_SIZE}px ${FONT_FAMILY}`

const canvas = document.getElementById('hero-canvas')
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error('#hero-canvas missing')
}

const wrap = canvas.parentElement
if (!wrap) throw new Error('hero canvas wrap missing')

const prepared = prepareWithSegments(HERO, FONT)

function render(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const cssW = Math.min(620, Math.max(280, wrap.clientWidth))
  const { lines } = layoutWithLines(prepared, cssW, LINE_HEIGHT)
  const lineCount = lines.length
  const padY = 6
  const cssH = Math.max(100, padY * 2 + lineCount * LINE_HEIGHT)

  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, cssW, cssH)

  ctx.fillStyle = '#2a1810'
  ctx.font = FONT
  ctx.textBaseline = 'top'

  let y = padY
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i]!.text, 0, y)
    y += LINE_HEIGHT
  }
}

let raf: number | null = null
function schedule(): void {
  if (raf !== null) return
  raf = requestAnimationFrame(() => {
    raf = null
    render()
  })
}

window.addEventListener('resize', schedule)
document.fonts.ready.then(schedule).catch(schedule)
schedule()
