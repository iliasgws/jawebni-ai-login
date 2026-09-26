import { $ } from "/ui.js";

const TOKEN_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;

function normalize(raw) {
  return raw.trim().replace(/[\s-]/g, "").toUpperCase();
}

function fieldError(message) {
  const input = $("token");
  const box = $("tokenError");
  if (message) {
    input.setAttribute("aria-invalid", "true");
    box.textContent = message;
    box.classList.remove("hidden");
    input.focus();
  } else {
    input.removeAttribute("aria-invalid");
    box.textContent = "";
    box.classList.add("hidden");
  }
  return false;
}

$("tokenForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = normalize($("token").value);
  if (!id) return fieldError("Saisissez votre code d'accès.");
  if (!TOKEN_RE.test(id)) {
    return fieldError("Ce code n'est pas valide. Vérifiez-le et réessayez.");
  }
  fieldError("");
  location.href = `/v/${id}`;
});

$("token").addEventListener("input", () => {
  if ($("token").getAttribute("aria-invalid")) fieldError("");
});
