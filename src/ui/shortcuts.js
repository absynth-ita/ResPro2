// ResPro — shortcut da tastiera del pannello
// Pattern: scope-limited, niente listener globali, niente conflitti con Chrome.
window.RGP = window.RGP || {};

(function () {
  /**
   * Riconosce Ctrl+Enter su Windows/Linux e Cmd+Enter su Mac.
   */
  function isCtrlEnter(e) {
    return e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
  }
  function isEsc(e) {
    return e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey;
  }

  /**
   * Registra le shortcut sul pannello.
   * @param {Element} panel
   * @param {object} hooks
   * @param {Element} hooks.runTextarea  textarea Run (Ctrl+Enter → onRun)
   * @param {Element} hooks.justTextarea textarea Justify (Ctrl+Enter → onJustify)
   * @param {() => boolean} hooks.isRunning  serve per decidere se Esc fa stop
   * @param {() => void} hooks.onRun
   * @param {() => void} hooks.onJustify
   * @param {() => void} hooks.onStop
   * @returns {() => void} dispose
   */
  function register(panel, hooks) {
    const onRunKey = (e) => {
      if (isCtrlEnter(e)) {
        e.preventDefault();
        hooks.onRun();
      }
    };
    const onJustKey = (e) => {
      if (isCtrlEnter(e)) {
        e.preventDefault();
        hooks.onJustify();
      }
    };
    // Esc è gestito a livello di pannello: se in run, ferma
    const onPanelKey = (e) => {
      if (isEsc(e) && hooks.isRunning()) {
        e.preventDefault();
        hooks.onStop();
      }
    };

    hooks.runTextarea.addEventListener("keydown",  onRunKey);
    hooks.justTextarea.addEventListener("keydown", onJustKey);
    panel.addEventListener("keydown", onPanelKey);

    return () => {
      hooks.runTextarea.removeEventListener("keydown",  onRunKey);
      hooks.justTextarea.removeEventListener("keydown", onJustKey);
      panel.removeEventListener("keydown", onPanelKey);
    };
  }

  RGP.shortcuts = { register };
})();
