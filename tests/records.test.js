/* Batch 8: personal records (on finish + trophies in the log) and session notes & duration. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path"),os=require("os");
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"tamreen-"));
const R=(w,r,x={})=>({w:String(w??""),r:String(r),r2:"",warm:false,...x});

module.exports=async()=>{
  const p=await open({time:"2026-09-26T10:00:00Z"});
  const ev=(f,a)=>p.evaluate(f,a);
  const modalOn=()=>ev(()=>document.getElementById("modal").classList.contains("on"));

  check("seed data alone sets no records (each exercise done once)", await ev(()=>recordMap().size)===0);

  // a new A workout: heavier leg press, more knee raises, better lateral raise set, same incline press
  await ev(()=>{ D.cursor="A"; render(); });
  await p.click("text=ابدأ الحصة");
  await ev(()=>{ const R=(w,r,x={})=>({w:String(w??""),r:String(r),r2:"",warm:false,...x}); const E=draft.entries;
    E.a1=[R(100,10),R(110,8)]; E.a2=[R(14,10)]; E.a6=[R(null,22)]; E.a5=[R(10,12,{r2:"12"})]; draft.sides.a5=true; });
  await p.click("#fin");
  check("finish: records sheet opens", await modalOn());
  const title=await p.textContent("#mtext"), body=await p.textContent("#mbody");
  check("sheet title counts 3 records", title.includes("3 أرقام قياسية جديدة"), title);
  check("heavier weight → أتقل وزن", body.includes("Leg Press / Hack Squat\nأتقل وزن: 110 كجم × 8"), body);
  check("more reps at bodyweight → أكتر عدّات", body.includes("Hanging Knee Raises\nأكتر عدّات: 22"), body);
  check("same weight, more reps → أحسن ست", body.includes("Lateral Raises\nأحسن ست: 10 كجم × 12"), body);
  check("no record for a repeat performance", !body.includes("Incline"), body);
  const [toastBottom,sheetTop]=await ev(()=>[document.getElementById("toast").getBoundingClientRect().bottom,
    document.querySelector("#modal .sheet").getBoundingClientRect().top]);
  check("the saved-message toast sits above the sheet, not on it", toastBottom<=sheetTop, {toastBottom,sheetTop});
  await p.click("#myes");
  await ev(()=>go("log"));
  check("log: trophy with count on that session", (await p.textContent("#app")).includes("🏆 3"));

  // a weaker workout: no sheet
  await ev(()=>{ D.cursor="A"; go("plan"); });
  await p.click("text=ابدأ الحصة");
  await ev(()=>{ draft.entries.a1[0]={w:"60",r:"8",r2:"",warm:false}; });
  await p.click("#fin");
  check("no records → no sheet", !(await modalOn()));

  // records follow session dates: a back-dated heavier session takes the leg-press record away
  await ev(()=>{ D.sessions.push({date:"2026-08-01",workout:"A",entries:{a1:[{w:"200",r:"5",r2:"",warm:false}]},units:{a1:"kg"},names:{},counts:{},sides:{},rir:{}}); save(); });
  const later=await ev(()=>D.sessions.findIndex(s=>s.date==="2026-09-26"&&s.entries.a1[1]?.w==="110"));
  check("back-dated session: later leg press no longer a record", await ev(i=>!(recordMap().get(i)||[]).some(r=>r.id==="a1"),later));
  check("the earliest session sets none", await ev(()=>!recordMap().has(D.sessions.length-1)));

  // assisted pull-ups and holds (fresh history)
  await ev(()=>{ const S=(date,workout,e)=>({date,workout,entries:e,units:{b1:"kg",b6:"kg"},names:{},counts:{},sides:{},rir:{}});
    const R=(w,r)=>({w:String(w),r:String(r),r2:"",warm:false});
    D.sessions=[S("2026-09-01","B",{b1:[R(30,6)],b6:[R("",30)]}),S("2026-09-08","B",{b1:[R(20,6)],b6:[R("",50)]})]; save(); });
  const t2=await ev(()=>(recordMap().get(1)||[]).map(recordText).join(" | "));
  check("less assistance → أحسن ست: مساعدة", t2.includes("أحسن ست: مساعدة 20 كجم × 6"), t2);
  check("longer hold → أطول ثبات", t2.includes("أطول ثبات: 50 ثانية"), t2);

  // notes + duration on a new workout
  await ev(()=>{ D.cursor="C"; go("plan"); });
  await p.click("text=ابدأ الحصة");
  check("header shows the start time", /\d{1,2}:\d{2}/.test(await p.textContent(".stitle span")) && await ev(()=>draft.startedAt>0));
  await ev(()=>{ draft.at=draft.ids.length; render(); });   // notes are on the wrap-up page
  await p.fill(".note-in","كتف شمال واجعني شوية");
  await p.clock.fastForward("55:00");
  await p.reload();   // the note and the start time survive a reload
  check("note kept across a reload", await p.inputValue(".note-in")==="كتف شمال واجعني شوية");
  await ev(()=>{ draft.entries.c1[0]={w:"",r:"10",r2:"",warm:false}; });
  const msg=await ev(()=>sessionText(draft));
  check("Ask Claude message has duration so far and the note", msg.includes("Duration: 55 min so far.")&&msg.includes("My notes: كتف شمال واجعني شوية"), msg.slice(0,500));
  await p.click("#fin");
  const rec=await ev(()=>D.sessions.at(-1));
  check("finish: 55 minutes and the note saved", rec.mins===55&&rec.note==="كتف شمال واجعني شوية", rec);
  check("finish toast shows the duration", (await p.textContent("#toast")).includes("55 دقيقة"));
  if(await modalOn()) await p.click("#myes");
  await ev(()=>go("log"));
  const logText=await p.textContent("#app");
  check("log row: duration and a note mark", logText.includes("55 دقيقة")&&logText.includes("📝"));

  // editing it: note + minutes editable, leaving with changes asks first
  await ev(()=>{ openSession(D.sessions.length-1); draft.at=draft.ids.length; render(); });
  check("old session shows note and minutes", await p.inputValue(".note-in")==="كتف شمال واجعني شوية" && await p.inputValue("input[oninput^='setMins']")==="55");
  await p.fill("input[oninput^='setMins']","60");
  await p.click("#back");
  check("changed minutes → asks before leaving", await modalOn());
  await p.click("#mno"); await p.click("#fin");
  check("edited minutes saved", await ev(()=>D.sessions.at(-1).mins)===60);

  // back-dated workouts aren't timed; absurd durations aren't kept
  await ev(()=>{ draft=blankDraft("A","2026-09-20",null); render(); });
  check("back-dated: no start time", await ev(()=>draft.startedAt)===0 && !/\d{1,2}:\d{2}/.test(await p.textContent(".stitle span")));
  await ev(()=>{ draft=null; D.cursor="A"; go("plan"); });
  await p.click("text=ابدأ الحصة");
  await ev(()=>{ draft.entries.a1[0]={w:"50",r:"8",r2:"",warm:false}; });
  await p.clock.fastForward("06:00:00");
  await p.click("#fin");
  check("over 300 minutes → not kept", await ev(()=>D.sessions.at(-1).mins)===undefined);
  if(await modalOn()) await p.click("#myes");

  // CSV + JSON carry notes and minutes; bad values are dropped
  const [dl]=await Promise.all([p.waitForEvent("download"),ev(()=>exportCSV())]);
  const csvFile=path.join(TMP,"t.csv"); await dl.saveAs(csvFile);
  const csv=fs.readFileSync(csvFile,"utf8");
  check("CSV has session_minutes and session_note columns", csv.split("\n")[0].includes("session_minutes,session_note")&&csv.includes(",60,كتف شمال واجعني شوية"));
  await ev(()=>{ D.sessions=[]; save(); });
  await p.setInputFiles("#restoreFile",csvFile); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("CSV round trip keeps minutes and note", await ev(()=>D.sessions.some(s=>s.mins===60&&s.note==="كتف شمال واجعني شوية")));
  const json=path.join(TMP,"b.json");
  fs.writeFileSync(json,JSON.stringify({sessions:[
    {date:"2026-09-01",workout:"A",entries:{a1:[R(50,8)]},mins:9999,note:{x:1}},
    {date:"2026-09-02",workout:"A",entries:{a1:[R(50,8)]},mins:"45",note:"  ok  "}]}));
  await p.setInputFiles("#restoreFile",json); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restore: bad minutes / note dropped, good ones cleaned", await ev(()=>{ const [a,b]=D.sessions;
    return a.mins===undefined&&a.note===undefined&&b.mins===45&&b.note==="ok"; }));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();
};
