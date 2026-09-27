import { $ } from "/ui.js";
import { initLang, applyStatic, mountLangSwitch, onLangChange, t } from "/i18n.js";

initLang();
applyStatic(document);
mountLangSwitch(document);

const TOKEN_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;

let errorKey = "";

function normalize(raw) {
  return raw.trim().replace(/[\s-]/g, "").toUpperCase();
}

function fieldError(key) {
  const input = $("token");
  const box = $("tokenError");
  errorKey = key;
  if (key) {
    input.setAttribute("aria-invalid", "true");
    box.textContent = t(key);
    box.classList.remove("hidden");
    input.focus();
  } else {
    input.removeAttribute("aria-invalid");
    box.textContent = "";
    box.classList.add("hidden");
  }
  return false;
}

/* Keep any visible error in step with a language switch. */
onLangChange(() => {
  applyStatic(document);
  if (errorKey) $("tokenError").textContent = t(errorKey);
});

$("tokenForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = normalize($("token").value);
  if (!id) return fieldError("gate.err.empty");
  if (!TOKEN_RE.test(id)) return fieldError("gate.err.invalid");
  fieldError("");
  location.href = `/v/${id}`;
});

$("token").addEventListener("input", () => {
  if ($("token").getAttribute("aria-invalid")) fieldError("");
});
