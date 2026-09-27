import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import {
  addOrder,
  createLink,
  deleteLink,
  deleteOrder,
  getOrder,
  getLink,
  getSalt,
  isVerifyValid,
  listLinks,
  listOrders,
  setVerify,
  clearVerify,
} from "./lib/store.js";
import { explain, ID_RE, maskMiddle } from "./lib/ids.js";
import {
  DEFAULT_DELIVERY_TOKEN,
  GamsgoError,
  fetchRecord,
  fetchTotp,
  getCodeJob,
  startCodeJob,
  verifyOrder,
} from "./lib/gamsgo.js";

const PORT = Number(process.env.PORT || 3000);
const HOST_BIND = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const ORDER_SN = process.env.GAMSGO_ORDER_SN || "";
const PUBLIC_DIR = path.resolve(process.cwd(), "public");
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const SERVICE_LABELS = {
  "fa-totp": "Connexion directe · double authentification",
  "fa-other": "Connexion par e-mail",
  "fa-gd-2fa": "Connexion e-mail Google · double authentification",
  "fa-gd-bk": "Connexion e-mail Google · e-mail de secours",
  "fa-ol": "Connexion e-mail Outlook",
  "fa-oa-2fa": "Connexion avec Google · double authentification",
  "fa-oa-bk": "Connexion avec Google · e-mail de secours",
};

const STEPS = {
  "fa-totp": [
    "Ouvrez la page de connexion du service acheté. Saisissez le **Compte de connexion** affiché ici, puis cliquez sur « Continuer ».",
    "Saisissez le **Mot de passe de connexion**, puis cliquez sur « Continuer ».",
    "Cliquez sur **Obtenir le code** ci-dessous, puis saisissez ce code à 6 chiffres dans le champ « Code unique » pour terminer la connexion. Si le code a expiré, cliquez de nouveau.",
  ],
};

/* ------------------------------------------------------------------ util */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(payload);
}

function sendHtml(res, status, html) {
  send(res, status, html, { "Content-Type": "text/html; charset=utf-8" });
}

function sendError(res, status, type, message) {
  send(res, status, { error: { type, message } });
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("payload too large"), { code: "E_TOO_BIG" }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("invalid json"), { code: "E_JSON" }));
      }
    });
    req.on("error", reject);
  });
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/* ------------------------------------------------------------ rate limit */

const buckets = new Map();

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.reset) {
    b = { n: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.n += 1;
  return b.n <= max;
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now >= v.reset) buckets.delete(k);
}, 60_000).unref();

function clientIp(req) {
  return (req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
}

/* ------------------------------------------------------------------ auth */

const sessions = new Map(); // token -> expiresAt

function newSession() {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function validSession(req) {
  const token = cookies(req).jaw_admin;
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (exp <= Date.now()) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (validSession(req)) return true;
  sendError(res, 401, "unauthorized", "Session expired — please sign in again.");
  return false;
}

/* -------------------------------------------------------- gams go layer */

async function ensureVerify(rec) {
  if (isVerifyValid(rec)) return rec.verify.token;

  let data;
  try {
    data = await verifyOrder(rec.orderSn, rec.deliveryToken);
  } catch (err) {
    await clearVerify(rec.id);
    throw err;
  }

  const token = data.order_verify_token;
  if (!token) {
    await clearVerify(rec.id);
    throw new GamsgoError(
      "verify_required",
      "Veuillez vérifier votre numéro de commande avant d'obtenir les informations.",
    );
  }
  await setVerify(rec.id, { token, expiresAt: data.expires_at });
  return token;
}

async function loadRecord(id) {
  const rec = await getLink(id);
  if (!rec) throw new GamsgoError("not_found", "Lien invalide ou expiré.", 404);

  let token = await ensureVerify(rec);
  let data = await fetchRecord(token, rec.deliveryToken);

  // Token can lapse between calls; retry once with a fresh exchange.
  if (data.locked) {
    await clearVerify(rec.id);
    const fresh = await getLink(id);
    token = await ensureVerify(fresh);
    data = await fetchRecord(token, rec.deliveryToken);
    if (data.locked) {
      throw new GamsgoError("verify_required", "Vérification de commande requise.", 403);
    }
  }
  return { rec, token, data };
}

function publicPayload(rec, data) {
  const sku = String(data.sku || "").trim().toLowerCase();
  return {
    id: rec.id,
    name: rec.name,
    service: data.sku,
    serviceLabel: SERVICE_LABELS[sku] || data.group_name || "Compte",
    planName: data.plan_name || "",
    daysLeft: data.days_left,
    account: data.account || "",
    password: data.password || "",
    discarded: !!data.discarded,
    expired: data.days_left === 0,
    hasAccountTotp: !!data.has_account_totp,
    hasEmailTotp: !!data.has_email_totp,
    canGetCode: !!data.can_get_code && !data.admin_read_only,
    loginType: data.login_type,
    steps: STEPS[sku] || [],
  };
}

function toGamsgoError(err) {
  if (err instanceof GamsgoError) return err;
  return new GamsgoError("internal", "Une erreur est survenue. Veuillez réessayer.", 500);
}

/* ------------------------------------------------------------- handlers */

async function serveStatic(res, relPath) {
  const target = path.resolve(PUBLIC_DIR, relPath);
  if (!target.startsWith(PUBLIC_DIR + path.sep) && target !== PUBLIC_DIR) {
    sendError(res, 404, "not_found", "Not found");
    return;
  }
  try {
    const body = await readFile(target);
    send(res, 200, body, {
      "Content-Type": MIME[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
  } catch {
    sendError(res, 404, "not_found", "Not found");
  }
}

async function handleAdminLogin(req, res) {
  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 10, 10 * 60_000)) {
    return sendError(res, 429, "rate_limit", "Trop de tentatives. Réessayez plus tard.");
  }
  const body = await readBody(req);
  const password = String(body.password || "");
  if (!password || !timingSafeEqual(password, ADMIN_PASSWORD)) {
    return sendError(res, 401, "bad_password", "Mot de passe incorrect.");
  }
  const token = newSession();
  send(res, 200, { ok: true }, {
    "Set-Cookie": `jaw_admin=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`,
  });
}

async function handleAdminLogout(req, res) {
  const token = cookies(req).jaw_admin;
  if (token) sessions.delete(token);
  send(res, 200, { ok: true }, {
    "Set-Cookie": "jaw_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
  });
}

async function handleListLinks(req, res) {
  if (!requireAdmin(req, res)) return;
  const links = await listLinks();
  send(res, 200, { links });
}

async function handleCreateLink(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!rateLimit(`create:${cookies(req).jaw_admin}`, 60, 60 * 60_000)) {
    return sendError(res, 429, "rate_limit", "Trop de liens générés. Réessayez plus tard.");
  }

  const body = await readBody(req);
  const name = String(body.name || "").trim();
  const phone = String(body.phone || "").trim();
  const orderSn = String(body.orderSn || "").trim() || ORDER_SN;

  if (!name) return sendError(res, 400, "name_required", "Le nom est requis.");
  if (!phone) return sendError(res, 400, "phone_required", "Le numéro de téléphone est requis.");
  if (!/^\+?\d{5,20}$/.test(phone.replace(/[\s-]/g, ""))) {
    return sendError(res, 400, "phone_invalid", "Numéro de téléphone invalide.");
  }
  if (!/^\d+$/.test(orderSn) && !/^[0-9a-zA-Z]{10}$/.test(orderSn)) {
    return sendError(res, 400, "order_invalid", "Identifiant de commande invalide.");
  }

  // The admin's chosen backend decides which delivery token unlocks this
  // customer's link — pool entry wins over the process-wide default.
  const pool = await getOrder(orderSn);
  const rec = await createLink({
    name,
    phone,
    orderSn,
    deliveryToken: (pool && pool.deliveryToken) || DEFAULT_DELIVERY_TOKEN,
  });
  const salt = await getSalt();
  send(res, 200, { link: rec, recipe: explain(rec.orderSn, rec.nonce, salt) });
}

async function handleDeleteLink(req, res, id) {
  if (!requireAdmin(req, res)) return;
  const ok = await deleteLink(id);
  if (!ok) return sendError(res, 404, "not_found", "Lien introuvable.");
  send(res, 200, { ok: true });
}

/* ------------------------------------------------------- backend orders */

/** Safe shape for the panel: the raw delivery token never leaves the server. */
function orderPayload(o) {
  return {
    orderSn: o.orderSn,
    note: o.note || "",
    tokenMask: o.deliveryToken ? maskMiddle(o.deliveryToken) : "",
    isDefault: !!o.deliveryToken && o.deliveryToken === DEFAULT_DELIVERY_TOKEN,
    meta: o.meta || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

async function handleListOrders(req, res) {
  if (!requireAdmin(req, res)) return;
  send(res, 200, { orders: (await listOrders()).map(orderPayload) });
}

async function handleAddOrder(req, res) {
  if (!requireAdmin(req, res)) return;
  const sid = cookies(req).jaw_admin;
  const body = await readBody(req);

  const orderSn = String(body.orderSn || "").trim();
  const deliveryToken = String(body.deliveryToken || "").trim();
  const note = String(body.note || "").trim().slice(0, 120);
  const validate = body.validate !== false;

  if (!orderSn) return sendError(res, 400, "order_required", "Order id is required.");
  if (!/^\d+$/.test(orderSn) && !/^[0-9a-zA-Z]{10}$/.test(orderSn)) {
    return sendError(
      res, 400, "order_format",
      "Order id must be digits, or exactly 10 letters and digits.",
    );
  }
  if (deliveryToken && !/^[0-9a-zA-Z]{8,64}$/.test(deliveryToken)) {
    return sendError(res, 400, "token_invalid", "Delivery token must be 8–64 letters and digits.");
  }
  const token = deliveryToken || DEFAULT_DELIVERY_TOKEN;
  if (!token) {
    return sendError(
      res, 400, "token_required",
      "No delivery token — set GAMSGO_TOKEN or paste one with this order.",
    );
  }

  let meta = null;
  if (validate) {
    if (!rateLimit(`ordervalidate:${sid}`, 30, 10 * 60_000)) {
      return sendError(res, 429, "rate_limit", "Trop de vérifications. Réessayez plus tard.");
    }
    let data;
    try {
      data = await verifyOrder(orderSn, token);
    } catch (err) {
      if (err instanceof GamsgoError && (err.type === "network" || err.type === "bad_response")) {
        return sendError(res, 502, err.type, err.message);
      }
      const type = err instanceof GamsgoError ? err.type : "verify_failed";
      const message =
        err instanceof GamsgoError ? err.message : "Impossible de vérifier cette commande.";
      return sendError(res, 400, type, message);
    }
    if (!data.order_verify_token) {
      return sendError(
        res, 400, "order_unverified",
        "Cette commande n'a pas pu être vérifiée auprès de GamsGo.",
      );
    }
    meta = {
      sku: data.sku || "",
      planName: data.plan_name || "",
      daysLeft: typeof data.days_left === "number" ? data.days_left : null,
      discarded: !!data.discarded,
      verifiedAt: new Date().toISOString(),
    };
  }

  const prev = await getOrder(orderSn);
  const rec = await addOrder({
    orderSn,
    deliveryToken: token,
    note,
    meta: meta || (prev && prev.meta) || null,
  });
  send(res, 200, { order: orderPayload(rec) });
}

async function handleDeleteOrder(req, res, rawSn) {
  if (!requireAdmin(req, res)) return;
  let orderSn = rawSn;
  try {
    orderSn = decodeURIComponent(rawSn);
  } catch {
    /* keep raw */
  }
  const ok = await deleteOrder(orderSn);
  if (!ok) return sendError(res, 404, "not_found", "Commande introuvable.");
  send(res, 200, { ok: true });
}

async function handleAdminSession(req, res) {
  if (!requireAdmin(req, res)) return;
  send(res, 200, {
    ok: true,
    config: { orderSn: ORDER_SN, deliveryToken: DEFAULT_DELIVERY_TOKEN },
  });
}

async function handlePublicRecord(req, res, id) {
  if (!rateLimit(`rec:${id}`, 60, 60_000)) {
    return sendError(res, 429, "rate_limit", "Trop de requêtes. Réessayez plus tard.");
  }
  try {
    const { rec, data } = await loadRecord(id);
    send(res, 200, { record: publicPayload(rec, data) });
  } catch (err) {
    const e = toGamsgoError(err);
    sendError(res, e.status, e.type, e.message);
  }
}

async function handleTotp(req, res, id, searchParams) {
  const field = searchParams.get("field") || "account";
  if (field !== "account" && field !== "email") {
    return sendError(res, 400, "totp_field_invalid", 'Le champ doit être "account" ou "email".');
  }
  if (!rateLimit(`totp:${id}`, 60, 60_000)) {
    return sendError(res, 429, "rate_limit", "Trop de requêtes. Réessayez plus tard.");
  }
  try {
    const rec = await getLink(id);
    if (!rec) throw new GamsgoError("not_found", "Lien invalide ou expiré.", 404);
    const token = await ensureVerify(rec);
    const data = await fetchTotp(token, field, rec.deliveryToken);
    send(res, 200, {
      code: data.code,
      nextCode: data.next_code || "",
      expiresIn: data.expires_in,
      period: data.period || 30,
    });
  } catch (err) {
    const e = toGamsgoError(err);
    sendError(res, e.status, e.type, e.message);
  }
}

async function handleCode(req, res, id, method) {
  const rec = await getLink(id);
  if (!rec) return sendError(res, 404, "not_found", "Lien invalide ou expiré.");

  try {
    if (method === "POST") {
      if (!rateLimit(`code:${id}`, 10, 10 * 60_000)) {
        return sendError(res, 429, "rate_limit", "Trop de tentatives. Réessayez plus tard.");
      }
      const token = await ensureVerify(rec);
      const job = await startCodeJob(token, rec.deliveryToken);
      return send(res, 200, { job: normalizeJob(job) });
    }

    if (!rateLimit(`codepoll:${id}`, 180, 60_000)) {
      return sendError(res, 429, "rate_limit", "Trop de requêtes. Réessayez plus tard.");
    }
    const token = await ensureVerify(rec);
    const data = await getCodeJob(token, rec.deliveryToken);
    return send(res, 200, { job: normalizeJob(data.job) });
  } catch (err) {
    const e = toGamsgoError(err);
    sendError(res, e.status, e.type, e.message);
  }
}

/** POST returns the job unwrapped, GET wraps it in .job — normalise both. */
function normalizeJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    code: job.code || "",
    pending: !!job.pending,
  };
}

/* --------------------------------------------------------------- server */

const ROUTE_ID = /^\/(?:api\/v|v)\/([0-9A-HJKMNP-TV-Z]{20})(?:\/([a-z-]+))?$/;
const ROUTE_ADMIN_ID = /^\/api\/admin\/links\/([0-9A-HJKMNP-TV-Z]{20})$/;
const ROUTE_ADMIN_ORDER = /^\/api\/admin\/orders\/([^/]+)$/;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const p = url.pathname;

  try {
    // ---- API
    if (p.startsWith("/api/")) {
      if (req.method === "POST" && p === "/api/admin/login") return await handleAdminLogin(req, res);
      if (req.method === "POST" && p === "/api/admin/logout") return await handleAdminLogout(req, res);
      if (req.method === "GET" && p === "/api/admin/session") return await handleAdminSession(req, res);
      if (req.method === "GET" && p === "/api/admin/links") return await handleListLinks(req, res);
      if (req.method === "POST" && p === "/api/admin/links") return await handleCreateLink(req, res);
      if (req.method === "GET" && p === "/api/admin/orders") return await handleListOrders(req, res);
      if (req.method === "POST" && p === "/api/admin/orders") return await handleAddOrder(req, res);

      const adminOrder = p.match(ROUTE_ADMIN_ORDER);
      if (adminOrder && req.method === "DELETE") return await handleDeleteOrder(req, res, adminOrder[1]);

      const adminId = p.match(ROUTE_ADMIN_ID);
      if (adminId && req.method === "DELETE") return await handleDeleteLink(req, res, adminId[1]);

      const pub = p.match(ROUTE_ID);
      if (pub) {
        const [, id, sub] = pub;
        if (!sub && req.method === "GET") return await handlePublicRecord(req, res, id);
        if (sub === "totp" && req.method === "GET") return await handleTotp(req, res, id, url.searchParams);
        if (sub === "code" && (req.method === "GET" || req.method === "POST")) {
          return await handleCode(req, res, id, req.method);
        }
      }
      return sendError(res, 404, "not_found", "Not found");
    }

    // ---- pages
    if (req.method !== "GET") return sendError(res, 405, "method_not_allowed", "Method not allowed");
    if (p === "/") return await serveStatic(res, "index.html");
    if (p === "/admin") return await serveStatic(res, "admin.html");
    if (ROUTE_ID.test(p)) return await serveStatic(res, "v.html");
    if (/^\/[a-z0-9._-]+$/i.test(p)) return await serveStatic(res, p.slice(1));
    sendError(res, 404, "not_found", "Not found");
  } catch (err) {
    if (err?.code === "E_TOO_BIG") return sendError(res, 413, "too_large", "Payload too large.");
    if (err?.code === "E_JSON") return sendError(res, 400, "json_invalid", "Corps JSON invalide.");
    console.error("[server]", req.method, p, err);
    sendError(res, 500, "internal", "Une erreur est survenue.");
  }
});

server.listen(PORT, HOST_BIND, async () => {
  const salt = await getSalt();
  console.log(`  jawebni-ai-login  →  http://localhost:${PORT}`);
  console.log(`  admin panel       →  http://localhost:${PORT}/admin`);
  console.log(`  id salt           →  ${salt.slice(0, 6)}…${salt.slice(-4)} (${salt.length} chars)`);
  if (ADMIN_PASSWORD === "change-me") {
    console.warn("  ⚠ ADMIN_PASSWORD is unset — using the default 'change-me'.");
    console.warn("    Set it:  ADMIN_PASSWORD=yourpass npm start");
  }
  if (!ORDER_SN) {
    console.warn("  ⚠ GAMSGO_ORDER_SN is unset — creating links will fail.");
    console.warn("    Set it:  GAMSGO_ORDER_SN=<your order id> npm start");
  }
  if (!DEFAULT_DELIVERY_TOKEN) {
    console.warn("  ⚠ GAMSGO_TOKEN is unset — credentials cannot be fetched.");
    console.warn("    Set it:  GAMSGO_TOKEN=<your delivery token> npm start");
  }
});
