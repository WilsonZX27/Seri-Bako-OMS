const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs'); const assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 const source=fs.readFileSync(process.argv[2]+'/supabase/migrations/363_daily_product_tracking.sql','utf8');
 const start=source.indexOf("   if tracking <> 'food_daily' then");
 const end=source.indexOf('\n   end if;',start)+11;
 const normalization=source.slice(start,end);
 await db.exec(`create function normalize_legacy(tracking text, x jsonb, consumed numeric, p_target_status text) returns jsonb language plpgsql as $$ begin ${normalization} return x; end $$;`);
 const get=async(tracking,payload,usage,status='draft')=>(await db.query('select normalize_legacy($1,$2::jsonb,$3,$4) as result',[tracking,JSON.stringify(payload),usage,status])).rows[0].result;
 const payload={wastage_qty:2,wastage_reason:'damaged',wastage_provided:true,notes:'Keep this note',usage_qty:5,saleable_next_day_qty:3};
 const carry=await get('food_carryover',payload,5);assert.equal(carry.wastage_qty,0);assert.equal(carry.wastage_reason,null);assert.equal(carry.usage_qty,5);assert.equal(carry.saleable_next_day_qty,3);assert.equal(carry.notes,'Keep this note');
 assert.equal((await get('food_daily',payload,null)).wastage_qty,2);
 await assert.rejects(()=>get('food_carryover',payload,null,'evening_completed'),/Usage or Qty Sold/);
 await assert.rejects(()=>get('packaging',payload,5,'evening_completed'),/Physical balance/);
 console.log('8 isolated PostgreSQL assertions: carryover wastage reset reproduced; usage, tomorrow, notes preserved; existing completion guards confirmed.');
 await db.close();
})().catch(e=>{console.error(e);process.exit(1)});
