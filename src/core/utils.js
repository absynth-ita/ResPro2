// ResPro — utility generiche
window.RGP = window.RGP || {};

(function () {
  /**
   * Promise che si risolve dopo `ms` ms, abortabile via AbortSignal.
   * Se il signal viene abortito, rigetta con AbortError.
   */
  function delay(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const t = setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }

  /**
   * Imposta value su input/textarea bypassando React/Angular setter,
   * e dispatcha gli eventi input/change.
   */
  function setNativeValue(el, value) {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  /**
   * Converte un pattern wildcard (% _ %) in RegExp case-insensitive.
   */
  function wildcardToRegex(p) {
    return new RegExp(
      p.replace(/[-\/\\^$+?.()|[\]{}]/g, "\\$&")
       .replace(/%/g, ".*")
       .replace(/_/g, "."),
      "i"
    );
  }

  /**
   * Score di similarità basato su quante parole del pattern compaiono nel testo.
   */
  function similarity(pattern, text) {
    const words = pattern.toLowerCase().replace(/[%_]/g, " ").split(/\s+/).filter(Boolean);
    if (!words.length) return 0;
    const t = text.toLowerCase();
    return words.filter(w => t.includes(w)).length / words.length;
  }

  /**
   * Escape per innerHTML quando proprio non possiamo usare textContent.
   */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  RGP.utils = { delay, setNativeValue, wildcardToRegex, similarity, escapeHtml };
})();
