/* ══ actions ══════════════════════════════════════════ */
function edit(id,s,f,v){ draft.entries[id][s][f]=normNum(v); refresh(); saveDraft(); }
function toggleWarm(id,s){ const r=draft.entries[id][s]; r.warm=!r.warm; redrawSets(id); saveDraft(); }
function setRir(id,v){ draft.rir[id]=draft.rir[id]===v?undefined:v; redrawRir(id); saveDraft(); }
function addSet(id){ draft.counts[id]++; draft.entries[id].push({w:"",r:"",r2:"",warm:false}); redrawSets(id); saveDraft(); }
function delSet(id){
  if(draft.counts[id]<=1) return;
  draft.counts[id]--; draft.entries[id].pop(); redrawSets(id); refresh(); saveDraft();
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
    onYes:v=>{ v.trim()?D.videos[id]=v.trim():delete D.videos[id]; save(); render(false); toast("اتثبّت"); }});
}
function plateCalc(id){
  const u=unitOf(id);
  sheet({text:"حاسبة أوزان البار",body:`وزن البار الحالي ${D.bar} كجم. اكتب الوزن الكلي المطلوب.`,value:"",type:"number",yes:"احسب",
    onYes:v=>{
      const total=num(v); if(!total) return;
      let side=(total-D.bar)/2;
      if(side<0) return sheet({text:"الوزن أقل من البار نفسه",body:`البار لوحده ${D.bar} كجم.`,yes:"تمام"});
      const out=[];
      PLATES.forEach(p=>{ const n=Math.floor(side/p+1e-9); if(n){ out.push(`${n} × ${p}`); side=+(side-n*p).toFixed(2); } });
      sheet({text:`${total} كجم = بار ${D.bar} + على كل جنب:`,
        body:(out.join("\n")||"لا شيء")+(side>0.01?`\n(باقي ${side} كجم مش مظبوط بالأوزان المتاحة)`:""),yes:"تمام"});
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
    const all=edit==null?(lastFor(e.id,date)?.all||[]):[];
    let done=all.length; while(done&&!all[done-1].r) done--;
    counts[e.id]=Math.max(e.sets,done);
    entries[e.id]=Array.from({length:counts[e.id]},(_,i)=>({w:all[i]?.w||"",r:"",r2:"",warm:!!all[i]?.warm}));
    units[e.id]=unitOf(e.id); names[e.id]=nameOf(e); sides[e.id]=perSide(e.id);
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
  draft={workout:s.workout,entries,counts,rir:clone(s.rir||{}),units,names,sides,date:s.date,edit:i}; render();
}
function skip(){ D.cursor=ORDER[(ORDER.indexOf(D.cursor)+1)%3]; save(); render(); toast("اتبدّل"); }
function cancel(){
  if(draft.edit!=null){ draft=null; tab="log"; render(); return; }
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
    onYes:()=>{ D.sessions.splice(i,1); draft=null; save(); tab="log"; render(); toast("اتحذفت"); buzz(30); }});
}
function addWaist(){
  const v=num(document.getElementById("waist").value);
  if(!v){ toast("اكتب رقم"); return; }
  D.waist.push({date:today(),cm:v}); save(); render(false); toast("اتسجّل ✓");
}
function editWaist(i){
  sheet({text:`قياس ${fdate(D.waist[i].date)}`,body:"سيبه فاضي عشان يتمسح.",value:String(D.waist[i].cm),yes:"حفظ",
    onYes:v=>{ const n=num(v);
      if(!v.trim()||!n) D.waist.splice(i,1); else D.waist[i].cm=n;
      save(); render(false); toast(n?"اتعدّل":"اتحذف"); }});
}
