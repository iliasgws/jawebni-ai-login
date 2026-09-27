# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Customers** — people who just bought an account on a delivery platform (GamsGo) and want to log in now. Their scene is a phone, right after purchase, one hand, low patience: they have a personal link or an access code and need login, password, and any verification code without hunting. Many are in Tunisia (phone placeholder `+216`); the customer UI is multi-language FR/EN/AR.

**Agents** — the Jawebni team who sell and deliver. They work at a desk on the admin panel: issue a customer link from name + phone, copy it into a chat, search past links, revoke one when something goes wrong. High frequency, low tolerance for friction. Admin UI is English.

## Product Purpose

Deliver purchased account credentials through personal, unguessable links. A customer opens their link and immediately sees the account they bought plus the codes needed to sign in. An agent issues those links from a phone number and can revoke any of them instantly.

Success is: a customer is logged in within seconds of opening their link, on a phone, without contacting support; an agent issues a link in under fifteen seconds and can find and revoke it later.

## Positioning

The link is the product. Nothing in a customer URL exposes the order number or the delivery token: the public id is a one-way hash of order id + per-link random noise + a server-side salt. Support ends at "here is your link." The delivery is the account itself — live, ready, and already accompanied by the codes that would normally block a login.

## Operating Context

- Customers open the link from a chat message (WhatsApp / Messenger / SMS), on a phone browser, often with the target service's login page open in another tab or app.
- Agents generate links while talking to a customer, pasting the result straight into chat.
- Credentials are sensitive: the customer is told not to change the password or add 2FA, because the account is shared inventory.
- The service is `noindex,nofollow`. No analytics, no third-party requests.
- Revocation must take effect immediately — a revoked link is dead the moment the agent clicks it.

## Capabilities and Constraints

- Zero-dependency, no framework, no build step. Node.js >= 20, ESM. `npm start` / `npm dev`, `npm run check`.
- Three surfaces: access gate (`/`), customer credentials (`/v/<id>`), admin panel (`/admin`).
- Customer UI is multi-language: **FR (default), EN, AR**, with Arabic requiring RTL. Language is switchable in the UI and must persist for the visit.
- Admin UI is English only.
- Security invariants that must never regress: no token, salt, or order SN in customer URLs or logs; customer data never shown without a valid token; revocation is immediate and server-side.
- Config is environment variables only (`ADMIN_PASSWORD`, `GAMSGO_ORDER_SN`, `GAMSGO_TOKEN`, `PORT`, `HOST`, `GAMSGO_HOST`, `GAMSGO_LANG`). Nothing secret in the repository.
- Time-based (TOTP) and email verification codes are fetched live and shown with a countdown. They expire; the UI must make expiry obvious.
- No third-party fonts, no CDNs, no external requests of any kind.

## Brand Commitments

- **Name and mark**: Jawebni. The existing mark is a calligraphic wordmark — warm near-black ink with gold and red — on a plain ground. It survives any redesign.
- **Gold accent**: the warm gold carried by the mark (`#F9BA1D` / `#EDB32B` family) is the brand accent. It must remain the accent of the system.
- Otherwise the palette, light/dark choice, and typography are open; the previous near-black + amber treatment is not binding.

## Evidence on Hand

- `public/logo.png` (1208×594, opaque, white ground, calligraphic mark in near-black + gold + red) and `public/favicon.png` (64×64).
- Working copy in French across the customer surfaces; English in admin.
- `README.md` documents the product and its security model.
- `GAMSGO_DELIVERY_API.md` documents the upstream delivery API.
- **Absences that must not be fabricated**: no customer testimonials, no usage numbers, no pricing, no logos of the upstream delivery platform, no photography, no customer names. Demo/placeholder credentials used in development are synthetic and must never be presented as real.

## Product Principles

1. **The link is the product.** Every surface decision serves the moment a customer opens it and the moment an agent sends it. Nothing may expose the machinery behind either.
2. **Seconds, not minutes.** A customer on a phone after purchase gets credentials and codes with no scrolling hunt, no reading, no second screen.
3. **Truth over reassurance.** Expiry, revocation, and the "do not change the password" warning are stated plainly. Never decorate a risk.
4. **Shared inventory is fragile.** The account is used by others; the UI must discourage the actions that break it and make the consequences legible.
5. **Quiet utility for the agent.** The admin panel is a tool used many times a day. Density, keyboard-friendliness, and reversibility beat charm.

## Accessibility & Inclusion

- Mobile-first: the customer surface must be legible and operable one-handed on a small phone screen.
- WCAG AA contrast for all text and controls, in every language and in both reading directions.
- Full RTL support for Arabic (`dir="rtl"`), including layout mirroring, not just translated strings.
- Keyboard operability, visible focus, `prefers-reduced-motion` honoured, screen-reader labels on icon-only controls.
