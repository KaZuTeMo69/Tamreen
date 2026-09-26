/* ══ start ════════════════════════════════════════════ */
document.getElementById("nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(b) go(b.dataset.tab);
});
/* FIX: reopen a workout that was still open when the page closed (tab killed, phone restarted…) */
(function resumeDraft(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null"); }catch(e){}
  if(!d||!PROGRAM[d.workout]||!d.entries||!d.date||(d.edit!=null&&!D.sessions[d.edit])) return;
  d.counts=d.counts||{}; d.rir=d.rir||{}; d.units=d.units||{}; d.names=d.names||{}; d.sides=d.sides||{};
  if(!Array.isArray(d.ids)||!d.ids.length)    // saved before exercise lists were kept with the workout
    d.ids=Object.keys(d.entries).length?Object.keys(d.entries):PROGRAM[d.workout].ex.map(e=>e.id);
  d.ids.map(exDef).forEach(e=>{               // fill anything missing
    if(!Array.isArray(d.entries[e.id])||!d.entries[e.id].length)
      d.entries[e.id]=Array.from({length:e.sets},()=>({w:"",r:"",r2:"",warm:false}));
    d.counts[e.id]=d.entries[e.id].length;
    if(!d.units[e.id]) d.units[e.id]=unitOf(e.id);
    if(!d.names[e.id]) d.names[e.id]=nameOf(e);
    if(d.sides[e.id]===undefined) d.sides[e.id]=perSide(e.id);
  });
  const restEnd=d.restEnd; delete d.restEnd;
  draft=d;
  if(restEnd>Date.now()) startTimer(0,restEnd);
  setTimeout(()=>toast("رجّعنا الحصة اللي كانت مفتوحة"),300);
})();
/* belt and braces: store the open workout when the app goes to the background */
document.addEventListener("visibilitychange",()=>{ if(document.hidden) saveDraft(); });
/* FEATURE: works offline — the service worker keeps a copy of the app on the phone (see sw.js) */
if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
/* FEATURE: install button in Settings where the browser offers one (Android / desktop Chrome) */
addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installPrompt=e; if(tab==="set"&&!draft) render(false); });
addEventListener("appinstalled",()=>{ installPrompt=null; if(tab==="set"&&!draft) render(false); });
render();
