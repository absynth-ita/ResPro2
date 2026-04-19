// ResPro — orchestratore del pannello: stato, eventi, run loop
window.RGP = window.RGP || {};

(function () {
  const I = RGP.icons;

  /**
   * Crea il pannello (se non esiste), lo monta nel DOM, registra tutti gli
   * handler e ritorna API per controllarlo dall'esterno.
   * @returns {{
   *   panel: Element,
   *   show: () => void,
   *   hide: () => void,
   *   isVisible: () => boolean,
   *   switchTab: (id: string) => void,
   *   destroy: () => void,
   * } | null}
   */
  function mount() {
    if (document.getElementById("rgp-panel")) {
      const existing = document.getElementById("rgp-panel");
      existing.style.display = "flex";
      return existing.__rgpApi || null;
    }

    // ── Costruzione DOM ──────────────────────────────────────────────────────
    const panel = document.createElement("div");
    panel.id = "rgp-panel";
    panel.innerHTML = RGP.buildPanelHTML();
    document.body.appendChild(panel);

    const $ = (s) => panel.querySelector(s);

    // ── Stato ────────────────────────────────────────────────────────────────
    const state = {
      templates: {},
      skipRules: { patterns: [], blacklist: [] },
      selectedTpl: "",
      justText: RGP.const.DEFAULT_JUST_TEXT,
      running: false,
      paused: false,
      abortCtrl: null,
    };

    // ── Cache elementi ───────────────────────────────────────────────────────
    const els = {
      log:         $("#rgp-log"),
      progBar:     $("#rgp-pb"),
      progLbl:     $("#rgp-prog-lbl"),
      start:       $("#rgp-start"),
      pause:       $("#rgp-pause"),
      stop:        $("#rgp-stop"),
      input:       $("#rgp-input"),
      tplApply:    $("#rgp-tpl-apply"),
      close:       $("#rgp-close"),
      justText:    $("#rgp-just-text"),
      justRun:     $("#rgp-just-run"),
      justReset:   $("#rgp-just-reset"),
      justLog:     $("#rgp-just-log"),
      dragHandle:  $("#rgp-drag-handle"),
      resizeHandle:$("#rgp-resize-handle"),
    };

    // ── Logger principale e di justify ───────────────────────────────────────
    const mainLog = RGP.logger.create(els.log);
    const justLog = RGP.logger.create(els.justLog);

    function setProgress(cur, tot) {
      els.progBar.style.width = (tot ? Math.round(cur / tot * 100) : 0) + "%";
      els.progLbl.textContent = tot ? `${cur} / ${tot}` : "";
    }

    function setBtnState(running) {
      els.start.disabled = running;
      els.start.style.opacity = running ? ".3" : "1";
    }

    // ── Persistenza ──────────────────────────────────────────────────────────
    function saveAll() {
      RGP.storage.saveTemplates(state.templates);
      RGP.storage.saveSkip(state.skipRules);
      RGP.storage.saveJustText(state.justText);
    }

    // ── Tabs ─────────────────────────────────────────────────────────────────
    const { switchTab } = RGP.uiBase.setupTabs(panel);

    // ── Geometria persistita: helper apply + save ────────────────────────────
    // Applica posizione/dimensione, clampando dentro il viewport per evitare
    // che il pannello finisca off-screen se l'utente cambia risoluzione.
    function applyGeometry(g) {
      if (!g) return;
      const vw = window.innerWidth, vh = window.innerHeight;
      if (typeof g.w === "number" && typeof g.h === "number") {
        const w = Math.max(RGP.const.UI.MIN_WIDTH,  Math.min(g.w, vw - 20));
        const h = Math.max(RGP.const.UI.MIN_HEIGHT, Math.min(g.h, vh - 20));
        panel.style.width  = w + "px";
        panel.style.height = h + "px";
      }
      if (typeof g.x === "number" && typeof g.y === "number") {
        const x = Math.max(0, Math.min(g.x, vw - 100));
        const y = Math.max(0, Math.min(g.y, vh - 100));
        panel.style.right  = "auto";
        panel.style.bottom = "auto";
        panel.style.left   = x + "px";
        panel.style.top    = y + "px";
      }
    }
    // Stato corrente, aggiornato sia dal drag che dal resize, salvato in batch
    const currentGeom = {};
    let saveGeomTimer = null;
    function scheduleSaveGeom() {
      clearTimeout(saveGeomTimer);
      saveGeomTimer = setTimeout(() => {
        RGP.storage.saveGeometry({ ...currentGeom });
        RGP.debug("Geometria salvata", currentGeom);
      }, 200);
    }

    // ── Drag & Resize ────────────────────────────────────────────────────────
    const disposeDrag = RGP.uiBase.makeDraggable(panel, els.dragHandle, ({ x, y }) => {
      currentGeom.x = x; currentGeom.y = y;
      scheduleSaveGeom();
    });
    const disposeResize = RGP.uiBase.makeResizable(panel, els.resizeHandle, ({ w, h }) => {
      currentGeom.w = w; currentGeom.h = h;
      scheduleSaveGeom();
    });

    // ── Dropdown templates ───────────────────────────────────────────────────
    const dd = RGP.dropdown.createDropdown(
      panel,
      () => Object.keys(state.templates).sort(),
      () => state.selectedTpl,
      (name) => { state.selectedTpl = name; }
    );

    // ── Tab Templates ────────────────────────────────────────────────────────
    const tplTab = RGP.tplTab.setup(panel, state, {
      onChange: () => { saveAll(); dd.rebuild(); },
      onSelectionCleared: () => dd.setLabel("— template —"),
    });

    // ── Tab Skip ─────────────────────────────────────────────────────────────
    const skipTab = RGP.skipTab.setup(panel, state, {
      onChange: () => saveAll(),
    });

    // ── Tab Run: handlers ────────────────────────────────────────────────────
    els.tplApply.addEventListener("click", () => {
      if (!state.selectedTpl || !state.templates[state.selectedTpl]) {
        mainLog.log("⚠️ Seleziona un template", "rgp-warn");
        return;
      }
      els.input.value = state.templates[state.selectedTpl].join("\n");
      mainLog.log(`📋 Caricato: ${state.selectedTpl} (${state.templates[state.selectedTpl].length} voci)`);
    });

    els.close.addEventListener("click", () => panel.style.display = "none");

    els.pause.addEventListener("click", () => {
      if (!state.running) return;
      state.paused = !state.paused;
      els.pause.innerHTML = state.paused
        ? `${I.playColored} Riprendi`
        : `${I.pause} Pausa`;
      mainLog.log(state.paused ? "⏸ In pausa" : "▶ Ripreso");
    });

    function handleStop() {
      if (!state.running) return;
      // abort proper: interrompe anche le delay() in corso
      state.abortCtrl?.abort();
      state.running = false;
      state.paused = false;
      setBtnState(false);
      els.pause.innerHTML = `${I.pause} Pausa`;
      mainLog.log("⏹ Fermato", "rgp-warn");
    }
    els.stop.addEventListener("click", handleStop);

    async function waitIfPaused() {
      while (state.paused && state.running) {
        await RGP.utils.delay(300, state.abortCtrl?.signal);
      }
    }

    async function handleRun() {
      if (state.running) return;
      let list = els.input.value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      if (!list.length && state.selectedTpl && state.templates[state.selectedTpl]) {
        list = [...state.templates[state.selectedTpl]];
        mainLog.log("📋 Uso template: " + state.selectedTpl, "rgp-note");
      }
      if (!list.length) {
        mainLog.log("⚠ Scrivi le respo o seleziona un template", "rgp-warn");
        return;
      }

      state.running = true;
      state.paused = false;
      state.abortCtrl = new AbortController();
      setBtnState(true);
      mainLog.clear();

      try {
        const result = await RGP.assigner.runList(list, {
          panelEl: panel,
          skipRules: state.skipRules,
          signal: state.abortCtrl.signal,
          waitIfPaused,
          log: mainLog.log,
          onProgress: setProgress,
        });
        setProgress(list.length, list.length);
        mainLog.log("──────────────────────────");
        mainLog.log(
          `🏁 Fine  ✅ ${result.added} aggiunti  ⏭ ${result.skipped} saltati  ❌ ${result.notFound} non trovati`,
          "rgp-done"
        );
        if (result.added > 0 && !result.aborted) {
          mainLog.log("⚠️ Ricontrolla sempre il lavoro prima di confermare!", "rgp-review");
        }
        // Notifica desktop solo se non è stato fermato a mano
        if (!result.aborted) {
          const title = result.notFound > 0
            ? "ResPro — Batch finito con problemi"
            : "ResPro — Batch completato";
          RGP.notify.notify(title,
            `✅ ${result.added} aggiunti · ⏭ ${result.skipped} saltati · ❌ ${result.notFound} non trovati`);
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          mainLog.log("❌ Errore inatteso: " + e.message, "rgp-err");
          console.error("[ResPro] runList error:", e);
        }
      } finally {
        state.running = false;
        state.paused = false;
        setBtnState(false);
        els.pause.innerHTML = `${I.pause} Pausa`;
      }
    }
    els.start.addEventListener("click", handleRun);

    // ── Tab Justify: handlers ────────────────────────────────────────────────
    els.justText.value = state.justText;
    els.justText.placeholder = "Testo da inserire in tutte le justification… (Ctrl+Enter per compilare)";

    async function handleJustify() {
      const text = els.justText.value.trim();
      if (!text) { justLog.log("⚠️ Inserisci il testo di giustificazione", "rgp-warn"); return; }
      state.justText = text;
      RGP.storage.saveJustText(text);

      justLog.clear();
      try {
        const { filled, conflicts } = await RGP.justifier.runJustify(text, justLog.log);
        justLog.log("──────────────────────────");
        justLog.log(`🏁 Fine  ✅ ${filled} compilate  ⚠️ ${conflicts} conflitti`, "rgp-done");
        justLog.log("✔ Controlla e premi Submit quando sei pronto", "rgp-done");
        // Notifica desktop
        RGP.notify.notify("ResPro — Justification compilate",
          `✅ ${filled} caselle compilate${conflicts ? ` · ⚠️ ${conflicts} conflitti SoD` : ""}`);
      } catch (e) {
        justLog.log("❌ Errore: " + e.message, "rgp-err");
        console.error("[ResPro] justify error:", e);
      }
    }
    els.justRun.addEventListener("click", handleJustify);

    els.justReset.addEventListener("click", () => {
      els.justText.value = RGP.const.DEFAULT_JUST_TEXT;
      state.justText = RGP.const.DEFAULT_JUST_TEXT;
      RGP.storage.saveJustText(state.justText);
      justLog.log("🔄 Testo ripristinato al default");
    });

    // ── Caricamento iniziale stato ───────────────────────────────────────────
    RGP.storage.loadAll().then(loaded => {
      state.templates = loaded.templates;
      state.skipRules = loaded.skipRules;
      state.justText  = loaded.justText;
      els.justText.value = state.justText;
      dd.rebuild();
      tplTab.renderList();
      skipTab.render();

      // Ripristina posizione/dimensione salvate
      if (loaded.geometry) {
        applyGeometry(loaded.geometry);
        Object.assign(currentGeom, loaded.geometry);
      }

      // Auto-switch su tab Justify se siamo allo Step 3
      if (RGP.currentStep() === "STEP3") switchTab("justify");
      RGP.debug("Pannello inizializzato", { step: RGP.currentStep() });
    });

    // ── Shortcut da tastiera ─────────────────────────────────────────────────
    // Ctrl+Enter / Cmd+Enter dentro le textarea → esegue l'azione del tab
    // Esc durante un'esecuzione → ferma
    const disposeShortcuts = RGP.shortcuts.register(panel, {
      runTextarea:  els.input,
      justTextarea: els.justText,
      isRunning:    () => state.running,
      onRun:        handleRun,
      onJustify:    handleJustify,
      onStop:       handleStop,
    });

    // ── API pubblica ─────────────────────────────────────────────────────────
    const api = {
      panel,
      show: () => { panel.style.display = "flex"; },
      hide: () => { panel.style.display = "none"; },
      isVisible: () => panel.style.display !== "none",
      switchTab,
      destroy: () => {
        disposeDrag();
        disposeResize();
        disposeShortcuts();
        dd.dispose();
        panel.remove();
      },
    };
    panel.__rgpApi = api;
    return api;
  }

  RGP.panel = { mount };
})();
