/* ══ programs: import / export / "get your program" (FEATURE) ═══ */
/* Anyone can train their own program: "Get your program" copies a prompt for the Claude chat, Claude asks
   about the person and answers with a schema-1 JSON program, which is pasted (or opened as a file) here,
   previewed and applied. A program can be exported to share it. Applying a program never deletes history:
   old sessions keep the name of the workout they were logged under, and exercises that leave the program
   are kept in D.retired so their history still counts and draws. */

/* exercise ids: a slug of the name plus a counter, never one the app has already seen */
const slug=s=>String(s||"").normalize("NFKD").replace(/[̀-ͯ]/g,"").toLowerCase()
  .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,30).replace(/-+$/,"")||"exercise";
const normName=s=>String(s||"").toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g,"");
/* every exercise id the app knows (programs, retired, built-in, history) → the names it has gone by */
function knownExercises(){
  const m=new Map(),add=(id,n)=>{ if(!id) return; if(!m.has(id)) m.set(id,{names:new Set(),shown:""});
    const k=m.get(id); if(n){ k.names.add(normName(n)); k.shown=k.shown||n; } };
  ALL.forEach(e=>{ add(e.id,nameOf(e)); add(e.id,e.n); });
  D.sessions.forEach(s=>Object.keys(s.entries||{}).forEach(id=>add(id,s.names?.[id])));
  return m;
}
function newExId(name,taken=new Set(knownExercises().keys())){
  const b=slug(name); let n=1; while(taken.has(`${b}-${n}`)) n++;
  const id=`${b}-${n}`; taken.add(id); return id;
}

/* reads pasted text (a stray code fence or sentence around the JSON is tolerated) → checkProgram's result */
function readProgramText(text){
  let t=String(text||"").replace(/^﻿/,"").trim();
  if(!t) return {ok:false,error:tx("مفيش حاجة — الصق الـ JSON الأول","Nothing there — paste the JSON first")};
  const fence=/```[a-z]*\s*([\s\S]*?)```/i.exec(t); if(fence) t=fence[1].trim();
  const a=t.indexOf("{"),b=t.lastIndexOf("}");
  if(a<0) return {ok:false,error:tx("مش JSON — مفيش { … }","Not JSON — there's no { … } in it")};
  let obj; try{ obj=JSON.parse(b>a?t.slice(a,b+1):t.slice(a)); }catch(e){ return {ok:false,error:tx("JSON مش سليم: ","Not valid JSON: ")+e.message}; }
  return checkProgram(obj);
}
/* before applying: keep an id that already means the same exercise (history carries on); give a new id to one
   the app knows under a different name (so two exercises never share a history) or that has none */
function planImport(sch){
  const P=clone(sch),known=knownExercises(),taken=new Set(known.keys()),renamed=[];
  P.workouts.forEach(w=>w.exercises.forEach(x=>{ if(x.id) taken.add(x.id); }));
  P.workouts.forEach(w=>{
    if(TAG_EN[w.id]&&w.tag===TAG_EN[w.id]) w.tag=DEFAULT_PROGRAM[w.id].tag;   // the built-in's own description
    w.exercises.forEach(x=>{
      const k=x.id&&known.get(x.id);
      if(k&&!k.names.has(normName(x.name))){ const to=newExId(x.name,taken); renamed.push({name:x.name,from:x.id,to,was:k.shown||x.id}); x.id=to; }
      else if(!x.id) x.id=newExId(x.name,taken);
    });
  });
  const ids=P.workouts.flatMap(w=>w.exercises.map(x=>x.id)),logged=new Set(D.sessions.flatMap(s=>Object.keys(s.entries||{})));
  return {program:P,renamed,carried:ids.filter(id=>logged.has(id)).length,total:ids.length};
}
/* switch programs (null = the built-in). History is never touched except to remember workout names. */
function applyProgram(sch){
  const next=sch?fromSchema(sch).program:DEFAULT_PROGRAM;
  D.sessions.forEach(s=>{ if(!s.label&&PROGRAM[s.workout]) s.label=PROGRAM[s.workout].label; });
  const incoming=new Set(Object.values(next).flatMap(p=>p.ex.map(e=>e.id)));
  Object.values(PROGRAM).flatMap(p=>p.ex).forEach(e=>{ if(!incoming.has(e.id)) retire(e); });
  /* an imported program names its exercises itself, and asks for right / left where it says so */
  if(sch) Object.values(next).flatMap(p=>p.ex).forEach(e=>{ delete D.swaps[e.id]; if(e.uni&&D.sides[e.id]===undefined) D.sides[e.id]=true; });
  storeProgram(sch);   // → loadProgram: the next workout moves to the first one if it's gone
  D.changedAt=Date.now(); save();
}

/* ── the screens (bottom sheets) ── */
function importProgram(text="",err=""){
  sheet({text:tx("استيراد برنامج","Import a program"),
    body:tx("الصق الـ JSON اللي Claude بعته، أو اختار ملف برنامج.","Paste the JSON Claude gave you, or choose a program file."),
    html:`${err?`<div class="perr" role="alert">${esc(err)}</div>`:""}
      <textarea id="pj" class="note-in pj" dir="ltr" spellcheck="false" autocapitalize="off" autocomplete="off"
        placeholder='{"schema": 1, "name": "…", "workouts": […]}'>${esc(text)}</textarea>
      <button class="chip" type="button" onclick="pickProgramFile()">📄 ${tx("اختار ملف","Choose a file")}</button>`,
    yes:tx("معاينة","Preview"),onYes:()=>previewProgram(document.getElementById("pj").value)});
}
function previewProgram(text){
  const r=readProgramText(text); if(!r.ok) return importProgram(text,r.error);
  const plan=planImport(r.program),P=plan.program,nW=P.workouts.length,nEx=plan.total,fresh=nEx-plan.carried;
  const lines=[
    tx(`${nW} تمارين (أيام)، ${nEx} تمرين، الاسم: ${P.name}`,`${nW} workout${nW===1?"":"s"}, ${nEx} exercises, name: ${P.name}`),
    plan.carried?tx(`${plan.carried} تمرين بيكمّل على سجلك، و${fresh} جديد.`,`${plan.carried} exercise${plan.carried===1?"":"s"} carry on from your log; ${fresh} ${fresh===1?"is":"are"} new.`)
      :tx("كل التمارين جديدة على سجلك.","All the exercises are new to your log."),
    ...plan.renamed.map(x=>tx(`«${x.name}» خد id جديد (${x.to}) — ${x.from} مستخدم لـ «${x.was}».`,`“${x.name}” gets a new id (${x.to}) — ${x.from} is already “${x.was}”.`)),
    tx("الحصص اللي سجلتها بتفضل زي ما هي — مفيش حاجة بتتمسح.","Your logged workouts stay as they are — nothing is deleted.")];
  sheet({text:tx("تستخدم البرنامج ده؟","Use this program?"),body:lines.join("\n"),
    html:`<div class="pvlist">${P.workouts.map(w=>`<div class="pvw"><b>${esc(labelText(w.label,w.id))}</b>${w.tag?` <span class="muted">— ${esc(w.tag)}</span>`:""}
      <div class="small muted" dir="auto">${w.exercises.map(x=>`${esc(x.name)} <span class="num" dir="ltr">${x.sets}×${x.repLow}–${x.repHigh}${x.isTime?"s":""}</span>`).join(" · ")}</div></div>`).join("")}</div>`,
    yes:tx("استخدمه","Use it"),onYes:()=>{ applyProgram(P); tab="plan"; render(); toast(tx("البرنامج اتغيّر ✓","Program changed ✓")); buzz(30); }});
}
function pickProgramFile(){
  const f=document.createElement("input"); f.type="file"; f.accept=".json,.txt,application/json,text/plain";
  f.onchange=()=>{ const file=f.files?.[0]; if(!file) return;
    const rd=new FileReader(); rd.onload=()=>previewProgram(String(rd.result||"")); rd.readAsText(file); };
  f.click();
}
async function exportProgram(){
  const sch=toSchema(PROGRAM,ORDER,PROGRAM_NAME,true);
  if(await giveFile(`tamreen-program-${slug(sch.name)}.json`,JSON.stringify(sch,null,2),"application/json")) toast(tx("البرنامج اتصدّر","Program exported"));
}
function copyProgramPrompt(){ giveText(programPrompt()); }
function resetProgram(){
  sheet({text:tx("ترجّع البرنامج الأصلي؟","Go back to the built-in program?"),body:tx("التمارين اللي مش فيه هتتشال من البرنامج، بس سجلها بيفضل.",
    "Exercises that aren't in it leave the program, but their history stays."),yes:tx("رجّع","Reset"),danger:true,
    onYes:()=>{ applyProgram(null); render(false); toast(tx("رجع الأصلي","Back to the built-in program")); }});
}

/* ── the prompt for the Claude chat ── */
/* the example inside the prompt; the tests check that the app accepts it */
const PROGRAM_EXAMPLE={schema:1,name:"Sara's Program",workouts:[
  {id:"A",label:"Workout A",tag:"Full body — squat focus",exercises:[
    {id:"goblet-squat-1",name:"Goblet Squat",equipment:"dumbbell",sets:3,repLow:8,repHigh:12,perSide:false,isTime:false,addWeight:false},
    {id:"dumbbell-bench-press-1",name:"Dumbbell Bench Press",equipment:"dumbbell",sets:3,repLow:8,repHigh:12,perSide:false,isTime:false,addWeight:false},
    {id:"seated-cable-row-1",name:"Seated Cable Row",equipment:"cable",sets:3,repLow:10,repHigh:12,perSide:false,isTime:false,addWeight:false},
    {id:"walking-lunge-1",name:"Walking Lunge",equipment:"dumbbell",sets:2,repLow:8,repHigh:10,perSide:true,isTime:false,addWeight:false},
    {id:"plank-1",name:"Plank",equipment:"body",sets:3,repLow:20,repHigh:45,perSide:false,isTime:true,addWeight:false}]},
  {id:"B",label:"Workout B",tag:"Full body — hinge and pull focus",exercises:[
    {id:"romanian-deadlift-1",name:"Romanian Deadlift",equipment:"barbell",sets:3,repLow:8,repHigh:10,perSide:false,isTime:false,addWeight:false},
    {id:"assisted-pull-up-1",name:"Assisted Pull-up",equipment:"body",sets:3,repLow:6,repHigh:10,perSide:false,isTime:false,addWeight:true,assisted:true},
    {id:"leg-press-1",name:"Leg Press",equipment:"machine",sets:3,repLow:10,repHigh:12,perSide:false,isTime:false,addWeight:false},
    {id:"dumbbell-shoulder-press-1",name:"Seated Dumbbell Shoulder Press",equipment:"dumbbell",sets:3,repLow:8,repHigh:12,perSide:false,isTime:false,addWeight:false},
    {id:"single-arm-dumbbell-row-1",name:"Single-Arm Dumbbell Row",equipment:"dumbbell",sets:2,repLow:10,repHigh:12,perSide:true,isTime:false,addWeight:false}]}]};
const PROGRAM_SCHEMA={type:"object",required:["schema","name","workouts"],additionalProperties:false,properties:{
  schema:{const:1},
  name:{type:"string",minLength:1,maxLength:60},
  workouts:{type:"array",minItems:1,maxItems:7,items:{type:"object",required:["id","label","tag","exercises"],additionalProperties:false,properties:{
    id:{type:"string",pattern:"^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$"},
    label:{type:"string",minLength:1,maxLength:40},
    tag:{type:"string",maxLength:80},
    exercises:{type:"array",minItems:1,maxItems:15,items:{type:"object",
      required:["id","name","equipment","sets","repLow","repHigh","perSide","isTime","addWeight"],additionalProperties:false,properties:{
      id:{type:"string",pattern:"^[a-z0-9]+(-[a-z0-9]+)*-[0-9]+$"},
      name:{type:"string",minLength:1,maxLength:80},
      equipment:{enum:EQUIPMENT},
      sets:{type:"integer",minimum:1,maximum:10},
      repLow:{type:"integer",minimum:1,maximum:600},
      repHigh:{type:"integer",minimum:1,maximum:600},
      perSide:{type:"boolean"},isTime:{type:"boolean"},addWeight:{type:"boolean"},assisted:{type:"boolean"}}}}}}}}};
function programPrompt(){
  return [
    "I'd like a personalised gym program for my workout-log app, Tamreen.",
    "",
    "Step 1 — ask me these questions, all in one message, and wait for my answers:",
    "1. Height",
    "2. Weight",
    "3. Age",
    "4. Training experience (how long, and what I've been doing)",
    "5. Main goal (for example: build muscle, lose fat, get stronger, general fitness)",
    "6. Equipment I can use (full gym, dumbbells at home, bodyweight only…)",
    "7. How many sessions a week I can realistically train",
    "8. Any injuries, pain or movements I should avoid",
    ...(isAr()?["Talk to me in Egyptian Arabic, but keep everything inside the JSON in English."]:[]),
    "",
    "Step 2 — design the program, then reply with ONLY one JSON object that matches the schema below. No text before or after it, no explanation, no markdown code fences: the app reads your reply directly.",
    "",
    "How the app uses the program:",
    "- \"workouts\" is a rotation: the app runs them in order (first, second, …, then back to the first) on whatever days I train. Choose 2–5 workouts that fit my sessions per week.",
    "- The first 3 exercises of each workout are its minimum session and get longer rest, so put the most important lifts first.",
    "- Every set is logged as weight × reps, or seconds for holds.",
    "",
    "Field rules:",
    "- \"schema\" is always 1. \"name\" is a short name for the program, like \"Ahmed's Program\".",
    "- workouts[].id: short and unique, like \"A\", \"B\", \"C\". label: like \"Workout A\" or \"Upper A\". tag: a few words on its focus.",
    "- exercises[].id: the exercise name in lowercase with hyphens, plus a counter, like \"leg-press-1\". Unique across the whole program: if the same movement is in two workouts, number them \"leg-press-1\" and \"leg-press-2\".",
    "- name: the usual English name of the exercise.",
    "- equipment: exactly one of \"machine\", \"dumbbell\", \"barbell\", \"cable\", \"body\".",
    "- sets: 1–10. repLow / repHigh: the rep range, repLow ≤ repHigh, 1–100 reps. For holds (isTime) they are seconds, up to 600.",
    "- perSide: true when right and left are logged separately (single-arm or single-leg work).",
    "- isTime: true for holds timed in seconds, like a plank (no weight).",
    "- addWeight: true for bodyweight moves that can take added weight or assistance, like pull-ups and dips (with \"equipment\": \"body\").",
    "- assisted (optional): true together with addWeight when the weight I log is machine assistance (an assisted pull-up machine).",
    "- Always include perSide, isTime and addWeight (true or false). No other fields.",
    "",
    "JSON Schema:",
    JSON.stringify(PROGRAM_SCHEMA,null,2),
    "",
    "Example of a valid reply (a 2-workout program):",
    JSON.stringify(PROGRAM_EXAMPLE,null,2)].join("\n");
}
