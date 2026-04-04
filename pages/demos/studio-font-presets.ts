/** Curated stacks (~20) — no network fonts; degrade per OS. */

export type FontPreset = { label: string; value: string }

export const STUDIO_FONT_PRESETS: readonly FontPreset[] = [
  { label: 'Helvetica / Arial', value: '"Helvetica Neue", Helvetica, Arial, sans-serif' },
  { label: 'System UI', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'San Francisco / Roboto', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", Gill Sans, sans-serif' },
  { label: 'Lucida Grande', value: '"Lucida Grande", "Lucida Sans Unicode", sans-serif' },
  { label: 'Gill Sans', value: '"Gill Sans", "Gill Sans MT", Calibri, sans-serif' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", Times, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, Georgia, serif' },
  { label: 'Palatino / Book Antiqua', value: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif' },
  { label: 'Iowan / Palatino book', value: '"Iowan Old Style", Palatino, "Palatino Linotype", serif' },
  { label: 'Garamond', value: 'Garamond, "EB Garamond", "Times New Roman", serif' },
  { label: 'Baskerville', value: 'Baskerville, "Baskerville Old Face", Garamond, serif' },
  { label: 'American Typewriter', value: '"American Typewriter", "Courier New", monospace' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Menlo / Consolas', value: 'Menlo, Consolas, "Courier New", monospace' },
  { label: 'Monaco / monospace', value: 'Monaco, "Lucida Console", monospace' },
  { label: 'Andale Mono', value: '"Andale Mono", Consolas, monospace' },
  { label: 'Comic Sans MS', value: '"Comic Sans MS", "Comic Sans", cursive' },
] as const
