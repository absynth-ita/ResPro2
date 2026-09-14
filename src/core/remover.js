// ResPro — svuotamento della selezione; Submit resta manuale.
window.RGP = window.RGP || {};
(function () {
  const {delay, setNativeValue} = RGP.utils;
  const {isPageElement, exactLabels} = RGP.myaccess;
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const enabled = el => isPageElement(el) && !el.disabled && !el.closest('[aria-disabled="true"], .disabled');
  function root() {
    for (const label of exactLabels('Selected Application Roles')) {
      for (let n = label.parentElement; n && n !== document.body; n = n.parentElement) {
        if (exactLabels('Available Application Roles', n).length) break;
        if ([...n.querySelectorAll('input')].some(isPageElement)) return n;
      }
    }
    throw new Error('Selected Application Roles non riconosciuta. Apri la fase Access.');
  }
  function glyph(el) {
    const txt = norm(el.textContent);
    if (/^[−–-]$/.test(txt)) return 'minus';
    if (/^[›»>]$/.test(txt)) return 'next';
    if (/^[‹«<]$/.test(txt)) return 'previous';
    const strokes = [...el.querySelectorAll('svg path, svg line, svg polyline')];
    if (strokes.length !== 1) return null;
    try {
      const s = strokes[0], len = s.getTotalLength(), box = s.getBBox();
      if (box.width > 0 && box.height <= box.width * 0.15) return 'minus';
      const a = s.getPointAtLength(0), m = s.getPointAtLength(len / 2), b = s.getPointAtLength(len);
      if (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) > 2) {
        if (m.x > a.x + 2) return 'next';
        if (m.x < a.x - 2) return 'previous';
      }
    } catch (_) { /* Require a label for unsupported icons. */ }
    return null;
  }
  function controls(scope) {
    return [...scope.querySelectorAll('button, a, [role="button"], .ent-remove-selected-item')]
      .filter(isPageElement).filter(el => !el.parentElement?.closest('button, a, [role="button"]'));
  }
  function read() {
    const scope = root();
    if (scope.querySelector('[aria-busy="true"]')) throw new Error('Selezione in caricamento.');
    const range = norm(scope.innerText).match(/(\d[\d,]*)\s*[-–—]\s*(\d[\d,]*)\s+of\s+(\d[\d,]*)/i);
    if (!range) throw new Error('Contatore della selezione non riconosciuto: nessuna rimozione automatica.');
    const [start, end, total] = range.slice(1).map(n => Number(n.replace(/,/g, '')));
    if (end > total || (total > 0 && start > end)) throw new Error('Contatore incoerente.');
    const buttons = controls(scope).filter(el => {
      const label = norm(el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent);
      return /^remove(?:\s|$)/i.test(label) || el.matches('.ent-remove-selected-item') ||
        el.querySelector('.icon-v2-remove, .icon-v2-minus, .lucide-minus, .lucide-circle-minus') || glyph(el) === 'minus';
    });
    const cards = buttons.map(btn => {
      // Include badges that are siblings of the title/action wrapper. Stop
      // before another card, the column header, search or pagination controls.
      let container = RGP.myaccess.findContainer(btn, buttons);
      for (let n = container.parentElement; n && n !== scope; n = n.parentElement) {
        if (buttons.some(other => other !== btn && n.contains(other)) || n.querySelector('input') ||
          /records per page|\d\s*[-–—]\s*\d.*\bof\b/i.test(n.innerText || '')) break;
        container = n;
      }
      const raw = norm(container.innerText);
      return {btn, container, existing: /\buser has access\b/i.test(raw),
        key: raw.replace(/\buser has access\b/ig, '').replace(/[−–-]\s*$/, '').trim(),
        name: RGP.myaccess.extractDisplayText(container)};
    });
    if (cards.length !== (total ? end - start + 1 : 0) || cards.some(c => !c.key || !scope.contains(c.container))) {
      throw new Error('Non riconosco tutte le card selezionate: operazione interrotta.');
    }
    return {start, end, total, cards, signature: JSON.stringify([start, end, total, cards.map(c => [c.key, c.existing])])};
  }
  const adapter = {
    read,
    async prepare(signal) {
      const inputs = [...root().querySelectorAll('input')].filter(el => isPageElement(el) && /search/i.test([el.placeholder, el.type, el.getAttribute('aria-label')].join(' ')));
      if (inputs.length !== 1 || inputs[0].disabled || inputs[0].readOnly) throw new Error('Ricerca dei ruoli selezionati non riconosciuta.');
      const inp = inputs[0];
      if (inp.value) {
        inp.focus(); setNativeValue(inp, '');
        for (const type of ['keydown', 'keypress', 'keyup']) inp.dispatchEvent(new KeyboardEvent(type, {key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true}));
        inp.blur();
      }
      await delay(RGP.const.TIMING.SEARCH_AFTER_ENTER, signal);
    },
    page(direction) {
      const button = controls(root()).find(el => enabled(el) && (
        (direction === 'next' ? /^(next|next page|go to next page)$/i : /^(previous|previous page|go to previous page|prev)$/i)
          .test(norm(el.getAttribute('aria-label') || el.getAttribute('title'))) || enabled(el) && glyph(el) === direction));
      if (!button) throw new Error('Pulsante pagina ' + direction + ' non riconosciuto o disabilitato.');
      button.click();
    },
    remove(card) {
      if (!card.btn.isConnected || !enabled(card.btn) || !root().contains(card.btn)) throw new Error('Card cambiata: rimozione annullata.');
      const live = read().cards.find(c => c.btn === card.btn && c.key === card.key && c.existing === card.existing);
      if (!live) throw new Error('Contenuto della card cambiato: rimozione annullata.');
      card.btn.click();
    }
  };
  async function run(mode, {signal, waitIfPaused, log, onProgress, dom = adapter}) {
    if (!['new', 'all'].includes(mode)) throw new Error('Modalità non valida.');
    let removed = 0;
    async function check() {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      await waitIfPaused();
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    }
    async function stable(predicate = () => true) {
      const deadline = Date.now() + RGP.const.TIMING.CANDIDATE_TIMEOUT;
      let previous = null, lastError;
      while (Date.now() < deadline) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        try {
          const s = dom.read();
          if (predicate(s) && s.signature === previous) return s;
          previous = predicate(s) ? s.signature : null;
        } catch (e) { lastError = e; previous = null; }
        await delay(RGP.const.TIMING.POLL_INTERVAL, signal);
      }
      throw new Error(lastError?.message || 'Cambiamento non confermato dalla pagina. Controlla la selezione prima di riprovare.');
    }
    try {
      await check(); await dom.prepare(signal);
      let snap = await stable();
      const initial = snap.total;
      while (snap.start > 1) {
        await check(); const old = snap;
        dom.page('previous');
        snap = await stable(s => s.start < old.start && s.total === old.total);
      }
      onProgress(removed, initial);
      while (snap.total > 0) {
        await check();
        const fresh = await stable();
        if (fresh.signature !== snap.signature) throw new Error('Selezione cambiata durante l’operazione.');
        // Use live buttons from the fresh snapshot: frameworks may rerender cards.
        snap = fresh;
        const target = snap.cards.find(c => mode === 'all' || !c.existing);
        if (target) {
          if (snap.cards.filter(c => c.key === target.key).length !== 1) throw new Error('Ruoli omonimi nella pagina: rimozione ambigua.');
          await check();
          if (dom.read().signature !== snap.signature) throw new Error('Selezione cambiata prima del clic.');
          dom.remove(target);
          const oldTotal = snap.total;
          snap = await stable(s => s.total === oldTotal - 1 && !s.cards.some(c => c.key === target.key));
          removed++; onProgress(removed, initial);
          log(`   ✅ Rimossa dalla selezione: ${target.name}`, 'rgp-ok');
        } else if (snap.end < snap.total) {
          const old = snap; await check();
          if (dom.read().signature !== old.signature) throw new Error('Selezione cambiata prima del cambio pagina.');
          dom.page('next');
          snap = await stable(s => s.start > old.start && s.total === old.total);
        } else break;
      }
      return {removed, remaining: snap.total, aborted: false};
    } catch (e) {
      if (e.name === 'AbortError') return {removed, aborted: true};
      e.message += ` Rimozioni confermate: ${removed}.`; throw e;
    }
  }
  RGP.remover = {run, adapter};
})();
