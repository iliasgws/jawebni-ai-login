---
name: Jawebni
description: Gold scratch-off recharge tickets on a petrol counter — a delivery portal for purchased account credentials.
colors:
  counter: "#103033"
  stock-face: "#fbf8f2"
  stock-stub: "#e9e2d5"
  stock-pressed: "#ded5c5"
  ink: "#1a1512"
  ink-2: "#574c42"
  ink-3: "#6b6055"
  rule: "#d9cfbe"
  rule-strong: "#c4b8a4"
  control: "#807566"
  gold: "#e9a21c"
  gold-lift: "#f5b63e"
  gold-glint: "#fff1c4"
  gold-shade: "#b87a0f"
  gold-deep: "#8a5f09"
  gold-wash: "#fbeed4"
  oxide: "#b01d10"
  oxide-wash: "#f7e3e0"
  positive: "#2f6b52"
  positive-wash: "#e1ede7"
  on-counter: "#e7edea"
  on-counter-2: "#b9c4c2"
  on-counter-3: "#8fa3a1"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  heading:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', 'Noto Sans Arabic', 'Geeza Pro', Tahoma, Arial, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 700
    lineHeight: 1.55
    letterSpacing: "0.08em"
  display:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.04em"
  data:
    fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', 'Cascadia Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  card: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.gold-lift}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "42px"
  button-secondary:
    backgroundColor: "{colors.stock-stub}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "42px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.oxide}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
    height: "42px"
  input:
    backgroundColor: "{colors.stock-stub}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "11px 13px"
  card:
    backgroundColor: "{colors.stock-face}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "0"
  stamp:
    backgroundColor: "{colors.stock-stub}"
    textColor: "{colors.ink-2}"
    rounded: "2px"
    padding: "5px 9px"
  stamp-positive:
    backgroundColor: "{colors.positive-wash}"
    textColor: "{colors.positive}"
    rounded: "2px"
    padding: "5px 9px"
  stamp-negative:
    backgroundColor: "{colors.oxide-wash}"
    textColor: "{colors.oxide}"
    rounded: "2px"
    padding: "5px 9px"
---

## Overview

Jawebni delivers purchased account credentials through personal, unguessable links. The visual world is the **gold scratch-off recharge card**: the credentials are a ticket you redeem, not a dashboard tile.

Every content surface is a printed ticket lying on a **petrol counter** (`counter`). The ticket carries a cut top-right corner, a dashed **perforation tear** bitten through at both edges, and a **gold foil panel** that opens to reveal the live verification code. The counter is deliberately not cream — it frames the card stock so the ticket is the only thing you read.

Three routes, one world: the access gate, the customer credentials page (the money surface), and the admin panel (the same stock at a denser measure). The admin header is a bone plate rather than a bar, because **the mark must always sit on card stock**, never on the counter.

Operate mode: expression never obscures the task, state, or familiar affordance. Restraint lives in the palette; personality lives in the material.

## Colors

**Roles carry meaning and nothing else:**

| Token | Role |
| --- | --- |
| `gold` | The foil material and every primary action. Never used as text. |
| `gold-deep` | Gold *as* text on stock (links, focus ring) — 5.32:1. |
| `oxide` | Validity stamps, revoked/VOID, destructive intent only. |
| `positive` | Valid / ready states. |
| `counter` | The table the tickets lie on; carries only `on-counter` text. |

The five-step **stock ramp** (`stock-face` → `stock-stub` → `stock-pressed`) is the only source of surface tone. Role washes (`gold-wash`, `oxide-wash`, `positive-wash`) are declared palette entries, not ad-hoc alpha.

`on-counter` / `on-counter-2` / `on-counter-3` are the only text colors permitted directly on the counter. Everything else renders on stock and takes `ink`.

**Contrast floor:** every text pair is ≥4.5:1 (`ink` on `stock-face` = 17.08, `ink-3` on `stock-stub` = 4.75, `on-counter-3` on `counter` = 5.31). Control outlines (`control` = `#807566`) clear 3:1 on every stock step. Gold's grain and sheen are tuned so `ink` stays ≥4.5:1 across the whole foil panel (worst case `gold-shade` = 5.03).

## Typography

One workhorse sans for UI, per Operate mode — system stack, no web fonts, no CDN, no network requests. Arabic resolves through the same stack (`Noto Sans Arabic`, `Geeza Pro`, `Tahoma`).

**Tabular mono is the display voice**, not a costume: codes, serials, link ids, denominations, and countdowns are the ticket's native language and are set large (`2.25rem`, `font-variant-numeric: tabular-nums`). Section headings carry their own weight without caps, tracking, or a kicker above them.

Tracked caps (`0.08em`, `11px`) label fields, columns, and controls — never sentences or headings. Tracking never goes below `-0.04em`; headings use `-0.015em`. Fixed rem scale, ratio ≈1.15, no fluid `clamp()`.

## Layout

Responsive behaviour is structural, not typographic. A `.shell` (760px narrow, 1080px default, 1140px wide) holds `.ticket` blocks separated by 16px; only `tear` notches and text sitting directly on the counter live outside them.

- **≤760px:** credential rows collapse from `label | value | actions` to `label` over `value | actions`; the admin table becomes a stack of rows with `data-label` captions; the grid drops to one column.
- **Ticket anatomy:** optional `.ticket-head` → `tear` → `.ticket-body` → `tear` → `.ticket-stub`. The stub (warmer stock) carries terms, warnings, and provenance.
- **RTL:** every margin, padding, border, inset, and origin is logical (`inset-inline-*`, `margin-inline-*`). The cut corner and the foil's reveal clip mirror under `[dir="rtl"]`. Credential values carry `dir="ltr"` so passwords, emails, and codes never bidi-mangle.

## Elevation & Depth

**Elevation is a hairline rule and nothing else.** There are no box-shadows anywhere except the zero-offset focus ring (`0 0 0 3px` wash + `0 0 0 4px` gold-deep), which is an accessibility indicator, not depth. A 1px border under a wide soft shadow is a ghost card; this world declares elevation once.

Depth comes from material instead: the counter is a different temperature and luminance from the stock, the stub is one step down the ramp, and the cut corner plus perforation notches read as physical edges.

## Shapes

- **Ticket:** `8px` radius with an **18px cut top-right corner** (`clip-path`, mirrored in RTL) and a hairline drawn along the cut. This is the world's signature shape and deliberately sits below the generic 12–16px card default — a larger radius fights the cut.
- **Tear:** `1px dashed rule` full-bleed across the ticket with two `16px` counter-coloured circles punched half-off each edge.
- **Controls:** `4px` radius (tickets are rectangles, not pills). `999px` only for the meter track.
- **Stamp:** `2px` radius, `1px` border, boxed — a rubber stamp, not a pill.

## Components

**`.ticket`** — the only container. Bone face, 1px `rule` border, cut corner, no shadow.

**`.foil`** — the signature interaction. A gold panel with fine metallic grain (two dot layers at 3px/5px) under one broad diagonal sheen; tap it and the veil clip-path sweeps away to reveal the live code, then focus moves to the copy button. States: veiled → busy (glint pulse on the icon) → open → done. Mirrors its clip direction in RTL. Reduced-motion skips the sweep.

**`.cred`** — printed field row: tracked-caps label, mono value on a dotted leader, icon actions. Copy confirmation is an ink stamp (`.copied::after`) that lands at −4° and fades — one authored moment, alongside the foil.

**`.btn`** — gold primary, stock secondary, oxide danger. Every control has default / hover / focus / active / disabled; inputs add error and loading. Minimum 42px (38px dense), 40px icon buttons.

**`.badge`** — the stamp (validity, order id, ready). `.notice` — a plate with an authored icon via mask: `.error`, `.ok`, and `.plate` (the hazard block for account-destructive warnings).

**Icons** — one authored SVG sprite (`.sprite`), one 1.6 stroke weight, referenced by `<use>`. Never a Unicode glyph: the sprite must be `display: none`, because the `hidden` attribute is ignored on SVG and a bare `<svg>` defaults to 300×150.

**Loading** uses skeletons, not spinners mid-content. Empty states teach the next action.

## Do's and Don'ts

**Do**

- Put the mark on `stock-face`. Never on the counter.
- Give every reveal, error, and expiry a plain-language state next to the code it affects.
- Use logical properties and mirror the cut corner and foil clip under `[dir="rtl"]`.
- Set codes, ids, and countdowns in tabular mono; let size and weight carry hierarchy.
- Keep `oxide` for destructive and revoked states only; keep `gold` for actions and foil only.
- Theme selection, caret, scrollbar, and focus rings from the palette.

**Don't**

- Don't add a box-shadow for elevation, or a 1px border under one.
- Don't put a colored `border-left`/`border-right` above 1px on a card, callout, or alert.
- Don't set a sentence or a heading in tracked caps, and don't put a kicker above a heading.
- Don't reach for emoji or Unicode glyphs as icons; draw them into the sprite.
- Don't use gradient text, glass-as-decoration, or `feTurbulence` grain.
- Don't introduce cream + serif + terracotta as the ground — the counter is petrol and the display voice is mono.
