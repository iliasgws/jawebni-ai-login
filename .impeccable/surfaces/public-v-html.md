---
version: 1
slug: "public-v-html"
primary_target: "public/v.html"
related_targets: ["public/index.html","public/admin.html"]
---

# Surface: customer delivery surfaces (gate + credentials) and admin

## Scope and visitor mode

Mode: **Operate**. Three routes in one world:

- `public/index.html` (`/`) — access gate. Customer enters the code from their message.
- `public/v.html` (`/v/<id>`) — customer credentials. The money surface.
- `public/admin.html` (`/admin`) — agent link generator. English, dense, high-frequency.

## Audience, job, action, proof, constraints

Audience: a customer on a **phone, right after purchase**, one hand, low patience, French by default with EN/AR available; and an agent at a desk issuing links many times a day.

Job: customer gets login + password + the live verification code in seconds. Agent issues, searches, copies, revokes.

Proof: the account is live and the codes are ready — the page *is* the delivery.

Constraints: zero-dependency, no build step, no external requests or CDNs; security invariants (no token/salt/order SN in URLs or logs); WCAG AA contrast; full RTL; `prefers-reduced-motion`; revocation is immediate.

## Chosen direction

**The gold scratch-off recharge card.** The credentials are a *ticket you redeem*, not a dashboard tile. A customer already opened their personal link — the same act as buying a recharge card — so the page is printed card stock and the live codes sit behind a gold foil panel that opens with one tap.

## Memorable moment

The foil. A gold stippled panel with the countdown engraved in it; one tap sweeps it away and stamps the code into place with a copy-confirmation that fades like an ink stamp.

## Unresolved decisions

- Whether the reveal gesture is drag-to-scratch or a single tap on mobile (leaning: tap, with drag as an enhancement — faster, and works for keyboard and screen readers).
- How the validity stamp behaves once the account nears expiry (currently the days badge).

## Direction contract

<!-- impeccable:direction-contract 1 -->

**THESIS.** The credentials are a ticket you redeem, not a collection of dashboard cards: the page is printed card stock with a gold foil panel that opens to give you the live code. It refuses the category default this project already ships — the centered dark card, the amber button, the stack of rounded floating panels with a colored left border.

**OWN-WORLD.** Bone card stock ground `#F2ECE1`, ink `#1A1512`. Oxide red `#B01D10` (from the mark) carries validity stamps, revoked/VOID, and destructive intent only. Gold `#E9A21C` is a *material* — the foil panel and the primary action — stippled, never a gradient text. Brass hairline rules `#D9CFBE` at 1px are the only elevation; no ghost borders under shadows. Component language: ticket rectangles with a clipped corner and perforation notches, tracked caps labels at 0.08em, tabular mono as the display voice (codes, serials, denominations, countdowns — the ticket's native language), denomination stamps. Tones snap to a five-step ramp; no ad-hoc rgba.

**STORY.** Customer: "my account is here, it is valid until X, the codes are behind the foil" — open link, read the ticket, tap the foil, copy, leave. Agent: issues tickets from a list; revoke stamps the ticket VOID in oxide red.

**FIRST VIEWPORT.** Gate: the mark on the ticket head band at full width, the heading, a mono scratch-slot input that reads like an unredeemed code strip, and a full-width gold CTA beneath it — one column, card-stock ground, no nav. Credentials: ticket head band with mark + service stamp; validity stamp opposite; then the credential rows printed as ruled fields (label left in tracked caps, mono value right); then the foil panel carrying the live code and countdown; then the hazard plate for "do not change the password". Admin: same stock and rules at denser measure, the issue form as a ticket stub, the table as perforated ledger rows, gold primary action, oxide revoke isolated by empty space.

**FORM.** The gold scratch-off recharge card. Position: 1 of 7 on the grounded list (top-ranked), locked by user decision over the roll. Seed key `4ae2fe48`.

**FINISH.** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
