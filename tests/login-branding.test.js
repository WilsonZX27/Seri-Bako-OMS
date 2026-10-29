const test=require('node:test'),assert=require('node:assert/strict');
const load=require('./helpers/load-source.cjs')({URL,process:{env:{}}});
const {loginBranding}=load('src/lib/branding/login-branding.ts');
test('logged-out identity uses only explicitly configured public deployment branding',()=>{
 const value=loginBranding({LOGIN_BRAND_NAME:'Example Company',LOGIN_BRAND_LOGO_URL:'https://example.test/logo.jpg'});
 assert.equal(value.company_name,'Example Company');assert.equal(value.logo_url,'https://example.test/logo.jpg');
 assert.equal(loginBranding({}).company_name,'Operations');assert.equal(loginBranding({}).logo_url,null);
});
test('login branding rejects unsafe or credential-bearing image URLs without breaking login',()=>{
 for(const url of ['javascript:alert(1)','http://example.test/logo.jpg','https://user:password@example.test/logo.jpg','https://example.test/logo.jpg?token=secret','bad'])assert.equal(loginBranding({LOGIN_BRAND_NAME:'Example',LOGIN_BRAND_LOGO_URL:url}).logo_url,null);
 assert.equal(loginBranding({LOGIN_BRAND_LOGO_URL:'https://example.test/logo.jpg'}).logo_url,null);
});
