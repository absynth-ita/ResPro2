// Run: node tests/highlights.cjs (no dependencies).
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
async function scenario(mode) {
  const controller = new AbortController();
  const context = vm.createContext({setTimeout, clearTimeout, DOMException, console});
  context.window = context;
  for (const file of ['constants', 'utils']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core', file + '.js'), 'utf8'), context);
  const R = context.RGP;
  const cards = ['Role Supply Chain', 'Role Global Services'].map(text => {
    const classes = new Set();
    return {text, btn: {isConnected: true, disabled: false, getAttribute: () => null}, container: {classes, closest: () => null, classList: {remove: c => classes.delete(c)}}};
  });
  let clicks = 0, current = cards;
  R.const.TIMING.HIGHLIGHT_PREVIEW = 40;
  R.const.TIMING.PER_ITEM_PAUSE = 1;
  R.skip = {shouldSkip: () => mode === 'skip' ? 'rule' : null};
  R.myaccess = {
    getCandidates: () => current,
    clearVisuals: () => cards.forEach(c => c.container.classes.clear()),
    applyVisual: (el, cls) => {el.classes.clear(); el.classes.add(cls);},
    triggerSearch: async () => true,
    waitForCandidates: async () => ({ok: true}),
    clickAdd: () => clicks++
  };
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core/assigner.js'), 'utf8'), context);
  const pending = R.assigner.runList(['Role'], {signal: controller.signal, waitIfPaused: async () => {}, log: () => {}, onProgress: () => {}});
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(clicks, 0, 'must not click before preview');
  assert(cards[0].container.classes.has('rgp-choice'), 'chosen role green during preview');
  assert(cards[1].container.classes.has('rgp-hit'), 'alternative yellow during preview');
  if (mode === 'abort') controller.abort();
  if (mode === 'replace') current = [];
  const result = await pending;
  assert.equal(clicks, mode === 'normal' ? 1 : 0);
  assert(cards.every(c => c.container.classes.size === 0), 'cleanup at completion/stop');
  if (mode === 'abort') assert(result.aborted);
  if (mode === 'replace') assert.equal(result.notFound, 1);
  if (mode === 'skip') assert.equal(result.skipped, 1);
  console.log('PASS:', mode);
}
(async () => {for (const mode of ['normal', 'abort', 'replace', 'skip']) await scenario(mode);})().catch(e => {console.error(e); process.exitCode = 1;});
