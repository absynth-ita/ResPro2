// ResPro — wrapper su Web Notifications API
// Chiede permission al primo uso, poi notifica silenziosamente.
window.RGP = window.RGP || {};

(function () {
  let permissionAsked = false;

  /**
   * Mostra una notifica desktop. Idempotente sui permessi: chiede una volta sola.
   * @param {string} title
   * @param {string} body
   * @returns {Promise<boolean>} true se la notifica è stata mostrata
   */
  async function notify(title, body) {
    if (!("Notification" in window)) {
      RGP.debug("Notifications API non supportata");
      return false;
    }
    let perm = Notification.permission;
    if (perm === "default" && !permissionAsked) {
      permissionAsked = true;
      try {
        perm = await Notification.requestPermission();
      } catch (e) {
        RGP.debug("requestPermission errore:", e.message);
        return false;
      }
    }
    if (perm !== "granted") {
      RGP.debug("Notifications: permission =", perm);
      return false;
    }
    try {
      // Icon: usa quella dell'estensione se accessible, altrimenti niente
      const opts = { body, tag: "respro" }; // tag → sostituisce notifica precedente
      try {
        opts.icon = chrome.runtime.getURL("icon128.png");
      } catch (_) { /* getURL può fallire se contesto invalidato */ }
      new Notification(title, opts);
      return true;
    } catch (e) {
      console.warn("[ResPro] notify errore:", e.message);
      return false;
    }
  }

  /**
   * Restituisce lo stato del permesso senza chiederlo.
   */
  function permissionStatus() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
  }

  RGP.notify = { notify, permissionStatus };
})();
