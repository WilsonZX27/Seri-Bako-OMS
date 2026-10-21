const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { permittedRolesFor, roleCodes } = require("../tests/e2e/v9-route-matrix.cjs");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/lib/information-architecture.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleExports = {};
new Function("exports", "require", compiled)(moduleExports, require);

const aliases = Object.fromEntries(Object.entries(roleCodes).map(([alias, code]) => [code, alias]));
const missingMatrixRoles = [...new Set(moduleExports.informationArchitecture.flatMap((item) => item.roles))]
  .filter((code) => !aliases[code]);
const differences = [];
for (const item of moduleExports.informationArchitecture) {
  const current = item.roles.map((code) => aliases[code]).filter(Boolean).sort();
  const matrix = [...permittedRolesFor(item.href)].sort();
  if (JSON.stringify(current) !== JSON.stringify(matrix)) {
    differences.push({ route: item.href, current, matrix });
  }
}

console.log(JSON.stringify({ missingMatrixRoles, differences }, null, 2));
if (missingMatrixRoles.length || differences.length) process.exitCode = 1;
