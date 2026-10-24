const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const sql=fs.readFileSync('docs/v10/proposals/asset-numbering-review-only.sql','utf8');
test('review-only numbering proposal allocates after idempotent retry and retains asset transaction audit',()=>{
 assert.match(sql,/rollback; -- dry-run review wrapper/);
 const create=sql.slice(sql.indexOf('create or replace function public.create_asset_master'));
 assert.ok(create.indexOf('pg_advisory_xact_lock')<create.indexOf('return existing.asset_id'));
 assert.ok(create.indexOf('return existing.asset_id')<create.indexOf("public.next_document_number(company,'asset')"));
 for(const text of ['assets.manage','asset_location_access(p_location)','Asset creation key reused with different details','insert into public.asset_holdings','insert into public.asset_master_updates',"'Code Mode'"])assert.ok(create.includes(text));
 assert.match(sql,/p_document_type = 'asset' and public.has_permission\('assets.manage'\)/);
 assert.match(sql,/public.assets where company_id = p_company_id and lower\(asset_code\) = lower\(v_candidate\)/);
 assert.match(sql,/Configured asset numbering produces an invalid asset ID/);
 assert.doesNotMatch(sql,/grant execute|insert into public.document_sequences/);
});
