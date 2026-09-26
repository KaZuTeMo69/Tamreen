/* ══ start ════════════════════════════════════════════ */
document.getElementById("nav").addEventListener("click",e=>{
  const b=e.target.closest("button"); if(!b) return; tab=b.dataset.tab; buzz(10); render();
});
render();
