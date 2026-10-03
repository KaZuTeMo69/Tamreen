/* ══ ask Claude ═══════════════════════════════════════ */
/* FEATURE: turn a session into a ready-to-paste message for the Claude chat — free, no API key.
   Works on the open workout and on an old session opened from the log (both are drafts). */
const EQN={machine:"machine",dumbbell:"dumbbells (weight per hand)",barbell:"barbell",cable:"cable",body:"bodyweight"};
const WEEKDAY=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const daysBetween=(a,b)=>Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/864e5);
const agoText=n=>n===0?"earlier today":n===1?"yesterday":`${n} days ago`;

/* one logged set, in the unit it was logged in: 50kg×12 · R10/L9 · assist 20kg×6 · +5kg×8 · BW×10 · 30s */
function setLine(ex,r,u,side){
  const s=ex.sec?"s":"";
  const reps=side&&r.r2?`R${r.r}${s}/L${r.r2}${s}`:`${r.r||r.r2}${s}`;
  const w=num(r.w);
  let t;
  if(ex.assist) t=w?`assist ${w}${u}×${reps}`:`BW×${reps}`;
  else if(ex.addw) t=w?`+${w}${u}×${reps}`:`BW×${reps}`;
  else if(ex.eq==="body"||!w) t=ex.sec?reps:`${reps} reps`;
  else t=`${w}${u}×${reps}`;
  return t+(r.warm?" (warm-up)":"");
}
function setsLine(ex,rows,u,side){
  return (rows||[]).filter(r=>r.r||r.r2).map(r=>setLine(ex,r,u,side)).join(", ");
}
const rirText=v=>v===undefined||v===null?"":` · RIR ${v===3?"3+":v}`;

function sessionText(d){
  const exs=d.ids.map(exDef),bw=D.bw.length?bwAt(d.date):0;
  const lines=[
    `I'm tracking my gym training (${ORDER.length}-workout rotation${PROGRAM_NAME?`, "${PROGRAM_NAME}"`:""}). Below is one session and my recent history for each exercise.`,
    "For each exercise, tell me in one line: add weight, keep it, lower it, or swap the exercise — and why.",
    "Then one line on the session overall. Keep it short. (RIR = reps I had left in the tank.)",
    "",
    `Session: ${d.label||PROGRAM[d.workout]?.label||`Workout ${d.workout}`} — ${WEEKDAY[new Date(d.date+"T00:00:00").getDay()]} ${d.date}.`+
      (bw&&exs.some(e=>e.addw)?` Bodyweight: ${+fromKg(bw,D.unit).toFixed(1)} ${D.unit}.`:"")];
  const mins=d.edit!=null?d.mins:activeMins(d);   // paused time left out
  if(mins>=1&&mins<=300) lines.push(`Duration: ${mins} min${d.edit!=null?"":" so far"}.`);
  if(d.note?.trim()) lines.push(`My notes: ${d.note.trim()}`);
  const skipped=[]; let n=0;
  exs.forEach(e=>{
    const rows=d.entries[e.id]||[], name=d.names?.[e.id]||nameOf(e);
    if(!rows.some(r=>r.r||r.r2)){ skipped.push(name); return; }
    /* earlier sessions only — editing an old session must not list itself */
    const hist=historyOf(e.id).filter(h=>h.date<d.date).slice(-3).reverse();
    lines.push("",`${++n}. ${name} — ${EQN[e.eq]}, plan ${e.sets} × ${e.lo}–${e.hi} ${e.sec?"seconds":"reps"}`+
      (e.uni?", one side at a time":""));
    lines.push(`   Today: ${setsLine(e,rows,d.units?.[e.id]||unitOf(e.id),!!d.sides?.[e.id])}${rirText(d.rir?.[e.id])}`);
    if(!hist.length){ lines.push("   First time doing this exercise."); return; }
    /* same rule as the app's plateau check, on the workouts before this one */
    const pl=plateauOf(historyOf(e.id).filter(h=>h.date<d.date));
    if(pl) lines.push(`   Plateau: no new best set in the last ${pl.since} workouts (best was ${pl.bestDate}).`);
    const [last,...older]=hist, sideOf=h=>h.all.some(r=>r.r2);
    lines.push(`   Last time (${agoText(daysBetween(last.date,d.date))}): ${setsLine(e,last.all,last.u,sideOf(last))}${rirText(last.rir)}`);
    if(older.length) lines.push("   Before: "+older.map(h=>`${h.date.slice(5)}: ${setsLine(e,h.all,h.u,sideOf(h))}${rirText(h.rir)}`).join(" | "));
  });
  if(skipped.length) lines.push("",`Not done today: ${skipped.join(", ")}`);
  return lines.join("\n");
}
async function askClaude(){
  if(!Object.values(draft.entries).some(rows=>rows.some(r=>r.r||r.r2))){ toast(tx("سجّل ست واحد على الأقل","Log at least one set")); return; }
  await giveText(sessionText(draft));
}
