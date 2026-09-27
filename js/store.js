/* ══ state ════════════════════════════════════════════ */
/* everything the app stores; settings live here too (name, units, goal, rest, bar & plates).
   The program has its own key (PROGRAM_KEY, see program.js). */
const defaults=()=>({cursor:"A",sessions:[],waist:[],bw:[],units:{},sides:{},swaps:{},videos:{},retired:{},theme:"auto",exNotes:{},autoRest:true,
  name:"",unit:"kg",goal:GOAL,rest:[90,120],bar:20,plates:[...PLATES],barLb:45,platesLb:[45,35,25,10,5,2.5],
  lastBackup:0,changedAt:0,migrated:0});
let D=defaults();
let tab="plan",draft=null,tick=null,progEx="a1";
let installPrompt=null;   // Chrome's "install app" prompt, kept for the button in Settings
let calMonth=null;        // month shown in the log calendar, "YYYY-MM" (null = this month)

try{
  const raw=localStorage.getItem(KEY);
  /* a new phone starts empty (the app is shared: nobody gets someone else's history) */
  if(raw) D={...D,...JSON.parse(raw)}; else D.migrated=4;
}catch(e){}
loadProgram();
/* FEATURE: dark mode. "auto" follows the phone; "light" / "dark" force it (the CSS reads data-theme).
   The browser bar colour (theme-color) follows the page background. */
function applyTheme(){
  const el=document.documentElement;
  if(D.theme==="light"||D.theme==="dark") el.dataset.theme=D.theme; else delete el.dataset.theme;
  const bg=getComputedStyle(el).getPropertyValue("--bg").trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{ m.content=bg; });
}
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",applyTheme);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(e){}};
/* FIX: the open workout is stored on every change, so a reload or a killed tab doesn't lose it */
const DRAFT_KEY=KEY+"-draft";
const saveDraft=()=>{try{
  if(draft) localStorage.setItem(DRAFT_KEY,JSON.stringify({...draft,restEnd:endAt>Date.now()?endAt:0}));
  else localStorage.removeItem(DRAFT_KEY);
}catch(e){}};
const buzz=ms=>{try{navigator.vibrate?.(ms)}catch(e){}};

/* FIX: dates follow the phone's own time zone, not UTC */
const pad2=n=>String(n).padStart(2,"0");
const today=()=>{ const d=new Date(); return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`; };
/* FIX: Arabic-Indic digits (٠-٩ / ۰-۹) and comma decimals read as plain numbers */
const normNum=v=>String(v??"").replace(/[٠-٩]/g,c=>c.charCodeAt(0)-0x660)
  .replace(/[۰-۹]/g,c=>c.charCodeAt(0)-0x6F0).replace(/[٫,]/g,".").trim();
const num=v=>+normNum(v)||0;
const ym=s=>s.slice(0,7);
/* FIX: "YYYY-MM-DD" read as a local date — new Date(s) alone is UTC midnight, a day early west of UTC */
const fdate=s=>new Date(s+"T00:00:00").toLocaleDateString(LOCALE(),{day:"numeric",month:"short"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const unitOf=id=>D.units[id]||D.unit||"kg";
const perSide=id=>!!D.sides[id];
const nameOf=e=>D.swaps[e.id]||e.n;
const nameIn=(s,id)=>s.names?.[id]||nameOf(exDef(id));
/* was this exercise logged right / left in that session? (older records: any left-side reps) */
const sidesIn=(s,id)=>s.sides?!!s.sides[id]:(s.entries?.[id]||[]).some(r=>r.r2!==""&&r.r2!=null);
const toKg=(v,u)=>num(v)*(u==="lb"?0.4536:1);
const fromKg=(kg,u)=>u==="lb"?kg/0.4536:kg;
/* a weight logged in one unit, shown in another (rounded to 0.5) */
const conv=(v,from,to)=>from===to?num(v):Math.round(fromKg(toKg(v,from),to)*2)/2;
const UL={get kg(){ return tx("كجم","kg"); },get lb(){ return tx("باوند","lb"); }};
const clone=o=>JSON.parse(JSON.stringify(o));
const isDate=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v);
/* only http(s) links — a pinned or restored "javascript:" link is dropped */
const safeUrl=v=>{ try{ const u=new URL(String(v)); return /^https?:$/.test(u.protocol)?u.href:""; }catch(e){ return ""; } };
const daysSince=t=>Math.max(0,Math.floor((Date.now()-t)/864e5));   // never negative, even if the phone's clock moved back
const step=(ex,u)=>u==="lb"?(ex.eq==="dumbbell"||ex.eq==="cable"?5:10)
  :(ex.eq==="dumbbell"?2:(ex.eq==="cable"?2.5:5));
/* FIX: same-day sessions count once toward the monthly goal */
const monthCount=()=>new Set(D.sessions.filter(s=>ym(s.date)===ym(today())).map(s=>s.date)).size;
const setCount=(s,e)=>s.counts?.[e.id]||(s.entries?.[e.id]?.length)||e.sets;

/* one-time migrations (also run after a restore):
   2 — split the old merged leg card + freeze historical names;
   3 — c6 is done on the leg press: "Seated Calf Raise" / "Standing Calf Raises" → "Calf Raise (Leg Press)",
       in the program, the saved rename and past workouts (only the label; the sets are untouched);
   4 — a program edited in an older version (D.program) moves to its own key as schema-1 JSON */
function migrate(){
  if(D.migrated>=4) return;
  if((D.migrated||0)<3) migrate3();
  if(D.program){ const sch=fromLegacy(D.program); if(sch) storeProgram(sch); }
  delete D.program; loadProgram();
  D.migrated=4; save();
}
function migrate3(){
  if((D.migrated||0)<2) D.sessions.forEach(s=>{
    if(s.workout==="C"&&s.entries?.c4&&!s.entries.c4b){
      s.entries.c4b=s.entries.c4; delete s.entries.c4;
      if(s.units?.c4){ s.units.c4b=s.units.c4; delete s.units.c4; }
    }
    if(!s.names){
      s.names={};
      Object.keys(s.entries||{}).forEach(id=>{ s.names[id]=byId(id)?nameOf(byId(id)):id; });
      if(s.entries?.c4b&&s.workout==="C") s.names.c4b="Seated Leg Curl";
    }
  });
  const OLD=["Seated Calf Raise","Standing Calf Raises"],NEW="Calf Raise (Leg Press)";
  if(OLD.includes(D.swaps?.c6)) delete D.swaps.c6;
  [...Object.values(D.program||{}).flatMap(p=>p.ex||[]),D.retired?.c6].forEach(e=>{ if(e?.id==="c6"&&OLD.includes(e.n)) e.n=NEW; });
  D.sessions.forEach(s=>{ if(OLD.includes(s.names?.c6)) s.names.c6=NEW; });
}
migrate();
