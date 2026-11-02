import type { PlanningBranch, PlanningProduct } from "./types";

export function defaultPlanningProducts(products: PlanningProduct[]): string[] {
  return products.map(p => p.id);
}

export function spreadsheetText(value: string): string {
  return /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function buildForecastTemplate(outlets: PlanningBranch[], products: PlanningProduct[]): string {
  if (outlets.length * products.length > 10000) throw new Error("Template exceeds 10,000 rows. Narrow the selected products first.");
  const cell = (value: string) => `"${spreadsheetText(value).replaceAll('"', '""')}"`;
  return '\uFEFFoutlet,product_code,weekday_qty,weekend_qty,product_name,category\r\n' + outlets.flatMap(outlet => products.map(product => [cell(outlet.branch_name),cell(product.product_code),'','',cell(product.product_name),cell(product.category)].join(','))).join('\r\n') + '\r\n';
}

export function matchForecastRows(rows: import("./forecast-csv").ForecastImportRow[], outlets: PlanningBranch[], products: PlanningProduct[]) {
  const seen = new Set<string>();
  return rows.map(row => {
    const branches=outlets.filter(b=>b.branch_name===row.outlet||spreadsheetText(b.branch_name)===row.outlet);
    const items=products.filter(p=>p.product_code===row.product_code||spreadsheetText(p.product_code)===row.product_code);
    if(branches.length!==1)throw new Error(`Unknown or ambiguous outlet: ${row.outlet}. Use this kitchen’s downloaded template. No values imported.`);
    if(items.length!==1)throw new Error(`Unknown, excluded, unavailable or ambiguous product: ${row.product_code}. Check Planning Settings and download a current template. No values imported.`);
    const key=`${branches[0].id}:${items[0].id}`;
    if(seen.has(key))throw new Error(`Duplicate outlet/product: ${row.outlet} / ${row.product_code}. No values imported.`);
    seen.add(key);
    return {...row,key};
  });
}
