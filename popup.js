const statusEl = document.getElementById("status");

document.getElementById("btn-inject").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Allineato al match pattern del manifest (era troppo permissivo prima)
  if (!tab || !tab.url || !tab.url.includes("myaccess-bh.saviyntcloud.com")) {
    statusEl.textContent = "Non sei su MyAccess BH";
    statusEl.className = "status err";
    return;
  }

  try {
    // Tenta toggle se il content script è già presente
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (typeof window.__rgpToggle === "function") {
          window.__rgpToggle();
          return "toggled";
        }
        return "not_found";
      }
    });

    if (results?.[0]?.result === "toggled") {
      statusEl.textContent = "Pannello aperto ✓";
      statusEl.className = "status ok";
      setTimeout(() => window.close(), 600);
      return;
    }

    // Content script non presente → inietta tutto in ordine
    // (il manifest già lo inietta automaticamente sulle pagine matching,
    //  questo è solo per pagine fuori dai due step canonici)
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["style.css"]
    });

    // Stesso ordine del manifest content_scripts.js
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "src/core/constants.js",
        "src/core/utils.js",
        "src/core/storage.js",
        "src/core/skip-rules.js",
        "src/core/myaccess.js",
        "src/core/assigner.js",
        "src/core/justifier.js",
        "src/core/notify.js",
        "src/core/spa-nav.js",
        "src/ui/icons.js",
        "src/ui/panel-html.js",
        "src/ui/interactions.js",
        "src/ui/dropdown.js",
        "src/ui/logger.js",
        "src/ui/shortcuts.js",
        "src/ui/tab-templates.js",
        "src/ui/tab-skip.js",
        "src/ui/panel.js",
        "src/content.js",
      ]
    });

    statusEl.textContent = "Pannello aperto ✓";
    statusEl.className = "status ok";
    setTimeout(() => window.close(), 600);
  } catch (e) {
    statusEl.textContent = "Errore: " + e.message;
    statusEl.className = "status err";
  }
};
