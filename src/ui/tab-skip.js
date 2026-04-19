// ResPro — tab Skip rules
window.RGP = window.RGP || {};

(function () {
  function setup(panel, state, cb) {
    const $ = (s) => panel.querySelector(s);

    function renderChip(text, key, container) {
      const chip = document.createElement("div");
      chip.className = "rgp-chip";
      chip.title = text;

      const span = document.createElement("span");
      span.textContent = text;

      const btn = document.createElement("button");
      btn.textContent = "✕";
      btn.title = "Rimuovi";
      btn.addEventListener("click", () => {
        state.skipRules[key] = state.skipRules[key].filter(x => x !== text);
        cb.onChange();
        render();
      });

      chip.append(span, btn);
      container.appendChild(chip);
    }

    function render() {
      const pl = $("#rgp-pat-list"), bl = $("#rgp-bl-list");
      pl.innerHTML = ""; bl.innerHTML = "";
      state.skipRules.patterns.forEach(p  => renderChip(p, "patterns",  pl));
      state.skipRules.blacklist.forEach(b => renderChip(b, "blacklist", bl));
    }

    function add(key, inputId) {
      const inp = $(`#${inputId}`);
      const val = inp.value.trim();
      if (!val) return;
      if (!state.skipRules[key].includes(val)) {
        state.skipRules[key].push(val);
        cb.onChange();
        render();
      }
      inp.value = "";
    }

    $("#rgp-pat-add").addEventListener("click", () => add("patterns",  "rgp-pat-inp"));
    $("#rgp-bl-add") .addEventListener("click", () => add("blacklist", "rgp-bl-inp"));
    $("#rgp-pat-inp").addEventListener("keydown", e => { if (e.key === "Enter") add("patterns",  "rgp-pat-inp"); });
    $("#rgp-bl-inp") .addEventListener("keydown", e => { if (e.key === "Enter") add("blacklist", "rgp-bl-inp"); });

    return { render };
  }

  RGP.skipTab = { setup };
})();
