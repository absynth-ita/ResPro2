// ResPro — interazione con il DOM di MyAccess (Saviynt)
// Tutto ciò che riguarda lo scraping della pagina vive qui.
// Quando MyAccess cambia layout, si tocca solo questo file.
window.RGP = window.RGP || {};

(function () {
  const { delay, setNativeValue } = RGP.utils;

  const normalize = value => (value || "").replace(/\s+/g, " ").trim();
  function isPageElement(el) {
    return !!el && !el.closest('[id^="rgp-"], nav, aside, header, [role="navigation"]') &&
      el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  }

  function exactLabels(text, root = document) {
    return [...root.querySelectorAll("*")].filter(el =>
      isPageElement(el) && normalize(el.textContent).replace(/^\*\s*/, "") === text &&
      ![...el.children].some(c => normalize(c.textContent).replace(/^\*\s*/, "") === text));
  }

  // Find the available column by its heading, never by the first Search input.
  function getAvailableRolesRoot() {
    for (const label of exactLabels("Available Application Roles")) {
      for (let n = label.parentElement; n && n !== document.body; n = n.parentElement) {
        if (exactLabels("Selected Application Roles", n).length) break;
        if ([...n.querySelectorAll("input")].some(isPageElement)) return n;
      }
    }
    return null;
  }

  function getAddButtons(panelEl) {
    const root = getAvailableRolesRoot();
    if (!root) return [];
    const seen = new Set();
    root.querySelectorAll('button, a, [role="button"], .ent-add-selected-item').forEach(el => {
      if (!isPageElement(el) || panelEl?.contains(el) || el.disabled || el.getAttribute("aria-disabled") === "true") return;
      const label = normalize(el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent);
      const explicitAdd = /^(add(?:\s+.*)?|\+)$/i.test(label) && !/justification/i.test(label);
      const icon = el.matches(".ent-add-selected-item") || el.querySelector(
        '.icon-v2-add, [data-icon="plus"], [data-icon="add"], [class*="icon-plus"], .lucide-plus, .lucide-circle-plus');
      // Unlabelled SVG plus: two perpendicular straight strokes (not a minus/chevron).
      const svg = el.querySelector("svg");
      const strokes = svg ? [...svg.querySelectorAll("line, path")].map(n => n.tagName.toLowerCase() === "line"
        ? [Number(n.getAttribute("x1")), Number(n.getAttribute("y1")), Number(n.getAttribute("x2")), Number(n.getAttribute("y2"))]
        : (() => { const d = n.getAttribute("d") || ""; const m = d.match(/^M\s*([\d.]+)[ ,]+([\d.]+)\s*L\s*([\d.]+)[ ,]+([\d.]+)\s*$/i); return m ? m.slice(1).map(Number) : []; })()) : [];
      const plus = strokes.some(a => a.length === 4 && a[0] === a[2] && a[1] !== a[3]) &&
        strokes.some(a => a.length === 4 && a[1] === a[3] && a[0] !== a[2]);
      if (explicitAdd || icon || plus) seen.add(el);
    });
    // Some pages put aria-label on the icon inside the clickable control.
    root.querySelectorAll('[aria-label="ADD"], [aria-label="Add"], [aria-label="add"]').forEach(icon => {
      const el = icon.closest('button, a, [role="button"]') || icon;
      if (isPageElement(el) && !el.disabled && el.getAttribute("aria-disabled") !== "true" && !panelEl?.contains(el)) seen.add(el);
    });
    return [...seen].filter(el => ![...seen].some(other => other !== el && el.contains(other)));
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
    const root = getAvailableRolesRoot();
    if (!root) return null;
    const inputs = [...root.querySelectorAll("input")].filter(el => isPageElement(el) && !el.disabled && !el.readOnly);
    const precise = inputs.filter(el => /search by application roles/i.test(el.getAttribute("placeholder") || ""));
    if (precise.length === 1) return precise[0];
    const searches = inputs.filter(el => /search/i.test([el.type, el.name, el.placeholder, el.getAttribute("aria-label")].join(" ")));
    return searches.length === 1 ? searches[0] : null;
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
    target.classList.remove("rgp-hit", "rgp-choice");
    target.classList.add(cls);
  }

  RGP.myaccess = {
    isPageElement, exactLabels, getAvailableRolesRoot,
    getAddButtons, findContainer, getCandidates, getSearchInput,
    extractDisplayText,
    triggerSearch, waitForCandidates, clickAdd,
    clearVisuals, applyVisual,
  };
})();
