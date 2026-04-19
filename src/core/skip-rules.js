// ResPro — logica per decidere se una respo va saltata
window.RGP = window.RGP || {};

(function () {
  const { HARD_BLACKLIST, HARD_PATTERNS } = RGP.const;

  function normalize(s) {
    return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  /**
   * Decide se la respo va saltata.
   * @param {string} text — testo della respo trovata
   * @param {{patterns: string[], blacklist: string[]}} userRules
   * @returns {false | "hardcoded-blacklist" | "hardcoded-pattern" | "blacklist" | "pattern"}
   */
  function shouldSkip(text, userRules) {
    const t = normalize(text);

    // 1. Blacklist hardcoded — match se contiene
    if (HARD_BLACKLIST.some(b => {
      const nb = normalize(b);
      return t.startsWith(nb) || t.includes(nb);
    })) return "hardcoded-blacklist";

    // 2. Pattern hardcoded
    if (HARD_PATTERNS.some(p => t.includes(p.toLowerCase()))) return "hardcoded-pattern";

    // 3. Blacklist utente
    if ((userRules.blacklist || []).some(b => {
      const nb = normalize(b);
      return nb === t || t.includes(nb);
    })) return "blacklist";

    // 4. Pattern utente
    if ((userRules.patterns || []).some(p => t.includes(p.toLowerCase().trim()))) return "pattern";

    return false;
  }

  RGP.skip = { shouldSkip, normalize };
})();
