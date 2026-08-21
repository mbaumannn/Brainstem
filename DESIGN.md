# Brainstem — Design Language v1.0

## What this document is

This is the single source of truth for Brainstem's visual language. The cheaper agent that implements this must follow it exactly; do not improvise new motifs, new colors, or new layout ideas. If a detail is missing here, ask before making it up.

## Concept: "One in, sixteen out"

Brainstem is a browser configurator for the Hexinverter Mutant Brain MIDI-to-CV Eurorack module. The design treats the page as the module's front panel, abstracted:

- One input at the top: the wordmark ring stands for the MIDI input (the module's only data ingress — literally the "brainstem").
- A spine down the middle: signal path runs down the page center.
- Sixteen outputs: four CV outputs and twelve gate outputs, each marked by the same ring shape.

"Brainy" comes from the anatomy of signal flow and the copy, not from neurons, gore, cables, or literal anatomy illustrations. The module photo is the reference; the UI is an abstraction of it, not a drawing.

## Locked design tokens

Add these to `src/index.css` `:root`, below the existing tokens:

```css
--ch-a-dim: #7a5638;
--ch-b-dim: #4a6b58;
--ch-c-dim: #3d5a72;
--ch-d-dim: #6f4a56;
--ch-neutral-dim: #4a4250;

--font-serif: "Instrument Serif", Georgia, serif;
```

Load the new font in `index.html` by replacing the Google Fonts link with:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

No other colors, fonts, or gradients may be introduced. The existing ambient radial glows stay untouched.

## The Ring: one atom for every output

`src/components/ChannelRing.tsx` is the only component that draws a ring. Every output (CV letters A–D, gate numbers 01–12) is rendered with it. The current `.cv-dot`, `.gate-dot`, `.gate-dots`, `.wordmark .dot`, and `SignalTrace.tsx` are removed.

### Component props

```tsx
export function ChannelRing({
  tone,        // one of: --ch-a | --ch-b | --ch-c | --ch-d | --ch-neutral | --accent
  active,      // true = filled live state, false = muted hollow state
  selected,    // optional: true adds selection halo
  size = 22,   // outer diameter in px
  children,    // optional glyph rendered inside the ring
}: {
  tone: string;
  active: boolean;
  selected?: boolean;
  size?: number;
  children?: React.ReactNode;
});
```

### Visual rule (do not deviate)

| State | Ring stroke | Interior | Glyph |
|---|---|---|---|
| **Active** | `var(--ring-color)`, 100% opacity, 1.5px | filled solid with `var(--ring-color)` | rendered in `var(--ink-950)` (knocked out) |
| **Muted** | dim variant of `var(--ring-color)`, 1.5px | empty | rendered in `var(--text-dim)` |

This is the single encoding rule everywhere: **hollow ring = unpatched/disabled; filled disc with knocked-out glyph = live/assigned.**

The wordmark mark is a ring with no glyph, size 12px, `tone="var(--accent)"`, `active={true}`: it is always filled because the app itself is the live input.

### Channel-to-color mapping

Use the existing `channelColor()` helper unchanged:

- CV A, Gate linked to voice 1 → `--ch-a` (amber)
- CV B, Gate linked to voice 2 → `--ch-b` (green)
- CV C, Gate linked to voice 3 → `--ch-c` (blue)
- CV D, Gate linked to voice 4 → `--ch-d` (pink)
- Gate with no voice link → `--ch-neutral`

For muted states, map to the matching `-dim` token. Add a helper next to `channelColor()` in `src/app/colors.ts`:

```ts
const DIM_COLORS = [
  "var(--ch-a-dim)",
  "var(--ch-b-dim)",
  "var(--ch-c-dim)",
  "var(--ch-d-dim)",
];

export function channelColorDim(index: number): string {
  return DIM_COLORS[index % DIM_COLORS.length];
}
```

### Selection and hover

- `selected`: add `box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring-color) 30%, transparent)` to the ring. The existing card border treatment (`.is-selected`) stays as well.
- Hover on a muted ring: stroke becomes full identity color at 60% opacity, glyph becomes `var(--text-soft)`. Active rings do not change on hover; the existing card lift (`transform: translateY(-1px)`) is enough.

### Sizes and glyphs

| Location | size | glyph | font |
|---|---|---|---|
| Wordmark | 12px | none | — |
| Gate cell | 22px | "01"…"12" | JetBrains Mono 700 11px, letter-spacing 0.02em |
| CV card | 40px | "A"…"D" | Space Grotesk 600 20px |

### Implementation note

Implement as a pure CSS/HTML component, not SVG. Real text must render inside the ring so it stays crisp and selectable. The component renders:

```tsx
<span className="channel-ring" style={{ "--ring-color": tone, "--ring-size": `${size}px` }}>
  {children}
</span>
```

with CSS:

```css
.channel-ring {
  --_size: var(--ring-size, 22px);
  width: var(--_size);
  height: var(--_size);
  border-radius: 50%;
  border: 1.5px solid var(--ring-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  background: var(--ring-color); /* active fill */
  color: var(--ink-950); /* knocked-out glyph */
}

.channel-ring.is-muted {
  background: transparent;
  border-color: var(--ring-dim-color, var(--ch-neutral-dim));
  color: var(--text-dim);
}

.channel-ring.is-selected {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring-color) 30%, transparent);
}
```

Pass the dim color via a second inline CSS variable (`--ring-dim-color`) or compute it inside the component. A small helper `toneDim(tone: string)` is acceptable if it lives in `colors.ts`.

## Layout: the spine

The page stops being a wide dashboard. Constrain it to a tall instrument-like column.

- `#root` max-width: change from `1180px` to `760px`.
- Center the root with `margin: 0 auto` (already done).
- Add a 1px vertical spine down the center of the output grids using `::before` on `.cv-grid` and `.gate-grid` (extend the existing `.gate-grid::before` pattern to `.cv-grid`).
  - `left: 50%`, `top: 0`, `bottom: 0`, `width: 1px`, `transform: translateX(-0.5px)`.
  - color: a gradient that fades at top and bottom: `linear-gradient(to bottom, transparent 0%, var(--line-soft) 8%, var(--line-soft) 92%, transparent 100%)`.
- Increase the column gap so the spine has breathing room:
  - `.cv-grid`: `gap: 14px 44px;`
  - `.gate-grid`: `gap: 10px 44px;`
- Section titles (`.rack-title`) move from left-aligned to **centered** over the spine:
  - `justify-content: center;`
  - keep mono caps, 12px, `var(--text-dim)`.
  - remove the trailing `::after` hairline rule.
- At `max-width: 560px` the spine hides, grids go single column, and right-column mirror classes revert (this is already partially implemented for gates at 460px; move the breakpoint to 560px and apply it to CV too).

## Header / wordmark

Replace the current wordmark block with a two-line lockup:

```tsx
<div className="wordmark">
  <h1>
    <ChannelRing tone="var(--accent)" active size={12} />
    <span>Brainstem</span>
  </h1>
  <span className="wordmark-tagline">a Mutant Brain utility</span>
</div>
```

Styles:

- `.wordmark h1`: `font-size: 34px`, `font-weight: 600`, `letter-spacing: -0.02em`, flex row with 10px gap.
- `.wordmark-tagline`: `font-family: var(--font-serif)`, `font-style: italic`, `font-size: 14px`, `color: var(--text-dim)`, `letter-spacing: 0.01em`.
- Remove `.wordmark .dot` styles, remove `<SignalTrace />`, and delete `src/components/SignalTrace.tsx`.
- The existing `.wordmark-trace` class and its styles are removed.

## Footer zigzag

The panel has a zigzag engraving at the bottom. Represent it once as a small mark above the footer area (above the fixed MIDI bar, visually part of the scrollable page bottom).

- Create `src/components/ZigzagMark.tsx` as a tiny inline SVG, 72px wide × 10px tall, currentColor.
- Render it once at the end of `App.tsx`, just before `<MidiBar />`.
- CSS: `display: block; margin: 28px auto 0; color: var(--line-strong); opacity: 0.6;`.
- The path is a simple zigzag: peak-trough-peak repeated, 3 cycles. Do not add gradients, shadows, or animation.

This replaces the orphaned curved line; the only linework on the page now originates from a ring or terminates in the zigzag.

## Profile bar: demote the dashboard

The profile bar currently looks like another card full of equal-weight buttons. Reduce it to a quiet toolbar.

- Remove `.profile-bar` background, border, and padding: make it `display: flex; flex-direction: column; gap: 10px; padding: 0 0 18px; border-bottom: 1px solid var(--line-soft); margin-bottom: 28px;`.
- `.profile-name`: `font-size: 22px`, `font-weight: 500`.
- `.profile-status`: keep as a small outlined mono tag; add `border-color: var(--line)`.
- `.profile-controls`: keep buttons, but all use `btn-ghost` except Save. Save uses the existing `.btn` style (subtle filled). No button gets `btn-primary`; the only primary action on the page is "Send to Mutant Brain".
- `.profile-desc`: keep, `font-size: 12px`, `color: var(--text-dim)`.

## MIDI bar: keep the dot, fix 320px

The MIDI status indicator represents a live connection LED, not a channel identity. It stays a plain filled dot — do not ring-ify it.

- `.status-dot` remains as is.
- Fix the 320px overflow:
  - Reduce `.midi-bar select` `min-width` to `180px` below 560px.
  - Hide `.midi-note` at `max-width: 560px`.
  - The `.profile-label` class in `MidiBar.tsx` is unstyled; add it to CSS: `font-family: var(--font-mono); font-size: 12px; color: var(--text-soft);`.
- Keep the fixed bar, backdrop blur, and primary "Send to Mutant Brain" button as the sole high-contrast action.

## CV cards and gate cells

### CV cards

```tsx
<span className="cv-card-head">
  <ChannelRing tone={color} active={active} selected={selected === i} size={40}>
    {LETTERS[i]}
  </ChannelRing>
</span>
```

- Remove the `.cv-letter` element; the letter now lives inside the ring.
- Keep `.cv-card.is-selected` and `.cv-card.is-idle` logic. Remove `.cv-dot`.
- For idle CVs, `active={false}` and `tone={channelColor(i)}`; the ring dims but stays identifiable as A/B/C/D.

### Gate cells

```tsx
<div className="gate-cell-main">
  <ChannelRing tone={color} active={active} selected={selected === i} size={22}>
    {String(i + 1).padStart(2, "0")}
  </ChannelRing>
  <span className="gate-text">…</span>
</div>
```

- Remove `.gate-dots` and `.gate-dot` entirely. The ring now carries state.
- `.gate-num` element is removed; the number lives inside the ring.
- Right-column mirror classes continue to work via `flex-direction: row-reverse`.

## Copy deck

Use these exact strings unless otherwise directed:

- Wordmark: "Brainstem"
- Tagline: "a Mutant Brain utility"
- Section titles: "CV Outputs", "Gate Outputs"
- MIDI label: "MIDI Output"
- MIDI note: "Pause other MIDI traffic while sending."
- Primary button: "Send to Mutant Brain"

## Guardrails / non-goals

Do not add:

- Gradients on UI atoms (the existing ambient backdrop is the only gradient).
- Metallic textures, bezels, screw heads, shadows, or any skeuomorphic jack rendering.
- Neuron, synapse, brain, cable, or wire imagery.
- Glassmorphism beyond the existing MIDI bar backdrop blur.
- New animation beyond existing transitions and the busy pulse.
- New colors beyond the tokens listed in this document.
- Rings around the MIDI status dot.

## Files to touch

- `src/index.css` — tokens, layout, ring styles, profile bar, MIDI bar, cleanup removed classes.
- `index.html` — add Instrument Serif and JetBrains Mono 700 to font link.
- `src/components/ChannelRing.tsx` — new.
- `src/components/ZigzagMark.tsx` — new.
- `src/components/CvRack.tsx` — use ChannelRing, remove cv-dot/letter split.
- `src/components/GateGrid.tsx` — use ChannelRing, remove gate-dots.
- `src/components/App.tsx` — new wordmark, remove SignalTrace, add ZigzagMark.
- `src/components/SignalTrace.tsx` — delete.
- `src/app/colors.ts` — add `channelColorDim` helper.

## Acceptance checks

Before marking done, verify:

- [ ] `npm test` passes.
- [ ] `npx tsc -b` passes.
- [ ] `npx oxlint src` passes.
- [ ] Desktop screenshot shows rings on every CV and gate output, no colored dots remain.
- [ ] 320px screenshot shows no content hidden behind the MIDI bar and no horizontal overflow.
- [ ] Both left and right column mirror layouts render correctly.
- [ ] The wordmark ring, CV rings, gate rings, and (if any) selected halos all use the same component.
- [ ] Muted CVs and disabled gates are still identifiable by their channel color in dim form.
