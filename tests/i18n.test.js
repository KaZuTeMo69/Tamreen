/* Batch 12: English (left-to-right) by default, Arabic from Settings; Orbitron; the name on the title line. */
const {open,check}=require("./lib.js");
const AR=/[؀-ۿ]/;

module.exports=async()=>{
  const p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  const ev=(f,a)=>p.evaluate(f,a);
  const app=()=>p.textContent("#app");
  /* Arabic left on a screen, ignoring the "عربي" language chip */
  const arabicLeft=async()=>(await app()).replace("عربي","").match(AR);

  // default language
  check("default: English, left-to-right", await ev(()=>[document.documentElement.lang,document.documentElement.dir,document.title].join())==="en,ltr,Tamreen");
  check("tab bar and timer in English", await ev(()=>[...document.querySelectorAll("nav span")].map(s=>s.textContent).join()+"|"+
    document.querySelector("#timer .small").textContent)==="Plan,Progress,Log,Settings|Rest");
  check("plan: title, day and its English description",
    (await app()).includes("Next up")&&(await p.textContent(".hero-title"))==="Workout A"&&(await p.textContent(".hero-tag"))==="Leg press + horizontal push & pull");

  // the name, top left, opens Settings
  check("no name yet: asks for one", (await p.textContent("button.me")).trim()==="Add your name");
  await p.click("button.me");
  check("tapping the name opens Settings", await ev(()=>tab)==="set" && (await app()).includes("Language"));
  await p.fill("input.field.txt","Abdo"); await p.press("input.field.txt","Tab");
  check("the name is shown in bold", (await p.textContent("button.me"))==="Abdo" && await ev(()=>+getComputedStyle(document.querySelector(".me")).fontWeight)>=800);
  /* the name is on the title's line, at its end: right in English, left in Arabic */
  const namePos=()=>ev(()=>{ const n=document.querySelector("button.me").getBoundingClientRect(),h=document.querySelector(".hrow h1").getBoundingClientRect();
    return {sameLine:n.top<h.bottom&&n.bottom>h.top,left:Math.round(n.left),right:Math.round(innerWidth-n.right)}; });
  const en=await namePos();
  check("the name is on the title's line, at the right", en.sameLine&&en.right<30, en);

  // Orbitron for titles, buttons and the name; DM Sans for text
  await ev(()=>document.fonts.ready);
  const fam=sel=>ev(s=>getComputedStyle(document.querySelector(s)).fontFamily,sel);
  check("Orbitron: name, title, section labels", /Orbitron/.test(await fam(".me"))&&/Orbitron/.test(await fam("h1"))&&/Orbitron/.test(await fam(".label")));
  check("DM Sans for body text", /^"?DM Sans/.test(await fam("body")));
  check("Orbitron file loads", await ev(()=>document.fonts.check("900 20px Orbitron")) && await ev(()=>[...document.fonts].some(f=>f.family.replace(/"/g,"")==="Orbitron"&&f.status==="loaded")));

  // every screen in English
  const R=(w,r)=>({w:String(w),r:String(r),r2:"",warm:false});
  await ev(rows=>{ rows.forEach(([date,w,r])=>D.sessions.push({date,workout:"A",entries:{a1:[{w:String(w),r:String(r),r2:"",warm:false}]},
    units:{a1:"kg"},names:{},counts:{},sides:{},rir:{a1:2},mins:50})); save(); },[["2026-09-09",110,9],["2026-09-16",115,9],["2026-09-23",120,8]]);
  for(const t of ["plan","prog","log","set","program"]){
    await ev(t=>go(t),t);
    const hit=await arabicLeft(); check(`${t}: no Arabic left`, !hit, hit&&(await app()).slice(Math.max(0,hit.index-40),hit.index+40));
  }
  await ev(()=>go("log"));
  check("log: English calendar (Saturday first, arrows)", await ev(()=>[...document.querySelectorAll(".dow")].map(d=>d.textContent).join())==="Sa,Su,Mo,Tu,We,Th,Fr"
    && await ev(()=>document.querySelector(".cal-head .chip").textContent)==="‹" && (await app()).includes("September 2026"));
  check("log: minutes and totals", (await app()).includes("50 min")&&(await app()).includes("kg total"));

  // time runs left → right in the charts
  await ev(()=>go("prog"));
  const xs=await ev(()=>[...document.querySelectorAll("#ch-ex .dot")].map(c=>+c.getAttribute("cx")));
  check("line chart: oldest on the left, newest on the right", xs.length>=4&&xs.every((x,i)=>!i||x>xs[i-1]), xs);
  const bars=await ev(()=>[...document.querySelectorAll("#ch-week .hit")].map(r=>+r.getAttribute("x")));
  check("columns: this week on the right", bars.length===12&&bars[11]>bars[0], bars);
  await p.focus("#ch-ex .hit"); await p.keyboard.press("ArrowLeft");
  const tip=await p.textContent("#ch-ex .ctip");
  check("chart keys: left arrow goes back in time", tip.includes("16 Sept"), tip);

  // a workout in English
  await ev(()=>go("plan")); await p.click("text=Start workout");
  { const hit=await arabicLeft(); check("workout: no Arabic left", !hit, hit&&(await app()).slice(Math.max(0,hit.index-40),hit.index+40)); }
  check("workout: English suggestion", /RIR 2 — try 125 kg/.test(await app()), (await p.textContent(".tip")));
  const inp=await p.$$("#sets-a1 input"); await inp[0].fill("125"); await inp[1].fill("8");
  check("workout: position, progress and finish button", (await p.textContent("#pos"))==="1 / 6" && (await p.$$(".seg.on")).length===1 && (await p.textContent("#fin"))==="Finish");
  await ev(()=>{ draft.at=draft.ids.length; render(); });
  check("wrap-up: count in English", (await p.textContent("#cnt"))==="1 / 6 exercises logged");
  await ev(()=>swap("a2"));
  check("sheets: English title and buttons", (await p.textContent("#mtext"))==="Rename the exercise"&&(await p.textContent("#mno"))==="Cancel"&&(await p.textContent("#myes"))==="Save");
  await p.click("#mno");
  await p.click("#fin");
  check("new record sheet in English", (await p.textContent("#mtext")).includes("New record")&&(await p.textContent("#mbody")).includes("Heaviest: 125 kg × 8"),
    await p.textContent("#mbody"));
  await p.click("#myes");

  // switch to Arabic in Settings: direction, text, kept after a reload, data untouched
  const before=await ev(()=>JSON.stringify(D));
  await ev(()=>go("set")); await p.click("button.chip:has-text('عربي')");
  check("Arabic: right-to-left", await ev(()=>[document.documentElement.lang,document.documentElement.dir].join())==="ar,rtl");
  check("Arabic: screen and tab bar in Arabic", (await app()).includes("الإعدادات")&&await ev(()=>document.querySelector("nav span").textContent)==="الخطة");
  const ar=await namePos();
  check("Arabic: the name is on the title's line, at the left", ar.sameLine&&ar.left<30, ar);
  await p.reload();
  check("the choice survives a reload", await ev(()=>document.documentElement.dir)==="rtl"&&(await app()).includes("اللي جاي"));
  check("switching language leaves the data alone", await ev(()=>JSON.stringify(D))===before);
  await ev(()=>go("prog"));
  const xa=await ev(()=>[...document.querySelectorAll("#ch-ex .dot")].map(c=>+c.getAttribute("cx")));
  check("Arabic chart: newest on the left", xa.every((x,i)=>!i||x<xa[i-1]), xa);
  await ev(()=>go("set")); await p.click("button.chip:has-text('English')");
  check("back to English", await ev(()=>document.documentElement.dir)==="ltr"&&(await app()).includes("Settings"));

  // an edited description is shown as written, in both languages
  await ev(()=>{ go("program"); editTag("B"); }); await p.fill("#minput","Back day"); await p.click("#myes");
  check("edited description kept as written", (await app()).includes("Back day")&&await ev(()=>PROGRAM.B.tag)==="Back day");
  check("other days keep the English default", (await app()).includes("Dips first + horizontal press"));

  // wiping the data keeps the language (it belongs to the phone, not the data)
  await ev(()=>{ go("log"); wipe(); }); await p.click("#myes");
  check("wipe keeps English", await ev(()=>document.documentElement.lang)==="en"&&(await app()).includes("No workouts yet."));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  // a fresh phone with no choice saved opens in English; the Arabic suites pin Arabic
  const q=await open({lang:"en"});
  check("fresh install: English", await q.evaluate(()=>LANG)==="en"&&(await q.textContent("#app")).includes("Start workout"));
  await q.done();
  const r=await open();
  check("test default (older suites): Arabic", await r.evaluate(()=>LANG)==="ar");
  await r.done();
};
