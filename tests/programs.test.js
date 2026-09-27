/* Batch 19: the program is data — schema-1 JSON import (paste / file) with preview and field-level errors,
   export, "Get your program", stable ids, any number of workouts, and history that survives program changes.
   Starts with the acceptance test: import a two-workout program, log a session, re-import the original
   three-workout program — both histories must show in the log, the progress chart and the CSV export. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path"),os=require("os");
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"tamreen-"));

const X=(id,name,equipment,sets,repLow,repHigh,more={})=>({id,name,equipment,sets,repLow,repHigh,perSide:false,isTime:false,addWeight:false,...more});
const UPPER_LOWER={schema:1,name:"Test Upper/Lower",workouts:[
  {id:"U",label:"Upper",tag:"Chest, back, arms",exercises:[
    X("bench-press-1","Bench Press","barbell",3,6,8),X("cable-row-1","Seated Cable Row","cable",3,10,12),
    X("chin-up-1","Chin-up","body",3,5,8,{addWeight:true}),X("db-curl-1","Dumbbell Curl","dumbbell",2,10,12,{perSide:true})]},
  {id:"L",label:"Lower",tag:"Legs and core",exercises:[
    X("back-squat-1","Back Squat","barbell",3,5,8),X("leg-curl-1","Leg Curl","machine",3,10,12),
    X("side-plank-1","Side Plank","body",2,20,40,{perSide:true,isTime:true}),X("calf-raise-1","Standing Calf Raise","machine",3,12,15),
    X("hip-thrust-1","Hip Thrust","barbell",3,8,10)]}]};

module.exports=async()=>{
  let p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  let ev=(f,a)=>p.evaluate(f,a);
  const app=()=>p.textContent("#app");
  const modal=()=>p.textContent("#modal");
  /* paste into the import box and press Preview; returns the sheet's text (preview or error) */
  const paste=async text=>{ await ev(()=>importProgram()); await p.fill("#pj",text); await p.click("#myes"); return modal(); };
  const capture=()=>ev(()=>{ window.__file=null; window.giveFile=async(n,t)=>{ window.__file={n,t}; return true; }; });
  const csv=async()=>{ await capture(); await ev(()=>exportCSV()); return ev(()=>window.__file.t); };
  const logText=async()=>{ await ev(()=>go("log")); return app(); };
  const progressOf=async id=>{ await ev(id=>{ go("prog"); setProg(id); },id);
    return {dots:await ev(()=>document.querySelectorAll("#ch-ex .dot").length),opt:await ev(id=>{ const o=document.querySelector(`option[value="${id}"]`); return o?[o.textContent,o.parentElement.label]:null; },id)}; };
  const seedCount=await ev(()=>D.sessions.length);

  /* ── acceptance ── */
  await capture(); await ev(()=>exportProgram());
  const original=await ev(()=>window.__file.t);
  check("original program exported as schema-1 JSON", JSON.parse(original).schema===1 && JSON.parse(original).workouts.length===3);

  let pv=await paste(JSON.stringify(UPPER_LOWER));
  check("preview: summary before applying", pv.includes("2 workouts, 9 exercises, name: Test Upper/Lower") && pv.includes("All the exercises are new") && pv.includes("nothing is deleted"), pv);
  check("preview lists the workouts", pv.includes("Upper") && pv.includes("Bench Press") && pv.includes("Lower") && pv.includes("Hip Thrust"));
  check("nothing changes until confirmed", await ev(()=>ORDER.join())==="A,B,C");
  await p.click("#myes");
  check("applied: two workouts, stored under their own key, not in the data", await ev(()=>ORDER.join()==="U,L"&&programStored&&!!localStorage.getItem(PROGRAM_KEY)&&!("program" in JSON.parse(localStorage.getItem(KEY)))));
  check("history kept", await ev(()=>D.sessions.length)===seedCount);
  check("next workout: the first of the new program", (await p.textContent(".hero-title"))==="Upper" && (await app()).includes("Bench Press"));
  // log a session against it
  await p.click(".hero .btn");
  check("workout screen: the new program's exercises", await ev(()=>draft.ids.join())==="bench-press-1,cable-row-1,chin-up-1,db-curl-1" && (await p.textContent(".stitle b"))==="Upper");
  await ev(()=>{ draft.entries["bench-press-1"].forEach(r=>{ r.w="60"; }); logSet("bench-press-1",0); logSet("bench-press-1",1); setRir("bench-press-1",2);
    draft.entries["cable-row-1"][0]={w:"40",r:"12",r2:"",warm:false}; stopTimer(); });
  await p.click("#fin"); if(await ev(()=>document.getElementById("modal").classList.contains("on"))) await p.click("#myes");
  const upIdx=await ev(()=>D.sessions.length-1);
  check("logged under the new program", await ev(i=>D.sessions[i].workout==="U"&&!!D.sessions[i].entries["bench-press-1"],upIdx));
  check("rotation: two workouts → Lower next, then Upper", (await p.textContent(".hero-title"))==="Lower" && await ev(()=>{ skip(); const a=D.cursor; skip(); return a+D.cursor; })==="UL");

  const checkBoth=async when=>{
    const log=await logText();
    check(`${when}: log shows the new session as Upper and the old ones as Workout A/B/C`,
      log.includes("Upper") && log.includes("Workout A") && log.includes("Workout B") && log.includes("Workout C") && !/NaN|undefined/.test(log));
    const oldEx=await progressOf("a1"),newEx=await progressOf("bench-press-1");
    check(`${when}: progress chart for an exercise of the original program`, oldEx.dots>=1 && oldEx.opt?.[0]==="Leg Press / Hack Squat", oldEx);
    check(`${when}: progress chart for an exercise of the two-workout program`, newEx.dots===1 && newEx.opt?.[0]==="Bench Press", newEx);
    const rows=(await csv()).split("\n");
    rows[0]=rows[0].replace(/^\uFEFF/,"");   // the export starts with a BOM (Excel reads Arabic then)
    check(`${when}: CSV has both programs' sets`, rows.some(r=>r.startsWith("2026-08-23,A,Leg Press / Hack Squat,a1,"))
      && rows.some(r=>/^2026-09-26,U,Bench Press,bench-press-1,1,,60,kg,/.test(r)) && rows[0]==="date,workout,exercise,exercise_id,set,warmup,weight,unit,reps,reps_left,rir,session_minutes,session_note", rows.slice(0,3));
    check(`${when}: no page errors`, p.errs.length===0, p.errs);
  };
  await checkBoth("on the two-workout program");
  check("old exercises listed as not in the program", (await progressOf("a1")).opt?.[1]==="Not in the program");

  // re-import the original three-workout program
  await ev(()=>go("set"));
  pv=await paste(original);
  check("re-import preview: the original's exercises carry on from the log", /3 workouts, 20 exercises/.test(pv) && /1\d exercises carry on from your log/.test(pv) && !pv.includes("gets a new id"), pv);
  await p.click("#myes");
  check("original program back: same ids, names as shown before", await ev(()=>ORDER.join()==="A,B,C"&&PROGRAM.A.ex.map(e=>e.id).join()==="a1,a2,a3,a4,a5,a6"&&nameOf(PROGRAM.A.ex[2])==="Chest Cable Row"));
  check("history still all there", await ev(()=>D.sessions.length)===seedCount+1);
  await checkBoth("back on the original program");
  check("the two-workout program's exercises now listed as not in the program", (await progressOf("bench-press-1")).opt?.[1]==="Not in the program");
  check("the Upper session keeps its name", await ev(i=>D.sessions[i].label,upIdx)==="Upper");
  // and via "Back to the built-in program"
  await ev(()=>{ go("set"); resetProgram(); }); await p.click("#myes");
  check("back to the built-in: nothing stored, history intact", await ev(()=>!programStored&&ORDER.join()==="A,B,C"&&D.sessions.length)===seedCount+1);
  await checkBoth("on the built-in program");

  /* ── errors name the field ── */
  const err=async(json,expect,name)=>{ const t=await paste(typeof json==="string"?json:JSON.stringify(json));
    const e=await ev(()=>document.querySelector("#mform .perr")?.textContent||"");
    check(`error: ${name}`, e.includes(expect) && await ev(()=>!!document.getElementById("pj").value), e||t); };
  const good=()=>JSON.parse(JSON.stringify(UPPER_LOWER));
  await err('{"schema": 1, "name": "x",','Not valid JSON','broken JSON');
  await err("Here you go!","no { … }","no JSON at all");
  await err("{not json","Not valid JSON","a brace but no JSON");
  await err({...good(),schema:2},"schema → made for a newer version","newer schema");
  await err({...good(),schema:undefined},"schema → must be 1","missing schema");
  await err({...good(),name:""},"name → the program's name","empty name");
  await err({...good(),workouts:[]},"workouts → a list of 1 to 7 workouts (has 0)","no workouts");
  let g=good(); g.workouts[0].exercises[1].equipment="kettlebell";
  await err(g,'workouts[0].exercises[1].equipment (Seated Cable Row, in Upper) → one of machine, dumbbell, barbell, cable, body (got "kettlebell")',"bad equipment");
  g=good(); g.workouts[1].exercises[0].repHigh=4;
  await err(g,"workouts[1].exercises[0].repHigh (Back Squat, in Lower) → a whole number from repLow (5) to 100 (got 4)","rep range upside down");
  g=good(); g.workouts[0].exercises[0].sets="3";
  await err(g,'workouts[0].exercises[0].sets (Bench Press, in Upper) → a whole number from 1 to 10 (got "3")',"sets as text");
  g=good(); g.workouts[1].exercises[2].id="bench-press-1";
  await err(g,"workouts[1].exercises[2].id (Side Plank, in Lower) → duplicate — same id as workouts[0].exercises[0]","duplicate exercise id");
  g=good(); g.workouts[1].id="U";
  await err(g,"workouts[1].id (Lower) → duplicate — same id as workouts[0]","duplicate workout id");
  g=good(); g.workouts[0].exercises[2].addWeight=false; g.workouts[0].exercises[2].assisted=true;
  await err(g,"workouts[0].exercises[2].assisted (Chin-up, in Upper) → needs addWeight: true as well","assisted without addWeight");
  g=good(); g.workouts[0].exercises[0].perSide="no";
  await err(g,'workouts[0].exercises[0].perSide (Bench Press, in Upper) → true or false (got "no")',"boolean as text");
  await p.click("#mno");
  check("errors changed nothing", await ev(()=>!programStored&&ORDER.join()==="A,B,C"));
  pv=await paste("Sure! Here is your program:\n```json\n"+JSON.stringify(good(),null,2)+"\n```");
  check("a reply wrapped in a code fence still imports", pv.includes("2 workouts, 9 exercises"));
  await p.click("#mno");

  /* ── stable ids ── */
  g=good(); g.workouts[0].exercises[0]={...g.workouts[0].exercises[0],id:"a1",name:"Goblet Squat"}; delete g.workouts[1].exercises[1].id;
  const a1Before=await ev(()=>historyOf("a1").length);
  pv=await paste(JSON.stringify(g));
  check("an id already used for another exercise gets a new one", pv.includes("“Goblet Squat” gets a new id (goblet-squat-1) — a1 is already “Leg Press / Hack Squat”"), pv);
  await p.click("#myes");
  check("…so the two histories never mix", await ev(()=>PROGRAM.U.ex[0].id==="goblet-squat-1"&&historyOf("goblet-squat-1").length===0)&&await ev(()=>historyOf("a1").length)===a1Before);
  check("a missing id is made from the name", await ev(()=>PROGRAM.L.ex[1].id)==="leg-curl-2");   // leg-curl-1 was used before
  check("new ids in the editor follow the same rule", await ev(()=>{ myProgram().U.ex.push(makeEx({n:"Bench Press",eq:"barbell",sets:3,lo:6,hi:8})); programChanged(); return PROGRAM.U.ex.at(-1).id; })==="bench-press-2");
  check("perSide exercises log right / left", await ev(()=>D.sides["side-plank-1"]===true&&PROGRAM.L.ex[2].uni===true&&PROGRAM.L.ex[2].sec===true));
  await ev(()=>{ go("plan"); D.cursor="L"; render(); });
  await p.click(".hero .btn"); await ev(()=>{ draft.at=2; render(); });
  check("a timed hold has no weight box", !(await p.$("#sets-side-plank-1 .stp-w")) && !!(await p.$("#sets-side-plank-1 .stp-r2")));
  await ev(()=>{ draft=null; render(); });

  /* ── any number of workouts ── */
  const five={schema:1,name:"Five",workouts:["P","Q","R","S","T"].map(k=>({id:k,label:`Day ${k}`,tag:"",exercises:[X(`${k.toLowerCase()}-move-1`,`Move ${k}`,"machine",3,8,12)]}))};
  await paste(JSON.stringify(five)); await p.click("#myes");
  const cycle=await ev(()=>{ const seen=[D.cursor]; for(let i=0;i<5;i++){ skip(); seen.push(D.cursor); } return seen.join(""); });
  check("five workouts rotate in order and wrap", cycle==="PQRSTP", cycle);
  check("the Ask Claude message names the rotation", await ev(()=>{ draft=blankDraft("P",today(),null); draft.entries["p-move-1"][0]={w:"50",r:"10",r2:"",warm:false};
    const t=sessionText(draft); draft=null; return t.includes("5-workout rotation, \"Five\"")&&t.includes("Session: Day P"); }));

  /* ── reload, backup, program file ── */
  await p.reload();
  check("the program survives a reload", await ev(()=>ORDER.join()==="PQRST".split("").join()&&PROGRAM_NAME==="Five"));
  const [dl]=await Promise.all([p.waitForEvent("download"),ev(()=>backup())]);
  const bfile=path.join(TMP,"backup.json"); await dl.saveAs(bfile);
  const b=JSON.parse(fs.readFileSync(bfile,"utf8"));
  check("backup carries the program (schema 1)", b.program?.schema===1&&b.program.name==="Five"&&Array.isArray(b.sessions));
  await ev(()=>storeProgram(null));
  await p.setInputFiles("#restoreFile",bfile); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restoring the backup brings the program back", await ev(()=>PROGRAM_NAME==="Five"&&ORDER.length===5&&D.sessions.length)===seedCount+1);
  const pfile=path.join(TMP,"program.json"); fs.writeFileSync(pfile,JSON.stringify(UPPER_LOWER));
  await p.setInputFiles("#restoreFile",pfile); await p.waitForSelector("#modal.on");
  check("a program file opened from Restore goes to the program preview", (await modal()).includes("2 workouts, 9 exercises"));
  await p.click("#mno");
  const [chooser]=await Promise.all([p.waitForEvent("filechooser"),ev(()=>{ importProgram(); pickProgramFile(); })]);
  await chooser.setFiles(pfile); await p.waitForFunction(()=>document.getElementById("mtext").textContent.includes("Use this program"));
  check("…and from Import → Choose a file", (await modal()).includes("name: Test Upper/Lower"));
  await p.click("#mno");

  /* ── history under an id nothing defines ── */
  await ev(()=>{ D.sessions.push({date:"2026-09-20",workout:"Z9",label:"Old Push",entries:{"mystery-press-1":[{w:"30",r:"10",r2:"",warm:false},{w:"32.5",r:"8",r2:"",warm:false}]},
    units:{"mystery-press-1":"kg"},names:{"mystery-press-1":"Mystery Press"},counts:{},sides:{},rir:{}}); save(); });
  const m=await progressOf("mystery-press-1");
  check("unknown id: picked by its saved name, chart drawn", m.opt?.[0]==="Mystery Press"&&m.dots===1, m);
  const log=await logText();
  check("unknown id: log shows the session name and its volume", log.includes("Old Push")&&log.includes("560 kg total"), log.slice(0,300));
  check("unknown id: CSV row with the saved name", (await csv()).includes("2026-09-20,Z9,Mystery Press,mystery-press-1,1,,30,kg,10"));
  await ev(()=>openSession(D.sessions.length-1));
  check("unknown id: an old session from another program opens and saves", (await p.textContent(".stitle b"))==="Old Push" && !!(await p.$("#ex-mystery-press-1")));
  await p.click("#fin");
  check("…and keeps its name after saving", await ev(()=>D.sessions.at(-1)?.label||D.sessions.find(s=>s.workout==="Z9")?.label)==="Old Push");
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── "Get your program": the prompt, and the example in it imports cleanly ── */
  p=await open({lang:"en",permissions:["clipboard-read","clipboard-write"]}); ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>go("set"));
  check("Settings: Get your program button", !!(await p.$("#getProgram")));
  await p.click("#getProgram");
  await p.waitForFunction(()=>document.getElementById("toast").textContent.includes("Copied"));
  const prompt=await ev(()=>navigator.clipboard.readText());
  check("prompt asks for the eight things", ["Height","Weight","Age","Training experience","Main goal","Equipment","sessions a week","injuries"].every(w=>prompt.includes(w)));
  check("prompt: reply with only JSON, no prose, no code fences", prompt.includes("reply with ONLY one JSON object")&&prompt.includes("no markdown code fences"));
  check("prompt embeds the schema and a worked example", prompt.includes('"required"')&&prompt.includes('"enum"')&&prompt.includes("Example of a valid reply"));
  const example=prompt.slice(prompt.lastIndexOf("Example of a valid reply")).replace(/^[^\n]*\n/,"");
  const r=await ev(t=>{ const x=readProgramText(t); return x.ok?{ok:true,n:x.program.workouts.length,ids:x.program.workouts.every(w=>w.exercises.every(e=>e.id))}:x; },example);
  check("the prompt's example passes the app's own checks", r.ok&&r.n===2&&r.ids, r);
  check("the prompt's schema matches the app's rules", await ev(()=>PROGRAM_SCHEMA.properties.workouts.items.properties.exercises.items.properties.equipment.enum.join())==="machine,dumbbell,barbell,cable,body");
  await ev(()=>setLang("ar"));
  check("Arabic: the prompt asks Claude to talk in Egyptian Arabic, JSON in English", await ev(()=>programPrompt().includes("Egyptian Arabic")));
  await p.done();

  /* ── a new phone starts empty (nobody gets someone else's history) ── */
  p=await open({lang:"en",seed:false}); ev=(f,a)=>p.evaluate(f,a);
  check("new phone: no workouts, the built-in program", await ev(()=>D.sessions.length===0&&!programStored&&ORDER.join()==="A,B,C"&&Object.keys(D.swaps).length===0));
  check("new phone: no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── an edited program from the previous version moves to its own key ── */
  p=await open({lang:"en",seed:false}); ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ const old={...defaults(),migrated:3,cursor:"B",program:{...JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),B:{label:"تمرين B",tag:"Pull day",ex:[{id:"b7",n:"Lat Pulldown",eq:"machine",sets:4,lo:8,hi:12}]}}};
    localStorage.setItem(KEY,JSON.stringify(old)); });
  await p.reload();
  check("older edited program migrated", await ev(()=>programStored&&PROGRAM.B.tag==="Pull day"&&PROGRAM.B.ex[0].sets===4&&!("program" in D)&&D.migrated===4&&D.cursor==="B"));
  check("its workouts keep their built-in names", await ev(()=>dayLabel("B"))==="Workout B");
  await p.done();
};
