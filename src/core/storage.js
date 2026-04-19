// ResPro — wrapper su chrome.storage.local
// Centralizza chiavi, error handling e migrazione legacy.
window.RGP = window.RGP || {};

(function () {
  const K = RGP.const.STORAGE_KEYS;
  const LEGACY = RGP.const.LEGACY_TEMPLATES_KEY;

  function safeGet(keys) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.get(keys, res => {
          if (chrome.runtime.lastError) {
            console.warn("[ResPro] storage.get error:", chrome.runtime.lastError.message);
            resolve({});
            return;
          }
          resolve(res || {});
        });
      } catch (e) {
        // Contesto estensione invalidato (succede dopo reload da chrome://extensions)
        console.warn("[ResPro] storage.get exception:", e.message);
        resolve({});
      }
    });
  }

  function safeSet(obj) {
    return new Promise(resolve => {
      try {
        chrome.storage.local.set(obj, () => {
          if (chrome.runtime.lastError) {
            console.warn("[ResPro] storage.set error:", chrome.runtime.lastError.message);
            resolve(false);
            return;
          }
          resolve(true);
        });
      } catch (e) {
        console.warn("[ResPro] storage.set exception:", e.message);
        resolve(false);
      }
    });
  }

  RGP.storage = {
    /**
     * Carica tutto lo stato persistito.
     * Esegue anche la migrazione una-tantum dalla vecchia chiave `rgpTemplate`.
     */
    async loadAll() {
      const res = await safeGet([K.TEMPLATES, K.SKIP, K.JUST_TEXT, K.GEOMETRY, LEGACY]);

      // Migrazione: se trovo la vecchia chiave e non la nuova, sposto.
      let templates = res[K.TEMPLATES];
      if (!templates && res[LEGACY]) {
        RGP.debug("Migrazione template da chiave legacy");
        templates = res[LEGACY];
        await safeSet({ [K.TEMPLATES]: templates });
      }

      const skip = res[K.SKIP] || {};
      return {
        templates: templates || {},
        skipRules: {
          patterns:  Array.isArray(skip.patterns)  ? skip.patterns  : [],
          blacklist: Array.isArray(skip.blacklist) ? skip.blacklist : [],
        },
        justText: res[K.JUST_TEXT] || RGP.const.DEFAULT_JUST_TEXT,
        geometry: res[K.GEOMETRY] || null, // {x, y, w, h} o null
      };
    },

    saveTemplates: (templates) => safeSet({ [K.TEMPLATES]: templates }),
    saveSkip:      (skipRules) => safeSet({ [K.SKIP]: skipRules }),
    saveJustText:  (text)      => safeSet({ [K.JUST_TEXT]: text }),
    saveGeometry:  (geom)      => safeSet({ [K.GEOMETRY]: geom }),
  };
})();
