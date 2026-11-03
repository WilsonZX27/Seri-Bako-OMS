const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  let now = 1800000000000, next = 0, shared = null;
  const timers = new Map(), effects = [], listeners = new Map(), calls = [], redirects = [];
  const sessions = {expired: true, active: true};
  class Clock extends Date { static now() { return now; } }
  const load = (path, bindings) => {
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    }}).outputText, {exports, Date: Clock, require: name => {
      if (!(name in bindings)) throw Error(name);
      return bindings[name];
    }, window: {
      setTimeout(fn, delay) {const id = ++next; timers.set(id, {fn, delay}); return id;},
      clearTimeout(id) {timers.delete(id);},
      localStorage: {getItem: () => shared, setItem: (_, value) => {shared = value;}},
      addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {},
    }});
    return exports;
  };
  const activity = load('src/lib/session-activity.ts', {});
  const provider = load('src/components/session-timeout-provider.tsx', {
    react: {useCallback: fn => fn, useEffect: fn => effects.push(fn), useId: () => 'id',
      useRef: current => ({current}), useState: value => [value, () => {}]},
    'react/jsx-runtime': {}, 'next/navigation': {useRouter: () => ({replace: url => redirects.push(url)})},
    '@/components/ui/button': {}, '@/components/ui/modal-shell': {},
    '@/lib/session-activity': activity,
    '@/lib/supabase/client': {createClient: () => ({auth: {signOut: async (options) => {
      calls.push(options); sessions.expired = false;
      if ((options?.scope ?? 'global') === 'global') sessions.active = false;
    }}})},
  });
  provider.SessionTimeoutProvider(); effects.forEach(fn => fn());
  const expiry = [...timers.values()].find(t => t.delay === activity.sessionLogoutAfterMs).fn;
  return {calls, sessions, redirects, expire: async () => {
    now += activity.sessionLogoutAfterMs; expiry(); await Promise.resolve(); await Promise.resolve();
  }, recentSharedActivity: () => { shared = String(now + activity.sessionLogoutAfterMs - 1000); }};
}
test('idle expiry revokes only current session and preserves another active login', async () => {
  const h = harness(); await h.expire();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0]?.scope, 'local');
  assert.equal(h.sessions.expired, false); assert.equal(h.sessions.active, true);
  assert.deepEqual(h.redirects, ['/access-status?reason=idle-timeout']);
});
test('recent same-origin shared activity prevents idle sign-out', async () => {
  const h = harness(); h.recentSharedActivity(); await h.expire();
  assert.equal(h.calls.length, 0); assert.equal(h.sessions.active, true);
  assert.equal(h.redirects.length, 0);
});
