/* ══ modal / toast ════════════════════════════════════ */
function sheet({text,body="",value,type="text",yes="تأكيد",danger,onYes}){
  const m=document.getElementById("modal"),inp=document.getElementById("minput");
  document.getElementById("mtext").textContent=text;
  document.getElementById("mbody").textContent=body;
  inp.classList.toggle("hide",value===undefined);
  if(value!==undefined){ inp.type=type; inp.value=value;
    inp.style.textAlign=type==="text"?"right":"center"; inp.style.fontFamily=type==="text"?"inherit":"'DM Sans'";
    inp.style.fontSize="15px"; }
  const y=document.getElementById("myes"),n=document.getElementById("mno");
  y.textContent=yes; y.className="btn"+(danger?" danger":"");
  const close=()=>{m.classList.remove("on");y.onclick=null;n.onclick=null;m.onclick=null;};
  y.onclick=()=>{ buzz(18); const v=inp.value; close(); onYes&&onYes(v); };
  n.onclick=close; m.onclick=e=>{ if(e.target===m) close(); };
  m.classList.add("on");
  if(value!==undefined) setTimeout(()=>inp.focus(),80);
}
let toastT=null;
function toast(msg){
  const t=document.getElementById("toast");
  t.textContent=msg; t.classList.add("on");
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove("on"),1600);
}

/* FIX: timestamp-based timer — survives screen lock / backgrounding */
let endAt=0;
function paintTimer(){
  const left=Math.max(0,Math.round((endAt-Date.now())/1000));
  document.getElementById("tval").textContent=
    String(Math.floor(left/60)).padStart(2,"0")+":"+String(left%60).padStart(2,"0");
  if(left<=0&&tick){ stopTimer(); buzz(400); toast("الراحة خلصت"); }
}
function startTimer(sec,until){          // until: resume a rest that was running before a reload
  stopTimer(); endAt=until||Date.now()+sec*1000;
  document.getElementById("timer").classList.add("on");
  paintTimer(); tick=setInterval(paintTimer,250); saveDraft();
}
function stopTimer(){
  if(tick)clearInterval(tick); tick=null; endAt=0;
  document.getElementById("timer").classList.remove("on"); saveDraft();
}
document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&tick) paintTimer(); });
