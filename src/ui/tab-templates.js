// ResPro — tab Templates: lista, editor, import/export
window.RGP = window.RGP || {};

(function () {
  const I = RGP.icons;

  /**
   * @param {Element} panel
   * @param {object} state — { templates, selectedTpl }
   * @param {object} cb — { onChange, onSelectionCleared }
   */
  function setup(panel, state, cb) {
    const $ = (s) => panel.querySelector(s);

    function renderList() {
      const wrap = $("#rgp-tpl-list");
      wrap.innerHTML = "";
      const names = Object.keys(state.templates).sort();
      if (!names.length) {
        const p = document.createElement("p");
        p.className = "rgp-empty";
        p.textContent = "Nessun template salvato.";
        wrap.appendChild(p);
        return;
      }
      // Costruisco con createElement / textContent → no HTML injection
      names.forEach(name => {
        const row = document.createElement("div");
        row.className = "rgp-tpl-row";

        const span = document.createElement("span");
        span.className = "rgp-tpl-name";
        span.title = name;
        span.textContent = name;

        const cnt = document.createElement("span");
        cnt.className = "rgp-tpl-count";
        cnt.textContent = `${state.templates[name].length} voci`;

        const editBtn = document.createElement("button");
        editBtn.className = "rgp-icon-btn";
        editBtn.title = "Modifica";
        editBtn.innerHTML = I.edit;
        editBtn.addEventListener("click", () => openEditor(name, state.templates[name].join("\n"), name));

        const delBtn = document.createElement("button");
        delBtn.className = "rgp-icon-btn rgp-icon-red";
        delBtn.title = "Elimina";
        delBtn.innerHTML = I.delete;
        delBtn.addEventListener("click", () => {
          if (!confirm(`Eliminare il template "${name}"?`)) return;
          delete state.templates[name];
          if (state.selectedTpl === name) {
            state.selectedTpl = "";
            cb.onSelectionCleared();
          }
          cb.onChange();
          renderList();
        });

        row.append(span, cnt, editBtn, delBtn);
        wrap.appendChild(row);
      });
    }

    function openEditor(name, body, originalName = "") {
      $("#rgp-tpl-ename").value = name;
      $("#rgp-tpl-ebody").value = body;
      $("#rgp-tpl-editor").classList.remove("rgp-hidden");
      $("#rgp-tpl-list").classList.add("rgp-hidden");
      $("#rgp-tpl-toolbar").classList.add("rgp-hidden");
      $("#rgp-tpl-ename").dataset.originalName = originalName;
      $("#rgp-tpl-ename").focus();
    }

    function closeEditor() {
      $("#rgp-tpl-editor").classList.add("rgp-hidden");
      $("#rgp-tpl-list").classList.remove("rgp-hidden");
      $("#rgp-tpl-toolbar").classList.remove("rgp-hidden");
    }

    $("#rgp-tpl-new").addEventListener("click", () => openEditor("", ""));
    $("#rgp-tpl-cancel").addEventListener("click", closeEditor);
    $("#rgp-tpl-save").addEventListener("click", () => {
      const name = $("#rgp-tpl-ename").value.trim();
      if (!name) { alert("Il nome del template è obbligatorio."); return; }
      const orig = $("#rgp-tpl-ename").dataset.originalName || "";
      // Se ho rinominato, rimuovo il vecchio
      if (orig && orig !== name) delete state.templates[orig];
      state.templates[name] = $("#rgp-tpl-ebody").value
        .split(/\r?\n/).map(x => x.trim()).filter(Boolean);
      cb.onChange();
      renderList();
      closeEditor();
    });

    // Import
    $("#rgp-tpl-file").addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          const p = JSON.parse(ev.target.result);
          const imp = {};
          if (Array.isArray(p)) {
            p.forEach(x => {
              if (x.name && Array.isArray(x.responsibilities)) imp[x.name] = x.responsibilities;
            });
          } else {
            Object.entries(p).forEach(([k, v]) => { if (Array.isArray(v)) imp[k] = v; });
          }
          const n = Object.keys(imp).length;
          if (!n) throw new Error("Nessun template valido trovato nel file.");
          Object.assign(state.templates, imp);
          cb.onChange();
          renderList();
          alert(`Importati ${n} template da "${file.name}".`);
        } catch (err) {
          alert("Errore nel file JSON: " + err.message);
        }
        e.target.value = "";
      };
      r.readAsText(file);
    });

    // Export
    $("#rgp-tpl-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.templates, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rgp-templates.json";
      a.click();
      // libera la memoria del blob URL
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    return { renderList };
  }

  RGP.tplTab = { setup };
})();
