/* Batch 6: works offline (service worker), installable (manifest + icons), install button. */
const {open,check,state}=require("./lib.js");

/* every local file index.html links to — the same rule sw.js uses */
const linked=html=>[...new Set([...html.matchAll(/(?:href|src)="(?![a-z]+:|#|\/\/)([^"]+)"/gi)].map(m=>m[1]))];
const cached=p=>p.evaluate(async()=>{ const c=await caches.open("tamreen"); return (await c.keys()).map(r=>r.url); });
async function until(fn,ms=8000){ const end=Date.now()+ms; let v; while(Date.now()<end){ v=await fn(); if(v) return v; await new Promise(r=>setTimeout(r,100)); } return v; }

module.exports=async()=>{
  const p=await open({serviceWorkers:"allow"});
  const ev=(f,a)=>p.evaluate(f,a);
  const base=await ev(()=>location.origin+"/");
  const html=await ev(()=>fetch("index.html").then(r=>r.text()));
  const files=linked(html).map(f=>base+f);
  const scripts=await ev(()=>document.scripts.length);
  check("index links css, every script, manifest, 2 icons, the font", files.length===scripts+5 && files.some(f=>f.endsWith("manifest.webmanifest")) && files.some(f=>f.endsWith(".woff2")), files);

  await ev(()=>navigator.serviceWorker.ready);
  const all=await until(async()=>{ const c=await cached(p); return files.every(f=>c.includes(f))&&c.includes(base+"index.html")&&c; });
  check("service worker saved the page and every linked file", !!all, await cached(p));

  // log a workout online, then open the app with no network at all
  await p.reload(); await until(()=>ev(()=>!!navigator.serviceWorker.controller));
  await p.click("text=ابدأ الحصة");
  const inp=await p.$$("#sets-a1 input"); await inp[0].fill("100"); await inp[1].fill("8");
  await p.click("#fin");
  await p.context().setOffline(true);
  await p.reload();
  check("offline: app opens", (await p.textContent("#app")).includes("اللي جاي"));
  check("offline: data is there", await ev(()=>D.sessions.length)===4);
  await p.click("nav button[data-tab=log]");
  check("offline: other tabs work", (await p.textContent("#app")).includes("4 حصة"));
  check("offline: no script errors", p.errs.length===0, p.errs);
  await p.context().setOffline(false);

  // a new release (?v= bumped) replaces the old files in the saved copy
  state.rewrite=(file,data)=>file==="index.html"?Buffer.from(data.toString().replace(/\?v=\d+/g,"?v=999")):data;
  try{
    await p.reload();
    const pruned=await until(async()=>{ const c=await cached(p); return c.some(u=>u.includes("?v=999"))&&!c.some(u=>/\?v=(?!999)\d+/.test(u))&&c; });
    check("new release: new files saved, old ones removed", !!pruned, await cached(p));
    check("new release: page uses the new files", await ev(()=>[...document.scripts].every(s=>s.src.includes("?v=999"))), await ev(()=>[...document.scripts].map(s=>s.src.split("/").pop())));
  }finally{ state.rewrite=null; }

  // weak signal (last: it leaves a slow request running): the page answer takes 8 s → saved copy after ~3 s
  state.delay=file=>file==="index.html"?8000:0;
  try{
    const t0=Date.now(); await p.reload({waitUntil:"domcontentloaded"}); const took=Date.now()-t0;
    check("slow network: saved copy after ~3 s", took>=2500&&took<6000&&(await p.textContent("#app")).includes("اللي جاي"), took);
  }finally{ state.delay=null; }
  await p.done();

  // manifest + icons
  const q=await open();
  const m=await q.evaluate(()=>fetch("manifest.webmanifest").then(r=>r.json()));
  check("manifest: name, standalone, start_url, rtl", m.name==="تمرين"&&m.display==="standalone"&&m.start_url==="./"&&m.dir==="rtl");
  const sizes=await q.evaluate(async icons=>Promise.all(icons.map(i=>new Promise(ok=>{
    const img=new Image(); img.onload=()=>ok(`${img.naturalWidth}x${img.naturalHeight}`===i.sizes); img.onerror=()=>ok(false); img.src=i.src; }))),m.icons);
  check("manifest icons load at their declared sizes", sizes.every(Boolean)&&sizes.length===3, sizes);
  check("maskable icon declared", m.icons.some(i=>i.purpose==="maskable"));
  check("iPhone icon is a 180px PNG", await q.evaluate(()=>new Promise(ok=>{ const img=new Image();
    img.onload=()=>ok(img.naturalWidth===180); img.onerror=()=>ok(false); img.src=document.querySelector("link[rel=apple-touch-icon]").href; })));

  // install button: hint by default, a button when the browser offers the install prompt
  await q.click("nav button[data-tab=set]");
  check("settings: install hint without a prompt", (await q.textContent("#app")).includes("Add to Home Screen"));
  await q.evaluate(()=>{ const e=new Event("beforeinstallprompt",{cancelable:true}); window.__asked=0;
    e.prompt=()=>{ window.__asked++; }; e.userChoice=Promise.resolve({outcome:"accepted"}); dispatchEvent(e); });
  check("settings: install button once the browser offers it", !!(await q.$("button:has-text('ثبّت التطبيق')")));
  await q.click("button:has-text('ثبّت التطبيق')");
  check("install button opens the browser prompt", await q.evaluate(()=>window.__asked)===1);
  await q.waitForFunction(()=>!document.querySelector("#app button.lime"));
  check("button gone after installing", !(await q.$("button:has-text('ثبّت التطبيق')")));
  check("no page errors", q.errs.length===0, q.errs);
  await q.done();
};
