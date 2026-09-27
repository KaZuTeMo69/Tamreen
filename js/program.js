/* ══ program ══════════════════════════════════════════ */
/* FEATURE: the program is data, not code. The active program is stored as JSON — schema 1, the same format
   as import / export (see js/programs.js) — under its own key, apart from the workout history. Without one,
   the built-in program below is used. Inside the app a program is
     PROGRAM = {workoutId: {label, tag, ex:[{id, n, eq, sets, lo, hi, uni, sec, addw, assist}]}}
     ORDER   = the workout ids in rotation order (any number of workouts)
   Exercise ids link a program to the logged history. Exercises that leave the program are kept in D.retired,
   and an id nothing knows falls back to the name saved in the session, so old history always renders. */

/* equipment names in the current language (getters, so a language switch needs no reload) */
const EQ={get machine(){ return tx("جهاز","Machine"); },get dumbbell(){ return tx("دمبل","Dumbbell"); },
  get barbell(){ return tx("بار","Barbell"); },get cable(){ return tx("كابل","Cable"); },get body(){ return tx("وزن الجسم","Bodyweight"); }};
/* the built-in program: the starting point for anyone who hasn't imported one */
const DEFAULT_PROGRAM={
 A:{label:"Workout A",tag:"ضغط رجل + دفع وسحب أفقي",ex:[
  {id:"a1",n:"Leg Press / Hack Squat",eq:"machine",sets:3,lo:8,hi:10},
  {id:"a2",n:"Incline Dumbbell Press",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"a3",n:"Chest-Supported Row",eq:"machine",sets:3,lo:10,hi:12},
  {id:"a4",n:"Dumbbell RDL",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"a5",n:"Lateral Raises",eq:"dumbbell",sets:3,lo:12,hi:15},
  {id:"a6",n:"Hanging Knee Raises",eq:"body",sets:3,lo:10,hi:20}]},
 B:{label:"Workout B",tag:"سحب رأسي أولوية + رجل أحادية",ex:[
  {id:"b1",n:"Pull-up (assisted)",eq:"body",addw:true,assist:true,sets:4,lo:5,hi:8},
  {id:"b7",n:"Lat Pulldown",eq:"machine",sets:3,lo:10,hi:12},
  {id:"b2",n:"Bulgarian Split Squat",eq:"dumbbell",uni:true,sets:3,lo:8,hi:10},
  {id:"b3",n:"Seated DB Shoulder Press",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"b4",n:"Lying Leg Curl",eq:"machine",sets:3,lo:10,hi:12},
  {id:"b5",n:"Incline Dumbbell Curl",eq:"dumbbell",sets:3,lo:10,hi:12},
  {id:"b6",n:"Hollow Body Hold",eq:"body",sec:true,sets:3,lo:20,hi:45}]},
 C:{label:"Workout C",tag:"Dips أولوية + ضغط أفقي",ex:[
  {id:"c1",n:"Dips",eq:"body",addw:true,sets:4,lo:6,hi:10},
  {id:"c2",n:"Flat Barbell Bench Press",eq:"barbell",sets:3,lo:6,hi:8},
  {id:"c3",n:"Single-Arm Dumbbell Row",eq:"dumbbell",uni:true,sets:3,lo:8,hi:10},
  {id:"c4",n:"Leg Extension",eq:"machine",sets:3,lo:10,hi:12},
  {id:"c4b",n:"Seated Leg Curl",eq:"machine",sets:3,lo:10,hi:12},
  {id:"c5",n:"Face Pulls",eq:"cable",sets:3,lo:15,hi:20},
  {id:"c6",n:"Calf Raise (Leg Press)",eq:"machine",sets:4,lo:12,hi:15}]}};
/* the built-in descriptions are Egyptian Arabic; these are their English versions */
const TAG_EN={A:"Leg press + horizontal push & pull",B:"Vertical pull first + single-leg",C:"Dips first + horizontal press"};
const GOAL=10,KEY="tamreen-v2",PROGRAM_KEY=KEY+"-program";
const PLATES=[20,15,10,5,2.5,1.25];
const EQUIPMENT=["machine","dumbbell","barbell","cable","body"];
const ID_RE=/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

/* PROGRAM / ORDER = the program in use (above). PROGRAM_NAME = its name ("" for the built-in).
   programStored = a program (imported or edited) is saved under PROGRAM_KEY.
   ALL = every exercise the app knows — program, retired ones, built-in — so old sessions keep their definitions. */
let PROGRAM=DEFAULT_PROGRAM,ORDER=Object.keys(DEFAULT_PROGRAM),PROGRAM_NAME="",programStored=false;
let ALL=Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex);
function loadProgram(){
  let sch=null;
  try{ const raw=localStorage.getItem(PROGRAM_KEY); if(raw){ const r=checkProgram(JSON.parse(raw));
    if(r.ok&&r.program.workouts.every(w=>w.exercises.every(x=>x.id))) sch=r.program; } }catch(e){}
  if(sch){ const x=fromSchema(sch); PROGRAM=x.program; ORDER=x.order; PROGRAM_NAME=sch.name; programStored=true; }
  else{ PROGRAM=DEFAULT_PROGRAM; ORDER=Object.keys(DEFAULT_PROGRAM); PROGRAM_NAME=""; programStored=false; }
  const seen=new Map();
  [...Object.values(PROGRAM).flatMap(p=>p.ex),...Object.values(D.retired||{}),...Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex)]
    .forEach(e=>{ if(!seen.has(e.id)) seen.set(e.id,e); });
  ALL=[...seen.values()];
  if(!PROGRAM[D.cursor]) D.cursor=ORDER[0];
}
/* save the program in use (after an edit), or forget it (back to the built-in) */
function storeProgram(sch){ try{ if(sch) localStorage.setItem(PROGRAM_KEY,JSON.stringify(sch)); else localStorage.removeItem(PROGRAM_KEY); }catch(e){} loadProgram(); }

/* a workout's name in the current language: "Workout A" is the built-in pattern and is translated;
   a name the program gave is shown as written. Sessions keep the name they were logged under (s.label). */
const labelText=(raw,id)=>{ const m=/^Workout (\S+)$/.exec(raw||""); return m?tx(`تمرين ${m[1]}`,raw):raw||tx(`تمرين ${id}`,`Workout ${id}`); };
const dayLabel=k=>labelText(PROGRAM[k]?.label,k);
const sessionLabel=s=>labelText(s.label||PROGRAM[s.workout]?.label,s.workout);
const dayTag=k=>{ const t=PROGRAM[k]?.tag||""; return !isAr()&&TAG_EN[k]&&t===DEFAULT_PROGRAM[k]?.tag?TAG_EN[k]:t; };
const programTitle=()=>PROGRAM_NAME||(programStored?tx("البرنامج الأصلي (متعدّل)","Built-in program (edited)"):tx("البرنامج الأصلي","Built-in program"));

const byId=id=>ALL.find(x=>x.id===id);
/* the newest name a session saved for an exercise */
const storedName=id=>{ for(let i=D.sessions.length-1;i>=0;i--){ const n=D.sessions[i].names?.[id]; if(n) return n; } return ""; };
/* never undefined — an id no definition knows (another program, an imported file) still shows up and saves,
   under the name its sessions saved */
const exDef=id=>byId(id)||{id,n:storedName(id)||id,eq:"machine",sets:1,lo:1,hi:99};
const inProgram=id=>Object.values(PROGRAM).some(p=>p.ex.some(e=>e.id===id));
/* no weight box: plain bodyweight moves and timed holds (unless they take added weight / assistance) */
const noLoad=e=>(e.eq==="body"||!!e.sec)&&!e.addw;

/* ── schema 1 ⇄ the app ── */
function fromSchema(sch){
  const program={};
  sch.workouts.forEach(w=>{ program[w.id]={label:w.label,tag:w.tag||"",ex:w.exercises.map(x=>{
    const e={id:x.id,n:x.name,eq:x.equipment,sets:x.sets,lo:x.repLow,hi:x.repHigh};
    if(x.perSide) e.uni=true;
    if(x.isTime) e.sec=true;
    if(x.addWeight||x.assisted) e.addw=true;
    if(x.assisted) e.assist=true;
    return e; })}; });
  return {program,order:sch.workouts.map(w=>w.id)};
}
/* share: the version for someone else — the names as shown, English descriptions, and right / left where
   this phone logs them that way */
function toSchema(prog=PROGRAM,order=ORDER,name=PROGRAM_NAME,share=false){
  return {schema:1,name:name||(D.name.trim()?`${D.name.trim()}'s program`:"Tamreen program"),
    workouts:order.map(k=>{ const w=prog[k];
      return {id:k,label:w.label,tag:share&&TAG_EN[k]&&w.tag===DEFAULT_PROGRAM[k]?.tag?TAG_EN[k]:(w.tag||""),
        exercises:w.ex.map(e=>{ const x={id:e.id,name:share?nameOf(e):e.n,equipment:e.eq,sets:e.sets,repLow:e.lo,repHigh:e.hi,
          perSide:!!e.uni||(share&&!!D.sides[e.id]),isTime:!!e.sec,addWeight:!!e.addw};
          if(e.assist) x.assisted=true;
          return x; })}; })};
}
/* a program saved by an older version, in the data or a backup: {A:{tag, ex:[…]}, B:{…}, C:{…}} with the
   built-in days. Bad exercises are dropped; a day left empty makes the whole thing unusable (null). */
function fromLegacy(obj){
  if(!obj||typeof obj!=="object") return null;
  const P={},seen=new Set(),int=(v,lo,hi,d)=>{ const x=Math.round(+v); return x>=lo&&x<=hi?x:d; };
  const ok=Object.keys(DEFAULT_PROGRAM).every(k=>{
    const ex=(Array.isArray(obj[k]?.ex)?obj[k].ex:[]).map(e=>{
      if(!e||typeof e!=="object"||!ID_RE.test(String(e.id))||!EQUIPMENT.includes(e.eq)||seen.has(String(e.id))) return null;
      seen.add(String(e.id));
      const x={id:String(e.id),n:String(e.n??e.id).slice(0,80),eq:e.eq,sets:int(e.sets,1,10,3),lo:int(e.lo,1,600,8),hi:int(e.hi,1,600,12)};
      if(x.hi<x.lo) x.hi=x.lo;
      ["uni","addw","assist","sec"].forEach(f=>{ if(e[f]) x[f]=true; });
      return x; }).filter(Boolean);
    P[k]={label:DEFAULT_PROGRAM[k].label,tag:String(obj[k]?.tag??DEFAULT_PROGRAM[k].tag).slice(0,80),ex};
    return ex.length>0;
  });
  return ok?toSchema(P,Object.keys(DEFAULT_PROGRAM),""):null;
}

/* checks a schema-1 program and returns a clean copy: {ok:true, program} or {ok:false, error} — the error
   names the field, e.g. 'workouts[1].exercises[2].repHigh (Lat Pulldown, in Workout B) → …'. Exercise ids may be left out
   (the importer makes them); ids must be unique across the program. */
function checkProgram(obj){
  const fail=(path,msg)=>({ok:false,error:`${path} → ${msg}`});
  const got=v=>tx(` (لقيت ${JSON.stringify(v)})`,` (got ${JSON.stringify(v)})`);
  const str=(v,max)=>typeof v==="string"&&v.trim().length>0&&v.trim().length<=max;
  const whole=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
  if(!obj||typeof obj!=="object"||Array.isArray(obj)) return fail("JSON",tx("لازم يكون object بين { }","must be one object in { }"));
  if(obj.schema!==1) return fail("schema",(typeof obj.schema==="number"&&obj.schema>1
    ?tx("البرنامج معمول لنسخة أحدث من التطبيق — حدّث الصفحة","made for a newer version of the app — reload the page")
    :tx("لازم يكون 1","must be 1"))+got(obj.schema));
  if(!str(obj.name,60)) return fail("name",tx("اسم البرنامج (نص من 1 لـ 60 حرف)","the program's name (text, 1–60 characters)")+got(obj.name));
  if(!Array.isArray(obj.workouts)||!obj.workouts.length||obj.workouts.length>7)
    return fail("workouts",tx("قايمة فيها من 1 لـ 7 تمارين (أيام)","a list of 1 to 7 workouts")+(Array.isArray(obj.workouts)?tx(` (فيها ${obj.workouts.length})`,` (has ${obj.workouts.length})`):got(obj.workouts)));
  const out={schema:1,name:obj.name.trim(),workouts:[]},wIds=new Map(),xIds=new Map();
  for(const [i,w] of obj.workouts.entries()){
    if(!w||typeof w!=="object"||Array.isArray(w)) return fail(`workouts[${i}]`,tx("لازم يكون object","must be an object"));
    const wHint=typeof w.label==="string"&&w.label.trim()?` (${w.label.trim().slice(0,30)})`:"";
    const wf=(f,msg)=>fail(`workouts[${i}].${f}${wHint}`,msg);
    if(typeof w.id!=="string"||!ID_RE.test(w.id)||w.id.length>24) return wf("id",tx("حروف إنجليزي وأرقام و - أو _ (لحد 24)","letters, digits, - or _ (up to 24)")+got(w.id));
    if(wIds.has(w.id)) return wf("id",tx(`مكرر — نفس id بتاع ${wIds.get(w.id)}`,`duplicate — same id as ${wIds.get(w.id)}`)+got(w.id));
    wIds.set(w.id,`workouts[${i}]`);
    if(!str(w.label,40)) return wf("label",tx("اسم التمرين ده (نص من 1 لـ 40 حرف)","the workout's name (text, 1–40 characters)")+got(w.label));
    if(w.tag!==undefined&&w.tag!==null&&(typeof w.tag!=="string"||w.tag.length>80)) return wf("tag",tx("نص لحد 80 حرف","text up to 80 characters")+got(w.tag));
    if(!Array.isArray(w.exercises)||!w.exercises.length||w.exercises.length>15)
      return wf("exercises",tx("قايمة فيها من 1 لـ 15 تمرين","a list of 1 to 15 exercises")+(Array.isArray(w.exercises)?tx(` (فيها ${w.exercises.length})`,` (has ${w.exercises.length})`):got(w.exercises)));
    const W={id:w.id,label:w.label.trim(),tag:(w.tag||"").trim(),exercises:[]};
    for(const [j,x] of w.exercises.entries()){
      if(!x||typeof x!=="object"||Array.isArray(x)) return fail(`workouts[${i}].exercises[${j}]${wHint}`,tx("لازم يكون object","must be an object"));
      const xHint=` (${typeof x.name==="string"&&x.name.trim()?x.name.trim().slice(0,40):"?"}${tx(`، في ${w.label.trim().slice(0,30)}`,`, in ${w.label.trim().slice(0,30)}`)})`;
      const xf=(f,msg)=>fail(`workouts[${i}].exercises[${j}].${f}${xHint}`,msg);
      if(x.id!==undefined&&x.id!==null&&x.id!==""){
        if(typeof x.id!=="string"||!ID_RE.test(x.id)) return xf("id",tx("حروف إنجليزي وأرقام و - أو _ (لحد 40)","letters, digits, - or _ (up to 40)")+got(x.id));
        if(xIds.has(x.id)) return xf("id",tx(`مكرر — نفس id بتاع ${xIds.get(x.id)}`,`duplicate — same id as ${xIds.get(x.id)}`)+got(x.id));
        xIds.set(x.id,`workouts[${i}].exercises[${j}]`);
      }
      if(!str(x.name,80)) return xf("name",tx("اسم التمرين (نص من 1 لـ 80 حرف)","the exercise name (text, 1–80 characters)")+got(x.name));
      if(!EQUIPMENT.includes(x.equipment)) return xf("equipment",tx("واحد من","one of")+` ${EQUIPMENT.join(", ")}`+got(x.equipment));
      for(const f of ["perSide","isTime","addWeight","assisted"])
        if(x[f]!==undefined&&typeof x[f]!=="boolean") return xf(f,tx("true أو false","true or false")+got(x[f]));
      if(!whole(x.sets,1,10)) return xf("sets",tx("رقم صحيح من 1 لـ 10","a whole number from 1 to 10")+got(x.sets));
      const top=x.isTime?600:100;
      if(!whole(x.repLow,1,top)) return xf("repLow",tx(`رقم صحيح من 1 لـ ${top}`,`a whole number from 1 to ${top}`)+got(x.repLow));
      if(!whole(x.repHigh,x.repLow,top)) return xf("repHigh",tx(`رقم صحيح من repLow (${x.repLow}) لـ ${top}`,`a whole number from repLow (${x.repLow}) to ${top}`)+got(x.repHigh));
      if(x.assisted&&!x.addWeight) return xf("assisted",tx("محتاج addWeight: true كمان","needs addWeight: true as well"));
      const X={name:x.name.trim(),equipment:x.equipment,sets:x.sets,repLow:x.repLow,repHigh:x.repHigh,
        perSide:!!x.perSide,isTime:!!x.isTime,addWeight:!!x.addWeight};
      if(x.id) X.id=x.id;
      if(x.assisted) X.assisted=true;
      W.exercises.push(X);
    }
    out.workouts.push(W);
  }
  /* stored programs always have ids; a program to import may not yet */
  return {ok:true,program:out};
}
