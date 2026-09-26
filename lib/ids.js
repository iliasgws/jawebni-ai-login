import crypto from "node:crypto";

/**
 * Crockford base32 — no I, L, O, U. Same alphabet GamsGo uses for its own
 * delivery tokens, so generated ids are visually indistinguishable from them.
 */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const ID_LENGTH = 20;
export const ID_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;

export function toBase32(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function randomNonce(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Public link id = sha256(realOrderId + "\n" + nonce + "\n" + salt), base32'd,
 * truncated to 20 chars (100 bits).
 *
 * - The raw order id never appears in any URL or response.
 * - `nonce` is fresh random noise per generated link, so the same order id
 *   always produces a different link, and the id cannot be reversed to the
 *   order id without the salt (kept server-side only).
 */
export function deriveId(orderSn, nonce, salt) {
  const seed = `${orderSn}\n${nonce}\n${salt}`;
  const digest = crypto.createHash("sha256").update(seed, "utf8").digest();
  return toBase32(digest).slice(0, ID_LENGTH);
}

export function newSalt(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

/** Human-readable breakdown shown in the admin panel. */
export function explain(orderSn, nonce, salt) {
  const seed = `${orderSn}\n${nonce}\n${salt}`;
  const digest = crypto
    .createHash("sha256")
    .update(seed, "utf8")
    .digest("hex");
  return {
    seed,
    digest,
    id: deriveId(orderSn, nonce, salt),
    maskedSalt: maskMiddle(salt),
    saltLength: salt.length,
  };
}

export function maskMiddle(s) {
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 4)}${"•".repeat(Math.min(s.length - 8, 16))}${s.slice(-4)}`;
}
