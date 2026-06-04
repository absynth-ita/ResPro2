// ResPro — Sistema modale riutilizzabile
window.RGP = window.RGP || {};

(function () {
  /**
   * Mostra una modale centrata con opzioni di blur e blocking.
   * 
   * @param {Object} options
   *   - title: titolo modale
   *   - message: corpo del messaggio
   *   - buttons: array di {label, action, type:"primary"|"secondary"}
   *   - blur: boolean — applica blur al background (default: true)
   *   - blocking: boolean — previene click fuori (default: true)
   *   - onClose: callback quando chiude
   */
  function showModal(options) {
    const {
      title = "Avviso",
      message = "",
      buttons = [],
      blur = true,
      blocking = true,
      onClose = () => {},
    } = options;

    // Overlay
    const overlay = document.createElement("div");
    overlay.className = "rgp-modal-overlay";
    if (blur) overlay.classList.add("rgp-modal-blur");
    if (!blocking) overlay.classList.add("rgp-modal-non-blocking");

    // Modale
    const modal = document.createElement("div");
    modal.className = "rgp-modal";
    modal.innerHTML = `
      <div class="rgp-modal-header">
        <span>${title}</span>
        ${!blocking ? '<button class="rgp-modal-close">✕</button>' : ''}
      </div>
      <div class="rgp-modal-body">${message}</div>
      <div class="rgp-modal-footer"></div>
    `;

    // Footer con bottoni
    const footer = modal.querySelector(".rgp-modal-footer");
    buttons.forEach(({ label, action, type = "secondary" }) => {
      const btn = document.createElement("button");
      btn.className = `rgp-btn rgp-btn-${type}`;
      btn.textContent = label;
      btn.onclick = () => {
        action?.();
        closeModal();
      };
      footer.appendChild(btn);
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeModal() {
      overlay.remove();
      onClose();
    }

    // Close button (solo se non blocking)
    const closeBtn = modal.querySelector(".rgp-modal-close");
    if (closeBtn) closeBtn.onclick = closeModal;

    // Click fuori (solo se non blocking)
    if (!blocking) {
      overlay.onclick = (e) => {
        if (e.target === overlay) closeModal();
      };
    }

    return { close: closeModal, overlay, modal };
  }

  RGP.modal = { showModal };
})();