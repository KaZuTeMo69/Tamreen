/* Batch 10: dark mode — follows the phone, can be forced light/dark, every colour comes from a token,
   and text keeps its contrast in both themes. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path");

/* WCAG contrast of two computed CSS colours ("rgb(r, g, b)") */
function contrast(a,b){
  const lum=c=>{ const [r,g,bl]=c.match(/\d+(\.\d+)?/g).slice(0,3).map(Number).map(v=>{ v/=255; return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4; });
    return 0.2126*r+0.7152*g+0.0722*bl; };
  const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05);
}
/* the colour pairs the app relies on, read from the live page */
const pairsOf=p=>p.evaluate(()=>{
  const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const probe=c=>{ const d=document.createElement("div"); d.style.color=c; document.body.appendChild(d); const v=getComputedStyle(d).color; d.remove(); return v; };
  const t=["--bg","--card","--ink","--muted","--lime","--on-lime","--violet","--on-violet","--hi","--on-ink","--field"].reduce((o,n)=>(o[n]=probe(css(n)),o),{});
  return {t,body:getComputedStyle(document.body).backgroundColor,meta:[...document.querySelectorAll('meta[name="theme-color"]')].map(m=>m.content)};
});
const TEXT=[["--ink","--card"],["--ink","--bg"],["--muted","--card"],["--muted","--bg"],["--muted","--field"],
  ["--on-lime","--lime"],["--on-violet","--violet"],["--hi","--card"],["--on-ink","--ink"]];
const MARKS=[["--ink","--card"],["--hi","--card"],["--muted","--card"]];

module.exports=async()=>{
  // every colour below the token blocks is a token
  const css=fs.readFileSync(path.join(__dirname,"..","css","app.css"),"utf8");
  const body=css.slice(css.indexOf("\n",css.indexOf('color-scheme:dark}',css.indexOf(':root[data-theme="dark"]')))+1);
  check("no hard-coded colours outside the token blocks", !/#[0-9a-f]{3,6}\b|rgba?\(/i.test(body), body.match(/#[0-9a-f]{3,6}\b|rgba?\([^)]*\)/gi));

  for(const scheme of ["light","dark"]){
    const p=await open({colorScheme:scheme});
    const {t,body:bg,meta}=await pairsOf(p);
    const low=TEXT.filter(([a,b])=>contrast(t[a],t[b])<4.5).map(([a,b])=>`${a} on ${b}: ${contrast(t[a],t[b]).toFixed(2)}`);
    check(`${scheme} (following the phone): text pairs ≥ 4.5:1`, low.length===0, low);
    const lowM=MARKS.filter(([a,b])=>contrast(t[a],t[b])<3).map(([a,b])=>`${a} on ${b}`);
    check(`${scheme}: chart marks ≥ 3:1 on the card`, lowM.length===0, lowM);
    check(`${scheme}: page background and browser bar match the theme`,
      bg===t["--bg"] && (scheme==="dark"?contrast(bg,"rgb(0, 0, 0)")<1.5:contrast(bg,"rgb(255, 255, 255)")<1.3) && meta.every(m=>m===meta[0]), {bg,meta});
    await p.done();
  }

  // forcing a theme against the phone, and it sticks after a reload
  const p=await open({colorScheme:"dark"});
  await p.evaluate(()=>go("set"));
  await p.click("text=فاتح");
  const light=await pairsOf(p);
  check("forced light on a dark phone", await p.evaluate(()=>document.documentElement.dataset.theme==="light"&&D.theme==="light") &&
    contrast(light.body,"rgb(255, 255, 255)")<1.3);
  await p.reload();
  check("forced theme survives a reload", await p.evaluate(()=>document.documentElement.dataset.theme)==="light");
  await p.click("nav button[data-tab=set]"); await p.click("text=زي الموبايل");
  check("back to following the phone", await p.evaluate(()=>!("theme" in document.documentElement.dataset)) &&
    contrast((await pairsOf(p)).body,"rgb(0, 0, 0)")<1.5);
  // charts pick up the dark tokens without a redraw
  await p.evaluate(()=>go("prog"));
  const dot=await p.evaluate(()=>getComputedStyle(document.querySelector("#ch-ex .ln")).stroke);   // the line wears --ink
  check("chart marks use the dark ink", contrast(dot,"rgb(255, 255, 255)")<1.2, dot);
  // backups carry the theme; nonsense is ignored
  await p.evaluate(()=>{ const d=cleanBackup({sessions:[],theme:"dark"}),e=cleanBackup({sessions:[],theme:"neon"});
    window.__t=[d.theme,e.theme]; });
  check("backup: theme restored, bad value ignored", JSON.stringify(await p.evaluate(()=>window.__t))==='["dark","auto"]');
  await p.click("nav button[data-tab=set]"); await p.click("text=غامق");
  check("forced dark on a dark phone keeps dark", await p.evaluate(()=>document.documentElement.dataset.theme)==="dark");
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();
};
