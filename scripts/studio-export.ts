#!/usr/bin/env bun
/**
 * Copy a Text Studio JSON design into pages/demos/studio-designs/<slug>.json
 * for use with /demos/studio-viewer?design=<slug>.
 *
 * Usage:
 *   bun run studio-export -- ./my-design.studio.json
 *   bun run studio-export -- --design ./my-design.studio.json
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { parseStudioDesign } from '../pages/demos/text-studio.schema.ts'

const root = process.cwd()
const outDir = path.join(root, 'pages', 'demos', 'studio-designs')

function parseArgs(): { input: string } {
  const argv = process.argv.slice(2)
  let input = ''
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--design' || a === '-d') {
      input = argv[++i] ?? ''
      continue
    }
    if (!a.startsWith('-') && !input) {
      input = a
    }
  }
  if (!input) {
    console.error('Usage: bun run studio-export -- <path-to-design.json>')
    console.error('   or: bun run studio-export -- --design <path-to-design.json>')
    process.exit(1)
  }
  return { input: path.resolve(root, input) }
}

const { input } = parseArgs()
const rawText = await readFile(input, 'utf8')
let raw: unknown
try {
  raw = JSON.parse(rawText) as unknown
} catch {
  console.error('Invalid JSON file:', input)
  process.exit(1)
}

const design = parseStudioDesign(raw)
if (!design) {
  console.error('Not a valid Text Studio design (studioDesignVersion: 1 required):', input)
  process.exit(1)
}

await mkdir(outDir, { recursive: true })
const outPath = path.join(outDir, `${design.slug}.json`)
await writeFile(outPath, `${JSON.stringify(design, null, 2)}\n`, 'utf8')
console.log(`Wrote ${path.relative(root, outPath)}`)
console.log(`Dev:    http://127.0.0.1:3000/demos/studio-viewer?design=${encodeURIComponent(design.slug)}`)
console.log(`(Run bun start from repo root; port may differ.)`)
