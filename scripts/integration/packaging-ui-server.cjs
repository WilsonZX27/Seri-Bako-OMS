// Separate test-only app instance; shares build, not browser contexts or control files.
const {createServer}=require('node:http');
const target=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
if(target.hostname!=='127.0.0.1'||target.port!=='58321')throw Error('Local synthetic Supabase required');
process.env.NEXT_DIST_DIR='.next-playwright-production';
const app=require('next')({dev:false,dir:process.cwd(),hostname:'localhost',port:3191});
app.prepare().then(()=>createServer(app.getRequestHandler()).listen(3191,'localhost',()=>console.log('Packaging UI fixture server ready on localhost3191')));
