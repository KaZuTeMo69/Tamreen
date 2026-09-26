/* ══ state ════════════════════════════════════════════ */
let D={cursor:"A",sessions:[],waist:[],units:{},sides:{},swaps:{},videos:{},bar:20,migrated:0};
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
const buzz=ms=>{try{navigator.vibrate?.(ms)}catch(e){}};

const today=()=>new Date().toISOString().slice(0,10);
const ym=s=>s.slice(0,7);
const fdate=s=>new Date(s).toLocaleDateString("ar-EG",{day:"numeric",month:"short"});
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const unitOf=id=>D.units[id]||"kg";
const perSide=id=>!!D.sides[id];
const nameOf=e=>D.swaps[e.id]||e.n;
const nameIn=(s,id)=>s.names?.[id]||(byId(id)?nameOf(byId(id)):id);
const toKg=(v,u)=>(+v||0)*(u==="lb"?0.4536:1);
const clone=o=>JSON.parse(JSON.stringify(o));
const step=ex=>ex.eq==="dumbbell"?2:(ex.eq==="cable"?2.5:5);
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
