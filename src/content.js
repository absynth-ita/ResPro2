// ResPro — entry point del content script
// Si limita a montare il pannello sulle pagine giuste e gestire navigation SPA.
(function () {
  let api = null;

  /** Mostra il pannello sulle pagine rilevanti, lo nasconde altrimenti. */
  function syncWithUrl() {
    if (RGP.isRelevantPage()) {
      const searchInput = RGP.myaccess.getSearchInput();
      
      // ⚠️ Se non c'è search input = account non enabled
      if (!searchInput) {
        if (!api) api = RGP.panel.mount();
        else api.show();
        
        RGP.modal.showModal({
          title: "⚠️ Account non enabled",
          message: "Verifica di aver completato lo Step 1 e abilitato l'account.",
          buttons: [
            {
              label: "Ignora",
              type: "secondary",
              action: () => {
                RGP.debug("Utente ha ignorato il warning — pannello resta visibile");
              }
            },
            {
              label: "← Torna Indietro",
              type: "primary",
              action: () => window.history.back()
            }
          ],
          blur: true,
          blocking: true,
        });
        return;
      }
      
      // ✅ Search input esiste — continua normalmente
      if (!api) api = RGP.panel.mount();
      else api.show();
      // Switch automatico su tab corretta
      const step = RGP.currentStep();
      if (step === "STEP3") {
        api.switchTab("justify");
        RGP.debug("Step 3 rilevato — tab Giustifica attiva");
      } else if (step === "STEP2") {
        api.switchTab("run");
        RGP.debug("Step 2 rilevato — tab Assegnatore attiva");
      }
    } else if (api) {
      api.hide();
      RGP.debug("Pagina non rilevante — pannello nascosto");
    }
  }

  /**
   * Toggle esposto al popup.
   * Forza l'apertura anche se la pagina non è "rilevante" — utile per fare
   * test o pulizia template fuori dai due step canonici.
   */
  window.__rgpToggle = function () {
    if (api && api.isVisible()) {
      api.hide();
    } else if (api) {
      api.show();
    } else {
      api = RGP.panel.mount();
    }
  };

  // Boot
  syncWithUrl();
  RGP.nav.onNavigate(syncWithUrl);

  // Helper di debug
  window.rgpDebug = function () {
    console.group("ResPro — debug DOM");
    const inp  = RGP.myaccess.getSearchInput();
    const btns = RGP.myaccess.getAddButtons(api?.panel || null);
    const cand = RGP.myaccess.getCandidates(api?.panel || null);
    console.log("Search input:", inp);
    console.log("ADD buttons trovati (" + btns.length + "):", btns);
    console.log("Candidates (" + cand.length + "):", cand);
    if (btns.length && !cand.length) {
      console.warn("Bottoni trovati ma getCandidates() vuoto — findContainer non risale abbastanza o testo vuoto.");
    }
    console.groupEnd();
    return { inp, btns, cand };
  };
})();
