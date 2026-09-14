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

  const { isPageElement, exactLabels } = RGP.myaccess;
  const roleSelector = "textarea[id^='role_buisnesjustifcation_'], textarea[placeholder='Provide a reason for your request']";

  function labelledControls(label, selector) {
    const found = new Set();
    for (const el of exactLabels(label)) {
      const target = el.getAttribute("for") && document.getElementById(el.getAttribute("for"));
      if (target?.matches(selector) && isPageElement(target)) { found.add(target); continue; }
      for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
        const controls = [...n.querySelectorAll(selector)].filter(isPageElement);
        if (controls.length) {
          if (controls.length === 1) found.add(controls[0]);
          break;
        }
      }
    }
    return [...found];
  }

  function roleAreas() {
    return [...new Set([...document.querySelectorAll(roleSelector), ...labelledControls("Justification", "textarea")])]
      .filter(el => isPageElement(el) && !el.disabled && !el.readOnly &&
        el.id !== "comments_global" && !el.id.startsWith("businessjustification_SOD_R_"));
  }

  function addJustificationButtons() {
    return [...new Set(exactLabels("Add Justification").map(el =>
      el.closest('button, a, [role="button"]') || el))]
      .filter(el => !el.disabled && el.getAttribute("aria-disabled") !== "true");
  }

  function buttonContext(button) {
    for (let n = button.parentElement; n && n !== document.body; n = n.parentElement) {
      const text = (n.innerText || n.textContent || "").replace(/Add Justification/g, "").replace(/\s+/g, " ").trim();
      if (text.length > 3) return text;
    }
    return "";
  }

  async function runJustify(text, log, signal) {
    let filled = 0, conflicts = 0;
    const completed = new WeakSet();
    const fillRoles = async () => {
      for (const ta of roleAreas()) {
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (completed.has(ta)) continue;
        completed.add(ta);
        if (ta.value.trim()) continue;
        setNativeValue(ta, text);
        filled++;
        log("   ✅ " + getRespoName(ta), "rgp-ok");
        await delay(JUSTIFY_PAUSE, signal);
      }
    };
    log("📋 Apertura e compilazione delle justification");
    await fillRoles();
    // Capture role identities before opening: a collapsed completed role may
    // show Add Justification again, and must not be reopened indefinitely.
    const pending = addJustificationButtons().map(button => ({ button, key: buttonContext(button) }));
    for (const item of pending) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const matches = addJustificationButtons().filter(el => buttonContext(el) === item.key);
      const button = item.button.isConnected && isPageElement(item.button) ? item.button :
        (matches.length === 1 ? matches[0] : null);
      if (!button) throw new Error("Ruolo non più riconoscibile dopo l'apertura della justification. Controlla la pagina e riprova.");
      const before = new Set(roleAreas());
      button.click();
      const start = Date.now();
      while (!roleAreas().some(el => !before.has(el))) {
        if (Date.now() - start >= RGP.const.TIMING.CANDIDATE_TIMEOUT) {
          throw new Error('Il clic su Add Justification non ha mostrato una casella riconoscibile. Compilazione interrotta: controlla il ruolo.');
        }
        await delay(RGP.const.TIMING.POLL_INTERVAL, signal);
      }
      await fillRoles();
    }

    const sodAreas = [...document.querySelectorAll("textarea[id^='businessjustification_SOD_R_']")]
      .filter(el => isPageElement(el) && !el.disabled && !el.readOnly && !el.value.trim());
    for (const ta of sodAreas) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      setNativeValue(ta, text);
      conflicts++;
      log("   ✅ SoD: " + getRespoName(ta), "rgp-ok");
      await delay(JUSTIFY_PAUSE, signal);
    }

    const globalComment = document.querySelector("#comments_global") || labelledControls("Comments", "textarea")[0];
    if (globalComment && isPageElement(globalComment) && !globalComment.disabled && !globalComment.readOnly && !globalComment.value.trim()) {
      setNativeValue(globalComment, text);
      log("   ✅ Commento globale compilato", "rgp-ok");
      filled++;
      await delay(JUSTIFY_PAUSE, signal);
    }

    const disclaimer = "I confirm that I have reviewed this request and that I need this access to do my job.";
    const checkbox = document.querySelector("#disclaimerCheckbox") || labelledControls(disclaimer, 'input[type="checkbox"]')[0];
    if (checkbox && isPageElement(checkbox) && !checkbox.disabled && !checkbox.checked) {
      checkbox.click();
      log("   ✅ Checkbox disclaimer spuntata", "rgp-ok");
      await delay(CHECKBOX_PAUSE, signal);
    }
    if (!filled && !conflicts) log("ℹ️ Nessun campo vuoto riconosciuto da compilare.");
    return { filled, conflicts };
  }

  RGP.justifier = { runJustify };
})();
