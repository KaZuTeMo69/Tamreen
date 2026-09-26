/* ══ actions ══════════════════════════════════════════ */
function edit(id,s,f,v){ draft.entries[id][s][f]=normNum(v); refresh(); saveDraft(); }
function toggleWarm(id,s){ const r=draft.entries[id][s]; r.warm=!r.warm; redrawSets(id); saveDraft(); }
function setRir(id,v){ draft.rir[id]=draft.rir[id]===v?undefined:v; redrawRir(id); saveDraft(); }
function addSet(id){ draft.counts[id]++; draft.entries[id].push({w:"",r:"",r2:"",warm:false}); redrawSets(id); saveDraft(); }
function delSet(id){
  if(draft.counts[id]<=1) return;
  const drop=()=>{ draft.counts[id]--; draft.entries[id].pop(); redrawSets(id); refresh(); saveDraft(); };
  const r=draft.entries[id][draft.counts[id]-1];   // FIX: ask before dropping a set that has reps
  if(r.r||r.r2) return sheet({text:`تمسح ست ${draft.counts[id]}؟`,body:"فيه عدّات متسجّلة فيه.",yes:"امسح",danger:true,onYes:drop});
  drop();
}
/* FIX: unit / right-left / name changes on an old session stay on that session;
   on a new session they also become the default for next time */
function setUnit(id,u){
  draft.units[id]=u; if(draft.edit==null){ D.units[id]=u; save(); }
  redrawSets(id); saveDraft(); toast("الوحدة: "+u);
}
function toggleSide(id){
  draft.sides[id]=!draft.sides[id]; if(draft.edit==null){ D.sides[id]=draft.sides[id]; save(); }
  render(false);
}
function setProg(id){ progEx=id; render(false); }
function swap(id){
  const old=draft.edit!=null;
  sheet({text:"بدّل التمرين",
    body:old?"الاسم الجديد يتسجّل في الحصة دي بس.":"الاسم الجديد يتسجّل في الحصص الجاية بس — الحصص القديمة بتفضل بأسمائها.",
    value:draft.names[id],yes:"حفظ",
    onYes:v=>{ v=v.trim();
      if(!old){ v?D.swaps[id]=v:delete D.swaps[id]; save(); }
      draft.names[id]=v||byId(id).n; render(false); toast("اتغيّر"); }});
}
function pinVideo(id){
  sheet({text:"لينك يوتيوب للتمرين",body:"سيبه فاضي للرجوع للبحث التلقائي.",value:D.videos[id]||"",yes:"ثبّت",
    onYes:v=>{ v=v.trim();
      if(v){ const u=safeUrl(/^[a-z][a-z0-9+.-]*:/i.test(v)?v:"https://"+v);   // FIX: http(s) links only
        if(!u){ toast("اللينك مش صالح"); return; } D.videos[id]=u; }
      else delete D.videos[id];
      save(); render(false); toast("اتثبّت"); }});
}
/* FIX: works in the exercise's unit, with the bar and plates from settings */
function plateCalc(id){
  const u=draft?.units[id]||unitOf(id),lb=u==="lb",bar=lb?D.barLb:D.bar,plates=lb?D.platesLb:D.plates,U=UL[u];
  sheet({text:"حاسبة أوزان البار",body:`وزن البار ${bar} ${U}. اكتب الوزن الكلي المطلوب.`,value:"",type:"number",yes:"احسب",
    onYes:v=>{
      const total=num(v); if(!total) return;
      let side=(total-bar)/2;
      if(side<0) return sheet({text:"الوزن أقل من البار نفسه",body:`البار لوحده ${bar} ${U}.`,yes:"تمام"});
      const out=[];
      plates.forEach(p=>{ const n=Math.floor(side/p+1e-9); if(n){ out.push(`${n} × ${p}`); side=+(side-n*p).toFixed(2); } });
      sheet({text:`${total} ${U} = بار ${bar} + على كل جنب:`,
        body:(out.join("\n")||"لا شيء")+(side>0.01?`\n(باقي ${side} ${U} مش مظبوط بالأوزان المتاحة)`:""),yes:"تمام"});
    }});
}
function pickDate(){
  sheet({text:"تاريخ الحصة",value:draft.date,type:"date",yes:"حفظ",
    onYes:v=>{ if(v){ draft.date=v; render(false); toast("التاريخ اتغيّر"); } }});
}
/* FIX: a new workout copies the last one's layout — weights and warm-up flags by set number —
   so warm-ups don't shift the pre-filled weights */
function blankDraft(workout,date,edit){
  const entries={},counts={},rir={},units={},names={},sides={};
  PROGRAM[workout].ex.forEach(e=>{
    const l=edit==null?lastFor(e.id,date):null, all=l?.all||[], u=unitOf(e.id);
    const w=v=>!v?"":l.u===u?v:String(conv(v,l.u,u));   // FIX: last weights in today's unit
    let done=all.length; while(done&&!all[done-1].r) done--;
    counts[e.id]=Math.max(e.sets,done);
    entries[e.id]=Array.from({length:counts[e.id]},(_,i)=>({w:w(all[i]?.w),r:"",r2:"",warm:!!all[i]?.warm}));
    units[e.id]=u; names[e.id]=nameOf(e); sides[e.id]=perSide(e.id);
  });
  return {workout,entries,counts,rir,units,names,sides,date,edit};
}
function start(){ draft=blankDraft(D.cursor,today(),null); render(); }
function startPast(){
  sheet({text:"تاريخ الحصة اللي فاتت",value:today(),type:"date",yes:"ابدأ",
    onYes:v=>{ draft=blankDraft(D.cursor,v||today(),null); render(); }});
}
function openSession(i){
  const s=D.sessions[i],entries={},counts={},units={},names={},sides={};
  PROGRAM[s.workout].ex.forEach(e=>{
    const rows=s.entries?.[e.id]||[], n=Math.max(e.sets,rows.length);
    counts[e.id]=n;
    entries[e.id]=Array.from({length:n},(_,k)=>({w:rows[k]?.w||"",r:rows[k]?.r||"",r2:rows[k]?.r2||"",warm:!!rows[k]?.warm}));
    units[e.id]=s.units?.[e.id]||unitOf(e.id);
    names[e.id]=nameIn(s,e.id);
    sides[e.id]=(s.sides||rows.length)?sidesIn(s,e.id):perSide(e.id);
  });
  draft={workout:s.workout,entries,counts,rir:clone(s.rir||{}),units,names,sides,date:s.date,edit:i};
  draft.snap=snapOf(draft); render();
}
/* what an edit changes — used to ask before leaving an old session with unsaved changes */
const snapOf=d=>JSON.stringify([d.entries,d.rir,d.units,d.names,d.sides,d.date]);
function skip(){ D.cursor=ORDER[(ORDER.indexOf(D.cursor)+1)%3]; save(); render(); toast("اتبدّل"); }
function cancel(){
  if(draft.edit!=null){
    const leave=()=>{ draft=null; tab="log"; render(); };
    if(snapOf(draft)===draft.snap) return leave();
    return sheet({text:"تخرج من غير ما تحفظ التعديلات؟",yes:"خروج",danger:true,onYes:leave});   // FIX
  }
  sheet({text:"تلغي الحصة من غير حفظ؟",yes:"إلغاء الحصة",danger:true,
    onYes:()=>{ draft=null; stopTimer(); render(); }});
}
function finish(){
  const n=Object.values(draft.entries).filter(r=>r.some(x=>x.r)).length;
  if(!n){ toast("سجّل تمرين واحد على الأقل"); return; }
  const units={},names={},counts={},sides={},entries=clone(draft.entries);
  PROGRAM[draft.workout].ex.forEach(e=>{
    units[e.id]=draft.units[e.id]; names[e.id]=draft.names[e.id]; counts[e.id]=draft.counts[e.id];
    if(draft.sides[e.id]) sides[e.id]=true;
    else entries[e.id].forEach(r=>{ r.r2=""; });   // left column was hidden — don't keep stray values
  });
  const rir={}; Object.entries(draft.rir).forEach(([k,v])=>{ if(v!==undefined) rir[k]=v; });
  const rec={date:draft.date,workout:draft.workout,entries,units,names,counts,sides,rir};
  D.changedAt=Date.now();
  /* ask the browser to keep this site's data (Safari can clear it after weeks without a visit) */
  try{ navigator.storage?.persisted?.().then(p=>p||navigator.storage.persist()).catch(()=>{}); }catch(e){}
  if(draft.edit!=null){ D.sessions[draft.edit]=rec; draft=null; save(); tab="log"; render(); toast("اتحفظ ✓"); }
  else{
    D.sessions.push(rec);
    D.cursor=ORDER[(ORDER.indexOf(rec.workout)+1)%3];
    draft=null; stopTimer(); save(); tab="plan"; render(); toast("حصة اتسجّلت ✓");
  }
  buzz(30);
}
function delSession(){
  const i=draft.edit;
  sheet({text:"تحذف الحصة دي نهائيًا؟",yes:"حذف",danger:true,
    onYes:()=>{ D.sessions.splice(i,1); D.changedAt=Date.now(); draft=null; save(); tab="log"; render(); toast("اتحذفت"); buzz(30); }});
}
/* waist and bodyweight logs (see LOGS in views.js) */
function addLog(key){
  const L=LOGS[key],v=num(document.getElementById("log-"+key).value);
  if(!v){ toast("اكتب رقم"); return; }
  D[key].push({date:today(),[L.f]:+L.store(v).toFixed(3)}); D.changedAt=Date.now(); save(); render(false); toast("اتسجّل ✓");
}
function editLog(key,i){
  const L=LOGS[key],x=D[key][i];
  sheet({text:`${L.title} — ${fdate(x.date)}`,body:"سيبه فاضي عشان يتمسح.",value:String(L.show(x[L.f])),yes:"حفظ",
    onYes:v=>{ const n=num(v);
      if(!v.trim()||!n) D[key].splice(i,1); else x[L.f]=+L.store(n).toFixed(3);
      D.changedAt=Date.now(); save(); render(false); toast(n?"اتعدّل":"اتحذف"); }});
}
/* ══ settings ═════════════════════════════════════════ */
function go(t){ tab=t; buzz(10); render(); }
async function installApp(){
  const p=installPrompt; if(!p) return;
  p.prompt(); const {outcome}=await p.userChoice;
  installPrompt=null; render(false); if(outcome==="accepted") toast("اتثبّت ✓");
}
function saved(){ save(); render(false); toast("اتحفظ"); }
/* a number from a settings field, or null (and the field is reset) when it's out of range */
function setting(v,lo,hi,msg){
  const t=normNum(v),n=+t;
  if(!t||isNaN(n)||n<lo||n>hi){ toast(msg); render(false); return null; }
  return n;
}
function setName(v){ D.name=v.trim().slice(0,30); saved(); }
function setDefUnit(u){ D.unit=u; saved(); }
function setGoal(v){ const n=setting(v,1,31,"الهدف من ١ لـ ٣١"); if(n!==null){ D.goal=Math.round(n); saved(); } }
function setRest(i,v){ const n=setting(v,5,900,"الراحة من ٥ لـ ٩٠٠ ثانية"); if(n!==null){ D.rest[i]=Math.round(n); saved(); } }
function setBar(u,v){ const n=setting(v,0,200,"اكتب وزن البار"); if(n!==null){ D[u==="lb"?"barLb":"bar"]=n; saved(); } }
function setPlates(u,v){
  const L=[...new Set(v.split(/[\s,،;]+/).map(num).filter(x=>x>0))].sort((a,b)=>b-a);
  if(!L.length){ toast("اكتب الأوزان مفصولة بفاصلة"); render(false); return; }
  D[u==="lb"?"platesLb":"plates"]=L; saved();
}
