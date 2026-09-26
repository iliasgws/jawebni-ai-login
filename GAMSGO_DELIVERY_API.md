# GamsGo "delivery account" link — reverse-engineered protocol

Everything below was derived by reading the shipped SPA bundle and probing the live API on
`delivery.gamsgo.pro`. It describes the **account-credential hand-off page** that GamsGo serves
at `/delivery_account/v/{TOKEN}` after a purchase.

> ⚠️ The "Live example" values in §10 are **real credentials/tokens for a real order**. Treat this
> file as a secret. Do not commit it.

---

## 1. Architecture at a glance

```
Browser
  │  GET /delivery_account/v/{TOKEN}?lang=fr        ← static SPA shell (Go http.FileServer + PathPrefix)
  ▼
index.html  (<base href="/delivery_account/">)
  ├─ ./import-*.css
  ├─ ./view-*.js          ← main app (i18n, state machine, API client)   ← everything documented here
  ├─ ./import-*.js        ← react/react-dom + helpers
  └─ ./fr-*.js            ← lazy locale chunk, one per language

SPA then talks to:
  GET/POST  /delivery_account/api/view/{TOKEN}[/{sub}]
```

Key facts:

* The whole app is **client-side rendered**. `index.html` contains only `<div id="root">`.
* There are **no cookies and no session header**. Auth is a per-link bearer token passed in
  `X-Order-Verify-Token`.
* Every API response is **HTTP 200**, even for errors. Success/failure is decided by the JSON
  field `code`.
* Every request carries a `lang` query parameter; the server echoes back **localized** error
  messages in that language.

---

## 2. The link token

The URL is `/delivery_account/v/{TOKEN}`. The client extracts it with:

```js
/\/v\/([0-9A-HJKMNP-TV-Z]{20})/        // Wr(pathname)
```

* exactly **20 characters**
* alphabet is **Crockford Base32**: `0-9 A-H J K M N P-T V-Z`
  (uppercase only; `I`, `L`, `O`, `U` excluded — so `U` in your token is not a typo)
* extraction failure ⇒ UI shows `ui.err.link_invalid` and no request is made.

Example: `<DELIVERY_TOKEN>`

---

## 3. Why a naive `curl` of the API 301s

Two independent traps:

| Mistake | Result |
|---|---|
| `GET https://delivery.gamsgo.pro/api/view/{TOKEN}` | **301 → `https://www.gamsgo.com`**, then Cloudflare error **1020 access denied** |
| Correct: `GET https://delivery.gamsgo.pro/delivery_account/api/view/{TOKEN}` | **200** |

The base path is not `/`. It comes from two places in the bundle:

```html
<base href="/delivery_account/">          <!-- index.html, fixes relative asset URLs -->
```
```js
var w1 = "/delivery_account";             // imp2.js → re-exported as `sr`
```

The request builder is:

```js
function Cr(path) {                       // append language
  return `${path}${path.includes("?") ? "&" : "?"}lang=${J()}`;
}
async function K(path, init) {
  const res  = await fetch(Cr(sr + path), init);
  const body = await res.json();          // non-JSON ⇒ ui.err.bad_response {status}
  if (body.code !== 200) throw Error(hr(body.type, body.message));
  return body.data;
}
```

Full URL = `https://delivery.gamsgo.pro` + `/delivery_account` + `/api/view/...` + `?lang=fr`.

Useful headers to imitate the SPA (Cloudflare is in front):

```
User-Agent:   Mozilla/5.0 ... Chrome/131.0 ...
Referer:      https://delivery.gamsgo.pro/delivery_account/v/{TOKEN}?lang=fr
Accept:       application/json
```

---

## 4. Response envelope

### Success
```json
{ "code": 200, "data": { ... }, "message": "success", "type": "success" }
```

### Failure — still HTTP 200
```json
{ "code": 1000, "data": {}, "message": "<localized human text>", "type": "<error_type>" }
```

* `code` is the machine signal (`200` ok, anything else = failure).
* `type` is the stable machine key used to pick a localized message client-side.
* `message` is already localized by the server using the `lang` query param.
* Client precedence for the text shown to the user:
  `localization["err."+type]` → `body.message` → `ui.err.fallback`.

### `lang`

Resolution order in the SPA (`xr()`):

1. `?lang=` query parameter
2. `localStorage["gg_fa_locale"]` — only if `source === "manual"`
3. `navigator.languages` / `navigator.language`
4. fallback `en`

~25 locales are supported (`en de es fr it nl pl pt sk ko ja zh ro ar id hi tl lt ms th vi tr el bn hu zh-tw`).
`lang` is **appended to every API call**, so it also controls server-side error text.
Setting an unknown/empty `lang` on a *manual* selection clears `gg_fa_locale`.

---

## 5. Endpoints

Base for all: `https://delivery.gamsgo.pro/delivery_account/api/view/{TOKEN}`

### 5.1 `GET {base}` — load the record

Optional header: `X-Order-Verify-Token: <token>`

```json
{
  "code": 200,
  "data": {
    "login_type": 4,
    "variant": "",
    "sku": "FA-TOTP",
    "group_name": "非接码2FA直登",
    "plan_name": "",
    "days_left": -1,
    "need_code": false,
    "account": "",
    "password": "",
    "backup_email": "",
    "email_password": "",
    "code_url": "",
    "code_account": "",
    "code_password": "",
    "remark": "",
    "status": 2,
    "discarded": false,
    "has_account_totp": false,
    "has_email_totp": false,
    "can_get_code": false,
    "order_sn_mask": "",
    "show_id_mask": "",
    "locked": true
  },
  "message": "success", "type": "success"
}
```

**Without the header you always get `locked: true` and every credential field is `""`.**
This is the whole security model: the link alone proves you *have* the delivery link; you must
additionally prove you own the *order*.

When `locked: true` the only useful fields are the masks, which are fed into the verify modal:

* `order_sn_mask` — e.g. `"12****34"` → labelled *"Commande / Order"*
* `show_id_mask`  — subscription id mask → labelled *"Subscription ID"*

Other flags that change rendering:

| field | effect |
|---|---|
| `admin_read_only` | show banner "Auth codes available, email code retrieval hidden because it creates a task"; `can_get_code` portal suppressed |
| `admin_view_token` | alt auth header for admin viewers (see §6) |
| `order_verify_token` + `expires_at` | persist to localStorage (§6) |
| `discarded` | credentials revoked → `err.credential_discarded` |
| `days_left === 0` | "expired" warning card, `ui.warn.expired` |
| `status` | `2` observed for a live plan (see `ui.status.active` / `expired`) |
| `has_account_totp` | render the account TOTP widget |
| `has_email_totp` | render the *Google/email* TOTP widget |
| `can_get_code` | render the email-OTP portal (§8) |
| `login_type === 1` && (`code_account`/`code_password`/`code_url`) | render the mailbox portal |
| `login_type === 5` | first credential label becomes "Compte Google" instead of "Compte de connexion" |

Error types: `link_invalid`, `link_invalid_or_expired`, `service_expired`,
`credential_discarded`, `service_unconfigured`, `query_failed`, `rate_limit`.

---

### 5.2 `POST {base}/verify-order` — unlock

```http
POST /delivery_account/api/view/{TOKEN}/verify-order?lang=fr
Content-Type: application/json

{"order_sn":"<ORDER_SN>"}
```

Response = the **full record** (identical shape to §5.1) **plus**:

```json
{
  "locked": false,
  "order_verify_token": "v1.eyJ0Ijoi...",
  "expires_at": 1790541823
}
```

Client-side pre-validation (`Pr` + `Mr`) happens *before* the request:

```js
Pr = s => s.replace(/\s+/g, "")            // strip ALL whitespace
Mr = s => /^\d+$/.test(s) || /^[0-9a-zA-Z]{10}$/.test(s)
```

* empty after strip → `ui.verify.empty`
* fails `Mr` → `ui.verify.format`
  (UI text claims *"16 digits or a 10-char subscription id"*, but the regex accepts **any**
  number of digits, or any 10 alphanumeric chars — so `<ORDER_SN>` works.)
* server rejects → `order_sn_mismatch` (also returned for the malformed-format case, since the
  server does its own check)

Other errors: `order_sn_required`, `verify_failed`, `rate_limit`.

**Rate limiting is real**: repeated bad guesses return `type: "rate_limit"` —
*"Too many attempts. Please try again later."*

---

### 5.3 `POST {base}/hop` — handoff ticket

Some links open with a hash fragment instead of a plain URL:

```
/delivery_account/v/{TOKEN}?lang=fr#h=<ticket>
/delivery_account/v/{TOKEN}#&h=<ticket>     // regex accepts both `#h=` and `&h=`
```

Flow:

1. client reads `location.hash` → `/#[#&]h=([^&]+)/`
2. `POST {base}/hop` with `{"h":"<decoded ticket>"}`
3. on success the SPA does `history.replaceState(null, "", location.pathname + location.search)`
   (drops the hash) and feeds the returned record into the same handler
4. on failure it falls back to the cached verify token, else shows `load_failed`

| body | response |
|---|---|
| `{}` | `type: "hop_ticket_missing"` — *"Ticket d'accès manquant."* |
| `{"h":"deadbeef"}` | `type: "hop_ticket_invalid"` — *"Ticket d'accès invalide."* |
| wrong ticket | `hop_ticket_mismatch` |
| expired | `hop_ticket_expired` — *"reopen this link from your order page"* |
| disabled | `hop_disabled` |

---

### 5.4 `GET {base}/totp?field={account|email}` — one-time code

Header: `X-Order-Verify-Token` **or** `X-Admin-View-Token` (order token wins if both present).

```json
{ "code": 200,
  "data": { "code": "347242", "next_code": "596782", "expires_in": 11, "period": 30 },
  "message": "success", "type": "success" }
```

* `field=account` → the account's own authenticator (for `FA-TOTP` / 2FA direct-login)
* `field=email`  → the Google/Gmail sign-in authenticator
* The **raw TOTP secret is never exposed** — only the currently valid 6-digit value.
* `field` must be exactly `account` or `email`, else `totp_field_invalid`.

Client display logic (`Nr`, threshold `Jr = 5`):

```
if (expires_in <= 5 && next_code):
        sleep (expires_in + 1) * 1000 ms      // let the counter roll over
        show next_code,  countdown = period - 1
else:
        show code,       countdown = expires_in
period defaults to 30
```

* countdown ticks every 1 s; bar width = `countdown / period`.
* `countdown <= 5` ⇒ add `.expiring` class, disable the copy button, tooltip becomes
  *"Expire bientôt — obtenez un nouveau code"*.
* when `countdown` hits 0 the widget drops back to the **"Obtenir le code" button** — i.e. a new
  server round-trip is required; the client does **not** compute TOTP locally.
* concurrent refreshes are debounced with a ref flag.

Errors: `verify_required` (*"verify your order number first"*), `totp_secret_missing`
(*"Ce champ n'a pas de clé 2FA."*), `totp_field_invalid`, `totp_failed`, `rate_limit`.

---

### 5.5 `GET {base}/code` — poll the email-OTP job   (§8 has the full story)

Header: `X-Order-Verify-Token`.

```json
{ "code": 200, "data": { "job": null }, "message": "success", "type": "success" }
{ "code": 200, "data": { "job": { "id": 5524574, "status": 0, "code": "", "pending": true } }, ... }
```

`job` is `null` when there is nothing in flight.

### 5.6 `POST {base}/code` — start an email-OTP fetch

Header: `X-Order-Verify-Token`. **No body.**

```json
{ "code": 200,
  "data": { "id": 5524574, "status": 0, "code": "", "pending": true },
  "message": "success", "type": "success" }
```

⚠️ Note the asymmetry: **POST returns the job directly as `data`, GET wraps it as `data.job`.**

Errors: `code_unsupported`, `code_in_progress` (*"A task is already running for this account"*),
`verify_required`, `rate_limit`.

---

## 6. Auth tokens

### `X-Order-Verify-Token`

Shape: `v1.<base64url-payload>.<signature>`

```
eyJ0IjoiSDZSSkpHMzNOMDhOOVJOODA2QlgiLCJlIjoxNzkwNTQxODIzLCJzIjozMjI3NTEyfQ
↓
{"t":"<DELIVERY_TOKEN>","e":1790541823,"s":3227512}
      └ link token ┘            └ expiry ┘   └ ??? ┘
```

* `e` = unix seconds. Observed `e - issued ≈ 85 990 s ≈ **24 h**`, matching the UI copy
  *"it will not be asked again on this device for a day."*
* Issued by `POST /verify-order`. Every successful verify mints a fresh one.
* Used by: `GET /`, `GET /totp`, `GET /code`, `POST /code`.

### Browser persistence (`localStorage`)

```js
D = token => `gg_fa_verify:${token}`
// value: {"token":"v1...","expiresAt": 1790541823000}   ← expires_at * 1000 (ms!)
```

Boot logic (`yr`):

```js
read  gg_fa_verify:{linkToken}
  ├─ missing / unparsable / no token / expiresAt <= now  → drop key, return null
  └─ valid → use it, call GET / with header; if response says locked → DROP key + re-show modal
write on every verify-order success (Gr)
delete on locked response (pr)
```

So the verify prompt is skipped on a second visit **only while the token is fresh and the
server still accepts it**.

### `X-Admin-View-Token`

Alternate header accepted by `GET /totp` **only when `X-Order-Verify-Token` is absent**
(`if (order) … else if (admin) …`). Issued via `data.admin_view_token` on the record.
Admin sessions that set `admin_read_only` get codes but not the email-OTP task button.

---

## 7. Client boot sequence (state machine)

From `gi()`:

```
1. token = match(location.pathname, /\/v\/([0-9A-HJKMNP-TV-Z]{20})/)
   ├─ no match → "Invalid link", stop
2. h  = location.hash  match /[#&]h=([^&]+)/
3. B  = read localStorage gg_fa_verify:{token}
4. dispatch:
   ├─ if h    → POST /hop {h}  → onSuccess → M(record)
   │            on fail: B ? retryWithToken(B.token) : show load_failed
   ├─ else if B → GET / with X-Order-Verify-Token: B
   │               ├─ locked → pr(token) (drop cache), show modal
   │               └─ ok     → M(record)
   └─ else     → GET / plain
                  ├─ locked → show modal (prefilled masks)
                  └─ ok     → M(record)

M(record):
  ├─ locked: true  → drop cached token, clear verifyToken, open modal with masks
  ├─ else:         → if (order_verify_token && expires_at) persist to localStorage
  │                  if (admin_read_only) notify admin store
  │                  set data → render credentials page
```

Modal (`xi`) posts to `/verify-order` and on success calls the same `M()`.

---

## 8. Email OTP (`can_get_code`) — full detail

This is the "Recevoir le code de vérification" / *"Code de vérification par e-mail"* portal.
It is a **remote job runner**: clicking the button creates a task on the provider's side that
logs into the mailbox, waits for the newest verification mail, and extracts the code.

### UI component `ei`

```
mount ──► GET /code ──► job?
                          ├─ null          → idle, button "Obtenir le code"
                          ├─ pending:true  → button disabled "Récupération du code…",
                          │                 poll GET /code every 3000 ms
                          └─ job           → see state map below
click ──► POST /code ──► job  → re-enter state map
```

State derivation (`di`):

```js
showCode = !!job.code
pending  = inFlight || (!!job.pending && !job.code)
dead     = !!job && !job.pending && !job.code
```

| job state | UI |
|---|---|
| `job == null`, not in flight | idle — button enabled, *"Obtenir le code"* |
| `pending: true`, `code: ""` | button disabled, *"Récupération du code…"*, polling @ 3 s |
| `code: "123456"` | big copyable code box + copy button |
| `pending: false`, `code: ""` | **dead** — red warn card *"Impossible d'obtenir le code. Veuillez réessayer dans un instant."*, button re-enabled so you can retry |

Polling is cancelled as soon as `pending` goes false; a request-generation counter
(`f.current`) discards stale responses.

### Observed job lifecycle (live)

```
POST /code            → {id:5524574, status:0, code:"", pending:true}
GET  /code  (+0..15s) → {id:5524574, status:0, code:"", pending:true}   ← still running
GET  /code  (+~20s)   → {id:5524574, status:3, code:"", pending:false}  ← terminal
GET  /code  (forever) → same terminal object
```

A second run (`id: 5524626`) behaved identically: `pending:true` for ~50 s, then
`status:3, code:"", pending:false`. In both runs the mailbox had **no fresh verification mail**
(a GamsGo OTP task expects you to *already be sitting on the target site's login page*, which
triggers the mail). So `status:3` here means "nothing found / task gave up", not necessarily a
transport error. The success shape (`pending:false` **with** a non-empty `code`) was not
observed live — the client never inspects `status`, only `pending` and `code`, so success is
whatever object carries `code`.

Note the job object returned by `GET` is **the same object you POSTed**, not a new one — the id
is stable for the life of the task.

`status` semantics (inferred from the client + observations):

| `status` | `pending` | meaning |
|---|---|---|
| `0` | `true`  | queued / running — keep polling |
| `1`/`2`    | `true`  | (not observed; presumably intermediate) |
| `3` | `false` | terminal failure — empty `code` ⇒ dead state |
| ?   | `false` with `code` filled | success (not observed; `showCode` only checks `code`) |

The client only ever branches on `pending` and `code` — `status` is passed through untouched.
A failure (`status:3`, empty code) is *not* retried automatically; the user must click again,
which mints a **new job id**.

### Prerequisites / gating

* requires `X-Order-Verify-Token` → otherwise `verify_required`
* requires `data.can_get_code === true` on the record (this link: **true**)
* suppressed when `data.admin_read_only === true`
* `data.need_code` is a separate flag (this link: `false`) controlling other UI

### Related: the mailbox portal (`login_type === 1`)

A different, *direct* path: the record carries `code_account` / `code_password` /
`code_url`. If present, the UI renders "Adresse e-mail" + "Mot de passe e-mail" credential rows
and an **"Ouvrir le site de messagerie"** link straight to `code_url` — no job, no polling.
The `ei` portal is *not* used in that mode (`can_get_code` and this portal are separate branches).

### Step-by-step tutorial rendered from i18n

`ui.getcode_tutorial.*` drives a 5-image walkthrough (`public/{lang}-fa-totp-*.webp`):

1. Enter the address
2. Enter the password (skippable if the site omits the step)
3. Verification page → two options:
   * **Option 1** — page says *"Consultez votre application d'authentification"*
   * **Option 2** — page says *"Consultez votre boîte de réception"* → click **Obtenir le code**
     under **Code de vérification par e-mail** here, paste it back

---

## 9. Error catalogue (machine `type` → FR text)

| `type` | French `message` |
|---|---|
| `link_invalid` | Lien invalide. |
| `link_invalid_or_expired` | Ce lien est invalide ou a expiré. |
| `service_expired` | Cet abonnement a expiré. Veuillez le renouveler depuis la page de votre commande. |
| `credential_discarded` | Ces identifiants ont été révoqués. Pour toute question, contactez le support. |
| `service_unconfigured` | Service temporairement indisponible. Veuillez réessayer plus tard ou contacter le support. |
| `query_failed` | *(same as above)* |
| `hop_disabled` | *(same as above)* |
| `order_verify_disabled` | *(same as above)* |
| `verify_failed` | *(same as above)* |
| `totp_failed` | *(same as above)* |
| `json_invalid` | Le corps de la requête n'est pas un JSON valide. |
| `hop_ticket_missing` | Ticket d'accès manquant. |
| `hop_ticket_invalid` | Ticket d'accès invalide. |
| `hop_ticket_expired` | Ce ticket d'accès a expiré. Veuillez rouvrir ce lien depuis la page de votre commande. |
| `hop_ticket_mismatch` | Ce ticket ne correspond pas à ce lien. |
| `rate_limit` | Trop de tentatives. Veuillez réessayer plus tard. |
| `order_sn_required` | Veuillez saisir votre numéro de commande ou votre identifiant d'abonnement. |
| `order_sn_mismatch` | Le numéro de commande ou l'identifiant d'abonnement ne correspond pas à ce lien. Vérifiez-le et réessayez. |
| `verify_required` | Veuillez vérifier votre numéro de commande ou votre identifiant d'abonnement avant d'obtenir le code. |
| `totp_field_invalid` | Le champ doit être `"account"` ou `"email"`. |
| `totp_secret_missing` | Ce champ n'a pas de clé 2FA. |
| `code_unsupported` | La récupération du code par e-mail n'est pas disponible pour cet abonnement. |
| `code_in_progress` | Une tâche est déjà en cours pour ce compte. Veuillez réessayer plus tard. |

Transport-level errors (thrown client-side, not from the server):

| condition | key |
|---|---|
| `fetch` threw | `ui.err.network` |
| body not JSON | `ui.err.bad_response` → *"Réponse inattendue du serveur (HTTP {status})"* |
| unknown `type` and no `message` | `ui.err.fallback` |

---

## 10. Example order (sanitized)

```
Link      https://delivery.gamsgo.pro/delivery_account/v/<DELIVERY_TOKEN>?lang=fr
Order sn  <ORDER_SN>        (shown masked as 12****34)
SKU       FA-TOTP · 非接码2FA直登 · login_type 4 · days_left 20
Account   customer@example.com
Password  <ACCOUNT_PASSWORD>
TOTP      available (field=account), period 30 s, threshold 5 s
Email OTP available (can_get_code: true)
Verify tok v1.<base64url-payload>.<signature>
           exp 1790541823 (24 h)
```

### Reproducible script

```bash
set -euo pipefail
HOST=https://delivery.gamsgo.pro
BASE=$HOST/delivery_account/api/view/<DELIVERY_TOKEN>
ORDER=<ORDER_SN>
LANGQ=fr
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'
HDR=(-H "User-Agent: $UA" -H "Referer: $HOST/delivery_account/v/<DELIVERY_TOKEN>?lang=$LANGQ" -H 'Accept: application/json')

echo '1. anonymous load (locked)'
curl -s "${BASE}?lang=$LANGQ" "${HDR[@]}" | jq .

echo '2. unlock'
TOKEN=$(curl -s -X POST "$BASE/verify-order?lang=$LANGQ" "${HDR[@]}" \
  -H 'Content-Type: application/json' \
  -d "{\"order_sn\":\"$ORDER\"}" | jq -r '.data.order_verify_token')
echo "verify token: $TOKEN"
AUTH=(-H "X-Order-Verify-Token: $TOKEN")

echo '3. unlocked record'
curl -s "${BASE}?lang=$LANGQ" "${HDR[@]}" "${AUTH[@]}" | jq .data

echo '4. live TOTP (account)'
curl -s "$BASE/totp?field=account&lang=$LANGQ" "${HDR[@]}" "${AUTH[@]}" | jq .data

echo '5. email OTP — start job (creates a real remote task)'
curl -s -X POST "$BASE/code?lang=$LANGQ" "${HDR[@]}" "${AUTH[@]}" | jq .data

echo '6. email OTP — poll every 3s until pending:false'
while true; do
  R=$(curl -s "$BASE/code?lang=$LANGQ" "${HDR[@]}" "${AUTH[@]}")
  echo "$R" | jq -c .data.job
  [ "$(echo "$R" | jq -r '.data.job.pending')" = "false" ] && break
  sleep 3
done
```

---

## 11. SKU / step catalog

`sku` (lowercased) selects the instruction set. `group_name` maps to a localized label via
`ui.group.{sku}`; unknown SKUs fall back to `ui.group.default` = *"Identifiants du compte"*.

| sku | group label (FR) | steps array key |
|---|---|---|
| `fa-other` | Connexion par e-mail | `fa-other` (3 steps: email, password, mailbox) |
| `fa-other-link` | *(fallback)* | `fa-other-link` (2 steps, no mailbox login) |
| `fa-gd-2fa` | Connexion e-mail Google · double authentification | `fa-gd-2fa` (6 steps) |
| `fa-gd-bk` | Connexion e-mail Google · e-mail de secours | `fa-gd-bk` (6 steps) |
| `fa-ol` | Connexion e-mail Outlook | `fa-ol` (5 steps) |
| **`fa-totp`** | **Connexion directe · double authentification** | `fa-totp` (3 steps) |
| `fa-oa-2fa` | Se connecter avec Google · double authentification | `fa-oa-2fa` (4 steps) |
| `fa-oa-bk` | Se connecter avec Google · e-mail de secours | `fa-oa-bk` (4 steps) |

Field-label suffix rule (`wr`):

```js
sku === 'fa-ol'            → `${field}_outlook`
sku.startsWith('fa-gd') ||
sku.startsWith('fa-oa')    → `${field}_google`
else                       → `${field}`
```

Steps are Markdown-lite: the renderer splits on `**` and emits `<b>` for odd segments.
Each step may have an illustration at `public/{lang}-{stepKey}.webp`.

Derived flags (`$r`):

```js
expired        = days_left === 0
degraded       = expired || (code_account || code_password)
hasMailboxCreds= !!(code_account || code_password)
mailboxNoLogin = login_type === 1 && !expired && !hasMailboxCreds
stepsKey       = mailboxNoLogin ? 'fa-other-link' : sku
```

---

## 12. Quick reference

| | |
|---|---|
| Page | `GET /delivery_account/v/{TOKEN20}?lang=xx` |
| Base path | `/delivery_account` (from `<base>` and the `sr` constant) |
| API root | `/delivery_account/api/view/{TOKEN}` |
| Read | `GET  {base}?lang=xx` |
| Unlock | `POST {base}/verify-order` `{"order_sn":...}` |
| Hop | `POST {base}/hop` `{"h":...}` |
| TOTP | `GET  {base}/totp?field=account\|email` |
| Email OTP status | `GET  {base}/code` → `data.job` |
| Email OTP start | `POST {base}/code` → `data` (job, unwrapped) |
| Auth header | `X-Order-Verify-Token: v1.<b64>.<sig>` (24 h) |
| Admin header | `X-Admin-View-Token` (totp only, only if order token absent) |
| Envelope | `{code, data, message, type}` — always HTTP 200 |
| Poll interval | 3000 ms (`ni`) |
| TOTP refresh threshold | 5 s (`Jr`) |
| Browser cache key | `localStorage["gg_fa_verify:{TOKEN}"]` |
| Language cache key | `localStorage["gg_fa_locale"]` |
