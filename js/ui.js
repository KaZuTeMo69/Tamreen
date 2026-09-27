/* ══ modal / toast ════════════════════════════════════ */
/* closes the bottom sheet (also used by buttons inside a sheet's own form) */
function closeSheet(){
  const m=document.getElementById("modal");
  m.classList.remove("on"); document.body.classList.remove("sheet-on");
  document.getElementById("myes").onclick=null; document.getElementById("mno").onclick=null; m.onclick=null;
  document.getElementById("minput").onkeydown=null;
}
/* html: a small form built by the caller (values already escaped); onYes reads it back from the page */
function sheet({text,body="",value,type="text",area,html,yes=tx("تأكيد","Confirm"),danger,onYes}){
  const m=document.getElementById("modal"),inp=document.getElementById("minput"),ta=document.getElementById("marea");
  document.getElementById("mtext").textContent=text;
  document.getElementById("mbody").textContent=body;
  const form=document.getElementById("mform");
  form.innerHTML=html||""; form.classList.toggle("hide",!html);
  ta.classList.toggle("hide",area===undefined);   // area: read-only text to copy by hand
  if(area!==undefined){ ta.value=area; setTimeout(()=>{ ta.focus(); ta.select(); },80); }
  inp.classList.toggle("hide",value===undefined);
  if(value!==undefined){ inp.type=type; inp.value=value;
    inp.style.textAlign=type==="text"?"start":"center"; inp.style.fontFamily=type==="text"?"inherit":"'DM Sans'";
    inp.style.fontSize="16px"; }
  const y=document.getElementById("myes"),n=document.getElementById("mno"),close=closeSheet;
  y.textContent=yes; y.className="btn"+(danger?" danger":""); n.textContent=tx("إلغاء","Cancel");
  y.onclick=()=>{ buzz(18); const v=inp.value; close(); onYes&&onYes(v); };
  inp.onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); y.onclick(); } };   // FIX: Enter confirms
  n.onclick=close; m.onclick=e=>{ if(e.target===m) close(); };
  m.classList.add("on"); document.body.classList.add("sheet-on");   // toasts move to the top meanwhile
  if(value!==undefined) setTimeout(()=>inp.focus(),80);
}
let toastT=null;
function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("on");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("on"),1600);
}

/* FIX: timestamp-based timer — survives screen lock / backgrounding.
   FEATURE: when the rest is over: a beep (Settings can turn it off), a vibration where the phone allows it
   (Android — iPhones don't let web apps vibrate), and the timer turns lime and says "Go!" for a few seconds,
   so it's noticed with the sound off too. In a workout the timer sits in the bottom bar (js/session.js). */
let endAt=0,doneT=null;
const restLeft=()=>Math.max(0,Math.round((endAt-Date.now())/1000));
const fmtLeft=s=>String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
const timerText=()=>document.body.classList.contains("rest-done")?tx("يلا!","Go!"):fmtLeft(restLeft());
function showTime(){ const t=timerText(); ["tval","ptval"].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent=t; }); }
function paintTimer(){
  showTime();
  if(restLeft()<=0&&tick) restOver();
}
function restOver(){
  clearInterval(tick); tick=null; endAt=0; saveDraft();
  document.body.classList.add("rest-done"); showTime();
  beep(); buzz([250,120,250,120,400]); toast(tx("الراحة خلصت","Rest over"));
  clearTimeout(doneT); doneT=setTimeout(stopTimer,4000);
}
/* the beep: a short Web Audio tone. Phones only allow sound after a tap, so taps unlock it. It plays along
   with music instead of pausing it; the iPhone's silent switch mutes it. */
let audioCtx=null;
function unlockAudio(){
  try{
    const A=window.AudioContext||window.webkitAudioContext; if(!A) return;
    if(navigator.audioSession) navigator.audioSession.type="ambient";   // Safari: mix with music
    audioCtx=audioCtx||new A(); if(audioCtx.state!=="running") audioCtx.resume();
  }catch(e){}
}
document.addEventListener("pointerdown",unlockAudio,{passive:true});
function beep(){
  if(D.restSound===false||!audioCtx) return;
  try{
    const t0=audioCtx.currentTime+0.02;
    [[0,880],[0.28,880],[0.56,1320]].forEach(([d,f])=>{
      const o=audioCtx.createOscillator(),g=audioCtx.createGain();
      o.type="sine"; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t0+d); g.gain.exponentialRampToValueAtTime(0.5,t0+d+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.22);
      o.connect(g); g.connect(audioCtx.destination); o.start(t0+d); o.stop(t0+d+0.25);
    });
  }catch(e){}
}
function startTimer(sec,until){          // until: resume a rest that was running before a reload
  stopTimer(); unlockAudio(); endAt=until||Date.now()+sec*1000;
  document.getElementById("timer").classList.add("on"); document.body.classList.add("timing");
  paintTimer(); tick=setInterval(paintTimer,250); saveDraft();
}
function stopTimer(){
  clearTimeout(doneT); document.body.classList.remove("rest-done");
  if(tick)clearInterval(tick); tick=null; endAt=0;
  document.getElementById("timer").classList.remove("on"); document.body.classList.remove("timing"); saveDraft();
}
document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&tick) paintTimer(); });
