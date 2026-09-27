/* Batch 16: faster logging — copy last time, same again, +1 rep, rest timer after each set, setup notes. */
const {open,check}=require("./lib.js");

module.exports=async()=>{
  const p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  const ev=(f,a)=>p.evaluate(f,a);
  const set=(id,s)=>ev(([id,s])=>({...draft.entries[id][s]}),[id,s]);
  const timing=()=>ev(()=>document.getElementById("timer").classList.contains("on"));

  await p.click("text=Start workout");
  // seed: Leg Press last time 60×10, 80×10, 100×10
  check("last time is tappable", (await p.$$("#sets-a1 button.prev.copy")).length===3);
  await p.click("#sets-a1 button.prev.copy >> nth=0");
  const s0=await set("a1",0);
  check("tap last time → weight and reps copied", s0.w==="60"&&s0.r==="10", s0);
  check("…and the rest timer starts", await timing() && (await p.textContent("#tval"))==="01:30");
  await ev(()=>stopTimer());

  await p.click("#ex-a1 >> text=Same again");
  const s1=await set("a1",1);
  check("Same again → next empty set gets the set above", s1.w==="60"&&s1.r==="10"&&!s1.warm, s1);
  check("…and starts the timer", await timing()); await ev(()=>stopTimer());
  await p.click("#ex-a1 >> text=+1 rep");
  check("+1 rep → the last logged set gets one more", (await set("a1",1)).r==="11" && !(await timing()));
  await p.click("#ex-a1 >> text=Same again"); await p.click("#ex-a1 >> text=Same again");
  check("Same again with every set done → adds a set", await ev(()=>draft.counts.a1)===4 && (await set("a1",3)).r==="11");
  await ev(()=>stopTimer());
  await p.click("#ex-a2 >> text=+1 rep");
  check("+1 rep with nothing logged → asks for a set first", (await p.textContent("#toast")).includes("Log a set first"));

  // typing reps starts the timer once; a warm-up doesn't
  const inp=await p.$$("#sets-a2 input");
  await inp[1].fill("12");
  check("typing reps starts the timer", await timing());
  await ev(()=>stopTimer()); await inp[1].fill("10");
  check("changing reps already typed doesn't restart it", !(await timing()));
  await p.click("#sets-a2 .set >> nth=1 >> .chip.w");
  await (await p.$$("#sets-a2 input"))[3].fill("12");
  check("a warm-up set doesn't start it", !(await timing()));

  // copy last time converts to the unit in use
  await ev(()=>{ setUnit("a1","lb"); draft.entries.a1[2]={w:"",r:"",r2:"",warm:false}; redrawSets("a1"); });
  await p.click("#sets-a1 button.prev.copy >> nth=2"); await ev(()=>stopTimer());
  check("copy last time in lb", (await set("a1",2)).w==="220.5", await set("a1",2));   // 100 kg

  // setup note
  await p.click("#ex-a1 >> text=Setup");
  await p.fill("#minput","Seat 4, pin 7"); await p.click("#myes");
  check("setup note saved and shown on the exercise", await ev(()=>D.exNotes.a1)==="Seat 4, pin 7"
    && (await p.textContent("#ex-a1 .setup")).includes("Seat 4, pin 7") && !(await p.$("#ex-a1 >> text=📌 Setup")));
  await p.click("#ex-a1 .setup"); await p.fill("#minput",""); await p.click("#myes");
  check("emptying it deletes it", await ev(()=>D.exNotes.a1)===undefined && !(await p.$("#ex-a1 .setup")));
  await ev(()=>{ D.exNotes.a1="Seat 4"; save(); });

  // finishing keeps the logged sets; an old workout never starts the timer or offers copies
  await p.click("#fin"); if(await p.$("#modal.on")) await p.click("#myes");
  await ev(()=>{ stopTimer(); openSession(D.sessions.length-1); });
  check("old workout: no copy buttons", (await p.$$("button.prev.copy")).length===0);
  await (await p.$$("#sets-a1 input"))[7].fill("5");
  check("old workout: typing reps doesn't start the timer", !(await timing()));
  await ev(()=>{ draft=null; render(); });

  // Settings: the timer can stay manual
  await ev(()=>go("set"));
  check("setting shown, on by default", (await p.textContent("#app")).includes("Start after each set") && await ev(()=>D.autoRest)===true);
  await p.click("button.chip:has-text('Off')");
  await ev(()=>go("plan")); await p.click("text=Start workout");
  await (await p.$$("#sets-b1 input"))[1].fill("6");
  check("turned off → typing reps doesn't start it", await ev(()=>D.autoRest)===false && !(await timing()));
  await ev(()=>{ draft=null; render(); });

  // backups carry the notes and the setting; junk is dropped
  const r=await ev(()=>{ const c=cleanBackup({sessions:[],exNotes:{a1:"  Seat 5 ",zz:"x",b1:""},autoRest:true}); return [c.exNotes,c.autoRest]; });
  check("backup: notes and setting restored, unknown ids dropped", JSON.stringify(r)==='[{"a1":"Seat 5"},true]', r);
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  // Arabic labels
  const q=await open();
  await q.click("text=ابدأ الحصة");
  const t=await q.textContent("#ex-a1");
  check("Arabic: buttons", t.includes("زي اللي فوق")&&t.includes("+1 عدّة")&&t.includes("ضبط الجهاز"));
  await q.done();
};
