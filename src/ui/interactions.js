// ResPro — interazioni base del pannello (drag, resize, tabs)
// Tutte le funzioni qui ritornano una funzione di cleanup.
window.RGP = window.RGP || {};

(function () {

  /** Drag del pannello. Ritorna funzione di cleanup.
   * @param {(geom: {x:number, y:number}) => void} [onEnd]  chiamato a fine drag
   */
  function makeDraggable(panel, handle, onEnd) {
    handle.style.cursor = "grab";
    let mv, up;

    const onDown = e => {
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      const r = panel.getBoundingClientRect();
      const ox = r.left, oy = r.top;

      mv = e => {
        panel.style.right = "auto";
        panel.style.bottom = "auto";
        panel.style.left = (ox + e.clientX - sx) + "px";
        panel.style.top  = (oy + e.clientY - sy) + "px";
      };
      up = () => {
        handle.style.cursor = "grab";
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
        mv = up = null;
        if (onEnd) {
          const r = panel.getBoundingClientRect();
          onEnd({ x: r.left, y: r.top });
        }
      };
      handle.style.cursor = "grabbing";
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    };

    handle.addEventListener("mousedown", onDown);
    return () => {
      handle.removeEventListener("mousedown", onDown);
      if (mv) document.removeEventListener("mousemove", mv);
      if (up) document.removeEventListener("mouseup", up);
    };
  }

  /** Resize via handle. Ritorna funzione di cleanup.
   * @param {(geom: {w:number, h:number}) => void} [onEnd]
   */
  function makeResizable(panel, handle, onEnd) {
    let mv, up;
    const onDown = e => {
      e.preventDefault();
      const sx = e.clientX, sy = e.clientY;
      const sw = panel.offsetWidth, sh = panel.offsetHeight;
      mv = e => {
        const w = Math.max(RGP.const.UI.MIN_WIDTH,  sw + (e.clientX - sx));
        const h = Math.max(RGP.const.UI.MIN_HEIGHT, sh + (e.clientY - sy));
        panel.style.width  = w + "px";
        panel.style.height = h + "px";
      };
      up = () => {
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
        mv = up = null;
        if (onEnd) onEnd({ w: panel.offsetWidth, h: panel.offsetHeight });
      };
      document.addEventListener("mousemove", mv);
      document.addEventListener("mouseup", up);
    };
    handle.addEventListener("mousedown", onDown);
    return () => {
      handle.removeEventListener("mousedown", onDown);
      if (mv) document.removeEventListener("mousemove", mv);
      if (up) document.removeEventListener("mouseup", up);
    };
  }

  /** Switching tra tab. Espone una `switchTab(tabId)` riusabile. */
  function setupTabs(panel) {
    function switchTab(tabId) {
      panel.querySelectorAll(".rgp-tab").forEach(b => b.classList.remove("rgp-tab-active"));
      panel.querySelectorAll(".rgp-pane").forEach(p => p.classList.add("rgp-hidden"));
      const btn  = panel.querySelector(`.rgp-tab[data-tab="${tabId}"]`);
      const pane = panel.querySelector(`#rgp-pane-${tabId}`);
      if (btn)  btn.classList.add("rgp-tab-active");
      if (pane) pane.classList.remove("rgp-hidden");
    }
    panel.querySelectorAll(".rgp-tab").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    return { switchTab };
  }

  RGP.uiBase = { makeDraggable, makeResizable, setupTabs };
})();
