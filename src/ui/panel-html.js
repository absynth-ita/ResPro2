// ResPro — markup HTML del pannello
window.RGP = window.RGP || {};

RGP.buildPanelHTML = function () {
  const I = RGP.icons;
  return `
<div id="rgp-titlebar">
  <div id="rgp-drag-handle">
    <div id="rgp-drag-title">${I.drag} ResPro</div>
    <div id="rgp-drag-sub">MyAccess BH · Assegnazione automatica responsibility</div>
  </div>
  <button id="rgp-close" title="Chiudi">${I.close}</button>
</div>
<div id="rgp-resize-handle" title="Ridimensiona">${I.resize}</div>

<div id="rgp-tabs">
  <button class="rgp-tab rgp-tab-active" data-tab="run">Assegnatore</button>
  <button class="rgp-tab" data-tab="justify">Giustifica</button>
  <button class="rgp-tab" data-tab="templates">Templates</button>
  <button class="rgp-tab" data-tab="skip">Skip rules</button>
</div>

<!-- TAB: RUN -->
<div id="rgp-pane-run" class="rgp-pane">
  <div id="rgp-tpl-row">
    <div id="rgp-dd-wrap">
      <div id="rgp-dd-btn">— template —<span id="rgp-dd-arrow">▾</span></div>
      <div id="rgp-dd-list" class="rgp-hidden"></div>
    </div>
    <button id="rgp-tpl-apply">Carica</button>
  </div>
  <textarea id="rgp-input" placeholder="Una responsibility per riga, oppure seleziona un template sopra…&#10;(Ctrl+Enter per avviare, Esc per fermare)"></textarea>
  <div id="rgp-controls">
    <button id="rgp-start">${I.play} Avvia</button>
    <button id="rgp-pause" title="Pausa / Riprendi">${I.pause} Pausa</button>
    <button id="rgp-stop" title="Ferma">${I.stop} Ferma</button>
  </div>
  <div id="rgp-pb-wrap"><div id="rgp-pb"></div></div>
  <div id="rgp-prog-lbl"></div>
  <div id="rgp-log"></div>
</div>

<!-- TAB: GIUSTIFICA -->
<div id="rgp-pane-justify" class="rgp-pane rgp-hidden">
  <p class="rgp-lbl">Testo giustificazione (uguale per tutte)</p>
  <textarea id="rgp-just-text"></textarea>
  <div id="rgp-just-controls">
    <button id="rgp-just-run">${I.play} Compila tutto</button>
    <button id="rgp-just-reset" class="rgp-pill">Reset testo</button>
  </div>
  <div id="rgp-just-log"></div>
</div>

<!-- TAB: TEMPLATES -->
<div id="rgp-pane-templates" class="rgp-pane rgp-hidden">
  <div id="rgp-tpl-toolbar">
    <label class="rgp-pill" title="Importa file JSON">
      ${I.importIcon} Importa<input type="file" id="rgp-tpl-file" accept=".json" style="display:none">
    </label>
    <button id="rgp-tpl-export" class="rgp-pill">${I.exportIcon} Esporta</button>
    <button id="rgp-tpl-new" class="rgp-pill rgp-pill-green">${I.plus} Nuovo</button>
  </div>
  <div id="rgp-tpl-list"></div>
  <div id="rgp-tpl-editor" class="rgp-hidden">
    <input id="rgp-tpl-ename" type="text" placeholder="Nome template…">
    <textarea id="rgp-tpl-ebody" placeholder="Una responsibility per riga…"></textarea>
    <div class="rgp-row-gap">
      <button id="rgp-tpl-save" class="rgp-pill rgp-pill-green">Salva</button>
      <button id="rgp-tpl-cancel" class="rgp-pill">Annulla</button>
    </div>
  </div>
</div>

<!-- TAB: SKIP -->
<div id="rgp-pane-skip" class="rgp-pane rgp-hidden">
  <div id="rgp-skip-hardcoded">
    <p class="rgp-lbl" style="margin-bottom:5px">Regole fisse (non modificabili)</p>
    <div class="rgp-chip" style="opacity:.6"><span>🔒 obsolete</span></div>
    <div class="rgp-chip" style="opacity:.6;margin-top:4px"><span>🔒 PS GS WMS Pack Office (NP-GE)</span></div>
  </div>
  <p class="rgp-lbl" style="margin-top:12px">Contiene parola (salta se trovata)</p>
  <div id="rgp-pat-list" class="rgp-chip-area"></div>
  <div class="rgp-row-gap">
    <input id="rgp-pat-inp" type="text" placeholder="es. obsolete, NP-GE…" style="flex:1">
    <button id="rgp-pat-add" class="rgp-pill rgp-pill-green">+</button>
  </div>
  <p class="rgp-lbl" style="margin-top:14px">Lista nera assoluta (testo esatto)</p>
  <div id="rgp-bl-list" class="rgp-chip-area"></div>
  <div class="rgp-row-gap">
    <input id="rgp-bl-inp" type="text" placeholder="Testo esatto della responsibility…" style="flex:1">
    <button id="rgp-bl-add" class="rgp-pill rgp-pill-green">+</button>
  </div>
</div>
`;
};
