import { $, api, esc, show, copyText, announce } from "/ui.js";

const state = {
  links: [],
  orders: [],
  recipe: null,
  config: { orderSn: "" },
};

/* ---------------------------------------------------------- validation */

const attempted = { loginForm: false, genForm: false, orderForm: false };

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
  newOrderSn: (v) => {
    const s = v.trim();
    if (!s) return "Enter an order id.";
    return /^\d+$/.test(s) || /^[0-9a-zA-Z]{10}$/.test(s)
      ? ""
      : "Use digits, or exactly 10 letters and digits.";
  },
  newOrderToken: (v) => {
    const s = v.trim();
    if (!s) return "";
    return /^[0-9a-zA-Z]{8,64}$/.test(s) ? "" : "Use 8–64 letters and digits.";
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
for (const id of ["newOrderSn", "newOrderToken"]) wireField(id, "orderForm");

const SERVER_FIELDS = {
  name_required: ["name", "Please enter a name."],
  phone_required: ["phone", "Please enter a phone number."],
  phone_invalid: ["phone", "Use 5–20 digits, with an optional leading +."],
  order_invalid: ["orderSn", "Use digits, or exactly 10 letters and digits."],
  order_required: ["newOrderSn", "Enter an order id."],
  order_format: ["newOrderSn", "Use digits, or exactly 10 letters and digits."],
  token_invalid: ["newOrderToken", "Use 8–64 letters and digits."],
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

/** What the picker resolves to: a pool backend, the server default, or a custom id. */
function pickedOrder() {
  const v = $("orderPick").value;
  if (v === "custom") return { orderSn: $("orderSn").value.trim() };
  if (v === "env") return { orderSn: "" }; // server falls back to GAMSGO_ORDER_SN
  return { orderSn: v.replace(/^sn:/, "") };
}

$("genForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted.genForm = true;
  const box = $("genError");
  show(box, false);
  const ids = ["name", "phone"];
  if ($("orderPick").value === "custom") ids.push("orderSn");
  if (!validateForm(ids)) return;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const data = await api("/api/admin/links", {
      method: "POST",
      body: {
        name: $("name").value.trim(),
        phone: $("phone").value.trim(),
        orderSn: pickedOrder().orderSn,
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
    `<div><b>sha256</b><span>${recipe.digest.slice(0, 32)}… → base32 → <span style="color:var(--gold-deep)">${esc(recipe.id)}</span></span></div>`,
  ].join("");
  show($("generated"), true);
  $("generated").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "nearest",
  });
  announce(`Link created for ${link.name}.`);
}

$("copyGen").addEventListener("click", () => copyText($("genUrl").textContent, $("copyGen")));

/* -------------------------------------------------------- backend orders */

let ordersLoading = false;
let confirmingOrder = null;

function serviceLabel(o) {
  if (!o.meta) return "";
  return [o.meta.sku, o.meta.planName].filter(Boolean).join(" · ");
}

function updateBadge() {
  const n = state.orders.length;
  $("orderBadge").textContent =
    `order ${state.config.orderSn || "—"} · ${n} backend${n === 1 ? "" : "s"}`;
}

function renderOrderPicker() {
  const sel = $("orderPick");
  const prev = sel.value;
  const opts = [];
  for (const o of state.orders) {
    opts.push({ v: `sn:${o.orderSn}`, t: `${o.orderSn}${o.note ? ` — ${o.note}` : ""}` });
  }
  if (state.config.orderSn) {
    opts.push({ v: "env", t: `${state.config.orderSn} — server default` });
  }
  opts.push({ v: "custom", t: "Custom order id…" });
  sel.innerHTML = opts.map((o) => `<option value="${esc(o.v)}">${esc(o.t)}</option>`).join("");
  sel.value = opts.some((o) => o.v === prev) ? prev : opts[0].v;
  updatePickerHint();
}

function updatePickerHint() {
  const v = $("orderPick").value;
  const hint = $("orderPickHint");
  show($("customOrder"), v === "custom");
  if (v === "custom") {
    hint.textContent = "Custom id — unlocked with the default delivery token (GAMSGO_TOKEN).";
    return;
  }
  if (v === "env") {
    hint.textContent = "Server default — unlocked with GAMSGO_TOKEN.";
    return;
  }
  const o = state.orders.find((x) => `sn:${x.orderSn}` === v);
  if (!o) {
    hint.textContent = "";
    return;
  }
  const svc = serviceLabel(o) || "backend";
  const days = typeof o.meta?.daysLeft === "number" ? ` · ${o.meta.daysLeft} d left` : "";
  hint.textContent = `${svc} · token ${o.isDefault ? "(default)" : o.tokenMask}${days}`;
}

$("orderPick").addEventListener("change", () => {
  updatePickerHint();
  if ($("orderPick").value === "custom") $("orderSn").focus();
});

async function refreshOrders() {
  ordersLoading = true;
  renderOrders();
  try {
    const data = await api("/api/admin/orders");
    state.orders = data.orders;
    show($("orderError"), false);
  } catch (err) {
    const box = $("orderError");
    box.textContent = SERVER_MESSAGES[err.type] || err.message || "Could not load backend orders.";
    show(box, true);
    announce("Could not load backend orders.");
    state.orders = [];
  } finally {
    ordersLoading = false;
    updateBadge();
    renderOrders();
    renderOrderPicker();
  }
}

function renderOrders() {
  const q = $("orderSearch").value.trim().toLowerCase();
  const rows = state.orders.filter(
    (o) =>
      !q ||
      o.orderSn.toLowerCase().includes(q) ||
      (o.note || "").toLowerCase().includes(q) ||
      serviceLabel(o).toLowerCase().includes(q),
  );

  const emptyEl = $("ordersEmpty");
  if (ordersLoading) {
    $("orderRows").innerHTML = Array.from({ length: 3 }, () => {
      const cell = (w) => `<span class="skeleton" style="width:${w}"></span>`;
      return `<tr class="skeleton-row" aria-hidden="true">
        <td>${cell("84%")}</td>
        <td>${cell("58%")}</td>
        <td>${cell("34%")}</td>
        <td>${cell("70%")}</td>
        <td>${cell("52%")}</td>
        <td>${cell("62%")}</td>
        <td>${cell("40%")}</td>
      </tr>`;
    }).join("");
    show($("clearOrderSearch"), false);
    show(emptyEl, false);
    show($("ordersTable"), true);
    return;
  }

  $("orderRows").innerHTML = rows
    .map((o) => {
      const svc = serviceLabel(o);
      const days = typeof o.meta?.daysLeft === "number" ? o.meta.daysLeft : null;
      const added = new Date(o.createdAt).toLocaleString();
      const actions =
        confirmingOrder === o.orderSn
          ? `<button class="btn sm danger" data-act="order-delete-confirm" aria-label="Confirm removing order ${esc(o.orderSn)}">Remove</button>
            <button class="btn sm ghost" data-act="order-delete-cancel">Cancel</button>`
          : `<button class="btn sm ghost danger" data-act="order-delete" aria-label="Remove backend order ${esc(o.orderSn)}">Remove</button>`;
      return `<tr data-order="${esc(o.orderSn)}">
        <td data-label="Order id" class="id">${esc(o.orderSn)}</td>
        <td data-label="Service">${svc ? esc(svc) : '<span class="dim">not checked</span>'}</td>
        <td data-label="Days">${days === null ? '<span class="dim">—</span>' : days}</td>
        <td data-label="Delivery token" class="mono">${o.isDefault ? "default" : esc(o.tokenMask)}</td>
        <td data-label="Note" class="dim">${o.note ? esc(o.note) : "—"}</td>
        <td data-label="Added" class="dim" style="font-size: var(--fs-sm)">${esc(added)}</td>
        <td data-label="">
          <div class="actions">${actions}</div>
        </td>
      </tr>`;
    })
    .join("");

  if (rows.length === 0 && q) {
    $("ordersEmptyText").textContent = "No orders match your search.";
    $("ordersEmptyHint").textContent = "Try the order id, its note, or the service name.";
    show($("clearOrderSearch"), true);
  } else if (rows.length === 0) {
    $("ordersEmptyText").textContent = "No backend orders yet.";
    $("ordersEmptyHint").textContent =
      "Add a GamsGo order id above — with its delivery token — to make it selectable in the generator.";
    show($("clearOrderSearch"), false);
  }
  show($("ordersTable"), rows.length > 0);
  show(emptyEl, rows.length === 0);
}

$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted.orderForm = true;
  const box = $("orderError");
  show(box, false);
  if (!validateForm(["newOrderSn", "newOrderToken"])) return;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    await api("/api/admin/orders", {
      method: "POST",
      body: {
        orderSn: $("newOrderSn").value.trim(),
        deliveryToken: $("newOrderToken").value.trim(),
        note: $("newOrderNote").value.trim(),
        validate: $("newOrderVerify").checked,
      },
    });
    $("newOrderSn").value = "";
    $("newOrderToken").value = "";
    $("newOrderNote").value = "";
    fieldError("newOrderSn", "");
    fieldError("newOrderToken", "");
    await refreshOrders();
    announce("Backend order added.");
    $("newOrderSn").focus();
  } catch (err) {
    showFormError(box, err);
  } finally {
    btn.disabled = false;
  }
});

$("orderSearch").addEventListener("input", () => {
  confirmingOrder = null;
  renderOrders();
});

$("clearOrderSearch").addEventListener("click", () => {
  $("orderSearch").value = "";
  renderOrders();
  $("orderSearch").focus();
});

$("orderRows").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const orderSn = btn.closest("tr").dataset.order;
  const act = btn.dataset.act;

  if (act === "order-delete") {
    confirmingOrder = orderSn;
    renderOrders();
    document
      .querySelector(`tr[data-order="${CSS.escape(orderSn)}"] [data-act="order-delete-confirm"]`)
      ?.focus();
    return;
  }
  if (act === "order-delete-cancel") {
    confirmingOrder = null;
    renderOrders();
    document
      .querySelector(`tr[data-order="${CSS.escape(orderSn)}"] [data-act="order-delete"]`)
      ?.focus();
    return;
  }
  if (act === "order-delete-confirm") {
    confirmingOrder = null;
    btn.disabled = true;
    try {
      await api(`/api/admin/orders/${encodeURIComponent(orderSn)}`, { method: "DELETE" });
      state.orders = state.orders.filter((o) => o.orderSn !== orderSn);
      announce("Backend order removed.");
    } catch (err) {
      const box = $("orderError");
      box.textContent = SERVER_MESSAGES[err.type] || err.message || "Could not remove the order.";
      show(box, true);
      announce("Could not remove the order.");
    }
    renderOrders();
    updateBadge();
    renderOrderPicker();
  }
});

/* --------------------------------------------------------------- list */

let listLoading = false;
let confirmingId = null;

async function refresh() {
  await Promise.all([refreshLinks(), refreshOrders()]);
}

async function refreshLinks() {
  updateBadge();
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

  const emptyEl = $("empty");
  if (listLoading) {
    // Operate surfaces load into skeletons, not a spinner mid-content.
    $("rows").innerHTML = Array.from({ length: 3 }, () => {
      const cell = (w) => `<span class="skeleton" style="width:${w}"></span>`;
      return `<tr class="skeleton-row" aria-hidden="true">
        <td>${cell("68%")}</td>
        <td>${cell("54%")}</td>
        <td>${cell("84%")}</td>
        <td>${cell("62%")}</td>
        <td>${cell("40%")}</td>
      </tr>`;
    }).join("");
    show($("clearSearch"), false);
    show(emptyEl, false);
    show($("table"), true);
    return;
  }

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
            <button class="btn sm ghost danger" data-act="delete" aria-label="Revoke the link for ${esc(l.name)}">Revoke</button>`;
      return `<tr data-id="${esc(l.id)}">
        <td data-label="Name"><strong>${esc(l.name)}</strong></td>
        <td data-label="Phone" class="mono">${esc(l.phone)}</td>
        <td data-label="Link id" class="id">${esc(l.id)}</td>
        <td data-label="Created" class="dim" style="font-size: var(--fs-sm)">${esc(created)}</td>
        <td data-label="">
          <div class="actions">${actions}</div>
        </td>
      </tr>`;
    })
    .join("");

  if (rows.length === 0 && q) {
    $("emptyText").textContent = "No links match your search.";
    $("emptyHint").textContent = "Try the customer's name, phone number, or link id.";
    show($("clearSearch"), true);
  } else if (rows.length === 0) {
    $("emptyText").textContent = "No links issued yet.";
    $("emptyHint").textContent =
      "Fill in a name and phone number above, then Generate link to create the first one.";
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
  if (e.key !== "Escape") return;
  if (confirmingId) {
    confirmingId = null;
    renderRows();
  }
  if (confirmingOrder) {
    confirmingOrder = null;
    renderOrders();
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
