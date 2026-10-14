// Explicitly opted-in local browser tests only. No request credentials or payloads are recorded.
const fs = require('node:fs');
const control = process.env.INTEGRATION_READ_FAULT_FILE;
if (control) {
  const original = globalThis.fetch;
  globalThis.fetch = async function(input, init) {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
    const method = String(init?.method || input?.method || 'GET').toUpperCase();
    let paths = [];
    try { paths = JSON.parse(fs.readFileSync(control, 'utf8')); } catch {}
    if (url.hostname === '127.0.0.1' && url.port === '58321' && (['GET', 'HEAD'].includes(method) || (method === 'POST' && ['/rest/v1/rpc/get_items_workspace', '/rest/v1/rpc/get_ap_aging_report'].includes(url.pathname))) && paths.includes(url.pathname)) {
      return new Response(JSON.stringify({code:'QA_READ_FAILURE',message:'Synthetic read unavailable'}), {status:503,headers:{'content-type':'application/json'}});
    }
    return original.call(this, input, init);
  };
}
