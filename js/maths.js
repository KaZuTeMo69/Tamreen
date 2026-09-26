/* ══ maths ════════════════════════════════════════════ */
const working=rows=>(rows||[]).filter(r=>r.r&&!r.warm);
function volume(s){
  let t=0;
  for(const [id,rows] of Object.entries(s.entries||{})){
    const ex=byId(id); if(!ex) continue;
    const u=s.units?.[id]||"kg", mult=(ex.eq==="dumbbell"&&!ex.uni)?2:1;
    working(rows).forEach(r=>{ t+=toKg(r.w,u)*((+r.r||0)+(+r.r2||0))*mult; });
  }
  return t;
}
function historyOf(id){          // newest last
  return D.sessions.filter(s=>working(s.entries?.[id]).length)
    .map(s=>({date:s.date,rows:working(s.entries[id]),u:s.units?.[id]||"kg",rir:s.rir?.[id]}));
}
function lastFor(id){ const h=historyOf(id); return h.length?h[h.length-1]:null; }
function topSet(h){
  return h.rows.reduce((b,r)=>{
    const kg=toKg(r.w,h.u), reps=Math.max(+r.r||0,+r.r2||0);
    const sc=kg>0?kg*(1+reps/30):reps;
    return (!b||sc>b.sc)?{sc,kg,reps,w:r.w}:b;
  },null);
}
/* FEATURE: next-session weight suggestion, driven by RIR */
function suggest(ex){
  const h=lastFor(ex.id); if(!h) return null;
  const scored=h.rows.filter(r=>Math.max(+r.r||0,+r.r2||0)>0);
  if(!scored.length) return null;
  const last=scored[scored.length-1];
  const reps=Math.max(+last.r||0,+last.r2||0), kg=toKg(last.w,h.u), rir=h.rir;
  const st=step(ex), fmt=v=>+(v.toFixed(2));
  if(!kg){ // bodyweight
    if(rir===undefined) return `آخر مرة ${reps} عدّة — استهدف ${reps+1}`;
    if(rir>=3) return `RIR ${rir} — ضيف وزن أو زوّد لـ ${reps+3} عدّات`;
    if(rir<=1) return `آخر مرة ${reps} عدّة و RIR ${rir} — استهدف ${reps+1}`;
    return `آخر مرة ${reps} عدّة — استهدف ${reps+2}`;
  }
  if(rir===undefined) return reps>=ex.hi?`آخر مرة ${fmt(kg)} × ${reps} — جرّب ${fmt(kg+st)}`
    :`آخر مرة ${fmt(kg)} × ${reps} — ثبّت الوزن واستهدف ${ex.hi}`;
  if(rir>=3) return `RIR ${rir} — الوزن خفيف، جرّب ${fmt(kg+st*2)}`;
  if(rir==2)  return `RIR 2 — جرّب ${fmt(kg+st)}`;
  if(reps<ex.lo&&rir===0) return `الوزن تقيل — انزل لـ ${fmt(Math.max(st,kg-st))}`;
  if(reps>=ex.hi) return `RIR ${rir} وكمّلت العدّات — جرّب ${fmt(kg+st)}`;
  return `ثبّت على ${fmt(kg)} واستهدف ${ex.hi} عدّات`;
}
function histLine(id){
  const h=historyOf(id).slice(-3).reverse();
  if(!h.length) return "";
  return "آخر ٣: "+h.map(x=>{const t=topSet(x);return t.kg?`${+t.kg.toFixed(1)}×${t.reps}`:`${t.reps}`;}).join(" · ");
}
