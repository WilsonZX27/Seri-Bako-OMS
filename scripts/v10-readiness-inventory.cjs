// Offline inventory only. This does not connect to a browser, database, or network.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.cwd();
const out = path.resolve(process.argv[2] || 'docs/v10');
const sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (cp.execFileSync('git', ['status', '--porcelain', '--', 'src'], { encoding: 'utf8' }).trim()) throw new Error('Commit or isolate source changes before creating an immutable source inventory.');
const hash = source => crypto.createHash('sha256').update(source).digest('hex');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
const modules = new Map();
function loadPure(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  const source = fs.readFileSync(file, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, { exports, require(name) {
    if (!name.startsWith('@/lib/')) throw Error(`Inventory pure-module import is not allowlisted: ${name}`);
    return loadPure(path.join('src', name.slice(2) + '.ts'));
  }});
  return exports;
}
const roles = Array.from(loadPure('src/lib/roles.ts').SYSTEM_ROLE_CODES);
const policy = loadPure('src/server/auth/route-permissions.ts');
const csv = rows => rows.map(row => row.map(value => '"' + String(value ?? '').replaceAll('"', '""') + '"').join(',')).join('\n') + '\n';
const allFiles = walk('src').filter(file => /\.tsx?$/.test(file));
const edges = [['source', 'import', 'resolved_source']];
const routes = [];
for (const file of allFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = ast.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);
  const owners = [];
  for (const name of imports) {
    const base = name.startsWith('@/') ? path.join('src', name.slice(2)) : name.startsWith('.') ? path.join(path.dirname(file), name) : null;
    const resolved = base && [base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')].find(candidate => fs.existsSync(candidate));
    if (resolved) { edges.push([file, name, resolved]); owners.push(resolved); }
  }
  if (!/^src\/app\/.+\/(?:page\.tsx|route\.ts)$/.test(file) && file !== 'src/app/page.tsx') continue;
  const kind = file.endsWith('/page.tsx') ? 'page' : 'handler';
  const route = '/' + path.dirname(file).slice('src/app/'.length).split('/').filter(segment => !/^\(.+\)$/.test(segment)).join('/');
  const guards = [];
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && /^require(?:Permission|AnyPermission|Role|ActiveTenantActor|Auth)/.test(node.expression.text)) guards.push(node.getText(ast).replace(/\s+/g, ' '));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const shellRoles = kind === 'page' ? policy.getRouteAllowedRoles(route) : null;
  const permissions = kind === 'page' ? policy.getRoutePermissionCodes(route) : null;
  routes.push({ route, kind, source: file, source_sha256: hash(source), snapshot_sha: sha, family: route.split('/').filter(Boolean)[0] || 'root', guards, shellRoles: shellRoles ? Array.from(shellRoles) : null, permissions: permissions ? Array.from(permissions) : null, owners });
}
routes.sort((a, b) => a.kind.localeCompare(b.kind) || a.route.localeCompare(b.route));
fs.mkdirSync(out, { recursive: true });
const header = ['route','kind','snapshot_sha','source','source_sha256','family_owner','direct_guards','shell_role_policy','shell_permission_policy','related_source_owners','source_review','rendered_evidence','fixture_evidence','priority','reproduction','status'];
fs.writeFileSync(path.join(out, 'route-ledger.csv'), csv([header, ...routes.map(row => [row.route,row.kind,sha,row.source,row.source_sha256,row.family,row.guards.join('; '),row.shellRoles?.join('|') || 'runtime_or_layout_resolution_required',row.permissions?.join('|') || 'runtime_or_layout_resolution_required',row.owners.join('|'),'enumerated_not_reviewed','','','untriaged',row.kind === 'page' ? `Open ${row.route}; use isolated representative fixture for dynamic IDs` : `Review ${row.route} authorization/input/cache contracts with isolated fixture`,'pending'])]));
const pageRows = routes.filter(row => row.kind === 'page');
const roleRows = [['route','role','eligibility_basis','effective_permission_evidence','viewports','states','source','visual_status']];
for (const row of pageRows) for (const role of roles) {
  const publicFlow = row.source.includes('/(auth)/') || row.route === '/';
  const basis = publicFlow ? 'auth_or_public_flow_review_required' : row.shellRoles ? row.shellRoles.includes(role) ? 'shell_role_included_runtime_grants_required' : 'shell_role_excluded_expected_denial' : 'runtime_role_resolution_required';
  roleRows.push([row.route,role,basis,'not_live_verified','390x844|820x1180|1440x900','see coverage-plan.json',row.source,'not_run']);
}
fs.writeFileSync(path.join(out, 'role-route-ledger.csv'), csv(roleRows));
fs.writeFileSync(path.join(out, 'source-dependency-edges.csv'), csv(edges));
const plan = {
  baseline_sha: sha, page_count: pageRows.length, handler_count: routes.length-pageRows.length, roles,
  primary_viewports: [{width:390,height:844},{width:820,height:1180},{width:1440,height:900}],
  boundary_widths: [389,390,391,639,640,767,768,1023,1024,1279,1280,1535,1536], landscape: {width:820,height:390},
  states: ['loaded','loading','empty','error','session_expired','permission_denied','validation','save_outcome_uncertain','saved_read_after_write','long_content'],
  core_planned_cells: pageRows.length*roles.length*3*10,
  interpretation: 'Normalized Cartesian plan, not execution evidence. Resolve state applicability per workflow. Excluded roles test denied behavior. Source role lists do not establish effective grants. Only evidence-ledger rows with exact route, role fixture/live identity basis, viewport, state, source SHA, reproduction, observed result and artifact establish coverage.',
  counts: { enumerated_pages: pageRows.length, current_snapshot_page_source_reviewed: 0, rendered_cells:0, live_role_cells:0 },
};
fs.writeFileSync(path.join(out, 'coverage-plan.json'), JSON.stringify(plan,null,2)+'\n');
const evidenceFile=path.join(out, 'evidence-ledger.csv');
if (!fs.existsSync(evidenceFile)) fs.writeFileSync(evidenceFile,csv([['id','route','role','identity_basis','viewport','state','source_sha','owner','priority','requirement','reproduction','observed_result','evidence_kind','artifact','status']]));
console.log(JSON.stringify({sha,pages:pageRows.length,handlers:routes.length-pageRows.length,roles,sourceModules:allFiles.length,localImportEdges:edges.length-1,plannedCoreCells:plan.core_planned_cells,output:out}));
