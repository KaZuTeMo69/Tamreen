/* Batch 7: program editor — edit, rename, replace, add, remove, reorder, day description, reset;
   history stays attached (or separate for "replace"); old sessions keep exercises taken out of the program;
   backups carry the program and are checked. */
const {open,check}=require("./lib.js");
const fs=require("fs"),path=require("path"),os=require("os");
const TMP=fs.mkdtempSync(path.join(os.tmpdir(),"tamreen-"));

module.exports=async()=>{
  const p=await open({time:"2026-09-26T10:00:00Z"});
  const ev=(f,a)=>p.evaluate(f,a);
  const text=()=>p.textContent("#app");
  const sheetOpen=()=>ev(()=>document.getElementById("modal").classList.contains("on"));
  /* fill the exercise form and save */
  async function form(v){
    if(v.n!==undefined) await p.fill("#f-n",v.n);
    if(v.eq) await p.selectOption("#f-eq",v.eq);
    for(const f of ["sets","lo","hi"]) if(v[f]!==undefined) await p.fill("#f-"+f,String(v[f]));
    for(const f of ["uni","addw","assist","sec"]) if(v[f]!==undefined) await p.setChecked("#f-"+f,v[f]);
    await p.click("#myes");
  }

  check("starts on the built-in program", await ev(()=>!programStored&&PROGRAM===DEFAULT_PROGRAM&&!localStorage.getItem(PROGRAM_KEY)));
  await p.click("nav button[data-tab=set]");
  await p.click("#app .row.tap >> text=البرنامج الأصلي");
  check("editor opens from Settings, Settings tab stays lit", (await text()).includes("البرنامج") &&
    await ev(()=>document.querySelector("nav button[data-tab=set]").classList.contains("on")));
  check("three days listed with their exercises", await ev(()=>document.querySelectorAll(".prow").length)===20);

  // edit a2: 4 sets of 6–8 — same exercise, same history
  const hA2=await ev(()=>historyOf("a2").length);
  await ev(()=>editEx("A",1)); await form({sets:4,lo:6,hi:8});
  check("edit: sets and reps saved", await ev(()=>{ const e=PROGRAM.A.ex[1]; return e.id==="a2"&&e.sets===4&&e.lo===6&&e.hi===8&&programStored&&!("program" in D)&&JSON.parse(localStorage.getItem(PROGRAM_KEY)).workouts[0].exercises[1].sets===4; }));
  check("edit: history unchanged", await ev(()=>historyOf("a2").length)===hA2);
  // rename through the editor = same history, new display name
  await ev(()=>editEx("A",1)); await form({n:"Incline DB Press (low)"});
  check("rename: new name shown, same id", await ev(()=>nameOf(byId("a2"))==="Incline DB Press (low)"&&PROGRAM.A.ex[1].id==="a2"));
  // form checks
  await ev(()=>editEx("A",1)); await form({lo:10,hi:6});
  check("form: bad rep range is refused and the form stays open", await sheetOpen() && (await p.textContent("#toast")).includes("العدّات"));
  await p.click("#mno");
  await ev(()=>addEx("A")); await form({n:""});
  check("form: empty name refused", await sheetOpen() && (await p.textContent("#toast")).includes("اسم"));
  await p.click("#mno");

  // replace a3 (has history) with a new exercise → separate history, a3 still known
  const volBefore=await ev(()=>Math.round(volume(D.sessions[0])));
  await ev(()=>replaceEx("A",2)); await form({n:"Seal Row",eq:"barbell"});
  const newId=await ev(()=>PROGRAM.A.ex[2].id);
  check("replace: new exercise in the slot", await ev(id=>id!=="a3"&&byId(id).n==="Seal Row"&&byId(id).eq==="barbell",newId));
  check("replace: new exercise starts with no history", await ev(id=>historyOf(id).length,newId)===0);
  check("replace: old exercise still known, old volume unchanged", await ev(()=>!!byId("a3")&&!inProgram("a3")) &&
    await ev(()=>Math.round(volume(D.sessions[0])))===volBefore);

  // add a custom exercise with added weight + right/left, move it up, log it
  await ev(()=>addEx("A")); await form({n:"Cable Fly",eq:"cable",sets:2,lo:12,hi:15,uni:true});
  const fly=await ev(()=>PROGRAM.A.ex.at(-1).id);
  check("add: custom exercise at the end", await ev(id=>{ const e=byId(id); return e.n==="Cable Fly"&&e.eq==="cable"&&e.uni===true&&e.sets===2; },fly));
  await ev(()=>moveEx("A",PROGRAM.A.ex.length-1,-1));
  check("move up", await ev(id=>PROGRAM.A.ex.at(-2).id===id,fly));
  await ev(()=>moveEx("A",0,-1));
  check("move past the top does nothing", await ev(()=>PROGRAM.A.ex[0].id)==="a1");
  await ev(()=>{ D.cursor="A"; go("plan"); });
  check("plan shows the edited day", (await text()).includes("Cable Fly") && (await text()).includes("Seal Row") && (await text()).includes("4 × 6–8"));
  await p.click("text=ابدأ الحصة");
  check("new workout follows the program", await ev(id=>draft.ids.includes(id)&&!draft.ids.includes("a3")&&draft.counts.a2===4,fly));
  await ev(id=>{ draft.entries[id][0]={w:"10",r:"12",r2:"12",warm:false}; draft.entries.a1[0]={w:"100",r:"8",r2:"",warm:false}; },fly);
  await p.click("#fin");
  const flyIdx=await ev(()=>D.sessions.length-1);

  // remove the custom exercise: history stays, and editing that old session keeps its data
  await ev(()=>go("program"));
  const flyPos=await ev(id=>PROGRAM.A.ex.findIndex(e=>e.id===id),fly);
  await ev(i=>removeEx("A",i),flyPos); await p.click("#myes");
  check("remove: gone from the program, kept as a retired exercise", await ev(id=>!inProgram(id)&&D.retired[id]?.n==="Cable Fly",fly));
  // right/left wasn't switched on, so the left-side reps were dropped on save: 100×8 + 10×12
  check("remove: its session volume still counts it", await ev(i=>Math.round(volume(D.sessions[i])),flyIdx)===100*8+10*12);
  await ev(i=>openSession(i),flyIdx);
  await ev(id=>{ draft.at=draft.ids.indexOf(id); render(); },fly);
  check("old session still shows the removed exercise", !!(await p.$(`#ex-${fly}`)));
  await p.click("#fin");
  check("saving that old session keeps the removed exercise's sets", await ev(([i,id])=>D.sessions[i].entries[id]?.[0]?.r==="12",[flyIdx,fly]));
  await ev(()=>go("prog"));
  check("progress picker lists exercises with history that left the program",
    await ev(id=>[...document.querySelectorAll("optgroup")].at(-1).label==="تمارين مش في البرنامج"&&!!document.querySelector(`option[value="${id}"]`),fly));

  // can't empty a day; description edit
  await ev(()=>{ go("program"); for(let i=PROGRAM.C.ex.length-1;i>0;i--){ myProgram().C.ex.splice(i,1); } programChanged(); });
  await ev(()=>removeEx("C",0));
  check("the last exercise of a day can't be removed", !(await sheetOpen()) && (await p.textContent("#toast")).includes("تمرين واحد"));
  await ev(()=>editTag("B")); await p.fill("#minput","Pull day"); await p.click("#myes");
  check("day description saved", await ev(()=>PROGRAM.B.tag)==="Pull day");

  // backup round trip: program + retired exercises + custom ids' settings
  await ev(id=>{ D.units[id]="lb"; save(); },fly);
  const [d0]=await Promise.all([p.waitForEvent("download"),ev(()=>backup())]);
  const file=path.join(TMP,"b.json"); await d0.saveAs(file);
  await ev(()=>{ D={...defaults(),migrated:2}; loadProgram(); save(); render(); });
  await p.setInputFiles("#restoreFile",file); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restore: program back", await ev(()=>PROGRAM.B.tag==="Pull day"&&PROGRAM.C.ex.length===1&&PROGRAM.A.ex[1].sets===4));
  check("restore: retired exercise and its unit back", await ev(id=>byId(id)?.n==="Cable Fly"&&D.units[id]==="lb",fly));

  // a tampered backup (this version's format): any bad field → the whole program is refused, the current one stays
  const bad=JSON.parse(fs.readFileSync(file,"utf8"));
  bad.program.workouts[0].exercises.push({id:"x-1",name:"bad",equipment:"rocket",sets:3,repLow:8,repHigh:12});
  fs.writeFileSync(file,JSON.stringify(bad));
  await ev(()=>storeProgram(null));
  await p.setInputFiles("#restoreFile",file); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restore: tampered program refused (built-in kept)", await ev(()=>!programStored&&PROGRAM===DEFAULT_PROGRAM));
  // an older backup ({A, B, C} program): a bad exercise is dropped; a day left empty refuses the whole program
  const legacy=(B)=>({sessions:[],program:{A:{tag:"Old A",ex:[{id:"a1",n:"Leg Press",eq:"machine",sets:3,lo:8,hi:10},{id:"<x>",n:"bad",eq:"rocket"}]},
    B:{tag:"Old B",ex:B},C:{tag:"Old C",ex:[{id:"c1",n:"Dips",eq:"body",addw:true,sets:4,lo:6,hi:10}]}}});
  fs.writeFileSync(file,JSON.stringify(legacy([{id:"b7",n:"Lat Pulldown",eq:"machine",sets:3,lo:10,hi:12}])));
  await p.setInputFiles("#restoreFile",file); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restore: older program format accepted, bad exercise dropped", await ev(()=>programStored&&PROGRAM.A.tag==="Old A"&&PROGRAM.A.ex.length===1&&PROGRAM.B.ex[0].id==="b7"));
  await ev(()=>storeProgram(null));
  fs.writeFileSync(file,JSON.stringify(legacy([{id:"zz9",eq:"rocket"}])));
  await p.setInputFiles("#restoreFile",file); await p.waitForSelector("#modal.on"); await p.click("#myes");
  check("restore: older program with an empty day refused (built-in kept)", await ev(()=>!programStored&&PROGRAM===DEFAULT_PROGRAM));

  // reset
  await ev(()=>{ myProgram().A.ex.push({id:"xtest1",n:"Temp",eq:"machine",sets:3,lo:8,hi:12}); programChanged(); go("program"); });
  await p.click("text=رجّع البرنامج الأصلي"); await p.click("#myes");
  check("reset: built-in program back, added exercise kept as retired", await ev(()=>!programStored&&!inProgram("xtest1")&&!!D.retired.xtest1));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  // a workout saved before exercise lists were stored still reopens
  const q=await open({time:"2026-09-26T10:00:00Z"});
  await q.evaluate(()=>{ const d=blankDraft("B",today(),null); delete d.ids; d.entries.b7[0].r="9";
    draft=d; saveDraft(); });   // stored the old way: no exercise list
  await q.reload();
  check("old unfinished workout reopens", await q.evaluate(()=>draft&&draft.ids.length===7&&draft.entries.b7[0].r==="9"));
  check("no page errors (old draft)", q.errs.length===0, q.errs);
  await q.done();
};
