/* ══ charts (FEATURE) ═════════════════════════════════ */
/* Small SVG charts, drawn after render() at the card's real width so text stays 11–12px on any phone.
   Time runs right → left like the rest of the app (oldest on the right). Colors come from CSS classes
   (tokens), so dark mode follows. Every value is also in the table under each chart; the tooltip only
   adds convenience. Text goes in with textContent. */
const SVGNS="http://www.w3.org/2000/svg";
function svgEl(tag,attrs,parent){
  const n=document.createElementNS(SVGNS,tag);
  for(const k in attrs) n.setAttribute(k,attrs[k]);
  if(parent) parent.appendChild(n); return n;
}
function svgText(parent,x,y,str,cls,anchor="middle"){ const t=svgEl("text",{x,y,class:cls,"text-anchor":anchor},parent); t.textContent=str; return t; }
/* a clean tick step (1, 2, 2.5, 5 × 10ⁿ) giving about `count` intervals */
function niceStep(span,count=3){
  const raw=span/count||1,p=10**Math.floor(Math.log10(raw)),f=raw/p;
  return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p;
}
const compact=v=>Math.abs(v)>=1000?`${+(v/1000).toFixed(Math.abs(v)>=10000?0:1)}k`:`${+v.toFixed(v%1?1:0)}`;

/* the host div gets the svg + one tooltip; returns the svg and its width */
function chartFrame(host,H,label){
  host.textContent="";
  const W=Math.max(200,Math.round(host.clientWidth||300));
  const svg=svgEl("svg",{width:W,height:H,viewBox:`0 0 ${W} ${H}`,class:"chart",role:"img","aria-label":label},host);
  const tip=document.createElement("div"); tip.className="ctip"; tip.hidden=true; host.appendChild(tip);
  return {svg,W,tip};
}
function showTip(tip,x,W,lines){
  tip.textContent="";
  lines.forEach((s,i)=>{ const d=document.createElement(i?"div":"b"); d.dir="auto"; d.textContent=s; tip.appendChild(d); });
  tip.hidden=false;
  const w=tip.offsetWidth; tip.style.left=`${Math.min(Math.max(x,w/2+2),W-w/2-2)}px`;
}

/* line: pts oldest → newest {v, tip:[value, detail, date]}; opts.numbers=false hides values (no weigh-in yet) */
function lineChart(host,pts,{fmt,numbers=true,label}){
  const H=176,T=26,B=24,R=numbers?38:14,L=18,n=pts.length;
  const {svg,W,tip}=chartFrame(host,H,label);
  const vs=pts.map(p=>p.v),min=Math.min(...vs),max=Math.max(...vs);
  const step=niceStep(Math.max(max-min,max*0.1,1));
  let lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step;
  if(hi-lo<step*2){ lo=Math.max(0,lo-step); hi=hi+step; }
  const y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const x=i=>n===1?(L+W-R)/2:W-R-i*(W-R-L)/(n-1);
  for(let v=lo;v<=hi+1e-9;v+=step){
    svgEl("line",{x1:L,x2:W-R,y1:y(v),y2:y(v),class:"grid"},svg);
    if(numbers) svgText(svg,W-2,y(v)+4,fmt(v),"tick","end");
  }
  svgEl("path",{d:pts.map((p,i)=>`${i?"L":"M"}${x(i)},${y(p.v)}`).join(""),class:"ln"},svg);
  const best=vs.indexOf(max),cross=svgEl("line",{y1:T-8,y2:H-B,class:"cross",visibility:"hidden"},svg);
  pts.forEach((p,i)=>svgEl("circle",{cx:x(i),cy:y(p.v),r:4,class:i===best?"dot best":"dot"},svg));
  /* labels only on the latest point and the best one */
  if(numbers) [...new Set([n-1,best])].forEach(i=>{
    const px=x(i),a=px<L+24?"start":px>W-R-24?"end":"middle";
    svgText(svg,a==="start"?px-4:a==="end"?px+4:px,y(pts[i].v)-9,fmt(pts[i].v),"lbl",a);
  });
  svgText(svg,x(0),H-6,fdate(pts[0].date),"tick",n===1?"middle":"end");
  if(n>1) svgText(svg,x(n-1),H-6,fdate(pts[n-1].date),"tick","start");
  /* the crosshair snaps to the nearest session; arrows move it when focused */
  const hit=svgEl("rect",{x:0,y:0,width:W,height:H,class:"hit",tabindex:0},svg);
  let cur=n-1;
  const at=i=>{ cur=i; cross.setAttribute("x1",x(i)); cross.setAttribute("x2",x(i)); cross.setAttribute("visibility","visible");
    showTip(tip,x(i),W,pts[i].tip); };
  const off=()=>{ cross.setAttribute("visibility","hidden"); tip.hidden=true; };
  hit.addEventListener("pointermove",e=>{ const r=svg.getBoundingClientRect(),px=e.clientX-r.left;
    let bi=0; pts.forEach((_,i)=>{ if(Math.abs(x(i)-px)<Math.abs(x(bi)-px)) bi=i; }); at(bi); });
  hit.addEventListener("pointerdown",e=>hit.dispatchEvent(new PointerEvent("pointermove",e)));
  hit.addEventListener("pointerleave",off);
  hit.addEventListener("focus",()=>at(cur)); hit.addEventListener("blur",off);
  hit.addEventListener("keydown",e=>{   // right = older, left = newer (right-to-left time)
    if(e.key==="ArrowLeft"){ e.preventDefault(); at(Math.min(n-1,cur+1)); }
    if(e.key==="ArrowRight"){ e.preventDefault(); at(Math.max(0,cur-1)); }
  });
}

/* columns: bars oldest → newest {v, tip:[...], label}; best = sage, partial (this week so far) = muted */
function columnChart(host,bars,{fmt,label,partial}){
  const H=164,T=24,B=24,R=40,L=6,n=bars.length;
  const {svg,W,tip}=chartFrame(host,H,label);
  const max=Math.max(0,...bars.map(b=>b.v)),step=niceStep(max||1),hi=Math.ceil((max||1)/step)*step;
  const y=v=>T+(1-v/hi)*(H-T-B),base=y(0),slot=(W-R-L)/n,bw=Math.min(24,slot-2);
  const cx=i=>W-R-(i+0.5)*slot;
  for(let v=0;v<=hi+1e-9;v+=step){
    svgEl("line",{x1:L,x2:W-R,y1:y(v),y2:y(v),class:"grid"},svg);
    svgText(svg,W-2,y(v)+4,fmt(v),"tick","end");
  }
  const best=max>0?bars.findIndex(b=>b.v===max):-1;
  bars.forEach((b,i)=>{
    const x0=cx(i)-bw/2,x1=x0+bw,top=y(b.v),r=Math.min(4,base-top);
    const cls=i===best?"bar best":i===partial?"bar partial":"bar";
    if(b.v>0) svgEl("path",{class:cls,"data-i":i,d:`M${x0},${base}V${top+r}Q${x0},${top} ${x0+r},${top}H${x1-r}Q${x1},${top} ${x1},${top+r}V${base}Z`},svg);
    const hit=svgEl("rect",{x:cx(i)-slot/2,y:T-10,width:slot,height:H-T-B+10,class:"hit",tabindex:0,"aria-label":b.tip.join(" · ")},svg);
    const on=()=>{ showTip(tip,cx(i),W,b.tip); svg.querySelectorAll(".bar").forEach(e=>e.classList.remove("lift"));
      svg.querySelector(`[data-i="${i}"]`)?.classList.add("lift"); };
    hit.addEventListener("pointerenter",on); hit.addEventListener("pointerdown",on); hit.addEventListener("focus",on);
    const out=()=>{ tip.hidden=true; svg.querySelector(`[data-i="${i}"]`)?.classList.remove("lift"); };
    hit.addEventListener("pointerleave",out); hit.addEventListener("blur",out);
  });
  /* labels only on the best week and this week */
  [...new Set([best,partial])].filter(i=>i>=0&&bars[i].v>0).forEach(i=>svgText(svg,cx(i),y(bars[i].v)-6,fmt(bars[i].v),"lbl"));
  svgText(svg,cx(0)+slot/2,H-6,bars[0].label,"tick","end");
  svgText(svg,cx(n-1)-slot/2,H-6,bars[n-1].label,"tick","start");
}

/* ── data for the progress tab ── */
const isoOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const addDays=(iso,n)=>{ const d=new Date(iso+"T00:00:00"); d.setDate(d.getDate()+n); return isoOf(d); };
/* weeks start on Saturday */
const weekStart=iso=>{ const d=new Date(iso+"T00:00:00"); return addDays(iso,-((d.getDay()+1)%7)); };
function weekSeries(count=12){
  const now=weekStart(today()),weeks=Array.from({length:count},(_,i)=>({start:addDays(now,-7*(count-1-i)),kg:0,n:0}));
  D.sessions.forEach(s=>{ const w=weeks.find(x=>x.start===weekStart(s.date)); if(w){ w.kg+=volume(s); w.n++; } });
  return weeks;
}
/* the plain-text version of a best set, for tooltips and tables. The "110 kg × 9" part is wrapped in
   Unicode isolates (LRI … PDI) so the Latin unit can't reorder it inside right-to-left text. */
const LRI=String.fromCharCode(0x2066),PDI=String.fromCharCode(0x2069);
function setPlain(ex,t,u){
  if(!t.kg) return `${t.reps} ${ex.sec?"ثانية":"عدّة"}`;
  return `${ex.assist?"مساعدة ":""}${LRI}${ex.addw&&!ex.assist?"+":""}${wIn(t,u)} ${u} × ${t.reps}${PDI}`;
}
/* what the exercise chart plots: estimated 1RM for anything with a weight, reps / seconds otherwise */
function exerciseSeries(id){
  const ex=exDef(id),u=unitOf(id),weighted=!(ex.eq==="body"&&!ex.addw);
  return historyOf(id).map(h=>{ const t=topSet(h); return {date:h.date,t,v:weighted?fromKg(t.sc,u):t.sc}; });
}

/* draws whatever charts the current screen has */
function drawCharts(){
  if(draft||tab!=="prog") return;
  const ex=exDef(progEx),u=unitOf(progEx),host=document.getElementById("ch-ex");
  if(host){
    const weighted=!(ex.eq==="body"&&!ex.addw),numbers=!(ex.addw&&!D.bw.length);
    const unit=weighted?UL[u]:ex.sec?"ثانية":"عدّة",fmt=v=>`${Math.round(v)}`;
    lineChart(host,exerciseSeries(progEx).slice(-10).map(p=>({date:p.date,v:p.v,
      tip:[numbers?`${Math.round(p.v)} ${unit}`:setPlain(ex,p.t,u),numbers?setPlain(ex,p.t,u):"",fdate(p.date)].filter(Boolean)})),
      {fmt,numbers,label:`${nameOf(ex)} — آخر ${ar(Math.min(10,historyOf(progEx).length))} حصص`});
  }
  const wk=document.getElementById("ch-week");
  if(wk){
    const U=D.unit,weeks=weekSeries();
    columnChart(wk,weeks.map((w,i)=>({v:fromKg(w.kg,U),label:i===weeks.length-1?"الأسبوع ده":fdate(w.start),
      tip:[`${Math.round(fromKg(w.kg,U)).toLocaleString("en")} ${UL[U]}`,`${w.n?ar(w.n):"مفيش"} حصص`,`أسبوع ${fdate(w.start)}`]})),
      {fmt:compact,partial:weeks.length-1,label:"الحجم الأسبوعي لآخر ١٢ أسبوع"});
  }
}
let resizeT=null;
addEventListener("resize",()=>{ clearTimeout(resizeT); resizeT=setTimeout(drawCharts,150); });
