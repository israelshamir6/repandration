/* ======================================================================
   Rep & Ration public-app extensions: shared UI pieces (sheets, quick actions, nav)
   ====================================================================== */
const PUB = !!window.RR_PUBLIC;
const api = (route, body) => window.RR_API ? window.RR_API(route, body === undefined ? {} : body) : Promise.reject(new Error("Log in first."));
const me = () => window.RR_USER || null;
Object.assign(ICON, {
  scan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6"/></svg>',
  camera:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  mic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  scale:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8.5 10a4.5 4.5 0 0 1 7 0M12 10l1.5-2"/></svg>',
  water:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  coach:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/><path d="M12 9.5v.01"/></svg>',
  help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01"/></svg>',
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.6 9.6l5.8-.8z"/></svg>',
  starOn:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.6 9.6l5.8-.8z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 9h4l3 3.5V16h-7z"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>'
});

/* ---------- sheets (bottom sheet on phones, dialog on desktop) ---------- */
const sheet = {open:false, view:null, data:{}};
const SHEETS = {};
function openSheet(view, data = {}){
  sheet.open = true; sheet.view = view; sheet.data = data;
  let el = $("#sheet");
  if (!el){ el = document.createElement("div"); el.id = "sheet"; el.className = "sheetwrap"; el.innerHTML = `<div class="sheetbg" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="sheethead"><h2 id="sheetTitle"></h2><button class="btn icon" data-act="closeSheet" aria-label="Close">${ICON.close}</button></div><div class="sheetbody" id="sheetBody"></div></div>`; document.body.appendChild(el); }
  el.classList.add("show"); document.documentElement.classList.add("noscroll");
  sheetRender();
  setTimeout(() => { const f = el.querySelector("[autofocus]"); if (f) f.focus(); }, 60);
}
function sheetRender(){
  if (!sheet.open) return; const s = SHEETS[sheet.view]; if (!s) return;
  const r = s(sheet.data); $("#sheetTitle").textContent = r.title || ""; $("#sheetBody").innerHTML = r.body;
  $("#sheet").querySelector(".sheet").classList.toggle("wide", !!r.wide);
}
function closeSheet(){
  const s = SHEETS[sheet.view]; if (s && s.onClose) s.onClose(sheet.data);
  sheet.open = false; sheet.view = null; const el = $("#sheet"); if (el) el.classList.remove("show"); document.documentElement.classList.remove("noscroll");
}
document.addEventListener("keydown", e => { if (e.key === "Escape" && sheet.open) closeSheet(); });
A.closeSheet = () => closeSheet();

/* ---------- quick actions (+ button) ---------- */
SHEETS.quick = () => ({title:"Quick add", body:`<div class="qgrid">
  ${[["qSearch","search","Search food","Millions of foods & drinks"],["qScan","scan","Scan barcode","Packaged foods"],["qPhoto","camera","Snap a meal","AI estimates it for you"],["qSay","mic","Say it","\"2 eggs and toast\""],
     ["qWeight","scale","Log weight","Updates your trend"],["qWorkout","workouts","Start workout","Today's session"],["qWater","water","Add water","One glass"],["qRecipe","plan","New recipe","Build & save a meal"]]
    .map(([a,i,t,s]) => `<button class="qbtn" data-act="${a}"><span class="qi">${ICON[i]}</span><b>${t}</b><small>${s}</small></button>`).join("")}</div>`});
A.quick = () => openSheet("quick");
A.qWeight = () => openSheet("weigh");
A.qWorkout = () => { closeSheet(); makeDraft(wIdx(new Date())); ui.woTab = "log"; go("workouts"); };
A.qWater = () => { closeSheet(); A.water(); };
SHEETS.weigh = () => ({title:"Log weight", body:`<form class="stack" data-form="weighSheet"><label class="f">Weight (${wUnit()})<input id="wsheet" type="number" step="0.1" inputmode="decimal" required autofocus placeholder="${fmt1(wDisp(state.profile.weightKg))}"></label>
  <label class="f">Date<input id="wsheetDate" type="date" value="${todayKey()}" max="${todayKey()}"></label><button class="btn primary">Save</button>
  <p class="small muted">Weigh in first thing in the morning, after the bathroom and before eating, a few times a week. Your trend line smooths out day-to-day water swings.</p></form>`});
document.addEventListener("submit", e => {
  const f = e.target.closest('[data-form="weighSheet"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const val = +$("#wsheet").value, date = $("#wsheetDate").value || todayKey(), kg = wIn(val);
  if (!(kg > 25 && kg < 320)){ toast(`Enter a weight in ${wUnit()}.`); return; }
  setWeight(r1(kg*100)/100, date > todayKey() ? todayKey() : date); persist("training","profile"); closeSheet(); render(); toast(`Logged ${fmt1(val)} ${wUnit()}`);
}, true);

/* ---------- navigation: fewer, clearer destinations ---------- */
VIEWS.length = 0;
VIEWS.push({id:"today", label:"Today"}, {id:"nutrition", label:"Food"}, {id:"workouts", label:"Train"}, {id:"plan", label:"Plan"}, {id:"progress", label:"Progress"},
  {id:"buddies", label:"Buddies"}, {id:"coach", label:"Coach"}, {id:"devices", label:"Devices"}, {id:"profile", label:"Profile"});
ICON.nutrition = ICON.nutrition; ICON.coach = ICON.coach;
const TABS = ["today", "nutrition", "workouts", "plan"];
function renderNav(){
  $("#nav").innerHTML = VIEWS.map(v => `<button data-act="nav" data-view="${v.id}" ${ui.view===v.id?'aria-current="page"':""}>${ICON[v.id]}<span>${v.label}</span>${v.id==="buddies"&&bud.invitedTo.length?`<span class="navbadge">${bud.invitedTo.length}</span>`:""}${v.id==="coach"&&coachUnread()?`<span class="navbadge">${coachUnread()}</span>`:""}</button>`).join("")
    + `<a class="navlink" href="/support.html" target="_blank" rel="noopener">${ICON.help}<span>Help & FAQ</span></a>`;
  const more = !TABS.includes(ui.view);
  $("#tabbar").innerHTML = TABS.map(id => { const v = VIEWS.find(x => x.id === id); return `<button data-act="nav" data-view="${id}" ${ui.view===id?'aria-current="page"':""}>${ICON[id]}<span>${v.label}</span></button>`; }).join("")
    + `<button data-act="more" ${more?'aria-current="page"':""}>${ICON.more}<span>More</span></button>`;
  let fab = $("#fab");
  if (!fab){ fab = document.createElement("button"); fab.id = "fab"; fab.className = "fab"; fab.setAttribute("data-act", "quick"); fab.setAttribute("aria-label", "Quick add: food, barcode, photo, weight or workout"); fab.innerHTML = ICON.plus; document.body.appendChild(fab); }
  fab.hidden = !!(state && state.meta.welcome);
}
SHEETS.more = () => ({title:"More", body:`<div class="list">${VIEWS.filter(v => !TABS.includes(v.id)).map(v => `<button class="li morelink" data-act="nav" data-view="${v.id}"><span class="qi">${ICON[v.id]}</span><span class="main"><b>${v.label}</b></span>${ICON.right}</button>`).join("")}
  <a class="li morelink" href="/support.html" target="_blank" rel="noopener"><span class="qi">${ICON.help}</span><span class="main"><b>Help & FAQ</b></span>${ICON.right}</a></div>`});
A.more = () => openSheet("more");
const _nav = A.nav; A.nav = el => { if (sheet.open) closeSheet(); _nav(el); };
function coachUnread(){ return (window.RR_COACH && RR_COACH.unread) || 0; }

/* ---------- small helpers ---------- */
const money = v => "$" + (Math.round(v*100)/100).toFixed(2);
const money0 = v => "$" + Math.round(v).toLocaleString();
function downloadFile(name, text, type = "text/plain"){
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type})); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function debounce(fn, ms){ let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

/* ---------- charts drawn at their real width (crisp, readable labels on every screen) ---------- */
const CHARTS = {}; let chartN = 0;
function lineChart(series, opt = {}){
  const probe = lineChart0(series, opt); if (!probe.startsWith("<svg")) return probe;
  const id = "ch" + (++chartN); CHARTS[id] = w => lineChart0(series, Object.assign({}, opt, {w}));
  return `<div class="chartbox" data-chart="${id}" style="height:${opt.h || 220}px">${probe}</div>`;
}
function calBars(target){ const id = "ch" + (++chartN); CHARTS[id] = w => calBars0(target, w); return `<div class="chartbox" data-chart="${id}" style="height:200px">${calBars0(target)}</div>`; }
function drawCharts(){
  for (const el of document.querySelectorAll(".chartbox[data-chart]")){
    const f = CHARTS[el.dataset.chart], w = Math.round(el.clientWidth);
    if (!f || !w || +el.dataset.w === w) continue;
    el.dataset.w = w; el.innerHTML = f(Math.max(240, w));
  }
  const live = new Set([...document.querySelectorAll(".chartbox[data-chart]")].map(e => e.dataset.chart));
  for (const k in CHARTS) if (!live.has(k)) delete CHARTS[k];
}
let chartRaf = 0;
new MutationObserver(() => { cancelAnimationFrame(chartRaf); chartRaf = requestAnimationFrame(drawCharts); }).observe(document.documentElement, {childList:true, subtree:true});
window.addEventListener("resize", () => { cancelAnimationFrame(chartRaf); chartRaf = requestAnimationFrame(drawCharts); });
