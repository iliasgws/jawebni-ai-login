/* i18n for the customer surfaces (FR default, EN, AR with RTL).
   One source of truth for every customer-facing string, including the
   service labels and sign-in steps the server ships in French: when a
   translation is missing the server's French is used as the fallback,
   so an unknown SKU never renders as an empty string. */

export const LANGS = ["fr", "en", "ar"];
export const DEFAULT_LANG = "fr";
const STORAGE_KEY = "jawebni.lang";
const CHANGE_EVENT = "jawebni:lang";

const STRINGS = {
  fr: {
    "doc.title": "Jawebni · Accès",
    "doc.title.cred": "Vos identifiants · Jawebni",
    "a11y.skip": "Aller au contenu",
    "a11y.lang": "Langue",

    "gate.heading": "Saisissez votre code d'accès",
    "gate.sub": "Le code vous a été transmis par notre équipe après votre commande.",
    "gate.label": "Code d'accès",
    "gate.placeholder": "ABCD EFGH IJKL MNOP QRST",
    "gate.submit": "Voir mes identifiants",
    "gate.err.empty": "Saisissez votre code d'accès.",
    "gate.err.invalid": "Ce code n'est pas valide. Vérifiez-le et réessayez.",

    "brand.account": "identifiants du compte",
    "brand.foot": "Lien personnel · ne le partagez avec personne d'autre.",

    "cred.loading": "Chargement de vos identifiants…",
    "cred.err.invalid": "Ce lien est invalide.",
    "cred.err.notFound": "Lien invalide ou expiré.",
    "cred.err.network":
      "Connexion impossible. Vérifiez votre accès internet, puis réessayez.",
    "cred.err.generic": "Impossible de charger ce lien pour le moment. Réessayez dans un instant.",
    "cred.retry": "Réessayer",
    "cred.hello": "Bonjour {name}",
    "cred.title": "Vos identifiants",
    "cred.account": "Compte de connexion",
    "cred.password": "Mot de passe de connexion",
    "cred.show": "Afficher",
    "cred.hide": "Masquer",
    "cred.copy": "Copier",
    "cred.copied": "Copié",
    "cred.revoked": "Ces identifiants ont été révoqués. Pour toute question, contactez le support.",
    "cred.revoked.stamp": "Révoqué",
    "cred.keepSafe":
      "Ne modifiez pas le mot de passe et n'activez aucune nouvelle double authentification, sinon le compte risque de ne plus être utilisable.",
    "cred.keepSafe.label": "Important",
    "cred.days.one": "{n} jour restant",
    "cred.days.other": "{n} jours restants",
    "cred.expired": "Expiré",

    "foil.reveal": "Touchez la feuille pour révéler le code",
    "foil.hint": "Un appui suffit",

    "totp.title": "Code de double authentification",
    "totp.every": "change toutes les {n} s",
    "totp.get": "Obtenir le code d'authentification",
    "totp.busy": "Chargement…",
    "totp.note": "Ce code change dans {n} s.",
    "totp.soon": "Expire bientôt — obtenez un nouveau code",
    "totp.copy": "Copier le code",

    "code.title": "Code de vérification par e-mail",
    "code.window": "1 à 2 minutes",
    "code.get": "Obtenir le code",
    "code.again": "Obtenir un nouveau code",
    "code.busy": "Récupération du code…",
    "code.retry": "Réessayer",
    "code.status": "Code reçu — saisissez-le sur la page de connexion",
    "code.failed": "Impossible d'obtenir le code. Veuillez réessayer dans un instant.",
    "code.help":
      "Si la page de connexion demande un code envoyé à l'e-mail du compte, récupérez-le ici.",
    "code.copy": "Copier le code",

    "steps.title": "Comment se connecter",
    "guide.title": "Guide visuel",
    "guide.alt":
      "Comment se connecter : guide illustré en trois étapes — adresse e-mail, mot de passe, vérification.",
  },

  en: {
    "doc.title": "Jawebni · Access",
    "doc.title.cred": "Your credentials · Jawebni",
    "a11y.skip": "Skip to content",
    "a11y.lang": "Language",

    "gate.heading": "Enter your access code",
    "gate.sub": "Our team sent you this code after your order.",
    "gate.label": "Access code",
    "gate.placeholder": "ABCD EFGH IJKL MNOP QRST",
    "gate.submit": "Show my credentials",
    "gate.err.empty": "Enter your access code.",
    "gate.err.invalid": "That code isn't valid. Check it and try again.",

    "brand.account": "account credentials",
    "brand.foot": "Personal link · do not share it with anyone.",

    "cred.loading": "Loading your credentials…",
    "cred.err.invalid": "This link is invalid.",
    "cred.err.notFound": "Invalid or expired link.",
    "cred.err.network": "No connection. Check your internet access, then try again.",
    "cred.err.generic": "Couldn't load this link right now. Try again shortly.",
    "cred.retry": "Try again",
    "cred.hello": "Hello {name}",
    "cred.title": "Your credentials",
    "cred.account": "Sign-in account",
    "cred.password": "Sign-in password",
    "cred.show": "Show",
    "cred.hide": "Hide",
    "cred.copy": "Copy",
    "cred.copied": "Copied",
    "cred.revoked": "These credentials have been revoked. For any question, contact support.",
    "cred.revoked.stamp": "Revoked",
    "cred.keepSafe":
      "Do not change the password or turn on any new two-factor authentication, or the account may stop working.",
    "cred.keepSafe.label": "Important",
    "cred.days.one": "{n} day left",
    "cred.days.other": "{n} days left",
    "cred.expired": "Expired",

    "foil.reveal": "Tap the foil to reveal the code",
    "foil.hint": "One tap is enough",

    "totp.title": "Two-factor authentication code",
    "totp.every": "changes every {n} s",
    "totp.get": "Get the authentication code",
    "totp.busy": "Loading…",
    "totp.note": "This code changes in {n} s.",
    "totp.soon": "Expires soon — get a new code",
    "totp.copy": "Copy the code",

    "code.title": "Email verification code",
    "code.window": "1 to 2 minutes",
    "code.get": "Get the code",
    "code.again": "Get a new code",
    "code.busy": "Fetching the code…",
    "code.retry": "Try again",
    "code.status": "Code received — enter it on the sign-in page",
    "code.failed": "Couldn't get the code. Please try again shortly.",
    "code.help":
      "If the sign-in page asks for a code sent to the account's email, get it here.",
    "code.copy": "Copy the code",

    "steps.title": "How to sign in",
    "guide.title": "Visual guide",
    "guide.alt":
      "How to sign in: illustrated three-step guide — email address, password, verification.",
  },

  ar: {
    "doc.title": "جوابني · الدخول",
    "doc.title.cred": "بيانات الدخول · جوابني",
    "a11y.skip": "انتقل إلى المحتوى",
    "a11y.lang": "اللغة",

    "gate.heading": "أدخل رمز الدخول",
    "gate.sub": "أرسلت لك فريقنا هذا الرمز بعد طلبك.",
    "gate.label": "رمز الدخول",
    "gate.placeholder": "ABCD EFGH IJKL MNOP QRST",
    "gate.submit": "اعرض بيانات الدخول",
    "gate.err.empty": "أدخل رمز الدخول.",
    "gate.err.invalid": "هذا الرمز غير صالح. تحقق منه ثم أعد المحاولة.",

    "brand.account": "بيانات الدخول",
    "brand.foot": "رابط شخصي · لا تشاركه مع أحد.",

    "cred.loading": "جارٍ تحميل بيانات الدخول…",
    "cred.err.invalid": "هذا الرابط غير صالح.",
    "cred.err.notFound": "رابط غير صالح أو منتهي الصلاحية.",
    "cred.err.network": "تعذّر الاتصال. تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
    "cred.err.generic": "تعذّر تحميل هذا الرابط حاليًا. أعد المحاولة بعد قليل.",
    "cred.retry": "أعد المحاولة",
    "cred.hello": "مرحبًا {name}",
    "cred.title": "بيانات الدخول",
    "cred.account": "حساب تسجيل الدخول",
    "cred.password": "كلمة مرور الدخول",
    "cred.show": "إظهار",
    "cred.hide": "إخفاء",
    "cred.copy": "نسخ",
    "cred.copied": "تم النسخ",
    "cred.revoked": "تم إلغاء صلاحية بيانات هذه الدخول. لأي استفسار، تواصل مع الدعم.",
    "cred.revoked.stamp": "مُلغى",
    "cred.keepSafe":
      "لا تغيّر كلمة المرور ولا تفعّل مصادقة ثنائية جديدة، وإلا قد يتوقف الحساب عن العمل.",
    "cred.keepSafe.label": "مهم",
    "cred.days.one": "يوم واحد متبقي",
    "cred.days.other": "{n} يوم متبقي",
    "cred.expired": "منتهٍ",

    "foil.reveal": "المس الغطاء الذهبي لإظهار الرمز",
    "foil.hint": "لمسة واحدة تكفي",

    "totp.title": "رمز المصادقة الثنائية",
    "totp.every": "يتغيّر كل {n} ث",
    "totp.get": "احصل على رمز المصادقة",
    "totp.busy": "جارٍ التحميل…",
    "totp.note": "يتغيّر هذا الرمز خلال {n} ث.",
    "totp.soon": "ينتهي قريبًا — احصل على رمز جديد",
    "totp.copy": "انسخ الرمز",

    "code.title": "رمز التحقق بالبريد الإلكتروني",
    "code.window": "دقيقة إلى دقيقتين",
    "code.get": "احصل على الرمز",
    "code.again": "احصل على رمز جديد",
    "code.busy": "جارٍ جلب الرمز…",
    "code.retry": "أعد المحاولة",
    "code.status": "تم استلام الرمز — أدخله في صفحة تسجيل الدخول",
    "code.failed": "تعذّر الحصول على الرمز. حاول مجددًا بعد قليل.",
    "code.help": "إن طلبت صفحة تسجيل الدخول رمزًا أُرسل إلى بريد الحساب، فاحصل عليه من هنا.",
    "code.copy": "انسخ الرمز",

    "steps.title": "كيفية تسجيل الدخول",
    "guide.title": "دليل مصور",
    "guide.alt": "كيفية تسجيل الدخول: دليل مصور في ثلاث خطوات — البريد الإلكتروني، كلمة المرور، التحقق.",
  },
};

/* Service names and sign-in steps, mirrored from server.js.
   Missing keys fall back to the French the server already sent. */
const SKU_LABELS = {
  fr: {
    "fa-totp": "Connexion directe · double authentification",
    "fa-other": "Connexion par e-mail",
    "fa-gd-2fa": "Connexion e-mail Google · double authentification",
    "fa-gd-bk": "Connexion e-mail Google · e-mail de secours",
    "fa-ol": "Connexion e-mail Outlook",
    "fa-oa-2fa": "Connexion avec Google · double authentification",
    "fa-oa-bk": "Connexion avec Google · e-mail de secours",
  },
  en: {
    "fa-totp": "Direct sign-in · two-factor authentication",
    "fa-other": "Sign-in by email",
    "fa-gd-2fa": "Google email sign-in · two-factor authentication",
    "fa-gd-bk": "Google email sign-in · backup email",
    "fa-ol": "Outlook email sign-in",
    "fa-oa-2fa": "Sign-in with Google · two-factor authentication",
    "fa-oa-bk": "Sign-in with Google · backup email",
  },
  ar: {
    "fa-totp": "دخول مباشر · مصادقة ثنائية",
    "fa-other": "الدخول عبر البريد الإلكتروني",
    "fa-gd-2fa": "دخول جوجل بالبريد · مصادقة ثنائية",
    "fa-gd-bk": "دخول جوجل بالبريد · بريد احتياطي",
    "fa-ol": "دخول Outlook بالبريد",
    "fa-oa-2fa": "الدخول عبر جوجل · مصادقة ثنائية",
    "fa-oa-bk": "الدخول عبر جوجل · بريد احتياطي",
  },
};

const SKU_STEPS = {
  fr: {
    "fa-totp": [
      "Ouvrez la page de connexion du service acheté. Saisissez le **Compte de connexion** affiché ici, puis cliquez sur « Continuer ».",
      "Saisissez le **Mot de passe de connexion**, puis cliquez sur « Continuer ».",
      "Cliquez sur **Obtenir le code** ci-dessous, puis saisissez ce code à 6 chiffres dans le champ « Code unique » pour terminer la connexion. Si le code a expiré, cliquez de nouveau.",
    ],
  },
  en: {
    "fa-totp": [
      "Open the sign-in page of the service you bought. Enter the **Sign-in account** shown here, then click **Continue**.",
      "Enter the **Sign-in password**, then click **Continue**.",
      "Click **Get the code** below, then enter this 6-digit code in the **One-time code** field to finish signing in. If the code has expired, click again.",
    ],
  },
  ar: {
    "fa-totp": [
      "افتح صفحة تسجيل الدخول للخدمة التي اشتريتها. أدخل **حساب تسجيل الدخول** الظاهر هنا ثم اضغط **متابعة**.",
      "أدخل **كلمة مرور الدخول** ثم اضغط **متابعة**.",
      "اضغط **احصل على الرمز** أدناه ثم أدخل هذا الرمز المكوّن من ٦ أرقام في حقل **الرمز لمرة واحدة** لإنهاء تسجيل الدخول. إذا انتهت صلاحية الرمز، اضغط مرة أخرى.",
    ],
  },
};

let lang = DEFAULT_LANG;

export function getLang() {
  return lang;
}

export function dirFor(code) {
  return code === "ar" ? "rtl" : "ltr";
}

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (LANGS.includes(v)) return v;
  } catch {
    /* storage disabled */
  }
  const fromUrl = new URLSearchParams(location.search).get("lang");
  if (LANGS.includes(fromUrl)) return fromUrl;
  return null;
}

/** Resolve the language once, before the first paint of dynamic content. */
export function initLang() {
  const stored = readStored();
  if (stored) lang = stored;
  else {
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    if (LANGS.includes(nav)) lang = nav;
  }
  applyDocument();
  return lang;
}

function applyDocument() {
  const el = document.documentElement;
  el.lang = lang;
  el.dir = dirFor(lang);
}

export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return getLang();
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage disabled */
  }
  applyDocument();
  applyStatic(document);
  document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { lang } }));
  return lang;
}

export function onLangChange(fn) {
  document.addEventListener(CHANGE_EVENT, fn);
}

/** Translate a key. `{name}` placeholders are substituted from `vars`. */
export function t(key, vars) {
  const dict = STRINGS[lang] || STRINGS[DEFAULT_LANG];
  let out = dict[key];
  if (out == null) out = STRINGS[DEFAULT_LANG][key];
  if (out == null) return key;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

/** Translate one of the server's French service labels. */
export function skuLabel(sku, fallback) {
  const key = String(sku || "").trim().toLowerCase();
  const v = SKU_LABELS[lang]?.[key];
  if (v) return v;
  const fr = SKU_LABELS.fr[key];
  return fr || fallback || "";
}

/** Translate the server's French sign-in steps; falls back to server text. */
export function skuSteps(sku, fallback) {
  const key = String(sku || "").trim().toLowerCase();
  const list = SKU_STEPS[lang]?.[key];
  if (Array.isArray(list) && list.length) return list;
  return Array.isArray(fallback) ? fallback : [];
}

const TEXT_ATTRS = ["data-i18n", "data-i18n-placeholder", "data-i18n-aria", "data-i18n-title"];

/** Walk the document and rewrite every tagged string to the current language. */
export function applyStatic(root = document) {
  for (const attr of TEXT_ATTRS) {
    const nodes = root.querySelectorAll?.(`[${attr}]`);
    if (!nodes) continue;
    for (const el of nodes) {
      const value = t(el.getAttribute(attr));
      if (attr === "data-i18n") el.textContent = value;
      else if (attr === "data-i18n-placeholder") el.setAttribute("placeholder", value);
      else if (attr === "data-i18n-aria") el.setAttribute("aria-label", value);
      else if (attr === "data-i18n-title") el.setAttribute("title", value);
    }
  }
  const pressed = root.querySelectorAll?.("[data-lang]");
  if (pressed) {
    for (const el of pressed) el.setAttribute("aria-pressed", String(el.dataset.lang === lang));
  }
}

/** Wire the segmented language control. Safe to call once per document. */
export function mountLangSwitch(root = document) {
  const group = root.querySelector?.("[data-langsw]");
  if (!group) return;
  group.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang]");
    if (btn) setLang(btn.dataset.lang);
  });
  group.querySelectorAll("[data-lang]").forEach((el) => {
    el.setAttribute("aria-pressed", String(el.dataset.lang === lang));
  });
}
