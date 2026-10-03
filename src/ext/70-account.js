/* ======================================================================
   Membership plans, family seats, reminders (push), app install and data export.
   ====================================================================== */
const PLAN_INFO = {
  individual_month:{name:"Monthly", price:15.99, per:"month", blurb:"Everything in Rep & Ration"},
  individual_year:{name:"Annual", price:120, per:"year", blurb:"Same app, billed once a year", save:15.99*12-120},
  family_month:{name:"Family", price:24.99, per:"month", blurb:"You plus 4 people in your household"},
  family_year:{name:"Family annual", price:199, per:"year", blurb:"You plus 4, billed once a year", save:24.99*12-199},
  coach_month:{name:"Coach", price:29.99, per:"month", blurb:"Client dashboard for up to 25 clients"},
  coach_unlimited_month:{name:"Coach Unlimited", price:49.99, per:"month", blurb:"Unlimited clients"}
};
const planLine = k => { const p = PLAN_INFO[k]; return p ? `${p.name} · ${money(p.price)}/${p.per}` : "Founding member · $12.99/month"; };
SHEETS.plans = () => {
  const u = me(), cur = u && u.sub.ownPlan, active = u && u.sub.active && u.sub.via === "own";
  const card = k => { const p = PLAN_INFO[k], on = active && cur === k && !u.sub.legacy;
    return `<div class="plancard ${on ? "on" : ""}"><div class="row"><b>${p.name}</b>${p.save ? `<span class="pill low">Save ${money(p.save)}</span>` : ""}<span class="spacer"></span><span class="num"><b>${money(p.price)}</b><small class="muted">/${p.per}</small></span></div>
      <p class="small muted">${p.blurb}${p.per === "year" ? ` · ${money(p.price/12)}/month` : ""}</p>
      ${on ? `<span class="small" style="color:var(--good);font-weight:700">Your plan</span>` : `<button class="btn sm ${p.save ? "primary" : ""}" data-act="pickPlan" data-p="${k}">${active ? "Switch to this" : "Choose"}</button>`}</div>`; };
  return {title:"Plans", wide:true, body:`<div class="stack">${u && u.sub.legacy ? `<p class="small">You're on the founding price of $12.99/month. Switching moves you to the plan you pick.</p>` : ""}
    <span class="eyebrow">Just you</span><div class="grid g-2">${card("individual_month")}${card("individual_year")}</div>
    <span class="eyebrow">Your household</span><div class="grid g-2">${card("family_month")}${card("family_year")}</div>
    <span class="eyebrow">Trainers & coaches</span><div class="grid g-2">${card("coach_month")}${card("coach_unlimited_month")}</div>
    <p class="small muted">${active ? "Switching takes effect now. Stripe credits the unused part of your current plan toward the new one." : "Every plan starts with a 7-day free trial if you haven't had one. Cancel any time."}</p></div>`};
};
A.openPlans = () => openSheet("plans");
A.pickPlan = async el => {
  const k = el.dataset.p, u = me(), p = PLAN_INFO[k];
  const active = u && u.sub.active && u.sub.via === "own";
  if (active){
    if (!confirm(`Switch to ${p.name} at ${money(p.price)}/${p.per}? ${u.sub.status === "trialing" ? "Your free trial continues; the new price applies when it ends." : "Your card is charged the prorated difference today."}`)) return;
    el.disabled = true;
    try { const j = await api("billing/change", {plan:k}); window.RR_USER = j.user; closeSheet(); render(); toast(`You're on ${p.name} now`); } catch (e){ toast(e.message); el.disabled = false; }
  } else { el.disabled = true; try { const j = await api("billing/checkout", {plan:k}); location.href = j.url; } catch (e){ toast(e.message); el.disabled = false; } }
};

const fam = {list:null, err:""};
async function famLoad(){ try { fam.list = (await api("family/list")).members; } catch (e){ fam.err = e.message; } if (ui.view === "profile" && !isTyping()) render(); }
function rrAccountCard(){
  const u = me(), st = u.sub.status, d = t => t ? new Date(t).toLocaleDateString(undefined, {month:"short", day:"numeric", year:"numeric"}) : "";
  const plan = u.sub.via === "family" ? `Family plan · covered by ${esc(u.sub.familyOwner)}` : planLine(u.sub.legacy ? null : u.sub.ownPlan);
  const line = u.sub.via === "family" ? "Active" : st === "trialing" ? `Free trial · first charge ${d(u.sub.trialEnd)}` : st === "active" ? `Active · renews ${d(u.sub.periodEnd)}` : st === "past_due" ? "Payment failed · update your card to keep access" : "No active plan";
  if (u.family && fam.list === null){ fam.list = []; famLoad(); }
  return `<section class="card stack"><h2>Account & billing</h2>
    <div class="kv"><span>Email</span><span>${esc(u.email)}</span></div><div class="kv"><span>Plan</span><span>${plan}</span></div><div class="kv"><span>Status</span><span>${esc(line)}</span></div>
    ${u.sub.via === "own" && (u.sub.ownPlan === "individual_month" || u.sub.legacy) ? `<div class="upsell"><b>Go annual and save $71.88</b><span class="small muted">$120/year works out to $10/month.</span><button class="btn sm primary" data-act="pickPlan" data-p="individual_year">Switch to annual</button></div>` : ""}
    ${u.family ? `<div class="stack"><span class="eyebrow">Your household · ${fam.list ? fam.list.length : 0} of 4 added</span>
      <div class="list">${(fam.list || []).map(m => `<div class="li"><div class="main"><b>${esc(m.name || m.email)}</b><small>${esc(m.email)} · ${m.joined ? "joined" : "invited, not signed up yet"}</small></div><button class="btn sm danger" data-act="famRemove" data-e="${esc(m.email)}">Remove</button></div>`).join("")}</div>
      ${(fam.list || []).length < 4 ? `<form class="row" data-form="famAdd"><input id="famEmail" type="email" placeholder="Their email" style="flex:1;min-width:180px" aria-label="Family member email"><button class="btn sm primary">Add</button></form><p class="small muted">They create an account with that email and get full access, no card needed.</p>` : ""}</div>` : ""}
    <div class="row">${u.sub.via !== "family" ? `<button class="btn sm" data-act="openPlans">Change plan</button><button class="btn sm" data-rr="portal">Manage billing</button>` : ""}<button class="btn sm" data-rr="logout">Log out</button><button class="btn sm danger" data-rr="delAsk">Delete account</button></div>
    ${rrDel ? `<div class="confirm"><span>Delete your account, cancel your subscription and erase your data? This can't be undone.</span><button class="btn sm danger" data-rr="delYes">Delete my account</button><button class="btn sm" data-rr="delNo">Cancel</button></div>` : ""}
    <p class="small muted">Billing is handled by Stripe. Cancel any time from Manage billing. <a href="/terms.html" target="_blank">Terms</a> · <a href="/privacy.html" target="_blank">Privacy</a> · <a href="/support.html" target="_blank">Help</a></p></section>`;
}
A.famRemove = async el => { if (!confirm(`Remove ${el.dataset.e} from your family plan?`)) return; try { fam.list = (await api("family/remove", {email:el.dataset.e})).members; render(); } catch (e){ toast(e.message); } };
document.addEventListener("submit", async e => { const f = e.target.closest('[data-form="famAdd"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  try { fam.list = (await api("family/add", {email:$("#famEmail").value})).members; render(); toast("Added. Tell them to sign up with that email."); } catch (x){ toast(x.message); } }, true);

/* ---------- install as an app ---------- */
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; if (ui.view === "today" || ui.view === "profile") render(); });
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function installCard(compact){
  if (!PUB || isStandalone() || state.profile.installDismissed) return "";
  if (!installEvt && !isIOS()) return "";
  return `<section class="card installcard"><div class="row"><img src="/icons/icon-192.png" alt="" width="44" height="44" style="border-radius:11px"><div style="flex:1;min-width:180px"><b>Put Rep & Ration on your home screen</b><p class="small muted">${installEvt ? "Opens full-screen like an app, with reminders." : "In Safari tap the Share button, then “Add to Home Screen”. You'll get reminders once it's installed."}</p></div>
    ${installEvt ? `<button class="btn primary sm" data-act="install">Install</button>` : ""}<button class="btn sm ghost" data-act="installNo">Not now</button></div></section>`;
}
A.install = async () => { if (!installEvt) return; installEvt.prompt(); const r = await installEvt.userChoice.catch(() => null); installEvt = null; if (r && r.outcome === "accepted") toast("Installed. Find Rep & Ration on your home screen."); render(); };
A.installNo = () => { state.profile.installDismissed = true; persist("profile"); render(); };
if ("serviceWorker" in navigator && PUB) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));

/* ---------- reminders ---------- */
const REM_DEFAULT = () => { const p = state.profile, t = s => { const x = slotTime(p, s); if (!x) return null; const [hm, ap] = x.split(" "); let [h, m] = hm.split(":").map(Number); if (ap === "PM" && h !== 12) h += 12; if (ap === "AM" && h === 12) h = 0; return `${pad(h)}:${pad(m)}`; };
  return [
    {id:"breakfast", label:slotLabel("Breakfast"), on:true, time:t("Breakfast") || "08:00", title:"Log breakfast", body:"Tap to log it in seconds. Scan, snap or search.", url:"/#nutrition"},
    {id:"lunch", label:"Lunch", on:true, time:t("Lunch") || "12:30", title:"Lunch check-in", body:"Log lunch so your macros stay on track.", url:"/#nutrition"},
    {id:"dinner", label:slotLabel("Dinner"), on:true, time:t("Dinner") || "18:30", title:"Dinner time", body:"Log dinner and see what's left for the day.", url:"/#nutrition"},
    {id:"workout", label:"Workout", on:true, time:"17:30", title:"Today's workout is ready", body:"Your session is planned. Let's get it done.", url:"/#workouts", train:true},
    {id:"weigh", label:"Weigh-in", on:true, time:"07:00", title:"Morning weigh-in", body:"Step on the scale before breakfast. It keeps your targets accurate.", url:"/#today", days:[0,2,4]},
    {id:"water", label:"Water", on:false, time:"14:00", title:"Drink some water", body:"A glass now keeps energy up.", url:"/#today"},
    {id:"prep", label:"Meal prep", on:true, time:"10:00", title:"Meal-prep day", body:"Your grocery list and prep steps are ready.", url:"/#plan", days:[6]}
  ]; };
const rem = {items:null, devices:0, busy:false, err:""};
SHEETS.reminders = () => {
  const items = rem.items || REM_DEFAULT(), perm = "Notification" in window ? Notification.permission : "unsupported";
  const needInstall = isIOS() && !isStandalone();
  return {title:"Reminders", body:`<div class="stack">
    ${perm === "unsupported" || needInstall ? `<p class="small" style="color:var(--warn)">${needInstall ? "On iPhone, add Rep & Ration to your home screen first (Share → Add to Home Screen), open it from there, then turn reminders on." : "This browser can't show notifications."}</p>` : perm === "denied" ? `<p class="small" style="color:var(--warn)">Notifications are blocked for this site. Allow them in your browser's site settings, then come back.</p>` : ""}
    <div class="list">${items.map((it,i) => `<div class="li"><label class="row" style="flex:1;gap:10px"><input type="checkbox" data-field="remOn" data-i="${i}" ${it.on ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--accent)"><span class="main"><b>${esc(it.label)}</b><small>${it.days ? it.days.map(d => DAYS[d]).join(", ") : it.train ? "Training days" : "Every day"}</small></span></label><input type="time" value="${it.time}" data-field="remTime" data-i="${i}" style="width:118px"></div>`).join("")}</div>
    <button class="btn primary" data-act="remSave" ${rem.busy ? "disabled" : ""}>${rem.devices ? "Save reminders" : "Turn on reminders"}</button>
    ${rem.devices ? `<button class="btn sm" data-act="remTest">Send a test notification</button>` : ""}
    <p class="small muted">Reminders arrive as notifications on this device even when the app is closed${rem.devices ? ` · on for ${rem.devices} device${rem.devices > 1 ? "s" : ""}` : ""}.</p></div>`};
};
A.openReminders = async () => { openSheet("reminders"); try { const j = await api("reminders/get"); rem.devices = j.devices; if (j.items && j.items.length){ const def = REM_DEFAULT(); rem.items = def.map(d => Object.assign(d, (j.items.find(x => x.id === d.id) || {}))); } sheetRender(); } catch {} };
document.addEventListener("change", e => { const el = e.target, f = el.dataset && el.dataset.field; if (f !== "remOn" && f !== "remTime") return; rem.items ||= REM_DEFAULT(); const it = rem.items[+el.dataset.i]; if (f === "remOn") it.on = el.checked; else it.time = el.value; });
function b64u(s){ const pad = "=".repeat((4 - s.length % 4) % 4), b = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); }
A.remSave = async () => {
  rem.items ||= REM_DEFAULT(); rem.busy = true; sheetRender();
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error(isIOS() ? "Add Rep & Ration to your home screen first, then open it from there." : "This browser can't receive notifications.");
    const perm = await Notification.requestPermission(); if (perm !== "granted") throw new Error("Notifications weren't allowed.");
    const reg = await navigator.serviceWorker.ready, key = (await api("push/key")).key;
    let sub = await reg.pushManager.getSubscription(); if (!sub) sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64u(key)});
    await api("push/subscribe", {subscription: sub.toJSON()});
    const trainDays = state.profile.schedule.map((d,i) => d ? i : -1).filter(i => i >= 0);
    await api("reminders/set", {tz: Intl.DateTimeFormat().resolvedOptions().timeZone, items: rem.items.map(it => ({id:it.id, on:it.on, time:it.time, days: it.days || (it.train ? trainDays : [0,1,2,3,4,5,6]), title:it.title, body:it.body, url:it.url}))});
    state.profile.reminders = true; persist("profile"); rem.devices = Math.max(1, rem.devices); toast("Reminders are on");
  } catch (e){ toast(e.message); }
  rem.busy = false; sheetRender();
};
A.remTest = async () => { try { const j = await api("push/test"); toast(j.sent ? "Test sent. Check your notifications." : "No device is set up yet."); } catch (e){ toast(e.message); } };

/* ---------- your data ---------- */
A.exportJSON = () => downloadFile(`rep-and-ration-${todayKey()}.json`, JSON.stringify({exported:new Date().toISOString(), profile:state.profile, food:state.food, training:state.training, health:state.health}, null, 2), "application/json");
A.exportCSV = () => {
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const food = ["date,meal,food,serving,amount,calories,protein_g,carbs_g,fat_g,sugar_g"].concat(Object.keys(state.food.log).sort().flatMap(d => state.food.log[d].map(e => [d, e.meal, q(e.name), q(e.serv), e.q, Math.round(e.kcal*e.q), r1(e.p*e.q), r1(e.c*e.q), r1(e.f*e.q), r1(e.s*e.q)].join(","))));
  const w = ["date,weight_kg,weight_lb"].concat(sortedWeights().map(x => [x.date, r1(x.kg), r1(x.kg*LB)].join(",")));
  const s = ["date,session,exercise,set,reps_or_seconds,load_kg"].concat(state.training.sessions.flatMap(se => se.items.flatMap(it => it.sets.map((x,i) => [se.date, q(se.name), q((EX[it.ex]||{name:it.ex}).name), i+1, x.v, x.load ? r1(x.load) : ""].join(",")))));
  downloadFile(`rep-and-ration-food-${todayKey()}.csv`, food.join("\n"), "text/csv");
  setTimeout(() => downloadFile(`rep-and-ration-weight-${todayKey()}.csv`, w.join("\n"), "text/csv"), 400);
  setTimeout(() => downloadFile(`rep-and-ration-workouts-${todayKey()}.csv`, s.join("\n"), "text/csv"), 800);
};
