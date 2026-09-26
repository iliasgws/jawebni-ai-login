# AGENTS.md

## Project Overview

`jawebni-ai-login` — a delivery portal for purchased account credentials. Customers open a personal, unguessable link and see their account (login, password, TOTP/email verification codes); agents use an admin panel to issue, list, and revoke links. Zero-dependency Node.js (>= 20, ESM, no framework, no build step). Customer-facing UI is in French.

- Run: `npm start` / `npm run dev` (`node --watch server.js`)
- Syntax check (the only "lint"): `npm run check`
- No test suite exists. At minimum run `npm run check` after every change; verify behavior manually with `npm run dev` + curl.

## Architecture

- `server.js` — the whole HTTP server: routing, static file serving, admin auth (session cookie, 12h TTL), and all JSON API endpoints. No framework; hand-rolled `http` server.
- `lib/store.js` — persistence layer. Reads/writes `data/store.json` (links, salt, verify state). This is the only mutable state.
- `lib/ids.js` — link ID scheme. Public IDs are a one-way hash of order id + per-link random value + server-side salt; never expose order numbers or the delivery token in URLs.
- `lib/gamsgo.js` — GamsGo API client (order verification, TOTP/email code fetching, background code jobs). Defaults/env in `GAMSGO_DELIVERY_API.md`.
- `public/` — static frontend, plain JS:
  - `index.html` + `ui.js` — customer delivery page
  - `admin.html` + `admin.js` — agent panel
  - `v.html` + `v.js`, `gate.js` — verification/gate pages
  - `style.css` — shared styles

## Environment Variables

`ADMIN_PASSWORD` (default `change-me`), `GAMSGO_ORDER_SN`, `GAMSGO_TOKEN`, `PORT` (3000), `HOST` (0.0.0.0). See `GAMSGO_DELIVERY_API.md` for the delivery-token default and API details.

## Conventions

- ESM (`import`/`export`) only; Node >= 20 built-ins. Do NOT add npm dependencies — the project is intentionally zero-dependency.
- Keep everything in the existing file layout; don't introduce a framework, build step, or bundler.
- Customer-facing text is French; admin-facing text may be English.
- `data/store.json` is runtime state — never commit changes to it or hand-edit it except to test.
- Security-sensitive: never leak the delivery token, salt, or order SN into URLs, logs, or the frontend.

## Git & PR Workflow (mandatory)

For EVERY change an agent makes to this repository, regardless of size:

1. **Create a GitHub issue first** describing the change (use `gh issue create`). Reference it in commits (`#<n>`).
2. **Work on a dedicated branch** — never commit directly to `main`. Branch name: `<type>/<short-desc>` (e.g. `fix/session-expiry`, `feat/download-csv`).
3. **Open a pull request** with `gh pr create`, linking the issue (`Closes #<n>` in the PR body).
4. **NEVER merge the PR** — no `gh pr merge`, no push to `main`, no local merge. The user reviews and merges manually.
5. Run `npm run check` before opening the PR; mention the result in the PR body.

This applies to bug fixes, features, refactors, docs, and config alike. Trivial one-line typo fixes still go through the same flow — the only exception is when the user explicitly says to commit straight to `main`.

## Task Management

IMPORTANT: These are mandatory workflow rules.

- For EVERY non-trivial request involving multiple steps, files, components, bugs, or implementation work, you MUST use OpenCode's built-in `todowrite` tool.
- Do NOT merely write a Markdown checklist in the chat. Use the actual `todowrite` tool so the OpenCode task panel stays synchronized.
- Create the task list BEFORE starting implementation.
- Break the work into concrete, verifiable tasks.
- Tasks must represent actual implementation steps, not vague descriptions.
- Keep the task list dynamically synchronized with the work throughout the entire session.
- Before starting a task, mark it `in_progress`.
- There should normally be only ONE `in_progress` task at a time.
- As soon as a task is actually finished and verified, immediately mark it `completed`.
- Do NOT wait until the end of the request to mark several tasks completed at once.
- If implementation reveals additional required work, immediately add new tasks to the todo list.
- If a task becomes unnecessary, remove/cancel it rather than leaving stale work in the list.
- If the user changes the requirements, immediately update/reorder the todo list before continuing.
- Never mark a task completed merely because code was written. Verification must be finished first.
- Testing, linting, typechecking, build verification, and UI verification should appear as explicit tasks when relevant.
- Bug fixes must include reproduction/diagnosis, implementation, and verification tasks when appropriate.
- UI work must include final visual/interaction verification when relevant.
- Do not abandon the todo list midway through implementation.
- Before giving the final response, inspect the todo list and ensure there are no incorrectly pending or in-progress tasks.
- If work remains unfinished, leave those tasks visibly pending and explicitly explain why.
- The todo list is the authoritative execution plan for the current request.
