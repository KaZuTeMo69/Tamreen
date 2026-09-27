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
/* FEATURE: next-session weight suggestion, driven by RIR — in the unit the exercise is logged in.
   In Arabic the unit is written in Arabic (كجم / باوند) so the sentence keeps reading right-to-left. */
function suggest(ex,upTo,unit){
  const h=lastFor(ex.id,upTo); if(!h) return null;
  const scored=h.rows.filter(r=>Math.max(num(r.r),num(r.r2))>0);
  if(!scored.length) return null;
  const last=scored[scored.length-1];
  const u=unit||h.u, reps=Math.max(num(last.r),num(last.r2)), w=conv(last.w,h.u,u), rir=h.rir;
  const st=step(ex,u), fmt=v=>+v.toFixed(2), tgt=v=>`${fmt(v)} ${UL[u]}`;
  const one=ex.sec?tx("ثانية","sec"):tx("عدّة","reps"), many=ex.sec?tx("ثواني","sec"):tx("عدّات","reps");
  if(!w){ // bodyweight
    if(rir===undefined) return tx(`آخر مرة ${reps} ${one} — استهدف ${reps+1}`,`Last time ${reps} ${one} — aim for ${reps+1}`);
    if(rir>=3) return tx(`RIR ${rir} — ضيف وزن أو زوّد لـ ${reps+3} ${many}`,`RIR ${rir} — add weight or go for ${reps+3} ${many}`);
    if(rir<=1) return tx(`آخر مرة ${reps} ${one} و RIR ${rir} — استهدف ${reps+1}`,`Last time ${reps} ${one} at RIR ${rir} — aim for ${reps+1}`);
    return tx(`آخر مرة ${reps} ${one} — استهدف ${reps+2}`,`Last time ${reps} ${one} — aim for ${reps+2}`);
  }
  if(ex.assist){ // FIX: less assistance is progress
    const less=n=>Math.max(0,w-st*n), aid=v=>v?tx(`مساعدة ${tgt(v)}`,`${tgt(v)} assist`):tx("من غير مساعدة","no assist");
    if(rir===undefined) return reps>=ex.hi?tx(`آخر مرة ${aid(w)} × ${reps} — جرّب ${aid(less(1))}`,`Last time ${aid(w)} × ${reps} — try ${aid(less(1))}`)
      :tx(`آخر مرة ${aid(w)} × ${reps} — ثبّت المساعدة واستهدف ${ex.hi}`,`Last time ${aid(w)} × ${reps} — same assist, aim for ${ex.hi}`);
    if(rir>=3) return tx(`RIR ${rir} — سهلة، جرّب ${aid(less(2))}`,`RIR ${rir} — easy, try ${aid(less(2))}`);
    if(rir==2)  return tx(`RIR 2 — جرّب ${aid(less(1))}`,`RIR 2 — try ${aid(less(1))}`);
    if(reps<ex.lo&&rir===0) return tx(`صعبة — زوّد المساعدة لـ ${tgt(w+st)}`,`Too hard — raise the assist to ${tgt(w+st)}`);
    if(reps>=ex.hi) return tx(`RIR ${rir} وكمّلت العدّات — جرّب ${aid(less(1))}`,`RIR ${rir} with all reps done — try ${aid(less(1))}`);
    return tx(`ثبّت على ${aid(w)} واستهدف ${ex.hi} عدّات`,`Stay at ${aid(w)}, aim for ${ex.hi} reps`);
  }
  if(rir===undefined) return reps>=ex.hi?tx(`آخر مرة ${fmt(w)} × ${reps} — جرّب ${tgt(w+st)}`,`Last time ${fmt(w)} × ${reps} — try ${tgt(w+st)}`)
    :tx(`آخر مرة ${fmt(w)} × ${reps} — ثبّت الوزن واستهدف ${ex.hi}`,`Last time ${fmt(w)} × ${reps} — same weight, aim for ${ex.hi}`);
  if(rir>=3) return tx(`RIR ${rir} — الوزن خفيف، جرّب ${tgt(w+st*2)}`,`RIR ${rir} — too light, try ${tgt(w+st*2)}`);
  if(rir==2)  return tx(`RIR 2 — جرّب ${tgt(w+st)}`,`RIR 2 — try ${tgt(w+st)}`);
  if(reps<ex.lo&&rir===0) return tx(`الوزن تقيل — انزل لـ ${tgt(Math.max(st,w-st))}`,`Too heavy — drop to ${tgt(Math.max(st,w-st))}`);
  if(reps>=ex.hi) return tx(`RIR ${rir} وكمّلت العدّات — جرّب ${tgt(w+st)}`,`RIR ${rir} with all reps done — try ${tgt(w+st)}`);
  return tx(`ثبّت على ${tgt(w)} واستهدف ${ex.hi} عدّات`,`Stay at ${tgt(w)}, aim for ${ex.hi} reps`);
}
/* FEATURE: personal records. One pass over the sessions in date order, keeping each exercise's best so
   far; a session sets a record when it beats every earlier session: a heavier working weight (lifts and
   added weight), else a better best set (e1RM score — covers assistance, and reps / seconds for
   bodyweight moves). A first-ever session sets none. Returns Map(session index → [records]). */
function recordMap(){
  const best={},out=new Map();
  D.sessions.map((s,i)=>({s,i})).sort((a,b)=>a.s.date<b.s.date?-1:a.s.date>b.s.date?1:a.i-b.i).forEach(({s,i})=>{
    const found=[];
    for(const [id,rows] of Object.entries(s.entries||{})){
      const ex=byId(id),h={id,date:s.date,rows:working(rows),u:s.units?.[id]||"kg"};
      if(!ex||!h.rows.length) continue;
      const t=topSet(h), weighed=!ex.assist&&(ex.eq!=="body"||ex.addw);
      const heavy=weighed?h.rows.reduce((m,r)=>toKg(r.w,h.u)>toKg(m.w,h.u)?r:m,h.rows[0]):null;
      const heavyKg=heavy?toKg(heavy.w,h.u):0, b=best[id];
      if(b){
        if(heavyKg>0&&heavyKg>b.kg+1e-6) found.push({id,kind:"heavy",w:heavy.w,reps:Math.max(num(heavy.r),num(heavy.r2)),u:h.u});
        else if(t.sc>b.sc+1e-6) found.push({id,kind:"best",w:t.w,reps:t.reps,u:h.u});
      }
      best[id]={sc:Math.max(b?.sc??0,t.sc),kg:Math.max(b?.kg??0,heavyKg)};
    }
    if(found.length) out.set(i,found);
  });
  return out;
}
/* "أتقل وزن: 110 كجم × 6" · "أحسن ست: +5 كجم × 8" · "أكتر عدّات: 22" · "أطول ثبات: 50 ثانية"
   (English: "Heaviest: 110 kg × 6" · "Best set: +5 kg × 8" · "Most reps: 22" · "Longest hold: 50 sec") */
function recordText(pr){
  const ex=exDef(pr.id),w=num(pr.w),U=UL[pr.u];
  if(!w) return ex.sec?tx(`أطول ثبات: ${pr.reps} ثانية`,`Longest hold: ${pr.reps} sec`):tx(`أكتر عدّات: ${pr.reps}`,`Most reps: ${pr.reps}`);
  const load=ex.assist?tx(`مساعدة ${w} ${U}`,`${w} ${U} assist`):`${ex.addw?"+":""}${w} ${U}`;
  return `${pr.kind==="heavy"?tx("أتقل وزن","Heaviest"):tx("أحسن ست","Best set")}: ${load} × ${pr.reps}`;
}
/* FEATURE: plateau check. An exercise has stalled when its best set (the e1RM score, or reps / seconds for
   bodyweight moves) hasn't beaten its best-ever for 3+ workouts in a row. The advice moves on each time:
   3 → take a lighter week; 4 (the week after) → go for the best again; 5+ → swap it for a variation.
   h = historyOf(...) for the workouts to look at, oldest first. */
const STALL=3,SWAP=5;
function plateauOf(h){
  if(h.length<STALL+1) return null;
  let best=-1,at=0;
  h.forEach((x,i)=>{ const sc=topSet(x).sc; if(sc>best+1e-6){ best=sc; at=i; } });
  const since=h.length-1-at;
  return since<STALL?null:{id:h[0].id,since,stage:since>=SWAP?"swap":since>STALL?"beat":"light",
    bestDate:h[at].date,best:topSet(h[at]),last:h[h.length-1]};
}
const plateau=(id,upTo)=>plateauOf(historyOf(id,upTo));
const PLATEAU_CHIP={light:["أسبوع أخف","Lighter week"],beat:["اكسر رقمك","Beat your best"],swap:["بدّله","Swap"]};
/* the advice, in unit u. A lighter week is about 90% of the last top weight, rounded down to the
   exercise's step (assisted and bodyweight moves: one set fewer instead). */
function plateauText(p,u){
  const ex=exDef(p.id),n=nl(p.since); u=u||p.last.u;
  if(p.stage==="swap") return tx(`${n} حصص من غير تحسّن — وقت تبدّله بتمرين شبهه`,`No progress in ${p.since} workouts — time to swap it for a variation`);
  if(p.stage==="beat"){
    const b=p.best,w=b.kg?`${ex.assist?tx("مساعدة ","assist "):ex.addw?"+":""}${wIn(b,u)} ${UL[u]} × ${b.reps}`:`${b.reps} ${ex.sec?tx("ثانية","sec"):tx("عدّة","reps")}`;
    return tx(`${n} حصص من غير تحسّن — بعد الأسبوع الأخف، ارجع لأحسن رقم ليك: ${w}`,`No progress in ${p.since} workouts — after the lighter week, go for your best again: ${w}`);
  }
  const t=topSet(p.last),w=ex.assist||!t.kg?0:conv(t.w,t.u,u),st=step(ex,u),light=w?Math.max(st,Math.floor(w*0.9/st+1e-9)*st):0;
  return light?tx(`${n} حصص من غير تحسّن — خُد أسبوع أخف: ${light} ${UL[u]} بنفس العدّات`,`No progress in ${p.since} workouts — take a lighter week: ${light} ${u}, same reps`)
    :tx(`${n} حصص من غير تحسّن — خُد أسبوع أخف: ست أقل ووقّف قبل الفشل بـ 2–3`,`No progress in ${p.since} workouts — take a lighter week: one set fewer, stop 2–3 reps short`);
}
/* the weight typed on a best set, in unit u (same rounding as the pre-filled weights) */
const wIn=(t,u)=>t.u===u?num(t.w):conv(t.w,t.u,u);
/* one best set as short text: "100×8", "+5×8" (added), "−20×6" (assistance), "10" (reps only) */
function setShort(ex,t,u){
  if(!t.kg) return `${t.reps}`;
  return `${ex.assist?"−":ex.addw?"+":""}${wIn(t,u)}×${t.reps}`;
}
function histLine(id,upTo,unit){
  const ex=byId(id),u=unit||unitOf(id),h=historyOf(id,upTo).slice(-3).reverse();
  if(!h.length) return "";
  const t=h.map(topSet);
  return `${tx("آخر 3","Last 3")}${t.some(x=>x.kg)?` (${UL[u]})`:""}: `+t.map(x=>setShort(ex,x,u)).join(" · ");
}
