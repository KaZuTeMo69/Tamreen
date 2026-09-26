/* ══ state ════════════════════════════════════════════ */
/* everything the app stores; settings live here too (name, units, goal, rest, bar & plates) */
const defaults=()=>({cursor:"A",sessions:[],waist:[],bw:[],units:{},sides:{},swaps:{},videos:{},
  name:"",unit:"kg",goal:GOAL,rest:[90,120],bar:20,plates:[...PLATES],barLb:45,platesLb:[45,35,25,10,5,2.5],migrated:0});
let D=defaults();
let tab="plan",draft=null,tick=null,progEx="a1";

try{
  const raw=localStorage.getItem(KEY);
  if(raw) D={...D,...JSON.parse(raw)};
  else{
    D.sessions=SEED_SESSIONS.map(s=>{
      const units={},names={...(s.names||{})},counts={};
      Object.keys(s.entries).forEach(id=>{ units[id]="kg"; counts[id]=s.entries[id].length;
        if(!names[id]) names[id]=(ALL.find(x=>x.id===id)||{}).n||id; });
      return {date:s.date,workout:s.workout,entries:s.entries,units,names,counts,rir:{}};
    });
    D.cursor="A";
    D.swaps={a3:"Chest Cable Row",c6:"Seated Calf Raise"};
    D.sides={a5:true,b2:true,b3:true,b5:true,c3:true};
    D.migrated=2;
  }
}catch(e){}
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
const fdate=s=>new Date(s).toLocaleDateString("ar-EG",{day:"numeric",month:"short"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const unitOf=id=>D.units[id]||D.unit||"kg";
const perSide=id=>!!D.sides[id];
const nameOf=e=>D.swaps[e.id]||e.n;
const nameIn=(s,id)=>s.names?.[id]||(byId(id)?nameOf(byId(id)):id);
/* was this exercise logged right / left in that session? (older records: any left-side reps) */
const sidesIn=(s,id)=>s.sides?!!s.sides[id]:(s.entries?.[id]||[]).some(r=>r.r2!==""&&r.r2!=null);
const toKg=(v,u)=>num(v)*(u==="lb"?0.4536:1);
const fromKg=(kg,u)=>u==="lb"?kg/0.4536:kg;
/* a weight logged in one unit, shown in another (rounded to 0.5) */
const conv=(v,from,to)=>from===to?num(v):Math.round(fromKg(toKg(v,from),to)*2)/2;
const UL={kg:"كجم",lb:"باوند"};
const clone=o=>JSON.parse(JSON.stringify(o));
const step=(ex,u)=>u==="lb"?(ex.eq==="dumbbell"||ex.eq==="cable"?5:10)
  :(ex.eq==="dumbbell"?2:(ex.eq==="cable"?2.5:5));
/* FIX: same-day sessions count once toward the monthly goal */
const monthCount=()=>new Set(D.sessions.filter(s=>ym(s.date)===ym(today())).map(s=>s.date)).size;
const setCount=(s,e)=>s.counts?.[e.id]||(s.entries?.[e.id]?.length)||e.sets;

/* one-time migration: split the old merged leg card + freeze historical names */
(function migrate(){
  if(D.migrated>=2) return;
  D.sessions.forEach(s=>{
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
  D.migrated=2; save();
})();
