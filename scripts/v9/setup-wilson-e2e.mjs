import fs from 'node:fs';import {randomUUID,randomBytes} from 'node:crypto';import {createClient} from '@supabase/supabase-js';
process.loadEnvFile('.env.test.local');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;if(url!=='http://127.0.0.1:57321')throw Error('Fixture restricted to explicit isolated loopback target');
const out='outputs/wilson-qa/full-stack';fs.mkdirSync(out,{recursive:true});
if(fs.existsSync(out+'/fixture-private.json'))throw Error('Fixture already exists; reuse recorded synthetic IDs instead of reseeding');
const db=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
async function must(p){const r=await p;if(r.error)throw Error(r.error.message);return r.data;}
const company=randomUUID(),branch=randomUUID(),otherBranch=randomUUID(),location=randomUUID(),otherLocation=randomUUID(),asset=randomUUID();
const source=(await must(db.from('companies').select('id').eq('company_code','SERI-BAKO').single())).id;
await must(db.from('companies').insert({id:company,company_code:'UAT-WILSON-1014',company_name:'Synthetic Release Review',status:'active'}));
await must(db.from('branches').insert([{id:branch,company_id:company,branch_code:'TEST-A',branch_name:'Synthetic outlet A',branch_type:'outlet',status:'active'},{id:otherBranch,company_id:company,branch_code:'TEST-B',branch_name:'Synthetic outlet B',branch_type:'outlet',status:'active'}]));
const sourceRoles=await must(db.from('roles').select('id,role_code,role_name').eq('company_id',source).is('deleted_at',null));const roles=new Map();
for(const row of sourceRoles){const roleId=randomUUID();await must(db.from('roles').insert({id:roleId,company_id:company,role_code:row.role_code,role_name:row.role_name,status:'active'}));roles.set(row.role_code,roleId);const grants=await must(db.from('role_permissions').select('permission_id').eq('role_id',row.id));if(grants.length)await must(db.from('role_permissions').insert(grants.map(g=>({role_id:roleId,permission_id:g.permission_id}))));}
const accounts=[];
for(const [slug,role,loc] of [['owner','super_admin',branch],['manager','manager',branch],['supervisor','outlet_supervisor',branch],['staff','outlet_staff',branch],['kitchen','kitchen',branch],['finance','finance',branch],['purchasing','purchasing',branch],['people','people_operations',branch],['other-staff','outlet_staff',branch],['other-manager','manager',otherBranch]]){
 if(!roles.has(role))continue;const email=`wilson-${slug}-1014@example.test`,password=`Local-${randomBytes(20).toString('base64url')}!9`,staff=randomUUID();const auth=await must(db.auth.admin.createUser({email,password,email_confirm:true}));
 await must(db.from('staffs').insert({id:staff,company_id:company,auth_user_id:auth.user.id,staff_code:`UAT-${slug}`,full_name:`Synthetic ${slug}`,email,default_branch_id:loc,status:'active',invitation_status:'completed',must_change_password:false}));
 await must(db.from('staff_roles').insert({staff_id:staff,role_id:roles.get(role),branch_id:loc,is_primary:true}));await must(db.from('staff_branches').insert({staff_id:staff,branch_id:loc,access_level:role==='super_admin'?'full':'manage',is_default:true}));accounts.push({slug,role,email,password,staff,branch:loc});
}
await must(db.from('asset_import_batches').insert({company_id:company,source_sha256:'synthetic-general-maintenance-1013',reconciliation:{synthetic:true},state:'live'}));
await must(db.from('asset_locations').insert([{id:location,company_id:company,source_name:'Synthetic outlet A',branch_id:branch,kind:'branch'},{id:otherLocation,company_id:company,source_name:'Synthetic outlet B',branch_id:otherBranch,kind:'branch'}]));
await must(db.from('assets').insert({id:asset,company_id:company,asset_code:'TEST-LAMP',item_name:'Synthetic ceiling lamp'}));await must(db.from('asset_holdings').insert({company_id:company,asset_id:asset,location_id:location,quantity:1}));
fs.writeFileSync(out+'/fixture-private.json',JSON.stringify({company,branch,otherBranch,location,otherLocation,asset,accounts},null,2),{mode:0o600});console.log(`Created synthetic company and ${accounts.length} local test identities; private fixture saved in ignored output.`);
