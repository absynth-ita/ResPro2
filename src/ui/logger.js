// ResPro — logger riusabile per il pannello di log
window.RGP = window.RGP || {};

(function () {
  /**
   * @param {Element} el — div contenitore
   * @param {number} maxLines
   * @returns {{log: Function, clear: Function}}
   */
  function create(el, maxLines = RGP.const.UI.LOG_MAX_LINES) {
    function log(msg, cls) {
      const line = document.createElement("div");
      if (cls) line.className = cls;
      line.textContent = msg;
      el.appendChild(line);
      while (el.children.length > maxLines) el.removeChild(el.firstChild);
      el.scrollTop = el.scrollHeight;
    }
    function clear() { el.innerHTML = ""; }
    return { log, clear };
  }

  RGP.logger = { create };
})();
