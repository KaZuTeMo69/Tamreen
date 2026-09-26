/* ══ start ════════════════════════════════════════════ */
document.getElementById("nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(b) go(b.dataset.tab);
});
/* FIX: reopen a workout that was still open when the page closed (tab killed, phone restarted…) */
(function resumeDraft(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(DRAFT_KEY)||"null"); }catch(e){}
  if(!d||!PROGRAM[d.workout]||!d.entries||!d.date||(d.edit!=null&&!D.sessions[d.edit])) return;
  d.counts=d.counts||{}; d.rir=d.rir||{}; d.units=d.units||{}; d.names=d.names||{}; d.sides=d.sides||{};
  PROGRAM[d.workout].ex.forEach(e=>{          // fill anything missing, e.g. after a program change
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
render();
