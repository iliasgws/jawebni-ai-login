import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { deriveId, randomNonce, newSalt, ID_RE } from "./ids.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const EMPTY = { meta: { salt: null }, links: {} };

let cache = null;
let writing = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    cache = { ...EMPTY, ...JSON.parse(raw) };
    cache.links = cache.links || {};
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    cache = structuredClone(EMPTY);
  }
  if (!cache.meta.salt) {
    cache.meta.salt = newSalt();
    await persist();
  }
  return cache;
}

async function persist() {
  const snapshot = JSON.stringify(cache, null, 2);
  writing = writing.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${STORE_FILE}.${process.pid}.tmp`;
    await writeFile(tmp, snapshot, "utf8");
    await rename(tmp, STORE_FILE);
  });
  return writing;
}

export async function getSalt() {
  return (await load()).meta.salt;
}

export async function listLinks() {
  const db = await load();
  return Object.values(db.links).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function getLink(id) {
  if (!ID_RE.test(id)) return null;
  return (await load()).links[id] || null;
}

/**
 * Creates a link for (name, phone, orderSn). The public id is a hash of the
 * real order id plus fresh random noise — never the order id itself.
 */
export async function createLink({ name, phone, orderSn, deliveryToken }) {
  const db = await load();
  const nonce = randomNonce();
  const id = deriveId(orderSn, nonce, db.meta.salt);

  if (db.links[id]) {
    const err = new Error("id collision");
    err.code = "collision";
    throw err;
  }

  const record = {
    id,
    name,
    phone,
    orderSn,
    deliveryToken,
    nonce,
    createdAt: new Date().toISOString(),
    // Server-side only. Never leaves the process.
    verify: null,
  };
  db.links[id] = record;
  await persist();
  return record;
}

export async function deleteLink(id) {
  const db = await load();
  if (!db.links[id]) return false;
  delete db.links[id];
  await persist();
  return true;
}

/** Persists a refreshed GamsGo verify token against a record. */
export async function setVerify(id, verify) {
  const db = await load();
  const rec = db.links[id];
  if (!rec) return;
  rec.verify = verify;
  await persist();
}

export async function clearVerify(id) {
  await setVerify(id, null);
}

export function isVerifyValid(rec) {
  if (!rec?.verify?.token) return false;
  // 120 s safety margin so we never use a token mid-flight as it expires.
  return rec.verify.expiresAt * 1000 - 120_000 > Date.now();
}
