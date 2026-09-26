/* ══ maths ════════════════════════════════════════════ */
const working=rows=>(rows||[]).filter(r=>r.r&&!r.warm);
/* total weight moved, in kg. Assistance on a pull-up machine isn't load, so it counts 0.
   FIX: two-dumbbell lifts logged right / left already add both sides — don't double them */
function volume(s){
  let t=0;
  for(const [id,rows] of Object.entries(s.entries||{})){
    const ex=byId(id); if(!ex||ex.assist) continue;
    const u=s.units?.[id]||"kg", mult=(ex.eq==="dumbbell"&&!ex.uni&&!sidesIn(s,id))?2:1;
    working(rows).forEach(r=>{ t+=toKg(r.w,u)*(num(r.r)+num(r.r2))*mult; });
  }
  return t;
}
/* FIX: ordered by session date (not by when it was entered), newest last.
   upTo (optional) ignores sessions after that date — used when logging a past session.
   rows = working sets only; all = every set as logged, so set numbers line up with warm-ups. */
function historyOf(id,upTo){
  return D.sessions.map((s,i)=>({s,i}))
    .filter(({s})=>(!upTo||s.date<=upTo)&&working(s.entries?.[id]).length)
    .sort((a,b)=>a.s.date<b.s.date?-1:a.s.date>b.s.date?1:a.i-b.i)
    .map(({s})=>({id,date:s.date,rows:working(s.entries[id]),all:s.entries[id],u:s.units?.[id]||"kg",rir:s.rir?.[id]}));
}
function lastFor(id,upTo){ const h=historyOf(id,upTo); return h.length?h[h.length-1]:null; }
/* bodyweight in kg on a date: the last weigh-in on or before it, else the first one (0 = none yet) */
function bwAt(date){
  const L=[...D.bw].sort((a,b)=>a.date<b.date?-1:1); if(!L.length) return 0;
  let v=L[0].kg; L.forEach(x=>{ if(x.date<=date) v=x.kg; }); return v;
}
/* FIX: for dips / pull-ups the load is bodyweight + added, or bodyweight − assistance.
   With no weigh-in yet a stand-in bodyweight keeps the ranking right; it's never shown. */
const BW_GUESS=75;
function loadKg(ex,w,u,date){
  const kg=toKg(w,u); if(!ex?.addw) return kg;
  const bw=bwAt(date)||BW_GUESS;
  return ex.assist?Math.max(0,bw-kg):bw+kg;
}
/* best working set of a session: kg = the number typed (weight / added / assistance), sc = e1RM score */
function topSet(h){
  const ex=byId(h.id);
  return h.rows.reduce((b,r)=>{
    const kg=toKg(r.w,h.u), reps=Math.max(num(r.r),num(r.r2)), load=loadKg(ex,r.w,h.u,h.date);
    const sc=load>0?load*(1+reps/30):reps;
    return (!b||sc>b.sc)?{sc,kg,reps,w:r.w,u:h.u}:b;
  },null);
}
/* FEATURE: next-session weight suggestion, driven by RIR — in the unit the exercise is logged in */
function suggest(ex,upTo,unit){
  const h=lastFor(ex.id,upTo); if(!h) return null;
  const scored=h.rows.filter(r=>Math.max(num(r.r),num(r.r2))>0);
  if(!scored.length) return null;
  const last=scored[scored.length-1];
  const u=unit||h.u, reps=Math.max(num(last.r),num(last.r2)), w=conv(last.w,h.u,u), rir=h.rir;
  const st=step(ex,u), fmt=v=>`${+v.toFixed(2)} ${u}`;
  const one=ex.sec?"ثانية":"عدّة", many=ex.sec?"ثواني":"عدّات";
  if(!w){ // bodyweight
    if(rir===undefined) return `آخر مرة ${reps} ${one} — استهدف ${reps+1}`;
    if(rir>=3) return `RIR ${rir} — ضيف وزن أو زوّد لـ ${reps+3} ${many}`;
    if(rir<=1) return `آخر مرة ${reps} ${one} و RIR ${rir} — استهدف ${reps+1}`;
    return `آخر مرة ${reps} ${one} — استهدف ${reps+2}`;
  }
  if(ex.assist){ // FIX: less assistance is progress
    const less=n=>Math.max(0,w-st*n), aid=v=>v?`مساعدة ${fmt(v)}`:"من غير مساعدة";
    if(rir===undefined) return reps>=ex.hi?`آخر مرة ${aid(w)} × ${reps} — جرّب ${aid(less(1))}`
      :`آخر مرة ${aid(w)} × ${reps} — ثبّت المساعدة واستهدف ${ex.hi}`;
    if(rir>=3) return `RIR ${rir} — سهلة، جرّب ${aid(less(2))}`;
    if(rir==2)  return `RIR 2 — جرّب ${aid(less(1))}`;
    if(reps<ex.lo&&rir===0) return `صعبة — زوّد المساعدة لـ ${fmt(w+st)}`;
    if(reps>=ex.hi) return `RIR ${rir} وكمّلت العدّات — جرّب ${aid(less(1))}`;
    return `ثبّت على ${aid(w)} واستهدف ${ex.hi} عدّات`;
  }
  if(rir===undefined) return reps>=ex.hi?`آخر مرة ${fmt(w)} × ${reps} — جرّب ${fmt(w+st)}`
    :`آخر مرة ${fmt(w)} × ${reps} — ثبّت الوزن واستهدف ${ex.hi}`;
  if(rir>=3) return `RIR ${rir} — الوزن خفيف، جرّب ${fmt(w+st*2)}`;
  if(rir==2)  return `RIR 2 — جرّب ${fmt(w+st)}`;
  if(reps<ex.lo&&rir===0) return `الوزن تقيل — انزل لـ ${fmt(Math.max(st,w-st))}`;
  if(reps>=ex.hi) return `RIR ${rir} وكمّلت العدّات — جرّب ${fmt(w+st)}`;
  return `ثبّت على ${fmt(w)} واستهدف ${ex.hi} عدّات`;
}
/* the weight typed on a best set, in unit u (same rounding as the pre-filled weights) */
const wIn=(t,u)=>t.u===u?num(t.w):conv(t.w,t.u,u);
/* one best set as short text: "100×8", "+5×8" (added), "−20×6" (assistance), "10" (reps only) */
function setShort(ex,t,u){
  if(!t.kg) return `${t.reps}`;
  return `\u200E${ex.assist?"−":ex.addw?"+":""}${wIn(t,u)}×${t.reps}`;
}
function histLine(id,upTo,unit){
  const ex=byId(id),u=unit||unitOf(id),h=historyOf(id,upTo).slice(-3).reverse();
  if(!h.length) return "";
  const t=h.map(topSet);
  return `آخر ٣${t.some(x=>x.kg)?` (${u})`:""}: `+t.map(x=>setShort(ex,x,u)).join(" · ");
}
