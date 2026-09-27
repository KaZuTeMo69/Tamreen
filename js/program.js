/* ══ program ══════════════════════════════════════════ */
/* equipment names in the current language (getters, so a language switch needs no reload) */
const EQ={get machine(){ return tx("جهاز","Machine"); },get dumbbell(){ return tx("دمبل","Dumbbell"); },
  get barbell(){ return tx("بار","Barbell"); },get cable(){ return tx("كابل","Cable"); },get body(){ return tx("وزن الجسم","Bodyweight"); }};
/* the built-in program; an edited copy lives in D.program (see the editor in actions.js) */
const DEFAULT_PROGRAM={
 A:{label:"تمرين A",tag:"ضغط رجل + دفع وسحب أفقي",ex:[
  {id:"a1",n:"Leg Press / Hack Squat",eq:"machine",sets:3,lo:8,hi:10},
  {id:"a2",n:"Incline Dumbbell Press",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"a3",n:"Chest-Supported Row",eq:"machine",sets:3,lo:10,hi:12},
  {id:"a4",n:"Dumbbell RDL",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"a5",n:"Lateral Raises",eq:"dumbbell",sets:3,lo:12,hi:15},
  {id:"a6",n:"Hanging Knee Raises",eq:"body",sets:3,lo:10,hi:20}]},
 B:{label:"تمرين B",tag:"سحب رأسي أولوية + رجل أحادية",ex:[
  {id:"b1",n:"Pull-up (assisted)",eq:"body",addw:true,assist:true,sets:4,lo:5,hi:8},
  {id:"b7",n:"Lat Pulldown",eq:"machine",sets:3,lo:10,hi:12},
  {id:"b2",n:"Bulgarian Split Squat",eq:"dumbbell",uni:true,sets:3,lo:8,hi:10},
  {id:"b3",n:"Seated DB Shoulder Press",eq:"dumbbell",sets:3,lo:8,hi:10},
  {id:"b4",n:"Lying Leg Curl",eq:"machine",sets:3,lo:10,hi:12},
  {id:"b5",n:"Incline Dumbbell Curl",eq:"dumbbell",sets:3,lo:10,hi:12},
  {id:"b6",n:"Hollow Body Hold",eq:"body",sec:true,sets:3,lo:20,hi:45}]},
 C:{label:"تمرين C",tag:"Dips أولوية + ضغط أفقي",ex:[
  {id:"c1",n:"Dips",eq:"body",addw:true,sets:4,lo:6,hi:10},
  {id:"c2",n:"Flat Barbell Bench Press",eq:"barbell",sets:3,lo:6,hi:8},
  {id:"c3",n:"Single-Arm Dumbbell Row",eq:"dumbbell",uni:true,sets:3,lo:8,hi:10},
  {id:"c4",n:"Leg Extension",eq:"machine",sets:3,lo:10,hi:12},
  {id:"c4b",n:"Seated Leg Curl",eq:"machine",sets:3,lo:10,hi:12},
  {id:"c5",n:"Face Pulls",eq:"cable",sets:3,lo:15,hi:20},
  {id:"c6",n:"Calf Raise (Leg Press)",eq:"machine",sets:4,lo:12,hi:15}]}};
const ORDER=["A","B","C"],GOAL=10,KEY="tamreen-v2";
const PLATES=[20,15,10,5,2.5,1.25];
/* PROGRAM = the program in use. ALL = every exercise the app knows, including ones taken out of the
   program, so old sessions keep their definitions (volume, records, charts). */
let PROGRAM=DEFAULT_PROGRAM;
let ALL=Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex);
function loadProgram(){
  PROGRAM=D.program||DEFAULT_PROGRAM;
  const seen=new Map();
  [...Object.values(PROGRAM).flatMap(p=>p.ex),...Object.values(D.retired||{}),...Object.values(DEFAULT_PROGRAM).flatMap(p=>p.ex)]
    .forEach(e=>{ if(!seen.has(e.id)) seen.set(e.id,e); });
  ALL=[...seen.values()];
}
/* a day's name and description in the current language; a description the person wrote is shown as written */
const dayLabel=k=>tx("تمرين ","Workout ")+k;
const TAG_EN={A:"Leg press + horizontal push & pull",B:"Vertical pull first + single-leg",C:"Dips first + horizontal press"};
const dayTag=k=>{ const t=PROGRAM[k].tag; return !isAr()&&t===DEFAULT_PROGRAM[k].tag?TAG_EN[k]:t; };
const byId=id=>ALL.find(x=>x.id===id);
/* never undefined — an id from an imported file that no definition knows still shows up and saves */
const exDef=id=>byId(id)||{id,n:id,eq:"machine",sets:1,lo:1,hi:99};
const inProgram=id=>Object.values(PROGRAM).some(p=>p.ex.some(e=>e.id===id));
