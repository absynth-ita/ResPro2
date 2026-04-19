# ResPro 🚀

> Estensione Chrome per assegnazione e giustificazione automatica delle responsibility su MyAccess (Saviynt).

**Versione 2.3** — shortcut da tastiera + notifiche desktop.

---

## Cosa fa

| Step | Pagina | Cosa fa ResPro |
|------|--------|---------------|
| **Step 2** — Select Access | `createrequestsecondstep` | Cerca e assegna le responsibility, scegliendo la variante corretta tra più risultati |
| **Step 3** — Review & Justification | `createrequestthirdstep` | Compila tutte le caselle di giustificazione, gestisce conflitti SoD, spunta il checkbox |

---

## Changelog

### v2.3 (corrente)

- ⌨️ **Shortcut da tastiera.** Pattern Slack/GitHub: dentro la textarea, **Ctrl+Enter** (o **Cmd+Enter** su Mac) esegue l'azione del tab (Avvia / Compila tutto). Durante un'esecuzione, **Esc** ferma. Niente combo strane da memorizzare, zero conflitti con Chrome perché agiscono solo dentro le textarea ResPro.
- 🔔 **Notifiche desktop a fine batch.** Quando finisce un'assegnazione o una compilazione justification, parte una notifica nativa con il riepilogo (✅ aggiunti / ⏭ saltati / ❌ non trovati). Permission richiesta una volta sola al primo uso. Niente notifica se hai fermato a mano col tasto Stop o Esc.

### v2.2

- ✨ Posizione e dimensione del pannello persistono tra sessioni (debounce 200ms, clamp dentro viewport).
- 🔧 `RGP.debug()` finalmente operativo in 7 punti chiave del workflow.

### v2.1

- 🐛 Log doppio fixato: estrazione titolo card via `extractDisplayText()`. Matching regex resta sul testo completo.

### v2.0 — Refactor completo

**Bug critici risolti:**
- 🔴 Storage keys disallineate (`rgpTemplates` write vs `rgpTemplate` read): migrazione automatica al primo avvio.
- 🔴 Popup chiamava una funzione inesistente: ogni clic re-iniettava tutto da capo.
- 🔴 Stop non era davvero uno stop. Ora `AbortController` interrompe anche le `delay()` in volo.
- 🟠 Memory leak su listener globali: ogni componente espone `dispose()`.
- 🟠 Due `MutationObserver` `subtree:true` sul body sostituiti con patching di `history.pushState` (overhead zero).
- 🟠 `getAddButtons()` chiamata O(n²): ora calcolata una volta e passata.
- 🟡 HTML injection nei nomi template: `innerHTML` → `createElement` + `textContent`.

**Architettura:** da un file monolitico di ~1000 righe a 19 moduli con responsabilità chiare.

---

## Struttura file

```
ResPro/
├── manifest.json
├── popup.html
├── popup.js
├── style.css
├── icon16.png / icon48.png / icon128.png
├── README.md
└── src/
    ├── content.js              ← entry point
    ├── core/
    │   ├── constants.js        ← chiavi storage, timing, DEBUG flag
    │   ├── storage.js          ← chrome.storage wrapper + migrazione + geometry
    │   ├── skip-rules.js       ← logica shouldSkip
    │   ├── utils.js            ← delay abortabile, setNativeValue
    │   ├── myaccess.js         ← TUTTO il DOM scraping di MyAccess
    │   ├── assigner.js         ← chooseBest + runList (Step 2)
    │   ├── justifier.js        ← runJustify (Step 3)
    │   ├── notify.js           ← Web Notifications API wrapper
    │   └── spa-nav.js          ← watcher navigation via history patching
    └── ui/
        ├── icons.js            ← SVG deduplicate
        ├── panel-html.js       ← markup
        ├── interactions.js     ← drag/resize/tabs (con cleanup, callback onEnd)
        ├── dropdown.js         ← dropdown custom
        ├── logger.js           ← logger riusabile
        ├── shortcuts.js        ← Ctrl+Enter / Esc handlers
        ├── tab-templates.js    ← gestione templates
        ├── tab-skip.js         ← gestione skip rules
        └── panel.js            ← orchestratore principale
```

Quando MyAccess cambia DOM, sai esattamente dove andare: `src/core/myaccess.js`.

---

## Installazione

1. Copia la cartella `ResPro` in una posizione **stabile** (non spostarla dopo)
2. Apri Chrome → `chrome://extensions`
3. Attiva **Modalità sviluppatore**
4. **"Carica estensione non pacchettizzata"** → seleziona la cartella `ResPro`

### Migrazione dalle versioni precedenti

Disinstalla la vecchia, installa la nuova. Tutto viene migrato automaticamente.

### Aggiornamenti futuri

1. Sostituisci i file aggiornati nella cartella
2. Bumpa il numero in `manifest.json` → `"version"` (es. `2.3` → `2.4`)
3. `chrome://extensions` → **⟳** su ResPro
4. F5 su MyAccess

> Convenzione semver: `MAJOR.MINOR.PATCH` — bug fix incrementa PATCH, mini-feature incrementa MINOR, breaking change incrementa MAJOR.

---

## Utilizzo

### Tab Assegnatore — Step 2

1. Seleziona un **template** dal dropdown (oppure incolla la lista nel textarea)
2. Premi **▶ Avvia** oppure **Ctrl+Enter** dentro il textarea
3. Per fermare: **⏹ Ferma** oppure **Esc**

**Logica di selezione variante:**

| Priorità | Variante |
|----------|----------|
| 1 | `Contractors - Supply Chain` |
| 2 | `Supply Chain` (no Global Services) |
| 3 | `Contractors` |
| 4 | Qualsiasi tranne `Global Services` |
| 5 | `Global Services` (solo se non c'è altro) |

### Tab Giustifica — Step 3

1. Verifica/modifica il testo (salvato tra sessioni)
2. **▶ Compila tutto** oppure **Ctrl+Enter** dentro il textarea
3. Controlla il risultato e premi **Submit** tu

### Tab Templates / Skip rules

Gestione standard: crea, modifica, elimina, importa/esporta JSON.

### Notifiche desktop

Al primo Avvio Chrome chiede il permesso. Se concedi, alla fine di ogni batch ricevi una notifica nativa col riepilogo. Se neghi, niente notifica e il workflow funziona uguale.

### Posizione del pannello

Trascina dall'header per spostarlo, ridimensiona dall'angolo in basso a destra. Posizione e dimensione vengono salvate automaticamente.

---

## Shortcut riassunte

| Shortcut | Dove | Azione |
|----------|------|--------|
| **Ctrl+Enter** / **Cmd+Enter** | Dentro textarea Run | Avvia |
| **Ctrl+Enter** / **Cmd+Enter** | Dentro textarea Justify | Compila tutto |
| **Esc** | Ovunque nel pannello, durante esecuzione | Stop |

---

## Debug

Apri F12 → Console e lancia:

```js
rgpDebug()           // mostra search input, ADD buttons, candidati
```

Per logging dettagliato durante il workflow, modifica in `src/core/constants.js`:

```js
DEBUG: true
```

ricarica l'estensione, F5. Tutti i `RGP.debug(...)` finiranno in console con prefisso `[ResPro]`.

---

## Tuning timing

Tutti i delay sono in `src/core/constants.js → TIMING`. Cambia un numero e ricarica.

---

## Note per il versioning su GitHub

GitHub non fa versioning automatico. Per ogni release:

1. Bumpa `manifest.json` → `"version"`
2. Aggiorna la sezione Changelog di questo README
3. `git add -A && git commit -m "v2.x — descrizione"`
4. (Opzionale ma consigliato) crea un tag: `git tag v2.x && git push --tags`
5. (Opzionale) su GitHub trasforma il tag in Release con changelog dettagliato

---

## Versione

| | |
|--|--|
| Versione | 2.3 |
| Manifest | MV3 |
| Compatibilità | Chrome 100+ |
| Pagine attive | `createrequestsecondstep`, `createrequestthirdstep` |
