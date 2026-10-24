const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('docs/v10/proposals/asset-transfer-batch-review-only.sql','utf8');
test('review-only batch proposal rejects null/nonarrays and keeps scoped atomic downstream operations',()=>{
 assert.match(sql,/rollback; -- review wrapper/);assert.match(sql,/jsonb_typeof\(p_lines\) is distinct from 'array'/);
 assert.match(sql,/line_count<1 or line_count>100/);assert.match(sql,/count\(distinct \(value->>'asset_id'\)::uuid\)/);
 assert.match(sql,/company_id = public.current_staff_company_id\(\)/);
 assert.match(sql,/asset_location_access\(from_location_id\) or public.asset_location_access\(to_location_id\)/);
 assert.match(sql,/unique \(company_id, client_key\)/);
 const request=sql.slice(sql.indexOf('create function public.request_asset_transfer_batch'),sql.indexOf('create function public.advance_asset_transfer_batch'));
 assert.ok(request.indexOf('pg_advisory_xact_lock')<request.indexOf('return batch.id'));
 assert.ok(request.indexOf('return batch.id')<request.indexOf('insert into public.asset_transfer_batches'));
 assert.match(request,/order by \(value->>'asset_id'\)::uuid/);assert.match(request,/public.request_asset_transfer\(asset_id,p_from,destination,amount/);
 const advance=sql.slice(sql.indexOf('create function public.advance_asset_transfer_batch'));
 assert.ok(advance.indexOf('public.advance_asset_transfer(line.id,p_action,p_note)')<advance.indexOf('update public.asset_transfer_batches set status'));
 assert.match(sql,/security_invoker=true/);assert.match(sql,/where t.batch_id is null/);
});

test('batch register retains wide total quantity instead of overflowing a single-line integer',()=>{assert.match(sql,/sum\(t.quantity\)::bigint as quantity/);assert.doesNotMatch(sql,/sum\(t.quantity\)::integer/);});
