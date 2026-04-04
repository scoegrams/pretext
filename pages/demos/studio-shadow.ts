/** Canonical Text Studio box-shadow: `0 {offsetY}px {blur}px rgba(r,g,b,a)` or `none`. */

export type StudioShadowParts = {
  enabled: boolean
  colorHex: string
  blurPx: number
  offsetYPx: number
  opacity: number
}

const DEFAULT_PARTS: StudioShadowParts = {
  enabled: true,
  colorHex: '#362817',
  blurPx: 22,
  offsetYPx: 10,
  opacity: 0.14,
}

const RE_RGBA =
  /^0\s+(\d+)px\s+(\d+)px\s+rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)\s*$/i

const RE_RGB_MODERN =
  /^0\s+(\d+)px\s+(\d+)px\s+rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)\s*$/i

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const s = hex.trim().replace(/^#/, '')
  const full =
    s.length === 3
      ? s
          .split('')
          .map(c => c + c)
          .join('')
      : s.slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n) || full.length !== 6) return { r: 54, g: 40, b: 23 }
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function formatStudioShadow(parts: StudioShadowParts): string {
  if (!parts.enabled) return 'none'
  const { r, g, b } = hexToRgb(parts.colorHex)
  const blur = Math.min(80, Math.max(0, Math.round(parts.blurPx)))
  const oy = Math.min(48, Math.max(0, Math.round(parts.offsetYPx)))
  const a = Math.min(1, Math.max(0, parts.opacity))
  return `0 ${oy}px ${blur}px rgba(${r}, ${g}, ${b}, ${a})`
}

export function parseStudioShadow(css: string): StudioShadowParts {
  const t = css.trim()
  if (t === '' || t === 'none') {
    return { ...DEFAULT_PARTS, enabled: false }
  }
  let m = RE_RGBA.exec(t)
  if (m) {
    const [, oy, blur, r, g, b, a] = m
    return {
      enabled: true,
      colorHex: rgbToHex(Number(r), Number(g), Number(b)),
      blurPx: Number(blur),
      offsetYPx: Number(oy),
      opacity: Number(a),
    }
  }
  m = RE_RGB_MODERN.exec(t)
  if (m) {
    const [, oy, blur, r, g, b, a] = m
    return {
      enabled: true,
      colorHex: rgbToHex(Number(r), Number(g), Number(b)),
      blurPx: Number(blur),
      offsetYPx: Number(oy),
      opacity: Number(a),
    }
  }
  return { ...DEFAULT_PARTS }
}

export function shadowStyleForCanvas(shadowCss: string): {
  draw: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffsetY: number
} {
  const p = parseStudioShadow(shadowCss)
  if (!p.enabled) {
    return { draw: false, shadowColor: 'transparent', shadowBlur: 0, shadowOffsetY: 0 }
  }
  const { r, g, b } = hexToRgb(p.colorHex)
  const a = Math.min(1, Math.max(0, p.opacity))
  return {
    draw: true,
    shadowColor: `rgba(${r},${g},${b},${a})`,
    shadowBlur: Math.min(80, Math.max(0, p.blurPx)),
    shadowOffsetY: Math.min(48, Math.max(0, p.offsetYPx)),
  }
}
