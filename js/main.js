/* ══ start ════════════════════════════════════════════ */
/* FEATURE: no zooming — the app is used one-handed at the gym. The viewport forbids it and CSS stops the
   double-tap zoom; iPhone's pinch gesture is cancelled here, since Safari ignores the viewport rule. */
["gesturestart","gesturechange"].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener("touchmove",e=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
applyLang();   // fill in the tab bar and timer text (the <head> call ran before they existed)
document.getElementById("nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(b) go(b.dataset.tab);
});
/* FIX: reopen a workout that was still open when the page closed (tab killed, phone restarted…) */
(function resumeDraft(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null"); }catch(e){}
  /* a new workout must still be in the program; an old one being edited can be from any program */
  if(!d||!d.entries||!d.date||(d.edit!=null?!D.sessions[d.edit]:!PROGRAM[d.workout])) return;
  d.counts=d.counts||{}; d.rir=d.rir||{}; d.units=d.units||{}; d.names=d.names||{}; d.sides=d.sides||{};
  if(!Array.isArray(d.ids)||!d.ids.length)    // saved before exercise lists were kept with the workout
    d.ids=Object.keys(d.entries).length?Object.keys(d.entries):(PROGRAM[d.workout]?.ex||[]).map(e=>e.id);
  d.ids.map(exDef).forEach(e=>{               // fill anything missing
    if(!Array.isArray(d.entries[e.id])||!d.entries[e.id].length)
      d.entries[e.id]=Array.from({length:e.sets},()=>({w:"",r:"",r2:"",warm:false}));
    d.counts[e.id]=d.entries[e.id].length;
    if(!d.units[e.id]) d.units[e.id]=unitOf(e.id);
    if(!d.names[e.id]) d.names[e.id]=nameOf(e);
    if(d.sides[e.id]===undefined) d.sides[e.id]=perSide(e.id);
  });
  d.at=Math.min(Math.max(0,d.at|0),d.ids.length); d.asked=d.asked||{};
  d.label=d.label||(d.edit!=null?D.sessions[d.edit].label:null)||PROGRAM[d.workout]?.label;
  const restEnd=d.restEnd; delete d.restEnd;
  draft=d;
  if(restEnd>Date.now()) startTimer(0,restEnd);
  setTimeout(()=>toast(tx("رجّعنا الحصة اللي كانت مفتوحة","Your open workout is back")),300);
})();
/* belt and braces: store the open workout when the app goes to the background */
document.addEventListener("visibilitychange",()=>{ if(document.hidden) saveDraft(); });
/* FEATURE: works offline — the service worker keeps a copy of the app on the phone (see sw.js) */
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
/* FEATURE: install button in Settings where the browser offers one (Android / desktop Chrome) */
addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installPrompt=e; if(tab==="set"&&!draft) render(false); });
addEventListener("appinstalled",()=>{ installPrompt=null; if(tab==="set"&&!draft) render(false); });
render();
