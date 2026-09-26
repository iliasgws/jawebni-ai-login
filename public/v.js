import { $, api, esc, show, sleep, rich, copyText } from "/ui.js";

const ID = (location.pathname.match(/^\/v\/([0-9A-HJKMNP-TV-Z]{20})$/) || [])[1];

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

/* --------------------------------------------------------- credentials */

function renderCredentials(r) {
  $("welcome").textContent = r.name ? `Bonjour ${r.name}` : "Vos identifiants";
  $("sub").textContent = r.serviceLabel + (r.planName ? ` · ${r.planName}` : "");
  $("serviceBadge").textContent = r.service || "";
  show($("serviceBadge"), !!r.service);

  const days = $("daysBadge");
  if (r.daysLeft >= 0 && r.daysLeft !== -1) {
    days.textContent = r.expired ? "Expiré" : `${r.daysLeft} jour${r.daysLeft > 1 ? "s" : ""} restant${r.daysLeft > 1 ? "s" : ""}`;
    days.className = `badge ${r.expired ? "warn" : "ok"}`;
    show(days, true);
  } else {
    show(days, false);
  }

  const rows = [
    { label: "Compte de connexion", value: r.account, secret: false },
    { label: "Mot de passe de connexion", value: r.password, secret: true },
    { label: "Mot de passe e-mail", value: r.emailPassword, secret: true },
    { label: "E-mail de secours", value: r.backupEmail, secret: false },
  ].filter((x) => x.value);

  const wrap = $("creds");
  wrap.innerHTML = "";
  for (const row of rows) {
    const el = document.createElement("div");
    el.className = "cred";
    el.innerHTML = `
      <span class="label">${esc(row.label)}</span>
      <span class="value${row.secret ? " masked" : ""}">${row.secret ? "•".repeat(Math.min(row.value.length, 12)) : esc(row.value)}</span>
      <span class="acts">
        ${
          row.secret
            ? `<button class="iconbtn" type="button" data-act="toggle" aria-pressed="false" aria-label="Afficher ${esc(row.label)}" title="Afficher">👁</button>`
            : ""
        }
        <button class="iconbtn" type="button" data-act="copy" aria-label="Copier ${esc(row.label)}" title="Copier">⧉</button>
      </span>`;
    const valueEl = el.querySelector(".value");
    let visible = !row.secret;
    el.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      if (act === "copy") {
        copyText(row.value, el.querySelector('[data-act="copy"]'), "Copié");
      } else if (act === "toggle") {
        visible = !visible;
        valueEl.textContent = visible
          ? row.value
          : "•".repeat(Math.min(row.value.length, 12));
        valueEl.classList.toggle("masked", !visible);
        const btn = el.querySelector('[data-act="toggle"]');
        btn.setAttribute("aria-pressed", String(visible));
        btn.setAttribute("aria-label", `${visible ? "Masquer" : "Afficher"} ${row.label}`);
        btn.title = visible ? "Masquer" : "Afficher";
      }
    });
    wrap.appendChild(el);
  }

  show($("discardBox"), !!r.discarded);
  if (r.remark) {
    $("remarkBox").textContent = `Remarque : ${r.remark}`;
    show($("remarkBox"), true);
  }

  if (r.steps?.length) {
    $("steps").innerHTML = r.steps.map((s) => `<li>${rich(s)}</li>`).join("");
    show($("stepsPanel"), true);
  }

  show($("totpPanel"), !!r.hasAccountTotp);
  show($("codePanel"), !!r.canGetCode);
}

/* --------------------------------------------------------------- totp */

let totpBusy = false;
let totpTimer = null;
let totpLeft = 0;
let totpTotal = 30;
let totpValue = "";

function paintTotp() {
  $("totpSecs").textContent = `${totpLeft}s`;
  $("totpBar").style.transform = `scaleX(${Math.max(0, Math.min(1, totpLeft / totpTotal))})`;
  $("totpNote").textContent =
    totpLeft <= 5 ? "Expire bientôt — obtenez un nouveau code" : `Ce code change dans ${totpLeft} s.`;
  $("totpLive").classList.toggle("expiring", totpLeft <= 5);
}

function startTotp(code, left, period) {
  clearInterval(totpTimer);
  totpValue = code;
  totpTotal = period;
  totpLeft = left;
  $("periodHint").textContent = period;
  $("totpCode").textContent = code.replace(/^(\d{3})(\d{3})$/, "$1 $2");
  show($("totpIdle"), false);
  show($("totpLive"), true);
  paintTotp();
  totpTimer = setInterval(() => {
    totpLeft -= 1;
    if (totpLeft <= 0) {
      clearInterval(totpTimer);
      show($("totpLive"), false);
      show($("totpIdle"), true);
      return;
    }
    paintTotp();
  }, 1000);
}

async function getTotp() {
  if (totpBusy) return;
  totpBusy = true;
  const btn = $("totpBtn");
  btn.disabled = true;
  btn.textContent = "Chargement…";
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
    btn.disabled = false;
    btn.textContent = "Obtenir le code d'authentification";
  }
}

$("totpBtn").addEventListener("click", getTotp);
$("totpCopy").addEventListener("click", () =>
  copyText(totpValue, $("totpCopy"), "Copié"),
);

/* ---------------------------------------------------------- email code */

let codeJob = null;
let codeTimer = null;

function showCodeState() {
  show($("codeError"), false);
  if (!codeJob) {
    show($("codeLive"), false);
    $("codeBtn").disabled = false;
    $("codeBtn").textContent = "Obtenir le code";
    return;
  }
  if (codeJob.code) {
    $("codeValue").textContent = codeJob.code;
    $("codeStatus").textContent = "Code reçu — saisissez-le sur la page de connexion";
    show($("codeLive"), true);
    $("codeBtn").disabled = false;
    $("codeBtn").textContent = "Obtenir un nouveau code";
    return;
  }
  if (codeJob.pending) {
    show($("codeLive"), false);
    $("codeBtn").disabled = true;
    $("codeBtn").textContent = "Récupération du code…";
    return;
  }
  // terminal but empty → dead
  show($("codeLive"), false);
  $("codeBtn").disabled = false;
  $("codeBtn").textContent = "Réessayer";
  const box = $("codeError");
  box.textContent = "Impossible d'obtenir le code. Veuillez réessayer dans un instant.";
  show(box, true);
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
  const btn = $("codeBtn");
  btn.disabled = true;
  show($("codeError"), false);
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
      btn.disabled = false;
      return;
    }
  }
  showCodeState();
  schedulePoll();
}

$("codeBtn").addEventListener("click", startCode);
$("codeCopy").addEventListener("click", () => copyText(codeJob?.code || "", $("codeCopy"), "Copié"));

/* ---------------------------------------------------------------- boot */

async function boot() {
  if (!ID) return fatal("Ce lien est invalide.");
  setLoading();
  try {
    const { record } = await api(`/api/v/${ID}`);
    renderCredentials(record);
    show($("loader"), false);
    show($("content"), true);
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
      fatal("Lien invalide ou expiré.");
    } else if (err.type === "network" || err.status === 0) {
      fatal("Connexion impossible. Vérifiez votre accès internet, puis réessayez.", {
        retry: true,
      });
    } else if (err.status >= 400 && err.status < 500 && err.message) {
      fatal(err.message);
    } else {
      fatal("Impossible de charger ce lien pour le moment. Réessayez dans un instant.", {
        retry: true,
      });
    }
  }
}

$("errorRetry").addEventListener("click", () => boot());

boot();
