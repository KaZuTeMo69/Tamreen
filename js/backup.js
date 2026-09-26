/* ══ backup / restore / CSV ══════════════════════════ */
function dl(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
/* FEATURE: on phones the file goes to the share sheet (WhatsApp, Drive, Files…), elsewhere it downloads.
   Resolves false only when the person cancels the share sheet. */
async function giveFile(name,text,type){
  const f=typeof File==="function"?new File([text],name,{type}):null;
  if(f&&matchMedia("(pointer:coarse)").matches&&navigator.canShare?.({files:[f]})){
    try{ await navigator.share({files:[f],title:name}); return true; }
    catch(e){ if(e.name==="AbortError") return false; }
  }
  dl(name,text,type); return true;
}
/* same idea for plain text: share sheet on phones (Copy, Claude, WhatsApp…), clipboard elsewhere,
   and a copyable box when neither is allowed */
async function giveText(text){
  if(matchMedia("(pointer:coarse)").matches&&navigator.share){
    try{ await navigator.share({text}); return; }
    catch(e){ if(e.name==="AbortError") return; }
  }
  try{ await navigator.clipboard.writeText(text); toast("اتنسخ — افتح Claude والصقه"); return; }catch(e){}
  sheet({text:"انسخ الرسالة دي والصقها في Claude",area:text,yes:"تمام"});
}
async function backup(){
  if(!await giveFile(`tamreen-backup-${today()}.json`,JSON.stringify(D),"application/json")) return;
  D.lastBackup=Date.now(); save(); render(false); toast("النسخة اتحفظت");
}

/* FIX: proper CSV — fields with commas, quotes or line breaks are quoted, and read back the same way */
const csvCell=v=>{ v=String(v??""); return /[",\r\n]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; };
function csvRows(txt){
  const rows=[]; let row=[],cell="",q=false;
  for(let i=0;i<txt.length;i++){
    const ch=txt[i];
    if(q){ if(ch!=='"') cell+=ch; else if(txt[i+1]==='"'){ cell+='"'; i++; } else q=false; }
    else if(ch==='"') q=true;
    else if(ch===","){ row.push(cell); cell=""; }
    else if(ch==="\n"||ch==="\r"){ if(ch==="\r"&&txt[i+1]==="\n") i++; row.push(cell); rows.push(row); row=[]; cell=""; }
    else cell+=ch;
  }
  row.push(cell); rows.push(row);
  return rows.filter(r=>r.some(c=>c.trim()));
}
/* CSV → sessions (accepts exports from any version of the app) */
const ALIASES={"chest cable row":"a3","pull-up":"b1","pull up":"b1","pull-up (assisted)":"b1",
  "leg extension + seated curl":"c4b","seated calf raise":"c6","standing calf raises":"c6",
  "leg press / hack squat":"a1"};
function nameToId(name){
  const k=String(name||"").trim().toLowerCase();
  if(ALIASES[k]) return ALIASES[k];
  const hit=ALL.find(e=>e.n.toLowerCase()===k);
  if(hit) return hit.id;
  for(const [id,nm] of Object.entries(D.swaps||{})) if(String(nm).toLowerCase()===k) return id;
  return null;
}
function parseCSV(txt){
  const lines=csvRows(txt); if(!lines.length) return {sessions:[],skipped:[]};
  const head=lines.shift().map(h=>h.trim().toLowerCase());
  const col=n=>head.indexOf(n);
  const iD=col("date"),iW=col("workout"),iE=col("exercise"),iId=col("exercise_id"),iWarm=col("warmup"),
        iWt=col("weight"),iU=col("unit"),iR=col("reps"),iL=col("reps_left"),iRir=col("rir"),
        iMin=col("session_minutes"),iNote=col("session_note");
  const map=new Map(),skipped=[];
  lines.forEach(c=>{
    const date=c[iD]?.trim(), wk=c[iW]?.trim(), nm=c[iE]?.trim();
    if(!isDate(date)||!PROGRAM[wk]) return;
    /* FIX: the exercise id (newer exports) wins over the name, so renamed exercises aren't dropped */
    const id=(iId>=0&&byId(c[iId]?.trim())?c[iId].trim():null)||nameToId(nm);
    if(!id){ skipped.push(nm); return; }
    const key=date+"|"+wk;
    if(!map.has(key)) map.set(key,{date,workout:wk,entries:{},units:{},names:{},counts:{},rir:{}});
    const s=map.get(key);
    (s.entries[id]=s.entries[id]||[]).push({
      w:normNum(c[iWt]), r:normNum(c[iR]), r2:(iL>=0?normNum(c[iL]):""),
      warm:iWarm>=0&&/warm/i.test(c[iWarm]||"")});
    s.units[id]=(iU>=0&&c[iU]?.trim()==="lb")?"lb":"kg";
    s.names[id]=nm||byId(id).n;
    s.counts[id]=s.entries[id].length;
    const rir=iRir>=0?normNum(c[iRir]):"";
    if(rir!==""&&[0,1,2,3].includes(+rir)) s.rir[id]=+rir;
    /* session-level columns repeat on every row; the first value wins */
    const mins=Math.round(num(c[iMin])); if(!s.mins&&mins>=1&&mins<=600) s.mins=mins;
    const note=(c[iNote]||"").trim(); if(!s.note&&note) s.note=note.slice(0,1000);
  });
  return {sessions:[...map.values()].sort((a,b)=>a.date<b.date?-1:1),skipped};
}

/* FIX: a JSON backup is checked and cleaned before it replaces anything.
   Fields the file has replace the current ones; fields it lacks (older backups) are kept. */
function cleanSession(s){
  if(!s||!isDate(s.date)||!PROGRAM[s.workout]||!s.entries||typeof s.entries!=="object") return null;
  const out={date:s.date,workout:s.workout,entries:{},units:{},counts:{},rir:{}};
  if(s.names&&typeof s.names==="object") out.names={};   // very old backups have none — migrate() adds them
  for(const [id,rows] of Object.entries(s.entries)){
    if(!Array.isArray(rows)) continue;
    out.entries[id]=rows.map(r=>({w:normNum(r?.w),r:normNum(r?.r),r2:normNum(r?.r2),warm:!!r?.warm}));
    out.units[id]=s.units?.[id]==="lb"?"lb":"kg";
    if(out.names) out.names[id]=String(s.names[id]??(byId(id)?.n||id)).slice(0,80);
    out.counts[id]=out.entries[id].length;
    if([0,1,2,3].includes(s.rir?.[id])) out.rir[id]=s.rir[id];
  }
  if(s.sides&&typeof s.sides==="object"){ out.sides={}; for(const id in s.sides) if(s.sides[id]) out.sides[id]=true; }
  const mins=Math.round(num(s.mins)); if(mins>=1&&mins<=600) out.mins=mins;
  if(typeof s.note==="string"&&s.note.trim()) out.note=s.note.trim().slice(0,1000);
  return out;
}
function cleanBackup(obj){
  const d={...D},has=k=>obj[k]!==undefined&&obj[k]!==null;
  const numIn=(v,lo,hi,def)=>{ const t=normNum(v),x=+t; return t&&!isNaN(x)&&x>=lo&&x<=hi?x:def; };
  /* the program (all three days, each with at least one valid exercise) and taken-out exercises */
  const cleanEx=e=>{
    if(!e||typeof e!=="object"||!/^[a-z0-9]{1,24}$/i.test(String(e.id))||!EQ[e.eq]) return null;
    const int=(v,lo,hi,def)=>Math.round(numIn(v,lo,hi,def));
    const x={id:String(e.id),n:String(e.n??e.id).slice(0,80),eq:e.eq,sets:int(e.sets,1,10,3),lo:int(e.lo,1,100,8),hi:int(e.hi,1,100,12)};
    if(x.hi<x.lo) x.hi=x.lo;
    FLAGS.forEach(f=>{ if(e[f]) x[f]=true; });
    return x;
  };
  if(obj.program===null) d.program=null;
  else if(obj.program&&typeof obj.program==="object"){
    const P={},seen=new Set();
    const ok=ORDER.every(k=>{
      const ex=(Array.isArray(obj.program[k]?.ex)?obj.program[k].ex:[]).map(cleanEx).filter(e=>e&&!seen.has(e.id)&&seen.add(e.id));
      P[k]={label:DEFAULT_PROGRAM[k].label,tag:String(obj.program[k]?.tag??DEFAULT_PROGRAM[k].tag).slice(0,80),ex};
      return ex.length>0;
    });
    if(ok) d.program=P;
  }
  if(has("retired")){ d.retired={}; Object.values(obj.retired).map(cleanEx).forEach(e=>{ if(e) d.retired[e.id]=e; }); }
  const ids=new Set([...ALL.map(e=>e.id),...Object.values(d.program||{}).flatMap(p=>p.ex.map(e=>e.id)),...Object.keys(d.retired||{})]);
  const map=(src,ok)=>{ const m={}; for(const [id,v] of Object.entries(src||{})){ const x=ids.has(id)&&ok(v); if(x) m[id]=x; } return m; };
  const log=(L,f)=>(Array.isArray(L)?L:[]).filter(x=>isDate(x?.date)&&num(x[f])>0).map(x=>({date:x.date,[f]:num(x[f])}));
  const plates=(L,def)=>{ const x=Array.isArray(L)?[...new Set(L.map(num).filter(v=>v>0))].sort((a,b)=>b-a):[]; return x.length?x:def; };
  d.sessions=obj.sessions.map(cleanSession).filter(Boolean);
  if(has("waist")) d.waist=log(obj.waist,"cm");
  if(has("bw")) d.bw=log(obj.bw,"kg");
  if(has("units")) d.units=map(obj.units,v=>(v==="kg"||v==="lb")&&v);
  if(has("sides")) d.sides=map(obj.sides,v=>!!v);
  if(has("swaps")) d.swaps=map(obj.swaps,v=>String(v).trim().slice(0,80));
  if(has("videos")) d.videos=map(obj.videos,safeUrl);
  if(PROGRAM[obj.cursor]) d.cursor=obj.cursor;
  if(obj.unit==="kg"||obj.unit==="lb") d.unit=obj.unit;
  if(has("name")) d.name=String(obj.name).slice(0,30);
  d.goal=Math.round(numIn(obj.goal,1,31,d.goal));
  if(Array.isArray(obj.rest)) d.rest=[0,1].map(i=>Math.round(numIn(obj.rest[i],5,900,d.rest[i])));
  d.bar=numIn(obj.bar,0,200,d.bar); d.barLb=numIn(obj.barLb,0,200,d.barLb);
  if(has("plates")) d.plates=plates(obj.plates,d.plates);
  if(has("platesLb")) d.platesLb=plates(obj.platesLb,d.platesLb);
  d.migrated=numIn(obj.migrated,0,99,0);
  return d;
}
function restore(){ document.getElementById("restoreFile").click(); }
function restored(){ loadProgram(); migrate(); D.lastBackup=D.changedAt=Date.now(); save(); draft=null; tab="log"; render(); toast("اترجّعت ✓"); }
document.getElementById("restoreFile").addEventListener("change",e=>{
  const f=e.target.files?.[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    const txt=String(rd.result||"").replace(/^\uFEFF/,"");
    const isCSV=/\.csv$/i.test(f.name)||/^date,workout,exercise/i.test(txt.trim());
    try{
      if(isCSV){
        const {sessions,skipped}=parseCSV(txt);
        if(!sessions.length) throw 0;
        sheet({text:"استرجاع من CSV؟",
          body:`الملف فيه ${sessions.length} حصة.`+(skipped.length?`\nتمارين مش متعرّف عليها (هتتجاهل): ${[...new Set(skipped)].join(", ")}`:"")+
               `\nده هيستبدل كل الحصص الحالية.`,
          yes:"استرجاع",danger:true,
          onYes:()=>{ D.sessions=sessions; D.migrated=2; restored(); }});
      }else{
        const obj=JSON.parse(txt);
        if(!obj||!Array.isArray(obj.sessions)) throw 0;
        const clean=cleanBackup(obj),bad=obj.sessions.length-clean.sessions.length;
        sheet({text:"استرجاع النسخة؟",
          body:`الملف فيه ${clean.sessions.length} حصة.`+(bad?`\n${bad} حصة فيها بيانات بايظة وهتتجاهل.`:"")+
               `\nده هيستبدل كل الداتا الحالية.`,
          yes:"استرجاع",danger:true,
          onYes:()=>{ D=clean; restored(); }});
      }
    }catch(err){ toast("الملف مش صالح"); }
    e.target.value="";
  };
  rd.readAsText(f);
});
async function exportCSV(){
  const rows=[["date","workout","exercise","exercise_id","set","warmup","weight","unit","reps","reps_left","rir",
    "session_minutes","session_note"]];
  [...D.sessions].sort((a,b)=>a.date<b.date?-1:1).forEach(s=>
    Object.keys(s.entries||{}).forEach(id=>(s.entries[id]||[]).forEach((r,i)=>{
      if(r.r||r.w) rows.push([s.date,s.workout,nameIn(s,id),id,i+1,r.warm?"warmup":"",r.w||"",
        s.units?.[id]||"kg",r.r||"",r.r2||"",s.rir?.[id]??"",s.mins||"",s.note||""]);
    })));
  if(await giveFile("tamreen.csv","\uFEFF"+rows.map(r=>r.map(csvCell).join(",")).join("\n"),"text/csv")) toast("اتصدّر");
}
function wipe(){
  sheet({text:"هيتمسح كل السجل نهائيًا",body:"اعمل نسخة احتياطية الأول لو مش متأكد.",yes:"امسح الكل",danger:true,
    onYes:()=>{ D={...defaults(),migrated:2}; loadProgram();
      save(); render(); toast("اتمسح"); buzz(40); }});
}
