const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");

function shiftRequestHarness(fetchImpl) {
  const slots = [];
  let hookIndex = 0;
  const React = {
    useRef(value) { const index = hookIndex++; return slots[index] ?? (slots[index] = { current: value }); },
    useState(value) { const index = hookIndex++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = next; }]; },
  };
  const source = fs.readFileSync("src/components/attendance/shift-request-button.tsx", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const load = require("./helpers/load-source.cjs")({ Error, TypeError, crypto: require("node:crypto").webcrypto });
  vm.runInNewContext(compiled, {
    exports,
    Error,
    TypeError,
    fetch: fetchImpl,
    window: { prompt: () => "Retained test reason" },
    require: (id) => id === "react" ? React
      : id.includes("ui/button") ? { Button: "button" }
        : id.includes("read-json-response") ? load("src/lib/http/read-json-response.ts")
          : require(id),
  });
  return {
    render() { hookIndex = 0; return exports.ShiftRequestButton({ assignmentId: "fixture-assignment" }).props.children; },
    flush() { return new Promise(resolve => setImmediate(resolve)); },
  };
}

function submitButtonHarness() {
  const hooks = [];
  const cleanups = new Map();
  const dependencies = new Map();
  const listeners = new Map();
  let hookIndex = 0;
  let pendingEffects = [];
  const useSlot = (kind, initial) => {
    const index = hookIndex++;
    if (!hooks[index]) hooks[index] = kind === "ref" ? { current: initial } : { value: initial };
    return [hooks[index], index];
  };
  const React = {
    useRef(initial) { return useSlot("ref", initial)[0]; },
    useState(initial) { const [slot] = useSlot("state", initial); return [slot.value, value => { slot.value = typeof value === "function" ? value(slot.value) : value; }]; },
    useEffect(callback, deps = []) {
      const index = hookIndex++;
      const previous = dependencies.get(index);
      if (!previous || deps.length !== previous.length || deps.some((value, at) => value !== previous[at])) pendingEffects.push({ index, callback, deps });
    },
  };
  const document = {
    addEventListener(name, callback) { const set = listeners.get(name) ?? new Set(); set.add(callback); listeners.set(name, set); },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    dispatchEvent(event) { for (const callback of listeners.get(event.type) ?? []) callback(event); },
  };
  const jsxRuntime = {
    Fragment: "fragment",
    jsx(type, props) {
      if (type === "button" && props.ref) props.ref.current ??= { element: "button" };
      return { type, props };
    },
    jsxs(type, props) { return jsxRuntime.jsx(type, props); },
  };
  const compiled = ts.transpileModule(fs.readFileSync("src/components/ui/submit-button.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    document,
    CustomEvent: function CustomEvent(type, init) { this.type = type; this.detail = init?.detail; },
    require: (id) => id === "react" ? React
      : id === "react/jsx-runtime" ? jsxRuntime
        : id === "react-dom" ? { useFormStatus: () => ({ pending: false }) }
          : id === "next/navigation" ? { usePathname: () => "/fixture", useSearchParams: () => new URLSearchParams() }
            : id.includes("ui/button") ? { Button: "button" }
              : id === "lucide-react" ? { LoaderCircle: "spinner" }
                : require(id),
  });
  function render() {
    hookIndex = 0;
    pendingEffects = [];
    const tree = exports.SubmitButton({ form: "fixture-form", showOverlay: true, overlayLabel: "Saving test record", children: "Save" });
    for (const effect of pendingEffects) {
      cleanups.get(effect.index)?.();
      const cleanup = effect.callback();
      if (typeof cleanup === "function") cleanups.set(effect.index, cleanup);
      dependencies.set(effect.index, effect.deps);
    }
    return tree;
  }
  return { render, dispatch: (type, detail) => document.dispatchEvent({ type, detail }) };
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  for (const child of Object.values(tree.props ?? {})) {
    if (Array.isArray(child)) { for (const item of child) { const found = findElement(item, predicate); if (found) return found; } }
    else { const found = findElement(child, predicate); if (found) return found; }
  }
  return null;
}

test("expired 401 is distinguished from a JSON permission 403", async () => {
  const { readJsonResponse } = await import("../src/lib/http/read-json-response.ts");
  await assert.rejects(
    readJsonResponse(Response.json({ ok: false, message: "Session expired." }, { status: 401 })),
    /session expired.*sign in again/i,
  );
  assert.deepEqual(
    await readJsonResponse(Response.json({ ok: false, message: "You do not have permission." }, { status: 403 })),
    { ok: false, message: "You do not have permission." },
  );
});

test("return paths accept only same-origin app paths and drop query state", async () => {
  const { getSafeReturnPath, buildLoginHref } = await import("../src/lib/http/session-recovery.ts");
  assert.equal(getSafeReturnPath("/purchase-orders/PO-123"), "/purchase-orders/PO-123");
  assert.equal(getSafeReturnPath("//evil.example/path"), null);
  assert.equal(getSafeReturnPath("https://evil.example/path"), null);
  assert.equal(getSafeReturnPath("/\\\\evil.example/path"), null);
  assert.equal(getSafeReturnPath("/purchase-orders?search=secret"), null);
  assert.equal(getSafeReturnPath("/purchase-orders#private"), null);
  assert.equal(getSafeReturnPath("/api/finance/export"), null);
  assert.equal(getSafeReturnPath("/login"), null);
  assert.equal(getSafeReturnPath("/\u0000bad"), null);
  assert.equal(buildLoginHref("/purchase-orders/PO-123"), "/login?returnTo=%2Fpurchase-orders%2FPO-123");
  assert.equal(buildLoginHref("//evil.example"), "/login");
});

test("requested return route must be known and allowed by the signed-in role and permission", async () => {
  const { canReturnToRoute } = await import("../src/lib/http/session-recovery.ts");
  assert.equal(canReturnToRoute("manager", ["manager", "super_admin"], ["purchase_order.read"], true), true);
  assert.equal(canReturnToRoute("outlet_staff", ["manager", "super_admin"], ["purchase_order.read"], true), false);
  assert.equal(canReturnToRoute("manager", ["manager"], ["purchase_order.read"], false), false);
  assert.equal(canReturnToRoute("manager", null, null, true), false);
});

test("concurrent expiry notices keep one safe return route and never save form contents", async () => {
  const { chooseSessionReturnPath } = await import("../src/lib/http/session-recovery.ts");
  const first = chooseSessionReturnPath(null, "/purchase-orders/PO-123");
  const second = chooseSessionReturnPath(first, "/goods-receivings");
  assert.equal(second, "/purchase-orders/PO-123");
  assert.equal(chooseSessionReturnPath("", "/goods-receivings"), "/goods-receivings");
  const recovery = fs.readFileSync("src/components/session-expired-recovery.tsx", "utf8");
  assert.match(recovery, /setReturnTo\(\(current\) => chooseSessionReturnPath\(current, safePath\)\)/);
  assert.match(recovery, /ModalShell open=\{open\}/);
  assert.doesNotMatch(recovery, /localStorage|sessionStorage|password|FormData/);
  const readJson = fs.readFileSync("src/lib/http/read-json-response.ts", "utf8");
  assert.match(readJson, /dispatchSessionExpired\(typeof window === "undefined" \? null : window\.location\.pathname\)/);
});

test("a 401 opens one recovery event with the current path; a 403 does not", async () => {
  const { readJsonResponse } = await import("../src/lib/http/read-json-response.ts");
  const events = [];
  const priorWindow = globalThis.window;
  globalThis.window = {
    location: { origin: "https://oms.example", pathname: "/purchase-orders/PO-123" },
    dispatchEvent(event) { events.push(event); return true; },
  };
  try {
    await assert.rejects(readJsonResponse(Response.json({ ok: false }, { status: 401 })), /session expired/i);
    assert.equal(events.length, 1);
    assert.equal(events[0].detail.returnTo, "/purchase-orders/PO-123");
    assert.deepEqual(await readJsonResponse(Response.json({ ok: false, message: "Forbidden" }, { status: 403 })), { ok: false, message: "Forbidden" });
    assert.equal(events.length, 1);
  } finally {
    if (priorWindow === undefined) delete globalThis.window;
    else globalThis.window = priorWindow;
  }
});

test("successful login returns only to a same-role, permitted requested route", () => {
  const auth = fs.readFileSync("src/server/actions/auth.ts", "utf8");
  const login = fs.readFileSync("src/app/(auth)/login/page.tsx", "utf8");
  assert.match(auth, /getSafeReturnPath\(formData\.get\("returnTo"\)\)/);
  assert.match(auth, /getRoutePermissionCodes\(returnTo\)/);
  assert.match(auth, /getRouteAllowedRoles\(returnTo\)/);
  assert.match(auth, /canReturnToRoute\(roleCode, allowedRoles, routePermissions, permissionAllowed\)/);
  assert.match(login, /name="returnTo" value=\{returnTo\}/);
  assert.doesNotMatch(auth, /localStorage|sessionStorage/);
});

test("recovery dialog is keyboard-contained and unmount clears its screen lock", () => {
  const dialog = fs.readFileSync("src/components/ui/modal-shell.tsx", "utf8");
  const recovery = fs.readFileSync("src/components/session-expired-recovery.tsx", "utf8");
  assert.match(dialog, /role="dialog" aria-modal="true" aria-labelledby=\{titleId\}/);
  assert.match(dialog, /focusDialog\(dialog, initialFocusRef\?\.current\)/);
  assert.match(dialog, /containDialogTab\(event, dialog\)/);
  assert.match(dialog, /if \(event\.key === "Escape"\)/);
  assert.match(dialog, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(recovery, /<Link ref=\{signInRef\} href=\{loginHref\}>Sign in again<\/Link>/);
  assert.match(recovery, /onClose=\{\(\) => undefined\}/);
});

test("server fetch does not retry a POST after a network failure", async () => {
  const source = fs.readFileSync("src/lib/supabase/server-fetch.ts", "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  let fetchCalls = 0;
  const mockRequire = (id) => {
    if (id === "@/lib/reliability/flags") return { reliabilityFlags: { observation: false, readRetry: true } };
    if (id === "@/lib/reliability/retry") return { withReadRetry: async (operation) => operation() };
    if (id === "@/server/observability/supabase-timing") return { reportSlowSupabaseRequest() {} };
    throw new Error(`Unexpected import: ${id}`);
  };
  vm.runInNewContext(compiled, {
    exports,
    require: mockRequire,
    process: { env: {} },
    URL,
    Request,
    performance,
    fetch: async () => { fetchCalls += 1; throw new TypeError("network unavailable"); },
    TypeError,
    Error,
    Date,
  });
  await assert.rejects(exports.limitedServerFetch("https://supabase.example.test/rest/v1/records", {
    method: "POST",
    body: JSON.stringify({ change: true }),
  }), /network unavailable/);
  assert.equal(fetchCalls, 1);
});

test("401 and 403 failures release the attendance request control without replay", async () => {
  for (const status of [401, 403]) {
    let calls = 0;
    const h = shiftRequestHarness(async () => {
      calls += 1;
      return Response.json({ ok: false, message: status === 403 ? "You do not have permission." : "Expired." }, { status });
    });
    h.render()[0].props.onClick();
    await h.flush();
    const [button, feedback] = h.render();
    assert.equal(calls, 1);
    assert.equal(button.props.disabled, false);
    assert.equal(button.props["aria-busy"], false);
    assert.equal(feedback.props.role, "alert");
    assert.match(feedback.props.children, status === 401 ? /session expired.*sign in again/i : /permission/i);
  }
});

test("external form pending bridge clears its full-screen submit overlay on completion", () => {
  const h = submitButtonHarness();
  let tree = h.render();
  h.dispatch("sb:form-pending", { formId: "fixture-form", pending: true });
  tree = h.render();
  assert.ok(findElement(tree, element => element.props?.role === "status"));
  h.dispatch("sb:form-pending", { formId: "fixture-form", pending: false });
  tree = h.render();
  assert.equal(findElement(tree, element => element.props?.role === "status"), null);
  assert.equal(findElement(tree, element => element.type === "button").props["aria-busy"], false);
});
