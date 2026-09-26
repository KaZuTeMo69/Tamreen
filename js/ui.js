/* ══ modal / toast ════════════════════════════════════ */
/* html: a small form built by the caller (values already escaped); onYes reads it back from the page */
function sheet({text,body="",value,type="text",area,html,yes="تأكيد",danger,onYes}){
  const m=document.getElementById("modal"),inp=document.getElementById("minput"),ta=document.getElementById("marea");
  document.getElementById("mtext").textContent=text;
  document.getElementById("mbody").textContent=body;
  const form=document.getElementById("mform");
  form.innerHTML=html||""; form.classList.toggle("hide",!html);
  ta.classList.toggle("hide",area===undefined);   // area: read-only text to copy by hand
  if(area!==undefined){ ta.value=area; setTimeout(()=>{ ta.focus(); ta.select(); },80); }
  inp.classList.toggle("hide",value===undefined);
  if(value!==undefined){ inp.type=type; inp.value=value;
    inp.style.textAlign=type==="text"?"right":"center"; inp.style.fontFamily=type==="text"?"inherit":"'DM Sans'";
    inp.style.fontSize="16px"; }
  const y=document.getElementById("myes"),n=document.getElementById("mno");
  y.textContent=yes; y.className="btn"+(danger?" danger":"");
  const close=()=>{m.classList.remove("on");document.body.classList.remove("sheet-on");
    y.onclick=null;n.onclick=null;m.onclick=null;inp.onkeydown=null;};
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
  document.getElementById("timer").classList.add("on"); document.body.classList.add("timing");
  paintTimer(); tick=setInterval(paintTimer,250); saveDraft();
}
function stopTimer(){
  if(tick)clearInterval(tick); tick=null; endAt=0;
  document.getElementById("timer").classList.remove("on"); document.body.classList.remove("timing"); saveDraft();
}
document.addEventListener("visibilitychange",()=>{ if(!document.hidden&&tick) paintTimer(); });
