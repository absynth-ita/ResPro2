// ResPro — watcher per navigazione SPA basato su patching di history
// Sostituisce due MutationObserver subtree:true che facevano lo stesso lavoro.
window.RGP = window.RGP || {};

(function () {
  const listeners = new Set();
  let installed = false;

  function notify() {
    const url = location.href;
    RGP.debug("nav:", url);
    listeners.forEach(fn => {
      try { fn(url); } catch (e) { console.warn("[ResPro] nav listener error:", e); }
    });
  }

  function install() {
    if (installed) return;
    installed = true;

    // Patch pushState e replaceState per emettere un evento custom
    ["pushState", "replaceState"].forEach(fn => {
      const orig = history[fn];
      history[fn] = function (...args) {
        const ret = orig.apply(this, args);
        // microtask per dare tempo all'app di aggiornare il DOM
        Promise.resolve().then(notify);
        return ret;
      };
    });

    // Back/forward
    window.addEventListener("popstate", notify);

    // Fallback: hashchange (alcune SPA Saviynt usano hash routing)
    window.addEventListener("hashchange", notify);
  }

  /**
   * Si registra a cambi di URL.
   * @param {(url: string) => void} fn
   * @returns {() => void} disposer
   */
  function onNavigate(fn) {
    install();
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  RGP.nav = { onNavigate };
})();
