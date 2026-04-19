// ResPro — workflow di giustificazione (Step 3)
window.RGP = window.RGP || {};

(function () {
  const { delay, setNativeValue } = RGP.utils;
  const { JUSTIFY_PAUSE, CHECKBOX_PAUSE } = RGP.const.TIMING;

  /** Prova a estrarre il nome della respo dal contesto della textarea */
  function getRespoName(ta) {
    let n = ta.parentElement;
    for (let i = 0; i < 8 && n; i++) {
      const title = n.querySelector(".row-title .large-text, .large-text, h5 a span, .applicationspan");
      if (title) return title.textContent.trim();
      const heading = n.querySelector("h4, h5, .portlet-title, .v2-header");
      if (heading && heading.textContent.trim().length > 3) return heading.textContent.trim();
      n = n.parentElement;
    }
    const row = ta.closest("[class*='panel'], [class*='portlet'], [class*='row'], tr");
    if (row) {
      const anyText = row.querySelector("h4, h5, .large-text, strong, b, label:not([for])");
      if (anyText) return anyText.textContent.trim();
    }
    return ta.id;
  }

  /**
   * Compila tutte le textarea di justification + commento globale + checkbox.
   * @returns {Promise<{filled: number, conflicts: number}>}
   */
  async function runJustify(text, log, signal) {
    let filled = 0, conflicts = 0;
    RGP.debug("runJustify: avvio compilazione justification");

    // 1. Justification per ogni respo
    const respoAreas = [...document.querySelectorAll("textarea[id^='role_buisnesjustifcation_']")]
      .filter(el => !el.value || el.value.trim() === "");
    log("📋 " + respoAreas.length + " justification da compilare");
    for (const ta of respoAreas) {
      if (signal?.aborted) return { filled, conflicts };
      setNativeValue(ta, text);
      filled++;
      log("   ✅ " + getRespoName(ta), "rgp-ok");
      await delay(JUSTIFY_PAUSE, signal);
    }

    // 2. Conflitti SoD
    const sodAreas = [...document.querySelectorAll("textarea[id^='businessjustification_SOD_R_']")]
      .filter(el => !el.value || el.value.trim() === "");
    if (sodAreas.length) {
      log("⚠️ " + sodAreas.length + " conflitti SoD", "rgp-warn");
      for (const ta of sodAreas) {
        if (signal?.aborted) return { filled, conflicts };
        setNativeValue(ta, text);
        conflicts++;
        log("   ✅ " + getRespoName(ta), "rgp-ok");
        await delay(JUSTIFY_PAUSE, signal);
      }
    }

    // 3. Commento globale
    const globalComment = document.querySelector("#comments_global");
    if (globalComment && (!globalComment.value || globalComment.value.trim() === "")) {
      setNativeValue(globalComment, text);
      log("   ✅ Commento globale compilato", "rgp-ok");
      filled++;
      await delay(JUSTIFY_PAUSE, signal);
    }

    // 4. Checkbox disclaimer
    const checkbox = document.querySelector("#disclaimerCheckbox");
    if (checkbox && !checkbox.checked) {
      checkbox.click();
      log("   ✅ Checkbox disclaimer spuntata", "rgp-ok");
      await delay(CHECKBOX_PAUSE, signal);
    } else if (checkbox && checkbox.checked) {
      log("   ℹ️ Checkbox già spuntata");
    }

    return { filled, conflicts };
  }

  RGP.justifier = { runJustify };
})();
