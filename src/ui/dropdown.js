// ResPro — dropdown custom per la selezione del template
// Evita conflitti con stili di MyAccess sui <select> nativi.
window.RGP = window.RGP || {};

(function () {
  /**
   * Crea un dropdown gestito.
   * @param {Element} panel
   * @param {() => string[]} getTemplateNames
   * @param {() => string} getSelected
   * @param {(name: string) => void} onSelect
   * @returns {{ rebuild: () => void, dispose: () => void }}
   */
  function createDropdown(panel, getTemplateNames, getSelected, onSelect) {
    const ddBtn  = panel.querySelector("#rgp-dd-btn");
    const ddList = panel.querySelector("#rgp-dd-list");

    const onBtnClick = (e) => { e.stopPropagation(); ddList.classList.toggle("rgp-hidden"); };
    const onDocClick = (e) => { if (!panel.contains(e.target)) ddList.classList.add("rgp-hidden"); };

    ddBtn.addEventListener("click", onBtnClick);
    document.addEventListener("click", onDocClick);

    function rebuild() {
      ddList.innerHTML = "";
      const names = getTemplateNames();
      if (!names.length) {
        const empty = document.createElement("div");
        empty.className = "rgp-dd-empty";
        empty.textContent = "Nessun template salvato";
        ddList.appendChild(empty);
        return;
      }
      const sel = getSelected();
      names.forEach(name => {
        const item = document.createElement("div");
        item.className = "rgp-dd-item";
        item.textContent = name;
        if (name === sel) item.classList.add("rgp-dd-item-active");
        item.addEventListener("click", e => {
          e.stopPropagation();
          ddBtn.childNodes[0].textContent = name;
          ddList.classList.add("rgp-hidden");
          ddList.querySelectorAll(".rgp-dd-item").forEach(i => i.classList.remove("rgp-dd-item-active"));
          item.classList.add("rgp-dd-item-active");
          onSelect(name);
        });
        ddList.appendChild(item);
      });
    }

    function setLabel(text) {
      ddBtn.childNodes[0].textContent = text;
    }

    function dispose() {
      ddBtn.removeEventListener("click", onBtnClick);
      document.removeEventListener("click", onDocClick);
    }

    return { rebuild, setLabel, dispose };
  }

  RGP.dropdown = { createDropdown };
})();
