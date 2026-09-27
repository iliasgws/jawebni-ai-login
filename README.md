# Jawebni — delivery portal

A small, zero-dependency web app for delivering purchased account credentials to
customers through personal, unguessable links — plus an admin panel to issue and
revoke those links.

Built with plain Node.js (>= 20), no frameworks, no build step.

## What it does

**Customers** receive one personal link (or just the access code it contains).
Opening it shows the account they bought — login, password, and one-tap access to
time-based (TOTP) or email verification codes — in French, on any phone or
desktop.

**Agents** sign in to the admin panel, enter the customer's name and phone, and
get a link to send them. Links can be copied, opened, searched, and revoked at
any time. Revoking takes effect immediately. The panel keeps a pool of backend
order ids (each paired with its delivery token); the backend picked at link
creation decides which order and token the customer's link is issued against.

Nothing in a customer URL ever exposes the underlying order number or delivery
token: the public id is a one-way hash of the order id, a per-link random value,
and a server-side salt.

## Quick start

```bash
git clone https://github.com/iliasgws/jawebni-ai-login.git
cd jawebni-ai-login
ADMIN_PASSWORD=yourpass GAMSGO_ORDER_SN=your-order GAMSGO_TOKEN=your-token npm start
```

Then open:

| Page | URL |
| --- | --- |
| Customer access (token entry) | `http://localhost:3000/` |
| Admin panel | `http://localhost:3000/admin` |
| Customer credentials | `http://localhost:3000/v/<id>` |

For development with auto-restart: `npm run dev`.  
For a syntax check of all JS: `npm run check`.

## Configuration

All configuration is via environment variables — nothing secret is stored in the
repository.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | recommended | `change-me` (warns) | Password for the admin panel |
| `GAMSGO_ORDER_SN` | **yes** | — | Order id on the delivery platform |
| `GAMSGO_TOKEN` | **yes** | — | Delivery token for that order |
| `PORT` | no | `3000` | HTTP port |
| `HOST` | no | `0.0.0.0` | Bind address |
| `GAMSGO_HOST` | no | `https://delivery.gamsgo.pro` | Upstream API base |
| `GAMSGO_LANG` | no | `fr` | Upstream response language |

The server prints a warning at startup if anything required is missing.

## How it works

1. An agent creates a link for a customer. The app derives a public id as
   `base32(sha256(order id + per-link random + server salt))` and stores the
   mapping in `data/store.json`.
2. The customer opens `/v/<id>` (or types the id on the front page). The server
   looks up the order, fetches the live account data upstream, and renders it.
3. One-time codes (TOTP / email) are requested on demand — never stored, never
   exposed in the URL.

The random per-link value means the same customer never shares an id with
another, even for the same order. The salt lives only on the server.

## Project layout

```
server.js            HTTP server, routes, validation, sessions
lib/ids.js           Public-id derivation (hash + base32)
lib/store.js         data/store.json persistence
lib/gamsgo.js        Upstream delivery-API client
public/              Static front-end (no build step)
  index.html/js      Customer token gate
  v.html/js          Customer credentials page
  admin.html/js      Admin panel
  ui.js              Shared helpers
  style.css          Design system
GAMSGO_DELIVERY_API.md   Notes on the upstream delivery API
```

## Security notes

- Customer URLs contain only the hashed public id — never the order id or
  delivery token.
- The admin panel is session-based (httpOnly cookie), with rate-limited login.
- Deleting a link removes access immediately; the page then says the link is
  invalid or expired.
- `data/` holds live credentials and is gitignored. Back it up privately.
- Keep `ADMIN_PASSWORD`, `GAMSGO_TOKEN`, and `GAMSGO_ORDER_SN` out of the repo —
  pass them as environment variables.

## Documentation

- `AGENTS.md` — conventions for working in this repository
- `GAMSGO_DELIVERY_API.md` — upstream delivery API reference (sanitized)
