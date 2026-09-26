import { $, api, esc, show, copyText, announce } from "/ui.js";

const state = {
  links: [],
  recipe: null,
  config: { orderSn: "" },
};

/* ---------------------------------------------------------- validation */

const attempted = { loginForm: false, genForm: false };

const validators = {
  name: (v) => (v.trim() ? "" : "Please enter a name."),
  phone: (v) => {
    const cleaned = v.trim().replace(/[\s-]/g, "");
    if (!cleaned) return "Please enter a phone number.";
    return /^\+?\d{5,20}$/.test(cleaned) ? "" : "Use 5–20 digits, with an optional leading +.";
  },
  password: (v) => (v ? "" : "Enter the password."),
  orderSn: (v) => {
    const s = v.trim();
    if (!s) return "";
    return /^\d+$/.test(s) || /^[0-9a-zA-Z]{10}$/.test(s)
      ? ""
      : "Use digits, or exactly 10 letters and digits.";
  },
};

function fieldError(id, message) {
  const input = $(id);
  const box = $(`${id}Error`);
  if (message) {
    input.setAttribute("aria-invalid", "true");
    box.textContent = message;
    show(box, true);
  } else {
    input.removeAttribute("aria-invalid");
    box.textContent = "";
    show(box, false);
  }
  return !message;
}

function validateField(id) {
  return fieldError(id, validators[id]($(id).value));
}

function validateForm(ids) {
  let firstBad = null;
  for (const id of ids) {
    if (!validateField(id) && !firstBad) firstBad = id;
  }
  if (firstBad) $(firstBad).focus();
  return !firstBad;
}

function wireField(id, formId) {
  const input = $(id);
  input.addEventListener("blur", () => {
    if (input.value || attempted[formId]) validateField(id);
  });
  input.addEventListener("input", () => {
    if (input.getAttribute("aria-invalid")) validateField(id);
  });
}

wireField("password", "loginForm");
for (const id of ["name", "phone", "orderSn"]) wireField(id, "genForm");

const SERVER_FIELDS = {
  name_required: ["name", "Please enter a name."],
  phone_required: ["phone", "Please enter a phone number."],
  phone_invalid: ["phone", "Use 5–20 digits, with an optional leading +."],
  order_invalid: ["orderSn", "Use digits, or exactly 10 letters and digits."],
};

const SERVER_MESSAGES = {
  bad_password: "Incorrect password.",
  unauthorized: "Session expired — please sign in again.",
  network: "Network error — check your connection and try again.",
};

function showFormError(box, err) {
  const mapped = SERVER_FIELDS[err.type];
  if (mapped) {
    fieldError(mapped[0], mapped[1]);
    $(mapped[0]).focus();
    return;
  }
  box.textContent = SERVER_MESSAGES[err.type] || err.message || "Something went wrong.";
  show(box, true);
}

/* -------------------------------------------------------------- auth */

function setSignedIn(on) {
  show($("bootScreen"), false);
  show($("loginScreen"), !on);
  show($("app"), on);
}

async function boot() {
  try {
    const data = await api("/api/admin/session");
    state.config = data.config;
    setSignedIn(true);
    await refresh();
  } catch (err) {
    setSignedIn(false);
    if (err.type === "network") {
      const box = $("loginError");
      box.textContent = SERVER_MESSAGES.network;
      show(box, true);
    }
  }
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted.loginForm = true;
  const box = $("loginError");
  show(box, false);
  if (!validateForm(["password"])) return;
  try {
    await api("/api/admin/login", { method: "POST", body: { password: $("password").value } });
    $("password").value = "";
    fieldError("password", "");
    const data = await api("/api/admin/session");
    state.config = data.config;
    setSignedIn(true);
    await refresh();
  } catch (err) {
    showFormError(box, err);
  }
});

$("logoutBtn").addEventListener("click", async () => {
  await api("/api/admin/logout", { method: "POST" });
  setSignedIn(false);
});

/* ------------------------------------------------------------- create */

$("genForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted.genForm = true;
  const box = $("genError");
  show(box, false);
  if (!validateForm(["name", "phone", "orderSn"])) return;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const data = await api("/api/admin/links", {
      method: "POST",
      body: {
        name: $("name").value.trim(),
        phone: $("phone").value.trim(),
        orderSn: $("orderSn").value.trim() || state.config.orderSn,
      },
    });
    state.recipe = data.recipe;
    renderGenerated(data.link, data.recipe);
    $("name").value = "";
    $("phone").value = "";
    await refresh();
  } catch (err) {
    showFormError(box, err);
  } finally {
    btn.disabled = false;
  }
});

function renderGenerated(link, recipe) {
  const url = `${location.origin}/v/${link.id}`;
  $("genTitle").textContent = `Link created for ${link.name}`;
  $("genUrl").textContent = url;
  $("openGen").href = url;
  $("genRecipe").innerHTML = [
    `<div><b>order id</b><span>${esc(recipe.seed.split("\n")[0])} <span class="dim">← never appears in the URL</span></span></div>`,
    `<div><b>random noise</b><span>${esc(recipe.seed.split("\n")[1])} <span class="dim">← fresh per link</span></span></div>`,
    `<div><b>salt</b><span>${esc(recipe.maskedSalt)} <span class="dim">← server-side only</span></span></div>`,
    `<div><b>sha256</b><span>${recipe.digest.slice(0, 32)}… → base32 → <span style="color:var(--accent-2)">${esc(recipe.id)}</span></span></div>`,
  ].join("");
  show($("generated"), true);
  $("generated").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "nearest",
  });
  announce(`Link created for ${link.name}.`);
}

$("copyGen").addEventListener("click", () => copyText($("genUrl").textContent, $("copyGen")));

/* --------------------------------------------------------------- list */

let listLoading = false;
let confirmingId = null;

async function refresh() {
  $("orderBadge").textContent = `order ${state.config.orderSn || "—"}`;
  if (!$("orderSn").value && state.config.orderSn) $("orderSn").value = state.config.orderSn;

  listLoading = true;
  renderRows();
  try {
    const data = await api("/api/admin/links");
    state.links = data.links;
    show($("listError"), false);
  } catch (err) {
    const box = $("listError");
    box.textContent = SERVER_MESSAGES[err.type] || err.message;
    show(box, true);
    announce("Could not load links.");
    state.links = [];
  } finally {
    listLoading = false;
    renderRows();
  }
}

function renderRows() {
  const q = $("search").value.trim().toLowerCase();
  const rows = state.links.filter(
    (l) =>
      !q ||
      l.name.toLowerCase().includes(q) ||
      l.phone.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q),
  );

  $("rows").innerHTML = rows
    .map((l) => {
      const url = `${location.origin}/v/${l.id}`;
      const created = new Date(l.createdAt).toLocaleString();
      const actions =
        l.id === confirmingId
          ? `<button class="btn sm danger" data-act="delete-confirm" aria-label="Confirm revoking the link for ${esc(l.name)}">Revoke</button>
            <button class="btn sm ghost" data-act="delete-cancel">Cancel</button>`
          : `<button class="btn sm" data-act="copy" data-url="${esc(url)}">Copy</button>
            <a class="btn sm ghost" href="${esc(url)}" target="_blank" rel="noopener">Open</a>
            <button class="btn sm ghost danger" data-act="delete" aria-label="Delete the link for ${esc(l.name)}">Delete</button>`;
      return `<tr data-id="${esc(l.id)}">
        <td><strong>${esc(l.name)}</strong></td>
        <td class="mono">${esc(l.phone)}</td>
        <td class="id">${esc(l.id)}</td>
        <td class="dim" style="font-size: var(--fs-sm)">${esc(created)}</td>
        <td>
          <div class="actions">${actions}</div>
        </td>
      </tr>`;
    })
    .join("");

  const emptyEl = $("empty");
  if (listLoading) {
    $("emptyText").textContent = "Loading links…";
    show($("clearSearch"), false);
    show(emptyEl, true);
    show($("table"), false);
    return;
  }
  if (rows.length === 0 && q) {
    $("emptyText").textContent = "No links match your search.";
    show($("clearSearch"), true);
  } else if (rows.length === 0) {
    $("emptyText").textContent = "No links issued yet.";
    show($("clearSearch"), false);
  }
  show($("table"), rows.length > 0);
  show(emptyEl, rows.length === 0);
}

$("search").addEventListener("input", () => {
  confirmingId = null;
  renderRows();
});

$("clearSearch").addEventListener("click", () => {
  $("search").value = "";
  renderRows();
  $("search").focus();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && confirmingId) {
    confirmingId = null;
    renderRows();
  }
});

$("rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = btn.closest("tr").dataset.id;
  const act = btn.dataset.act;

  if (act === "copy") {
    await copyText(btn.dataset.url, btn);
    return;
  }
  if (act === "delete") {
    confirmingId = id;
    renderRows();
    document.querySelector(`tr[data-id="${id}"] [data-act="delete-confirm"]`)?.focus();
    return;
  }
  if (act === "delete-cancel") {
    confirmingId = null;
    renderRows();
    document.querySelector(`tr[data-id="${id}"] [data-act="delete"]`)?.focus();
    return;
  }
  if (act === "delete-confirm") {
    confirmingId = null;
    btn.disabled = true;
    try {
      await api(`/api/admin/links/${id}`, { method: "DELETE" });
      state.links = state.links.filter((l) => l.id !== id);
      announce("Link revoked.");
    } catch (err) {
      const box = $("listError");
      box.textContent = SERVER_MESSAGES[err.type] || err.message || "Could not revoke the link.";
      show(box, true);
      announce("Could not revoke the link.");
    }
    renderRows();
  }
});

boot();
