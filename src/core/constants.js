// ResPro — costanti globali
// Tutte le pagine, chiavi storage, default e regole hardcoded vivono qui.
window.RGP = window.RGP || {};

RGP.const = {
  // Pagine MyAccess su cui il pannello è attivo
  PAGES: {
    STEP2: "createrequestsecondstep",   // selezione respo
    STEP3: "createrequestthirdstep",    // giustificazione
  },

  // Chiavi chrome.storage.local — UNIFORMATE (bug fix #1)
  STORAGE_KEYS: {
    TEMPLATES: "rgpTemplates",
    SKIP:      "rgpSkip",
    JUST_TEXT: "rgpJustText",
    GEOMETRY:  "rgpGeometry",
  },
  // Vecchia chiave da migrare se trovata
  LEGACY_TEMPLATES_KEY: "rgpTemplate",

  // Testo default per la giustificazione
  DEFAULT_JUST_TEXT: "Need for work, logistic user",

  // Skip rules hardcoded (non modificabili dall'utente)
  HARD_BLACKLIST: [
    "PS GS WMS Pack Office (NP-GE) - Global Services",
    "PS GS WMS Pack Office (NP-GE)",
  ],
  HARD_PATTERNS: [
    "obsolete",
  ],

  // Timeout / delay (centralizzati per tuning)
  TIMING: {
    SEARCH_CLEAR_WAIT: 400,
    SEARCH_AFTER_INPUT: 300,
    SEARCH_AFTER_ENTER: 500,
    CANDIDATE_TIMEOUT: 7000,
    POLL_INTERVAL: 250,
    PER_ITEM_PAUSE: 700,
    JUSTIFY_PAUSE: 100,
    CHECKBOX_PAUSE: 200,
  },

  // Limiti UI
  UI: {
    MIN_WIDTH: 280,
    MIN_HEIGHT: 320,
    LOG_MAX_LINES: 120,
  },

  // Toggle debug — flippa a true e ricarica per logging dettagliato in console
  DEBUG: false,
};

RGP.isRelevantPage = () => {
  const href = location.href;
  return Object.values(RGP.const.PAGES).some(p => href.includes(p));
};

RGP.currentStep = () => {
  const href = location.href;
  if (href.includes(RGP.const.PAGES.STEP3)) return "STEP3";
  if (href.includes(RGP.const.PAGES.STEP2)) return "STEP2";
  return null;
};

RGP.debug = (...args) => {
  if (RGP.const.DEBUG) console.log("[ResPro]", ...args);
};
