const HOST = process.env.GAMSGO_HOST || "https://delivery.gamsgo.pro";
const DEFAULT_DELIVERY = process.env.GAMSGO_TOKEN || "";
const LANG = process.env.GAMSGO_LANG || "fr";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const DEFAULT_DELIVERY_TOKEN = DEFAULT_DELIVERY;

export class GamsgoError extends Error {
  constructor(type, message, status = 200) {
    super(message);
    this.name = "GamsgoError";
    this.type = type;
    this.status = status;
  }
}

function baseUrl(deliveryToken) {
  const token = deliveryToken || DEFAULT_DELIVERY;
  return `${HOST}/delivery_account/api/view/${encodeURIComponent(token)}`;
}

/**
 * Every GamsGo response is HTTP 200 with an envelope of
 * {code, data, message, type}. `code !== 200` is the failure signal and
 * `message` is already localized by the `lang` query param.
 */
async function request(path, { method = "GET", body, verifyToken, deliveryToken } = {}) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${baseUrl(deliveryToken)}${path}${sep}lang=${LANG}`;

  const headers = {
    Accept: "application/json",
    "User-Agent": UA,
    Referer: `${HOST}/delivery_account/v/${deliveryToken || DEFAULT_DELIVERY}?lang=${LANG}`,
  };
  if (verifyToken) headers["X-Order-Verify-Token"] = verifyToken;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new GamsgoError("network", `Impossible de joindre GamsGo (${err.message}).`, 502);
  }

  let payload;
  try {
    payload = await res.json();
  } catch {
    throw new GamsgoError("bad_response", `Réponse inattendue de GamsGo (HTTP ${res.status}).`, 502);
  }

  if (payload.code !== 200) {
    throw new GamsgoError(payload.type || "error", payload.message || "Erreur inconnue.", 200);
  }
  return payload.data;
}

/** Exchanges the real order id for a 24 h verify token. */
export function verifyOrder(orderSn, deliveryToken) {
  return request("/verify-order", {
    method: "POST",
    body: { order_sn: orderSn },
    deliveryToken,
  });
}

export function fetchRecord(verifyToken, deliveryToken) {
  return request("", { verifyToken, deliveryToken });
}

export function fetchTotp(verifyToken, field, deliveryToken) {
  return request(`/totp?field=${encodeURIComponent(field)}`, { verifyToken, deliveryToken });
}

export function getCodeJob(verifyToken, deliveryToken) {
  return request("/code", { verifyToken, deliveryToken });
}

export function startCodeJob(verifyToken, deliveryToken) {
  return request("/code", { method: "POST", verifyToken, deliveryToken });
}
