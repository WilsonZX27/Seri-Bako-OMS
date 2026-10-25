const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs');
const form=fs.readFileSync('src/components/asset-transfer-batch-form.tsx','utf8'),pr=fs.readFileSync('src/components/procurement-forms.tsx','utf8');
test('asset columns have one shared title row and each asset keeps a separately named quantity input',()=>{
 assert.equal((form.match(/data-transfer-line-header/g)||[]).length,1);
 assert.match(form,/<RequestLineHeader[^>]*className={assetLineColumns}>[\s\S]*?<span>Asset<\/span><span>Available<\/span><span>Quantity<\/span><span>Remove<\/span>/);
 assert.match(form,/<RequestLineRow[^>]*className={assetLineColumns}/);
 assert.match(form,/<Field label="Quantity" labelClassName="sr-only" required>/);
 assert.match(form,/name={`quantity_\$\{id\}`}/);assert.match(form,/aria-label={`Quantity for \$\{choice\?\.item_name/);
});
test('PR and asset requests use the same header and row owners without hiding the asset header on phones',()=>{
 assert.match(pr,/<RequestLineHeader\s+data-purchase-request-line-header/);assert.match(pr,/<RequestLineRow data-purchase-request-line/);
 const assetHeader=form.slice(form.indexOf('<RequestLineHeader'),form.indexOf('</RequestLineHeader>'));
 assert.doesNotMatch(assetHeader,/hidden|overflow-x/);
});
