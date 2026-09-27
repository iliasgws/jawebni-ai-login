import { $, api, esc, show, sleep, rich, copyText, announce, icon, stampRow } from "/ui.js";
import { initLang, applyStatic, mountLangSwitch, onLangChange, t, skuLabel, skuSteps } from "/i18n.js";

initLang();
applyStatic(document);
mountLangSwitch(document);

const ID = (location.pathname.match(/^\/v\/([0-9A-HJKMNP-TV-Z]{20})$/) || [])[1];

/** Last record served, so a language switch can rebuild without refetching. */
let lastRecord = null;

function fatal(message, { retry = false } = {}) {
  $("errorText").textContent = message;
  show($("errorRetry"), retry);
  show($("errorBox"), true);
  show($("loader"), false);
  show($("content"), false);
}

function setLoading() {
  show($("loader"), true);
  show($("errorBox"), false);
  show($("content"), false);
}

/* ------------------------------------------------------- foil (the reveal) */

function foilBusy(id, busy) {
  $(id).classList.toggle("is-busy", busy);
}

function foilOpen(id, { instant = false } = {}) {
  const foil = $(id);
  if (foil.classList.contains("is-open")) return;
  foil.querySelector(".foil-body").hidden = false;
  foil.classList.add("is-open");
  if (instant) foil.classList.add("is-done");
  else setTimeout(() => foil.classList.add("is-done"), 460);
}

function foilClose(id) {
  const foil = $(id);
  foil.classList.remove("is-open", "is-done");
  foil.querySelector(".foil-body").hidden = true;
}

/* --------------------------------------------------------- credentials */

function renderCredentials(r) {
  lastRecord = r;
  $("welcome").textContent = r.name ? t("cred.hello", { name: r.name }) : t("cred.title");
  $("sub").textContent =
    skuLabel(r.service, r.serviceLabel) + (r.planName ? ` · ${r.planName}` : "");

  const days = $("daysBadge");
  if (r.daysLeft >= 0 && r.daysLeft !== -1) {
    days.textContent = r.expired
      ? t("cred.expired")
      : r.daysLeft === 1
        ? t("cred.days.one", { n: r.daysLeft })
        : t("cred.days.other", { n: r.daysLeft });
    days.className = `badge ${r.expired ? "warn" : "ok"}`;
    show(days, true);
  } else {
    show(days, false);
  }

  const rows = [
    { key: "cred.account", value: r.account, secret: false },
    { key: "cred.password", value: r.password, secret: true },
  ].filter((x) => x.value);

  const wrap = $("creds");
  wrap.innerHTML = "";
  for (const row of rows) {
    const label = t(row.key);
    const el = document.createElement("div");
    el.className = "cred";
    el.innerHTML = `
      <span class="label">${esc(label)}</span>
      <span class="value${row.secret ? " masked" : ""}" dir="ltr">${
        row.secret ? "•".repeat(Math.min(row.value.length, 12)) : esc(row.value)
      }</span>
      <span class="acts">
        ${
          row.secret
            ? `<button class="iconbtn" type="button" data-act="toggle" aria-pressed="false" aria-label="${esc(
                `${t("cred.show")} ${label}`,
              )}" title="${esc(t("cred.show"))}">${icon("eye")}</button>`
            : ""
        }
        <button class="iconbtn" type="button" data-act="copy" aria-label="${esc(
          `${t("cred.copy")} ${label}`,
        )}" title="${esc(t("cred.copy"))}">${icon("copy")}</button>
      </span>`;

    const valueEl = el.querySelector(".value");
    let visible = !row.secret;
    el.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "copy") {
        copyText(row.value, el.querySelector('[data-act="copy"]'), t("cred.copied"));
        stampRow(el, t("cred.copied"));
      } else if (act === "toggle") {
        visible = !visible;
        valueEl.textContent = visible ? row.value : "•".repeat(Math.min(row.value.length, 12));
        valueEl.classList.toggle("masked", !visible);
        const btn = el.querySelector('[data-act="toggle"]');
        const verb = visible ? t("cred.hide") : t("cred.show");
        btn.setAttribute("aria-pressed", String(visible));
        btn.setAttribute("aria-label", `${verb} ${label}`);
        btn.title = verb;
        btn.innerHTML = icon(visible ? "eyeOff" : "eye");
      }
    });
    wrap.appendChild(el);
  }

  show($("discardBox"), !!r.discarded);

  const steps = skuSteps(r.service, r.steps);
  if (steps.length) {
    $("steps").innerHTML = steps.map((s) => `<li>${rich(s)}</li>`).join("");
    show($("stepsPanel"), true);
  } else {
    show($("stepsPanel"), false);
  }

  show($("totpPanel"), !!r.hasAccountTotp);
  show($("codePanel"), !!r.canGetCode);
}

/* ---------------------------------------------------------------- totp */

let totpBusy = false;
let totpTimer = null;
let totpLeft = 0;
let totpTotal = 30;
let totpValue = "";

function paintTotp() {
  $("totpSecs").textContent = `${totpLeft}s`;
  $("totpBar").style.transform = `scaleX(${Math.max(0, Math.min(1, totpLeft / totpTotal))})`;
  $("totpNote").textContent = totpLeft <= 5 ? t("totp.soon") : t("totp.note", { n: totpLeft });
  $("totpFoil").classList.toggle("is-expiring", totpLeft <= 5);
}

function resetTotpVeil() {
  foilClose("totpFoil");
  foilBusy("totpFoil", false);
  $("totpBtn").disabled = false;
  $("totpVeilLabel").textContent = t("foil.reveal");
}

function startTotp(code, left, period) {
  clearInterval(totpTimer);
  totpValue = code;
  totpTotal = period;
  totpLeft = left;
  $("totpPeriod").textContent = t("totp.every", { n: period });
  $("totpCode").textContent = code.replace(/^(\d{3})(\d{3})$/, "$1 $2");
  foilOpen("totpFoil");
  paintTotp();
  announce($("totpCode").textContent);
  $("totpCopy").focus({ preventScroll: true });
  totpTimer = setInterval(() => {
    totpLeft -= 1;
    if (totpLeft <= 0) {
      clearInterval(totpTimer);
      resetTotpVeil();
      return;
    }
    paintTotp();
  }, 1000);
}

async function getTotp() {
  if (totpBusy) return;
  totpBusy = true;
  $("totpBtn").disabled = true;
  foilBusy("totpFoil", true);
  $("totpVeilLabel").textContent = t("totp.busy");
  show($("totpError"), false);
  try {
    let d = await api(`/api/v/${ID}/totp?field=account`);
    // Upstream can answer with an already-expired window; refetch once instead
    // of flashing "0s" at the user.
    if (d.expiresIn <= 0 && !d.nextCode) {
      d = await api(`/api/v/${ID}/totp?field=account`);
    }
    // Mirror upstream: if the code is about to roll, wait it out and use the
    // pre-computed next value instead of fetching again.
    if (d.expiresIn <= 5 && d.nextCode) {
      await sleep((d.expiresIn + 1) * 1000);
      startTotp(d.nextCode, d.period - 1, d.period);
    } else {
      startTotp(d.code, Math.max(d.expiresIn, 1), d.period);
    }
  } catch (err) {
    const box = $("totpError");
    box.textContent = err.message;
    show(box, true);
  } finally {
    totpBusy = false;
    foilBusy("totpFoil", false);
    if (!$("totpFoil").classList.contains("is-open")) {
      $("totpBtn").disabled = false;
      $("totpVeilLabel").textContent = t("foil.reveal");
    }
  }
}

$("totpBtn").addEventListener("click", getTotp);
$("totpCopy").addEventListener("click", () => copyText(totpValue, $("totpCopy"), t("cred.copied")));

/* ----------------------------------------------------------- email code */

let codeJob = null;
let codeTimer = null;

function showCodeState() {
  show($("codeError"), false);
  const foil = $("codeFoil");
  const label = $("codeVeilLabel");

  if (!codeJob) {
    foil.classList.remove("is-busy");
    foilClose("codeFoil");
    $("codeBtn").disabled = false;
    label.textContent = t("code.get");
    return;
  }
  if (codeJob.code) {
    foil.classList.remove("is-busy");
    $("codeValue").textContent = codeJob.code;
    $("codeStatus").textContent = t("code.status");
    const wasOpen = foil.classList.contains("is-open");
    foilOpen("codeFoil", { instant: !wasOpen && document.readyState !== "loading" });
    if (wasOpen) $("codeStatus").textContent = t("code.status");
    return;
  }
  if (codeJob.pending) {
    foil.classList.add("is-busy");
    foilClose("codeFoil");
    $("codeBtn").disabled = true;
    label.textContent = t("code.busy");
    return;
  }
  // terminal but empty → dead
  foil.classList.remove("is-busy");
  foilClose("codeFoil");
  $("codeBtn").disabled = false;
  label.textContent = t("code.retry");
  $("codeError").textContent = t("code.failed");
  show($("codeError"), true);
}

function schedulePoll() {
  clearTimeout(codeTimer);
  if (!codeJob?.pending) return;
  codeTimer = setTimeout(pollCode, 3000);
}

async function pollCode() {
  try {
    const { job } = await api(`/api/v/${ID}/code`);
    codeJob = job;
  } catch (err) {
    const box = $("codeError");
    box.textContent = err.message;
    show(box, true);
    codeJob = null;
  }
  showCodeState();
  schedulePoll();
}

async function startCode() {
  const foil = $("codeFoil");
  show($("codeError"), false);
  foil.classList.add("is-busy");
  $("codeBtn").disabled = true;
  $("codeVeilLabel").textContent = t("code.busy");
  try {
    const { job } = await api(`/api/v/${ID}/code`, { method: "POST" });
    codeJob = job;
  } catch (err) {
    if (err.type === "code_in_progress") {
      const { job } = await api(`/api/v/${ID}/code`);
      codeJob = job;
    } else {
      const box = $("codeError");
      box.textContent = err.message;
      show(box, true);
      codeJob = null;
      foil.classList.remove("is-busy");
      $("codeBtn").disabled = false;
      return;
    }
  }
  showCodeState();
  schedulePoll();
}

$("codeBtn").addEventListener("click", startCode);
$("codeCopy").addEventListener("click", () =>
  copyText(codeJob?.code || "", $("codeCopy"), t("cred.copied")),
);

/* ---------------------------------------------------------------- boot */

function syncLabels() {
  $("totpPeriod").textContent = t("totp.every", { n: totpTotal });
  if (!$("totpFoil").classList.contains("is-open") && !totpBusy) {
    $("totpVeilLabel").textContent = t("foil.reveal");
  }
}

async function boot() {
  if (!ID) return fatal(t("cred.err.invalid"));
  setLoading();
  try {
    const { record } = await api(`/api/v/${ID}`);
    renderCredentials(record);
    show($("loader"), false);
    show($("content"), true);
    syncLabels();
    // Resume an email-code job that was already running. A terminal/dead job
    // from an earlier visit is ignored — no error is shown until the user
    // actually clicks.
    if (record.canGetCode) {
      try {
        const { job } = await api(`/api/v/${ID}/code`);
        codeJob = job && (job.code || job.pending) ? job : null;
        showCodeState();
        schedulePoll();
      } catch {
        /* non-fatal */
      }
    }
  } catch (err) {
    if (err.status === 404 || err.type === "not_found") {
      fatal(t("cred.err.notFound"));
    } else if (err.type === "network" || err.status === 0) {
      fatal(t("cred.err.network"), { retry: true });
    } else if (err.status >= 400 && err.status < 500 && err.message) {
      fatal(err.message);
    } else {
      fatal(t("cred.err.generic"), { retry: true });
    }
  }
}

/* Language switch: rebuild the dynamic surface in place, no refetch. */
onLangChange(() => {
  applyStatic(document);
  if (lastRecord) renderCredentials(lastRecord);
  syncLabels();
  if (totpLeft > 0) paintTotp();
  showCodeState();
});

$("errorRetry").addEventListener("click", () => boot());

boot();
