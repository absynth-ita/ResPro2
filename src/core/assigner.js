// ResPro — orchestratore del workflow di assegnazione respo (Step 2)
window.RGP = window.RGP || {};

(function () {
  const { delay, similarity, wildcardToRegex } = RGP.utils;
  const M = RGP.myaccess;

  /**
   * Tra più varianti dello stesso ruolo, scegli secondo la regola aziendale:
   *   1. "Contractors - Supply Chain"  (per contractor MVN)
   *   2. "Supply Chain"                (esclusi GS)
   *   3. "Contractors"
   *   4. Altro escludendo "Global Services"
   *   5. Global Services solo se non c'è alternativa
   */
  function chooseBest(pattern, matches) {
    if (matches.length === 1) return matches[0];

    const byScore = (a, b) => similarity(pattern, b.text) - similarity(pattern, a.text);

    const contractorsSC = matches.filter(m => /contractors\s*[-\u2013]\s*supply\s*chain/i.test(m.text));
    if (contractorsSC.length) {
      const w = contractorsSC.sort(byScore)[0];
      RGP.debug(`chooseBest "${pattern}": Contractors-SC (${contractorsSC.length} candidati)`);
      return w;
    }

    const supplyChain = matches.filter(m => /supply\s*chain/i.test(m.text));
    if (supplyChain.length) {
      const w = supplyChain.sort(byScore)[0];
      RGP.debug(`chooseBest "${pattern}": Supply Chain (${supplyChain.length} candidati)`);
      return w;
    }

    const contractors = matches.filter(m => /contractors/i.test(m.text));
    if (contractors.length) {
      const w = contractors.sort(byScore)[0];
      RGP.debug(`chooseBest "${pattern}": Contractors (${contractors.length} candidati)`);
      return w;
    }

    const noGlobal = matches.filter(m => !/global\s*services/i.test(m.text));
    const pool = noGlobal.length ? noGlobal : matches;
    RGP.debug(`chooseBest "${pattern}": fallback (${pool === noGlobal ? "no-Global" : "Global come ultima risorsa"})`);
    return pool.sort(byScore)[0];
  }

  /**
   * Cerca tra i candidati attualmente visibili quelli che matchano il pattern,
   * applica i visual e ritorna { best, matches }.
   */
  function findSmart(pattern, panelEl) {
    const rx = wildcardToRegex(pattern);
    const all = M.getCandidates(panelEl);
    const matches = all.filter(c => rx.test(c.text));
    if (!matches.length) return { best: null, matches: [] };

    M.clearVisuals();
    matches.forEach(x => M.applyVisual(x.container, "rgp-hit"));

    const best = chooseBest(pattern, matches);
    if (best) {
      (best.container.closest("tr") || best.container).classList.remove("rgp-hit");
      M.applyVisual(best.container, "rgp-choice");
    }
    return { best, matches };
  }

  /**
   * Esegue il workflow su una lista di nomi.
   * @param {string[]} list
   * @param {object} opts
   * @param {Element} opts.panelEl
   * @param {object} opts.skipRules
   * @param {AbortSignal} opts.signal
   * @param {() => Promise<void>} opts.waitIfPaused — funzione che blocca se in pausa
   * @param {(msg: string, cls?: string) => void} opts.log
   * @param {(cur: number, tot: number) => void} opts.onProgress
   * @returns {Promise<{added: number, skipped: number, notFound: number, aborted: boolean}>}
   */
  async function runList(list, opts) {
    const { panelEl, skipRules, signal, waitIfPaused, log, onProgress } = opts;
    let added = 0, skipped = 0, notFound = 0, aborted = false;

    M.clearVisuals();
    RGP.debug(`runList: avvio batch di ${list.length} respo`);

    try {
      for (let i = 0; i < list.length; i++) {
        if (signal.aborted) { aborted = true; break; }
        await waitIfPaused();
        if (signal.aborted) { aborted = true; break; }

        const item = list[i];
        onProgress(i + 1, list.length);
        log(`🔎 [${i + 1}/${list.length}] Richiesta: ${item}`);

        const searched = await M.triggerSearch(item, signal);
        if (!searched) { log("❌ Casella di ricerca non trovata", "rgp-err"); break; }

        const wait = await M.waitForCandidates(panelEl, item, signal);
        if (!wait.ok) {
          if (wait.diagnostic) log("   ⚠ " + wait.diagnostic, "rgp-warn");
          log("   Assegnata: — (timeout, nessun risultato)", "rgp-err");
          notFound++;
          continue;
        }

        const { best: choice, matches } = findSmart(item, panelEl);
        if (!choice) {
          log("   Assegnata: — (non trovato)", "rgp-err");
          notFound++;
          continue;
        }

        // Mostra varianti se più di una
        if (matches.length > 1) {
          log("   Varianti disponibili:", "rgp-variants-label");
          for (const m of matches) {
            const t = m.displayText || m.text.replace(/\s+/g, " ").trim();
            const isChosen = m === choice;
            log("   " + (isChosen ? "✔ " : "○ ") + t,
                isChosen ? "rgp-variant-chosen" : "rgp-variant-other");
          }
        }

        // Skip rules — il match resta su choice.text (più ricco), il log su displayText
        const reason = RGP.skip.shouldSkip(choice.text, skipRules);
        if (reason) {
          log("   Assegnata: 🚫 " + (choice.displayText || choice.text), "rgp-skip-chosen");
          skipped++;
          continue;
        }

        // Click effettivo
        try {
          M.clickAdd(choice.btn);
          added++;
          log("   Assegnata: ✅ " + (choice.displayText || choice.text), "rgp-ok");
        } catch (err) {
          log("   Assegnata: ⚠️ Click fallito: " + err.message, "rgp-warn");
          notFound++;
        }
        await delay(RGP.const.TIMING.PER_ITEM_PAUSE, signal);
      }
    } catch (e) {
      if (e.name === "AbortError") aborted = true;
      else throw e;
    } finally {
      M.clearVisuals();
    }

    return { added, skipped, notFound, aborted };
  }

  RGP.assigner = { chooseBest, findSmart, runList };
})();
