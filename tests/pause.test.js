/* Batch 20: pause a workout and continue it later (paused time doesn't count), and the how-to video as a
   ▶ button on the exercise header. */
const {open,check}=require("./lib.js");

module.exports=async()=>{
  let p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  let ev=(f,a)=>p.evaluate(f,a);
  const app=()=>p.textContent("#app");
  const on=()=>ev(()=>document.getElementById("modal").classList.contains("on"));
  const seed=await ev(()=>D.sessions.length);

  /* ── pause ── */
  await p.click(".hero .btn");
  check("new workout: a pause button next to ✕", !!(await p.$("#pause")) && (await p.getAttribute("#pause","aria-label"))==="Pause");
  await p.click("#row-a1-0 .chk"); await p.click("#row-a1-1 .chk");
  await ev(()=>{ draft.at=1; render(); });
  await p.click("#row-a2-0 .chk");
  await p.clock.runFor(10*6e4);   // 10 minutes in, then pause (the rest timer is running)
  await p.click("#pause");
  check("paused: the workout screen closes, the tabs come back", await ev(()=>draft===null&&!document.body.classList.contains("in-session")) && await ev(()=>!document.getElementById("nav").classList.contains("hide")));
  check("paused: the rest timer stops", !(await ev(()=>document.body.classList.contains("timing"))));
  check("paused: kept under its own key, not as an open workout", await ev(()=>!!localStorage.getItem(PAUSED_KEY)&&!localStorage.getItem(DRAFT_KEY)));
  check("paused: nothing saved to the log yet", await ev(()=>D.sessions.length)===seed);
  let home=await app();
  check("home: the paused workout instead of the next one", home.includes("Paused workout")&&home.includes("2 / 6 exercises logged")&&home.includes("Continue workout")&&home.includes("Discard it")&&!home.includes("Start workout"), home.slice(0,300));
  check("home: how long ago and the minutes so far", home.includes("Paused just now · 10 min so far"));
  check("home: the paused card is violet", await ev(()=>getComputedStyle(document.querySelector(".hero.paused")).backgroundColor)===await ev(()=>getComputedStyle(document.querySelector("nav button.on")).backgroundColor));
  await ev(()=>startPast());
  check("no second workout while one is paused", !(await on()) && (await p.textContent("#toast")).includes("Continue or discard the paused workout first") && await ev(()=>draft===null));
  // other tabs work meanwhile
  await p.click("nav button[data-tab=log]");
  check("other tabs work while paused", (await app()).includes("Training days"));
  // a reload keeps it paused
  await p.clock.runFor(20*6e4);   // 20 minutes paused
  await p.reload();
  home=await app();
  check("after a reload it's still paused, 20 min ago", home.includes("Paused 20 min ago · 10 min so far") && await ev(()=>draft===null));

  /* ── continue ── */
  await p.click("#resume");
  check("continue: back on the same exercise, sets as they were", await ev(()=>draft&&draft.at===1&&draft.entries.a1[1].r==="10"&&draft.entries.a2[0].r!=="") && !!(await p.$("#ex-a2")));
  check("continue: the paused slot is cleared", await ev(()=>paused===null&&!localStorage.getItem(PAUSED_KEY)&&!!localStorage.getItem(DRAFT_KEY)));
  await p.clock.runFor(5*6e4);
  check("Ask Claude counts only training time", await ev(()=>sessionText(draft).includes("Duration: 15 min so far.")));
  await p.click("#fin"); if(await on()) await p.click("#myes");
  check("finish: 10 + 5 minutes, the 20-minute pause left out", await ev(()=>D.sessions.at(-1).mins)===15);
  check("saved like any workout (no pause fields)", await ev(()=>!Object.keys(D.sessions.at(-1)).some(k=>/paus|asked|^at$/.test(k))));

  /* ── discard ── */
  await ev(()=>{ D.cursor="B"; render(); });
  await p.click(".hero .btn"); await p.click("#row-b1-0 .chk"); await p.click("#pause");
  await p.click(".hero.paused .hero-link");
  check("discard asks first", await on() && (await p.textContent("#mtext"))==="Discard the paused workout?");
  await p.click("#mno");
  check("…cancel keeps it", await ev(()=>paused!==null));
  await p.click(".hero.paused .hero-link"); await p.click("#myes");
  check("discarded: gone, nothing logged, next workout back", await ev(()=>paused===null&&!localStorage.getItem(PAUSED_KEY)&&D.sessions.length)===seed+1 && (await app()).includes("Start workout"));

  /* ── old workouts and other paths ── */
  await ev(()=>openSession(0));
  check("editing an old workout: no pause button", !(await p.$("#pause")));
  await ev(()=>{ draft=null; render(); });
  await p.click(".hero .btn"); await p.click("#pause");
  await ev(()=>openSession(0));
  check("opening an old workout while one is paused leaves it paused", await ev(()=>paused!==null&&draft.edit===0));
  await p.click("#back");
  check("…closing it goes back to the Log, still paused", await ev(()=>draft===null&&tab==="log"&&paused!==null));
  await ev(()=>go("plan"));
  check("…and home still shows the paused one", (await app()).includes("Paused workout"));
  await ev(()=>{ go("log"); wipe(); }); await p.click("#myes");
  check("delete all data also drops the paused workout", await ev(()=>paused===null&&!localStorage.getItem(PAUSED_KEY)));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── a new program imported while paused: the paused workout continues as it was started ── */
  p=await open({lang:"en",time:"2026-09-26T10:00:00Z"}); ev=(f,a)=>p.evaluate(f,a);
  await p.click(".hero .btn"); await p.click("#row-a1-0 .chk"); await ev(()=>{ draft.rir.a1=2; stopTimer(); }); await p.click("#pause");
  await ev(()=>applyProgram({schema:1,name:"Two",workouts:[{id:"U",label:"Upper",tag:"",exercises:[{id:"bench-press-1",name:"Bench Press",equipment:"barbell",sets:3,repLow:6,repHigh:8}]},
    {id:"L",label:"Lower",tag:"",exercises:[{id:"back-squat-1",name:"Back Squat",equipment:"barbell",sets:3,repLow:5,repHigh:8}]}]}));
  await ev(()=>{ go("plan"); });
  check("other program: the paused card keeps the workout's own name", (await p.textContent(".hero.paused .hero-title"))==="Workout A");
  await p.click("#resume");
  check("…continues with its own exercises and sets", (await p.textContent("#ex-a1 h2")).includes("Leg Press") && await ev(()=>draft.entries.a1[0].r)!=="");
  await p.click("#fin"); if(await on()) await p.click("#myes");
  check("…saved under its own name; next up is the new program's first workout", await ev(()=>{ const s=D.sessions.at(-1); return s.label==="Workout A"&&!!s.entries.a1&&D.cursor==="U"; }));
  check("no page errors (program)", p.errs.length===0, p.errs);
  await p.done();

  /* ── the screen lock follows: released on pause, taken again on continue ── */
  p=await open({lang:"en"}); ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ window.__l={req:0,rel:0}; Object.defineProperty(navigator,"wakeLock",{configurable:true,value:{request:async()=>{ __l.req++;
    return {addEventListener(){},release:async()=>{ __l.rel++; }}; }}}); });
  await p.click(".hero .btn"); await p.waitForTimeout(50);
  await p.click("#pause"); await p.waitForTimeout(50);
  check("pause lets the screen sleep", await ev(()=>__l.req===1&&__l.rel===1));
  await p.click("#resume"); await p.waitForTimeout(50);
  check("continue keeps it on again", await ev(()=>__l.req)===2);
  await p.done();

  /* ── the how-to video, on the header ── */
  p=await open({lang:"en"}); ev=(f,a)=>p.evaluate(f,a);
  await p.click(".hero .btn");
  const v=await ev(()=>{ const a=document.querySelector("#ex-a1 a.vid"); return a&&{href:a.href,target:a.target,pinned:a.classList.contains("pinned"),label:a.getAttribute("aria-label")}; });
  check("▶ on the exercise header: a YouTube search when nothing is pinned", v&&v.href.startsWith("https://www.youtube.com/results?search_query=Leg%20Press")&&v.target==="_blank"&&!v.pinned&&v.label==="How-to video", v);
  await ev(()=>{ D.videos.a1="https://youtu.be/abc"; render(); });
  check("…the pinned link when there is one, shown in violet", await ev(()=>{ const a=document.querySelector("#ex-a1 a.vid"); return a.href==="https://youtu.be/abc"&&a.classList.contains("pinned"); }));
  await ev(()=>exMenu("a1"));
  check("⋯ keeps pinning the link, not the video itself", (await p.textContent("#modal")).includes("Change YouTube link") && !(await p.textContent("#modal")).includes("How-to video"));
  await ev(()=>closeSheet());
  await ev(()=>setLang("ar"));
  check("Arabic labels", await p.getAttribute("#ex-a1 a.vid","aria-label")==="فيديو الشرح" && await p.getAttribute("#pause","aria-label")==="إيقاف مؤقت");
  check("no page errors (video)", p.errs.length===0, p.errs);
  await p.done();
};
