/* Runs every tests/*.test.js against the app in headless Chromium.
   Usage: npm test            (all suites)
          npm test -- backup  (only suites whose file name contains "backup") */
const http=require("http"),fs=require("fs"),path=require("path");
const {chromium}=require("playwright");
const {state}=require("./lib.js");

const ROOT=path.join(__dirname,"..");
const TYPES={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",
  ".webmanifest":"application/manifest+json",".png":"image/png",".svg":"image/svg+xml"};

/* a tiny static server for the repo, like GitHub Pages */
function serve(){
  const server=http.createServer((req,res)=>{
    let file=path.join(ROOT,decodeURIComponent(new URL(req.url,"http://x").pathname));
    if(!file.startsWith(ROOT)){ res.writeHead(403); return res.end(); }
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory()) file=path.join(file,"index.html");
    fs.readFile(file,(err,data)=>{
      if(err){ res.writeHead(404); return res.end("not found"); }
      res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream","Cache-Control":"no-cache"});
      res.end(data);
    });
  });
  return new Promise(ok=>server.listen(0,"127.0.0.1",()=>ok(server)));
}

(async()=>{
  const only=process.argv[2]||"";
  const suites=fs.readdirSync(__dirname).filter(f=>f.endsWith(".test.js")&&f.includes(only)).sort();
  const server=await serve();
  state.base=`http://127.0.0.1:${server.address().port}`;
  state.browser=await chromium.launch();
  for(const f of suites){
    console.log(`\n${f}`);
    try{ await require(path.join(__dirname,f))(); }
    catch(e){ state.failed++; console.log("  FAIL crashed: "+(e.stack||e)); }
  }
  await state.browser.close(); server.close();
  console.log(`\n${state.passed} passed, ${state.failed} failed`);
  process.exitCode=state.failed?1:0;
})();
