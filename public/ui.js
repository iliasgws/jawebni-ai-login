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

/* Icons: one authored set, one stroke weight. Each page ships a hidden
   <svg> sprite of <symbol id="i-…"> elements and we reference it by <use>.
   Never a Unicode glyph standing in for an icon. */
const ICON_NAMES = new Set([
  "copy",
  "eye",
  "eyeOff",
  "globe",
  "ticket",
  "key",
  "refresh",
  "close",
  "check",
  "mail",
  "shield",
  "trash",
]);

/** Inline an icon by name. Pass `title` to give it an accessible name. */
export function icon(name, { cls = "", title = "" } = {}) {
  if (!ICON_NAMES.has(name)) return "";
  const label = title
    ? `role="img" aria-label="${esc(title)}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" ${label}><use href="#i-${name}"/></svg>`;
}

/**
 * The copy confirmation: an ink stamp that lands on the row and fades.
 * Pass null for `row` to fall back to a plain label swap on the button.
 */
export function stampRow(row, label) {
  if (!row || typeof row.animate !== "function") return;
  row.setAttribute("data-stamped", label);
  row.classList.remove("copied");
  void row.offsetWidth;
  row.classList.add("copied");
  setTimeout(() => row.classList.remove("copied"), 950);
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
  // Icon-only buttons keep their icon: the confirmation is the row stamp,
  // plus the live-region announcement below.
  if (btn && !btn.querySelector("svg")) {
    const old = btn.textContent;
    btn.textContent = doneLabel;
    setTimeout(() => {
      btn.textContent = old;
    }, 1400);
  }
  announce(doneLabel);
}
