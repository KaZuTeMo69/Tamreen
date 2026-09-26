/* Shared helpers for the browser tests. run.js sets BASE (the local server) and the browser. */
const state={browser:null,base:"",passed:0,failed:0};

/* A fresh phone-sized page with empty storage, Cairo time and Google Fonts blocked.
   opts: time (fake clock start), tz, permissions, serviceWorkers ("block" by default), path */
async function open(opts={}){
  const ctx=await state.browser.newContext({
    viewport:{width:390,height:844}, timezoneId:opts.tz||"Africa/Cairo", locale:"ar-EG",
    permissions:opts.permissions||[], serviceWorkers:opts.serviceWorkers||"block"});
  const p=await ctx.newPage(); p.errs=[];
  p.on("pageerror",e=>p.errs.push(String(e)));
  await p.route(/fonts\.(googleapis|gstatic)/,r=>r.abort());
  if(opts.time) await p.clock.install({time:new Date(opts.time)});
  await p.goto(state.base+(opts.path||"/"));
  p.done=()=>ctx.close();
  return p;
}
function check(name,cond,extra){
  console.log((cond?"  PASS ":"  FAIL ")+name+(cond||extra===undefined?"":"  → "+JSON.stringify(extra)));
  cond?state.passed++:state.failed++;
}
module.exports={state,open,check};
