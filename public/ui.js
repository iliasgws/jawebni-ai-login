export const $ = (id) => document.getElementById(id);

export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Network error");
    err.type = "network";
    err.status = 0;
    throw err;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.type = data?.error?.type;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

export function show(el, on) {
  el.classList.toggle("hidden", !on);
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Politely announce a message to screen readers via a dedicated live region. */
export function announce(message) {
  let live = $("live");
  if (!live) {
    live = document.createElement("div");
    live.id = "live";
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    document.body.appendChild(live);
  }
  live.textContent = "";
  setTimeout(() => {
    live.textContent = message;
  }, 30);
}

/** Minimal markdown-lite: **bold** → <b>, everything else escaped. */
export function rich(text) {
  return esc(text)
    .split("**")
    .map((chunk, i) => (i % 2 ? `<b>${chunk}</b>` : chunk))
    .join("");
}

export async function copyText(text, btn, doneLabel = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = doneLabel;
    setTimeout(() => {
      btn.textContent = old;
    }, 1400);
  }
  announce(doneLabel);
}
