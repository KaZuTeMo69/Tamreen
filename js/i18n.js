/* ══ language (FEATURE) ═══════════════════════════════ */
/* English (left-to-right) by default, Egyptian Arabic (right-to-left) from Settings. The choice is a
   setting of this phone, not of the data, so it lives in its own key and a restored backup keeps it.
   Loaded in <head> so the page has the right direction before anything is drawn.
   tx(arabic, english) picks the text for the current language. */
const LANG_KEY="tamreen-v2-lang";
let LANG=(()=>{ try{ return localStorage.getItem(LANG_KEY)==="ar"?"ar":"en"; }catch(e){ return "en"; } })();
const isAr=()=>LANG==="ar";
const tx=(ar,en)=>isAr()?ar:en;
/* Arabic keeps Arabic month and day names but writes numbers with 0–9 (-u-nu-latn), like the English side */
const LOCALE=()=>isAr()?"ar-EG-u-nu-latn":"en-GB";
/* a number, grouped the current language's way (always 0–9) */
const nl=n=>Number(n).toLocaleString(LOCALE());
/* the fixed text in index.html (tab bar, rest timer), marked with data-l */
const STATIC={plan:["الخطة","Plan"],prog:["التقدم","Progress"],log:["السجل","Log"],set:["الإعدادات","Settings"],
  rest:["راحة","Rest"],skip:["تخطّي","Skip"]};
function applyLang(){
  const el=document.documentElement;
  el.lang=LANG; el.dir=tx("rtl","ltr");
  document.title=tx("تمرين","Tamreen");
  document.querySelectorAll("[data-l]").forEach(n=>{ const s=STATIC[n.dataset.l]; if(s) n.textContent=tx(...s); });
}
applyLang();
function setLang(l){
  LANG=l==="ar"?"ar":"en";
  try{ localStorage.setItem(LANG_KEY,LANG); }catch(e){}
  applyLang(); render(false);
}
