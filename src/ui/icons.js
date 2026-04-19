// ResPro — icone SVG come costanti (deduplicate dall'HTML)
window.RGP = window.RGP || {};

RGP.icons = {
  drag: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" style="opacity:.4;flex-shrink:0">
    <circle cx="2" cy="2" r="1.1" fill="currentColor"/><circle cx="8" cy="2" r="1.1" fill="currentColor"/>
    <circle cx="2" cy="5" r="1.1" fill="currentColor"/><circle cx="8" cy="5" r="1.1" fill="currentColor"/>
    <circle cx="2" cy="8" r="1.1" fill="currentColor"/><circle cx="8" cy="8" r="1.1" fill="currentColor"/>
  </svg>`,

  close: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
  </svg>`,

  resize: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <line x1="10" y1="3" x2="3" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".4"/>
    <line x1="10" y1="6" x2="6" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".4"/>
    <line x1="10" y1="9" x2="9" y2="10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".4"/>
  </svg>`,

  play: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
  </svg>`,

  playColored: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="currentColor"/>
  </svg>`,

  pause: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
    <line x1="5" y1="3" x2="5" y2="13"/><line x1="11" y1="3" x2="11" y2="13"/>
  </svg>`,

  stop: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor"/>
  </svg>`,

  importIcon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 2v9M4 7l4 4 4-4"/><path d="M2 13h12"/>
  </svg>`,

  exportIcon: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 11V2M4 6l4-4 4 4"/><path d="M2 13h12"/>
  </svg>`,

  plus: `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
  </svg>`,

  edit: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z"/>
  </svg>`,

  delete: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
    <line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/>
  </svg>`,
};
