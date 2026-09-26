/* ══ backup / restore / CSV ══════════════════════════ */
function dl(name,text,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([text],{type})); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function backup(){ dl(`tamreen-backup-${today()}.json`,JSON.stringify(D),"application/json"); toast("النسخة اتحفظت"); }
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
  const lines=txt.split(/\r?\n/).filter(l=>l.trim());
  const head=lines.shift().split(",").map(h=>h.trim().toLowerCase());
  const col=n=>head.indexOf(n);
  const iD=col("date"),iW=col("workout"),iE=col("exercise"),iWarm=col("warmup"),
        iWt=col("weight"),iU=col("unit"),iR=col("reps"),iL=col("reps_left"),iRir=col("rir");
  const map=new Map(),skipped=[];
  lines.forEach(line=>{
    const c=line.split(",");
    const date=c[iD]?.trim(), wk=c[iW]?.trim(), nm=c[iE]?.trim();
    if(!date||!PROGRAM[wk]) return;
    const id=nameToId(nm); if(!id){ skipped.push(nm); return; }
    const key=date+"|"+wk;
    if(!map.has(key)) map.set(key,{date,workout:wk,entries:{},units:{},names:{},counts:{},rir:{}});
    const s=map.get(key);
    (s.entries[id]=s.entries[id]||[]).push({
      w:(c[iWt]||"").trim(), r:(c[iR]||"").trim(), r2:(iL>=0?(c[iL]||"").trim():""),
      warm:iWarm>=0&&/warm/i.test(c[iWarm]||"")});
    s.units[id]=(iU>=0&&(c[iU]||"").trim())||"kg";
    s.names[id]=nm;
    s.counts[id]=s.entries[id].length;
    if(iRir>=0&&(c[iRir]||"").trim()!=="") s.rir[id]=+c[iRir];
  });
  return {sessions:[...map.values()].sort((a,b)=>a.date<b.date?-1:1),skipped};
}
function restore(){ document.getElementById("restoreFile").click(); }
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
          onYes:()=>{ D.sessions=sessions; D.migrated=2; save(); draft=null; tab="log"; render(); toast("اترجّعت ✓"); }});
      }else{
        const obj=JSON.parse(txt);
        if(!obj||!Array.isArray(obj.sessions)) throw 0;
        sheet({text:"استرجاع النسخة؟",body:`الملف فيه ${obj.sessions.length} حصة. ده هيستبدل كل الداتا الحالية.`,
          yes:"استرجاع",danger:true,
          onYes:()=>{ D={...D,...obj}; save(); draft=null; tab="log"; render(); toast("اترجّعت ✓"); }});
      }
    }catch(err){ toast("الملف مش صالح"); }
    e.target.value="";
  };
  rd.readAsText(f);
});
function exportCSV(){
  const rows=[["date","workout","exercise","set","warmup","weight","unit","reps","reps_left","rir"]];
  [...D.sessions].sort((a,b)=>a.date<b.date?-1:1).forEach(s=>
    Object.keys(s.entries||{}).forEach(id=>(s.entries[id]||[]).forEach((r,i)=>{
      if(r.r||r.w) rows.push([s.date,s.workout,nameIn(s,id),i+1,r.warm?"warmup":"",r.w||"",
        s.units?.[id]||"kg",r.r||"",r.r2||"",s.rir?.[id]??""]);
    })));
  dl("tamreen.csv","\uFEFF"+rows.map(r=>r.join(",")).join("\n"),"text/csv");
  toast("اتصدّر");
}
function wipe(){
  sheet({text:"هيتمسح كل السجل نهائيًا",body:"اعمل نسخة احتياطية الأول لو مش متأكد.",yes:"امسح الكل",danger:true,
    onYes:()=>{ D={...defaults(),migrated:2};
      save(); render(); toast("اتمسح"); buzz(40); }});
}
