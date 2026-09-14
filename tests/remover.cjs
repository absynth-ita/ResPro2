// node tests/remover.cjs — workflow tests, no browser dependencies.
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
async function scenario(mode, options = {}) {
  const context = vm.createContext({setTimeout, clearTimeout, DOMException}); context.window = context;
  for (const name of ['constants', 'utils']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core', name+'.js'), 'utf8'), context);
  context.RGP.myaccess = {};
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/core/remover.js'), 'utf8'), context);
  context.RGP.const.TIMING.POLL_INTERVAL = 2; context.RGP.const.TIMING.CANDIDATE_TIMEOUT = 80;
  const initial = options.empty ? [] : Array.from({length: 13}, (_, i) => ({key: 'role-'+i, name:'Role '+i, existing: i % 3 === 0}));
  let data = [...initial], page = options.page || 0, clicks = [], navigations = 0, prepared = false;
  const ctrl = new AbortController();
  const dom = {
    async prepare() { prepared = true; },
    read() {
      const cards = data.slice(page*4, page*4+4), total = data.length;
      const start = total ? page*4+1 : 0, end = total ? Math.min((page+1)*4,total) : 0;
      return {cards, total, start, end, signature: JSON.stringify([page, data.map(c=>c.key)])};
    },
    page(direction) { page += direction==='next'?1:-1; navigations++; assert(page>=0 && page*4<data.length); },
    remove(card) {
      clicks.push(card.key);
      if (!options.failed) {
        data = data.filter(c=>c.key!==card.key); page = Math.min(page, Math.max(0,Math.ceil(data.length/4)-1));
      }
      if (options.abort) ctrl.abort();
    }
  };
  const progress=[];
  const run = context.RGP.remover.run(mode,{signal:ctrl.signal,waitIfPaused:async()=>{},log:()=>{},onProgress:n=>progress.push(n),dom});
  if (options.failed) {
    await assert.rejects(run,/Cambiamento non confermato/); assert.equal(clicks.length,1); assert.equal(progress.at(-1),0);
  } else {
    const result = await run;
    assert(prepared);
    if (options.abort) { assert(result.aborted); assert.equal(clicks.length,1); }
    else {
      const expected = mode==='new'? initial.filter(c=>c.existing):[];
      assert.deepEqual(data,expected); assert.equal(result.removed,initial.length-expected.length);
      if (mode==='new') assert(clicks.every(key=>!initial.find(c=>c.key===key).existing));
      if (!options.empty) assert(navigations>0 || mode==='all' && !options.page);
    }
  }
  console.log('PASS', mode, options);
}
(async()=>{
 await scenario('new'); await scenario('all'); await scenario('new',{page:2}); await scenario('all',{page:3});
 await scenario('all',{empty:true}); await scenario('new',{abort:true}); await scenario('all',{failed:true});
})().catch(e=>{console.error(e);process.exitCode=1;});
