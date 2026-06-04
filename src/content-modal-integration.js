// Integration example for modal in content.js
// Add this logic to your syncWithUrl() function

/*

function syncWithUrl() {
  if (RGP.isRelevantPage()) {
    const searchInput = RGP.myaccess.getSearchInput();
    
    if (!searchInput) {
      RGP.modal.showModal({
        title: "⚠️ Account non enabled",
        message: "Verifica di aver completato lo Step 1 e abilitato l'account.",
        buttons: [
          {
            label: "Ignora",
            type: "secondary",
            action: () => {
              if (!api) api = RGP.panel.mount();
              RGP.debug("Utente ha ignorato il warning");
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
    
    if (!api) api = RGP.panel.mount();
    else api.show();
  }
}

*/
