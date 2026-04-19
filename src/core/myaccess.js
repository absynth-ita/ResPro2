// ResPro — interazione con il DOM di MyAccess (Saviynt)
// Tutto ciò che riguarda lo scraping della pagina vive qui.
// Quando MyAccess cambia layout, si tocca solo questo file.
window.RGP = window.RGP || {};

(function () {
  const { delay, setNativeValue } = RGP.utils;

  /**
   * Trova tutti i bottoni "+" / ADD presenti nella pagina, escludendo
   * quelli che appartengono al pannello ResPro (passato come `panelEl`).
   */
  function getAddButtons(panelEl) {
    const seen = new Set();
    const notOurs = el => el && (!panelEl || !panelEl.contains(el));

    document.querySelectorAll('[aria-label="ADD"],[aria-label="Add"],[aria-label="add"]')
      .forEach(el => { if (notOurs(el)) seen.add(el); });

    document.querySelectorAll(".ent-add-selected-item")
      .forEach(el => { if (notOurs(el)) seen.add(el); });

    document.querySelectorAll("a i.icon-v2-add, button i.icon-v2-add")
      .forEach(el => { const p = el.closest("a,button"); if (notOurs(p)) seen.add(p); });

    document.querySelectorAll("button,a").forEach(el => {
      if (!notOurs(el)) return;
      const txt = el.textContent.trim();
      // bottone con testo "+" puro (layout card nuovo)
      if (txt === "+") seen.add(el);
      // bottone con SVG e quasi-niente testo (cerchio + di MyAccess)
      else if (el.querySelector("svg") && txt.replace(/\s/g, "").length <= 3) seen.add(el);
    });

    return [...seen];
  }

  /**
   * Risale il DOM da un bottone ADD per trovare il container che contiene
   * il NOME della responsibility. Gestisce sia layout tabellare che card.
   *
   * @param {Element} addBtn
   * @param {Element[]} allButtons — già calcolati, per evitare ricalcoli
   */
  function findContainer(addBtn, allButtons) {
    // LAYOUT A (tabella): td fratello con testo
    const tr = addBtn.closest("tr");
    if (tr) {
      for (const td of tr.querySelectorAll("td")) {
        if (td.contains(addBtn)) continue;
        const t = (td.innerText || "").trim();
        if (t.length > 5) return td;
      }
      if ((tr.innerText || "").trim().length > 5) return tr;
    }

    // LAYOUT B (card): risali con limiti stretti, evitando layout chrome
    let n = addBtn.parentElement;
    for (let i = 0; i < 10 && n && n.tagName !== "BODY"; i++) {
      const t = (n.innerText || "").trim();
      const tag = n.tagName.toLowerCase();
      const cls = (n.className || "").toLowerCase();
      const isLayout = ["header", "nav", "footer", "aside"].includes(tag) ||
        cls.includes("header") || cls.includes("navbar") ||
        cls.includes("user-") || cls.includes("-user") ||
        cls.includes("profile") || cls.includes("avatar") ||
        cls.includes("page-header") || cls.includes("topbar");
      if (!isLayout && t.length > 5 && t.length < 300) {
        // se nessun altro bottone ADD vive in questo container → è quello giusto
        const others = allButtons.filter(b => b !== addBtn && n.contains(b));
        if (others.length === 0) return n;
      }
      n = n.parentElement;
    }
    return addBtn.parentElement || addBtn;
  }

  /**
   * Estrae il testo "user-friendly" da mostrare nel log.
   * Le card di MyAccess hanno spesso titolo + sottotitolo (descrizione/ID),
   * quindi `innerText` contiene roba duplicata tipo:
   *   "NP - SHP Shipping Dept Office - Supply Chain
   *    NP - SHP Shipping Dept Office"
   * Per il log vogliamo solo la prima riga (o il titolo della card).
   */
  function extractDisplayText(container) {
    // 1. Prova a trovare un elemento "titolo" esplicito
    const titleEl = container.querySelector(
      ".large-text, .applicationspan, h5 a span, h5, h4, [class*='title']:not([class*='subtitle'])"
    );
    if (titleEl) {
      const t = ((titleEl.innerText ?? titleEl.textContent) || "").replace(/\s+/g, " ").trim();
      if (t.length > 3) return t;
    }
    // 2. Fallback: prima riga non vuota di innerText
    const raw = container.innerText ?? container.textContent ?? "";
    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 3);
    if (lines.length) return lines[0];
    // 3. Ultima spiaggia: tutto schiacciato
    return raw.replace(/\s+/g, " ").trim();
  }

  /**
   * Restituisce i candidati visibili: { btn, container, text, displayText }
   * - `text` = innerText completo (per matching regex, contiene tutto)
   * - `displayText` = riga di titolo (per log/UI, niente duplicati)
   * Calcola getAddButtons() UNA volta sola (fix #9: era O(n²)).
   */
  function getCandidates(panelEl) {
    const btns = getAddButtons(panelEl);
    return btns
      .map(btn => {
        const container = findContainer(btn, btns);
        return {
          btn,
          container,
          text: (container.innerText || "").trim(),
          displayText: extractDisplayText(container),
        };
      })
      .filter(x => x.text.length > 3);
  }

  function getSearchInput() {
    return document.querySelector(
      'input[placeholder*="Search"], input[placeholder*="Application Roles"], ' +
      'input[type="search"], input[name*="search"]'
    );
  }

  /**
   * Esegue una ricerca: svuota, scrive il testo, dispatcha Enter.
   */
  async function triggerSearch(text, signal) {
    const inp = getSearchInput();
    if (!inp) {
      RGP.debug("triggerSearch: input non trovato");
      return false;
    }
    RGP.debug("triggerSearch:", text);

    inp.focus();
    setNativeValue(inp, "");
    await delay(RGP.const.TIMING.SEARCH_CLEAR_WAIT, signal);

    setNativeValue(inp, text);
    await delay(RGP.const.TIMING.SEARCH_AFTER_INPUT, signal);

    const kev = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
    ["keydown", "keypress", "keyup"].forEach(t => inp.dispatchEvent(new KeyboardEvent(t, kev)));
    inp.blur();

    await delay(RGP.const.TIMING.SEARCH_AFTER_ENTER, signal);
    return true;
  }

  /**
   * Aspetta che compaiano candidati che matchano il testo cercato.
   * Verifica usando TUTTE le parole, così "Receiver (C18)" non matcha "(C06)".
   */
  async function waitForCandidates(panelEl, expectedText, signal) {
    const timeout = RGP.const.TIMING.CANDIDATE_TIMEOUT;
    const interval = RGP.const.TIMING.POLL_INTERVAL;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const cands = getCandidates(panelEl);
      if (cands.length > 0) {
        if (!expectedText) return { ok: true, candidates: cands };
        const needle = expectedText.toLowerCase().replace(/[()]/g, "");
        const needleWords = needle.split(/\s+/).filter(Boolean);
        const fresh = cands.some(c => {
          const hay = c.text.toLowerCase().replace(/[()]/g, "");
          return needleWords.every(w => hay.includes(w));
        });
        if (fresh) {
          RGP.debug(`waitForCandidates: ${cands.length} candidati pronti per "${expectedText}"`);
          return { ok: true, candidates: cands };
        }
      }
      await delay(interval, signal);
    }
    // diagnostica per il timeout
    const raw = getAddButtons(panelEl);
    const diagnostic = raw.length === 0
      ? "Nessun bottone + nel DOM"
      : `${raw.length} bottoni + trovati, container text: «${
          (findContainer(raw[0], raw).innerText || "").trim().slice(0, 60) || "VUOTO"
        }»`;
    return { ok: false, candidates: [], diagnostic };
  }

  /**
   * Click sul bottone ADD: prova prima la funzione globale di MyAccess
   * (che è più affidabile), fallback al click DOM.
   */
  function clickAdd(btn) {
    const onclickAttr = btn.getAttribute("onclick") || "";
    const m = onclickAttr.match(/selectedApplicationRoleMove\(([^)]+)\)/);
    if (m && typeof window.selectedApplicationRoleMove === "function") {
      const args = m[1].split(",").map(a => a.trim().replace(/^['"]|['"]$/g, ""));
      window.selectedApplicationRoleMove(...args);
    } else {
      btn.click();
    }
  }

  // ── Visual highlights sulla pagina ────────────────────────────────────────
  function clearVisuals() {
    document.querySelectorAll(".rgp-hit, .rgp-choice")
      .forEach(e => e.classList.remove("rgp-hit", "rgp-choice"));
  }

  function applyVisual(el, cls) {
    const target = el.closest("tr") || el;
    target.classList.add(cls);
  }

  RGP.myaccess = {
    getAddButtons, findContainer, getCandidates, getSearchInput,
    extractDisplayText,
    triggerSearch, waitForCandidates, clickAdd,
    clearVisuals, applyVisual,
  };
})();
