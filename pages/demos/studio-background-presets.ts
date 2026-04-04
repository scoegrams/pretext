export type PageBgChoice = { id: string; label: string; css: string }

export const PAGE_BACKGROUND_CHOICES: readonly PageBgChoice[] = [
  { id: 'solid', label: 'Solid page color only', css: '' },
  {
    id: 'warm',
    label: 'Warm paper',
    css: 'linear-gradient(180deg, #fbf7f0 0%, #f5f1ea 100%)',
  },
  {
    id: 'cream',
    label: 'Soft cream',
    css: 'linear-gradient(160deg, #fff9f0 0%, #f2ebe3 55%, #e8dfd4 100%)',
  },
  {
    id: 'cool',
    label: 'Cool mist',
    css: 'linear-gradient(180deg, #f4f7fb 0%, #e8eef5 100%)',
  },
  {
    id: 'dusk',
    label: 'Dusk violet',
    css: 'linear-gradient(145deg, #f3f0ff 0%, #e8e4f5 50%, #ddd8ec 100%)',
  },
  {
    id: 'sea',
    label: 'Sea glass',
    css: 'linear-gradient(180deg, #f0faf8 0%, #dceee9 100%)',
  },
  {
    id: 'rose',
    label: 'Rose quartz',
    css: 'linear-gradient(180deg, #fdf5f5 0%, #f0e4e6 100%)',
  },
  { id: 'custom', label: 'Custom…', css: '' },
] as const

export function pageBgPresetIdForCss(css: string | undefined): string {
  const t = (css ?? '').trim()
  if (t === '') return 'solid'
  const hit = PAGE_BACKGROUND_CHOICES.find(c => c.id !== 'custom' && c.css === t)
  return hit?.id ?? 'custom'
}
