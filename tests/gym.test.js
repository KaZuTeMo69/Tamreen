/* Batch 18: gym-floor essentials — no zooming, the screen stays on during a workout, a beep + vibration +
   "Go!" when rest ends (timer in the bottom bar), and exercises fit short screens without scrolling. */
const {open,check}=require("./lib.js");

/* stand-ins for the phone APIs the browser in the tests doesn't have */
const fakes=()=>{
  window.__locks={req:0,rel:0,live:null};
  Object.defineProperty(navigator,"wakeLock",{configurable:true,value:{request:async()=>{ __locks.req++;
    const s={fns:[],addEventListener(t,f){ this.fns.push(f); },release:async function(){ __locks.rel++; this.fns.forEach(f=>f()); }};
    __locks.live=s; return s; }}});
  window.__audio={osc:0,freq:[]};
  window.AudioContext=class{ constructor(){ this.state="running"; this.currentTime=0; this.destination={}; }
    resume(){} createOscillator(){ __audio.osc++; const o={type:"",frequency:{},connect(){},start(){},stop(){}};
      Object.defineProperty(o.frequency,"value",{set(v){ __audio.freq.push(v); }}); return o; }
    createGain(){ return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}}; } };
  audioCtx=null;
  window.__vib=[]; navigator.vibrate=p=>{ __vib.push(p); return true; };
};

module.exports=async()=>{
  let p=await open({lang:"en",time:"2026-09-26T10:00:00Z"});
  let ev=(f,a)=>p.evaluate(f,a);

  /* ── no zooming ── */
  check("viewport forbids zoom", /maximum-scale=1/.test(await p.getAttribute("meta[name=viewport]","content"))&&/user-scalable=no/.test(await p.getAttribute("meta[name=viewport]","content")));
  check("CSS: no pinch or double-tap zoom, scrolling kept", await ev(()=>getComputedStyle(document.documentElement).touchAction)==="pan-x pan-y");
  check("iPhone pinch gesture cancelled", await ev(()=>{ const e=new Event("gesturestart",{cancelable:true,bubbles:true}); document.body.dispatchEvent(e); return e.defaultPrevented; }));
  const two=await ev(()=>{ const t=i=>new Touch({identifier:i,target:document.body,clientX:50+i*40,clientY:200});
    const a=new TouchEvent("touchmove",{cancelable:true,bubbles:true,touches:[t(1),t(2)]}),b=new TouchEvent("touchmove",{cancelable:true,bubbles:true,touches:[t(1)]});
    document.body.dispatchEvent(a); document.body.dispatchEvent(b); return [a.defaultPrevented,b.defaultPrevented]; });
  check("two-finger moves blocked, one-finger scrolling not", two[0]===true&&two[1]===false, two);

  /* ── screen stays on during a workout ── */
  await ev(fakes);
  await p.click(".hero .btn"); await p.waitForTimeout(50);
  check("workout opens → screen kept on", await ev(()=>__locks.req)===1);
  await ev(()=>{ goEx(1); goEx(2); render(false); }); await p.waitForTimeout(50);
  check("moving around doesn't ask again", await ev(()=>__locks.req)===1);
  await ev(()=>{ __locks.live.fns.forEach(f=>f()); document.dispatchEvent(new Event("visibilitychange")); }); await p.waitForTimeout(50);
  check("the phone dropped it (app in the background) → taken again on return", await ev(()=>__locks.req)===2);
  await ev(()=>{ go("set"); }); // settings aren't reachable mid-workout; flip the setting directly
  await ev(()=>{ setAwake("off"); }); await p.waitForTimeout(50);
  check("Settings off → released", await ev(()=>__locks.rel)>=1 && await ev(()=>!wakeLock));
  await ev(()=>{ setAwake("on"); }); await p.waitForTimeout(50);
  const before=await ev(()=>__locks.rel);
  await ev(()=>{ draft.entries[draft.ids[0]][0].r="8"; stopTimer(); }); await p.click("#fin"); if(await ev(()=>document.getElementById("modal").classList.contains("on"))) await p.click("#myes");
  await p.waitForTimeout(50);
  check("workout finished → released", await ev(()=>__locks.rel)>before && await ev(()=>!wakeLock));

  /* ── rest over: beep, vibration, "Go!", timer in the bottom bar ── */
  await ev(()=>{ D.cursor="A"; render(); }); await p.click(".hero .btn");
  await ev(fakes);
  await p.click("#row-a1-0 .chk");
  const bar=await ev(()=>({ptimer:getComputedStyle(document.querySelector(".ptimer")).display,old:getComputedStyle(document.getElementById("timer")).display,
    t:document.getElementById("ptval").textContent,next:getComputedStyle(document.querySelector(".nxl")).display}));
  check("resting: timer in the bottom bar, the old bar hidden, Next shrinks to its arrow", bar.ptimer==="flex"&&bar.old==="none"&&bar.t==="02:00"&&bar.next==="none", bar);
  await p.clock.runFor(60000);
  check("counts down", (await p.textContent("#ptval"))==="01:00");
  await p.clock.runFor(61000);
  check("rest over: \"Go!\" in lime", await ev(()=>document.body.classList.contains("rest-done"))&&(await p.textContent("#ptval"))==="Go!"
    &&await ev(()=>getComputedStyle(document.querySelector(".ptimer")).backgroundColor)!==await ev(()=>getComputedStyle(document.body).backgroundColor));
  check("…a beep (three tones)", await ev(()=>__audio.osc)===3 && JSON.stringify(await ev(()=>__audio.freq))==="[880,880,1320]");
  check("…a vibration", JSON.stringify(await ev(()=>__vib.at(-1)))==="[250,120,250,120,400]");
  check("…and a message", (await p.textContent("#toast")).includes("Rest over"));
  await p.clock.runFor(4500);
  check("after a few seconds the bar is back to Next", !(await ev(()=>document.body.classList.contains("timing")||document.body.classList.contains("rest-done")))
    && await ev(()=>getComputedStyle(document.querySelector(".nxl")).display)!=="none");
  // Skip works on the flash too; sound off = no beep
  await ev(()=>{ D.restSound=false; __audio.osc=0; }); await p.click("#row-a1-1 .chk"); await p.clock.runFor(121000);
  check("sound off → no beep, still flashes", await ev(()=>__audio.osc)===0 && await ev(()=>document.body.classList.contains("rest-done")));
  await p.click(".ptimer button");
  check("Skip clears it at once", !(await ev(()=>document.body.classList.contains("rest-done")||document.body.classList.contains("timing"))));
  await ev(()=>{ D.restSound=true; draft=null; stopTimer(); go("set"); });
  const set=await p.textContent("#app");
  check("Settings: sound and screen rows", set.includes("Sound when rest ends")&&set.includes("Keep the screen on during a workout")&&set.includes("Rest: first 3 exercises (sec)"));
  await ev(()=>{ __audio.osc=0; setRestSound("on"); });
  check("turning the sound on plays a sample", await ev(()=>__audio.osc)===3);
  check("backup keeps both settings", await ev(()=>{ const d=cleanBackup({sessions:[],restSound:false,awake:false}); return d.restSound===false&&d.awake===false; }));
  check("no page errors", p.errs.length===0, p.errs);
  await p.done();

  /* ── without the APIs (older phones): nothing breaks ── */
  p=await open({lang:"en"}); ev=(f,a)=>p.evaluate(f,a);
  await ev(()=>{ delete Navigator.prototype.wakeLock; window.AudioContext=undefined; window.webkitAudioContext=undefined; audioCtx=null; });
  await p.click(".hero .btn"); await ev(()=>{ startTimer(1); }); await p.waitForTimeout(1600);
  check("no wake lock / no audio: the rest still ends with the flash", await ev(()=>document.body.classList.contains("rest-done")) && p.errs.length===0, p.errs);
  await p.done();

  /* ── short screens: every exercise fits without scrolling, even with the RIR question and the timer ── */
  for(const [w,h,lang,label] of [[375,667,"en","iPhone SE 2/3, iPhone 8"],[390,664,"en","iPhone in a Safari tab"],[375,667,"ar","iPhone SE 2/3 in Arabic"]]){
    p=await open({lang}); ev=(f,a)=>p.evaluate(f,a);
    await p.setViewportSize({width:w,height:h});
    const over=await ev(()=>{ const worst=[];
      for(const day of ORDER){ draft=null; D.cursor=day; start();
        draft.ids.forEach((id,i)=>{ draft.at=i; draft.entries[id].forEach(r=>{ r.r="10"; if(draft.sides[id]) r.r2="10"; }); render(); startTimer(90);
          if(!document.querySelector(".rirask")) worst.push(id+": no RIR question");
          const o=document.documentElement.scrollHeight-innerHeight; if(o>0) worst.push(`${id} +${o}px`); }); }
      draft=null; stopTimer(); render(); return worst; });
    check(`${label} (${w}×${h}): all 20 exercises fit`, over.length===0, over);
    await p.done();
  }
};
