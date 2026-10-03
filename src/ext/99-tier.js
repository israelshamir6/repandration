/* ======================================================================
   Free vs Premium. Free: log food by search, log workouts (no demos or videos), buddies,
   progress and the weekly meal plan (no grocery list). Everything else stays visible but
   opens an upgrade prompt. The server enforces the same rules.
   ====================================================================== */
function isPremium(){ if (!PUB) return true; const u = me(); return !!(u && u.sub && u.sub.active); }
const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lockic"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
function premiumGate(feature){ if (isPremium()) return true; openSheet("upgrade", {feature}); return false; }
SHEETS.upgrade = d => { const u = me() || {sub:{}}, trial = u.sub && u.sub.canTrial;
  return {title:"Premium feature", body:`<div class="stack upsheet"><div class="row" style="gap:12px"><span class="qi">${LOCK}</span><div style="flex:1"><b>${esc(d.feature || "This feature")} isn't available in free mode.</b><p class="small muted">Upgrade to Premium to unlock it, along with everything else in Rep &amp; Ration.</p></div></div>
    <ul class="small" style="margin:0;padding-left:18px;line-height:1.8"><li>Barcode, photo and "say it" food logging</li><li>Restaurant menu scanner and chain menus</li><li>Grocery lists, budget and faith-based menus</li><li>Adaptive calorie targets and weekly AI review</li><li>1,700+ exercise demos and coach videos</li><li>DOT physical prep, fasting timer, progress photos and reminders</li></ul>
    <div class="grid g-2"><button class="btn primary" data-act="pickPlan" data-p="individual_year">${trial ? "Try 7 days free · then $120/yr" : "Annual · $120/yr"}</button><button class="btn" data-act="pickPlan" data-p="individual_month">${trial ? "Try 7 days free · then $15.99/mo" : "Monthly · $15.99/mo"}</button></div>
    <button class="btn sm ghost" data-act="openPlans" style="align-self:center">See Family and Coach plans</button>
    ${trial ? `<p class="small muted" style="text-align:center">Nothing is charged for 7 days. Cancel any time before then.</p>` : ""}</div>`}; };
const lockedView = (title, feature, blurb) => `<div class="pagehead"><div><h1>${title}</h1><p class="sub">Premium</p></div></div>
  <section class="card stack lockcard"><span class="qi">${LOCK}</span><h2>${esc(feature)} is a Premium feature</h2><p class="muted">${blurb}</p><div class="row"><button class="btn primary" data-act="upgrade" data-f="${esc(feature)}">Upgrade to Premium</button></div></section>`;
A.upgrade = el => openSheet("upgrade", {feature: el.dataset.f || "This feature"});

// actions that need Premium
const PREMIUM_ACTS = {qScan:"Barcode scanning", qPhoto:"Photo logging", qSay:"Say-it logging", aiMic:"Voice logging", qRecipe:"Recipes", editRecipe:"Recipes", logRecipeBtn:"Recipes", rcAdd:"Recipes",
  water:"Water tracking", qWater:"Water tracking", copyList:"Grocery lists", shareList:"Grocery lists", openReminders:"Reminders", remTest:"Reminders",
  checkinYes:"Adaptive targets", adaptiveToggle:"Adaptive targets", budgetOff:"Budget menus", vvOpen:"Coach videos", vvFollow:"Coach videos"};
for (const [k, label] of Object.entries(PREMIUM_ACTS)) if (A[k]){ const f = A[k]; A[k] = (el, e) => { if (!premiumGate(label)) { if (el && el.type === "checkbox") el.checked = !el.checked; return; } return f(el, e); }; }
// recipes tab in food search
const _fsTab = A.fsTab; A.fsTab = el => { if (el.dataset.t === "recipes" && !premiumGate("Recipes")) return; _fsTab(el); };
// tabs and views
const _woTab = A.woTab; A.woTab = el => { if (el.dataset.tab === "videos" && !premiumGate("Coach videos")) return; _woTab(el); };
const _planTab = A.planTab; A.planTab = el => { if (el.dataset.tab === "grocery" && !premiumGate("Grocery lists & shopping")) return; _planTab(el); };
for (const [view, title, feature, blurb] of [["coach","Coach","Coach mode","Connect with a personal trainer or nutrition coach, share your logs and message each other. Trainers on a Coach plan get a client dashboard and can post demo videos."],
  ["devices","Devices","Devices & health alerts","Track heart rate, sleep, steps and blood pressure, with one clear tip when something needs attention."],
  ["market","Coach Shop","The Coach Shop","Training programs, meal plans, coaching and gear from Rep & Ration coaches."],
  ["dot","DOT prep","DOT physical prep","Get ready for your DOT medical exam: blood pressure log with certificate-length estimates, sleep and sleep-apnea screening, blood sugar, and a readiness checklist."]]){
  const f = RENDER[view]; RENDER[view] = () => isPremium() ? f() : lockedView(title, feature, blurb);
}
for (const [view, tab, title, feature, blurb] of [["workouts","videos","Train","Coach videos","Short exercise demos from Rep & Ration coaches, checked for safety before they're published."],["plan","grocery","Weekly plan","Grocery lists & shopping","Your week's grocery list, prep steps, budget and one-tap send to Amazon Fresh."]]){
  const f = RENDER[view], key = view === "workouts" ? "woTab" : "planTab";
  RENDER[view] = () => (!isPremium() && ui[key] === tab) ? (ui[key] = view === "workouts" ? "schedule" : "meals", f()) : f();
}
// budget form
document.addEventListener("submit", e => { if (e.target.closest('[data-form="budget"]') && !isPremium()){ e.preventDefault(); e.stopImmediatePropagation(); premiumGate("Budget menus"); } }, true);
// demos are Premium: free members see the steps but no images or videos
const _exThumb = exThumb; exThumb = e => isPremium() ? _exThumb(e) : `<span class="exthumb ph sm">${ICON[e.pattern === "cardio" ? "progress" : "workouts"]}<small>${esc(PATTERN[e.pattern])}</small></span>`;
const _demoBlock = demoBlock; demoBlock = e => isPremium() ? _demoBlock(e) : ((e.img || e.wimg || e.vid) ? `<button class="btn" data-act="upgrade" data-f="Exercise demos & videos">${LOCK} Unlock the demo with Premium</button>` : "");
// profile settings that belong to Premium features
const _profileExtras = profileExtras;
profileExtras = () => {
  if (isPremium()) return _profileExtras();
  const html = _profileExtras();
  const keep = /<section class="card stack"><h2>Your data<\/h2>[\s\S]*?<\/section>/.exec(html);
  return `<section class="card stack lockcard"><div class="row" style="gap:10px"><span class="qi">${LOCK}</span><div style="flex:1"><h2>Premium settings</h2><p class="small muted">Faith and cultural menus, budget and household plans, trucker and shift-worker modes, and reminders come with Premium.</p></div></div><button class="btn primary sm" data-act="upgrade" data-f="Premium settings" style="align-self:flex-start">Upgrade to Premium</button></section>${keep ? keep[0] : ""}`;
};
// little lock badges on Premium buttons for free members
function markLocks(){
  if (isPremium()) return;
  document.querySelectorAll("[data-act]").forEach(el => { const a = el.dataset.act;
    const locked = PREMIUM_ACTS[a] || (a === "woTab" && el.dataset.tab === "videos") || (a === "planTab" && el.dataset.tab === "grocery") || (a === "fsTab" && el.dataset.t === "recipes") || (a === "nav" && ["coach","devices","dot","market"].includes(el.dataset.view)) || PREMIUM_EXTRA.includes(a);
    if (locked && !el.querySelector(".lockic")) el.insertAdjacentHTML("beforeend", LOCK); });
}
const PREMIUM_EXTRA = ["menuScan","pantryOpen","openSleep","fastQuick","chainOpen","fastStart","weeklyRun","snapToggle"];
new MutationObserver(() => { clearTimeout(markLocks.t); markLocks.t = setTimeout(markLocks, 30); }).observe(document.documentElement, {childList:true, subtree:true});
// a gentle banner for free members on Today
const _today = RENDER.today; RENDER.today = () => {
  const html = _today(); if (isPremium() || !PUB) return html;
  return `<div class="banner"><p><b>You're on the free plan.</b> Log food, workouts and progress as long as you like. Premium adds barcode and photo logging, grocery lists, adaptive targets, demos and more.</p><button class="btn primary" data-act="upgrade" data-f="Premium">See Premium</button></div>` + html;
};
