# Text Studio (Precons) — what it is

**Text Studio** is the interactive editor at `/demos/text-studio`. The drawer brands it **Precons**; it is not a separate product — it is this repo’s **visual design tool** for Pretext-backed layouts.

## What it does

1. **Edits a single JSON-shaped design** (`StudioDesignV1` in `text-studio.schema.ts`): name/slug, theme colors, page background presets, frame (max width, padding, border, shadow, mat inset), body typography, and sample paragraph text.

2. **Live canvas preview** — no DOM text measurement in the hot path. The preview uses the same Pretext APIs as the rest of the demos:
   - **Simple mode** (`studio-canvas.ts`): one column, `prepareWithSegments` + `layoutWithLines`, draws into the preview card.
   - **Editorial mode** (`studio-editorial-canvas.ts`): multi-column flow with `layoutNextLine`, optional **headline as a wrap obstacle**, and **circle/rect** obstacles — same family of behavior as **Editorial engine** and **Dynamic layout**, driven by the form instead of a bespoke demo script.

3. **Persists drafts in the browser** (IndexedDB) keyed by slug, with URL `?design=<slug>` so reloads reopen the same design.

4. **Exports** a portable `.studio.json` (Download JSON) and a **copy-paste CLI** hint for `studio-export`, which can register a file under `pages/demos/studio-designs/<slug>.json` for the **Studio viewer** (`/demos/studio-viewer?design=<slug>`).

## What it does *not* do

- It is **not** a general page builder; it targets **Pretext canvas layouts** described by the schema.
- It does **not** run Masonry, accordion, or other demos *inside* the editor — those are **separate pages** under `/demos/…`.

## Design document (`StudioDesignV1`)

| Area | Role |
|------|------|
| `theme` | Page/panel/ink/muted/rule/accent colors; optional `pageGradient` CSS. |
| `frame` | Card size, padding, border radius, border, shadow, mat inset. |
| `typography` | Body `fontFamily`, `fontSize`, `lineHeight` (Pretext font string). |
| `sampleText` | Paragraph(s) fed to `prepareWithSegments`. |
| `editorial` | Toggle + columns, gutter, viewport height, column washes, **title** (position, type, optional background box), **objects** (circles/rects as obstacles). |

Parsing and defaults live in `text-studio.schema.ts` (`defaultStudioDesign`, `parseStudioDesign`).

## Export and static viewer

- **`bun run studio-export -- ./your-design.studio.json`** — validates JSON, writes `pages/demos/studio-designs/<slug>.json`, prints viewer URL (see `scripts/studio-export.ts`).
- **`bun run site:build`** — emits the static site under `site/`; viewer + copied JSON paths are described in `DEVELOPMENT.md`.

The Bun HTML dev server only reliably serves **bundled** assets; the checked-in **`example`** design may be loaded via bundling in `studio-viewer.ts`. For other slugs during local dev, prefer **`design=example`** or use the built `site/` output after `site:build`.

## Code map

| Piece | File(s) |
|-------|---------|
| UI + wiring | `text-studio.html`, `text-studio.ts` |
| Schema / defaults | `text-studio.schema.ts` |
| Simple preview | `studio-canvas.ts` |
| Editorial preview | `studio-editorial-canvas.ts` |
| Shadows | `studio-shadow.ts`, `studio-shadow.ts` helpers |
| Fonts | `studio-font-presets.ts` |
| Background presets | `studio-background-presets.ts` |
| Static read-only viewer | `studio-viewer.html`, `studio-viewer.ts` |
| Registered designs | `pages/demos/studio-designs/*.json` |

## Relating other demos (e.g. Masonry)

- **Masonry** (`/demos/masonry`) is a **separate** demo: it uses Pretext for **height prediction** in a card grid without DOM reads. It does not consume `StudioDesignV1` today.
- **Cross-linking**: the shared **demo nav** in `text-studio.html` already lists peer demos, including **Masonry** — keep that nav in sync with `pages/demos/index.html` when you add or rename cards.
- If you want Masonry **conceptually** “next to” Text Studio in the **demos index**, edit `pages/demos/index.html`: place the **Masonry** and **Text Studio** cards adjacent in the grid (order is presentation-only; both stay independent routes).

## Adding a new studio-adjacent demo later

1. Add the page under `pages/demos/` (or `pages/demos/<name>/index.html`).
2. Register it in `package.json` `start` / `start:watch` globs if it is a new HTML entry pattern.
3. Add `scripts/build-demo-site.ts` entry + target if the static site should include it.
4. Link from `pages/demos/index.html` and from the **demo nav** in pages that use it (`text-studio.html`, `studio-viewer.html`, etc.).

For deeper repo conventions, see `DEVELOPMENT.md` and `CLAUDE.md` / `AGENTS.md`.
