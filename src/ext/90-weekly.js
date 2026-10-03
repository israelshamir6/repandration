/* ======================================================================
   Weekly AI coach review, daily habits on Today, sleep and progress photos on Progress,
   and an offline indicator.
   ====================================================================== */
function weekStats(){
  const p = state.profile, c = calc(p), days = [];
  for (let i = 7; i >= 1; i--) days.push(dkey(addDays(new Date(), -i)));
  const logged = days.filter(k => dayEntries(k).length), tot = logged.map(k => dayTotals(k));
  const avg = f => tot.length ? Math.round(tot.reduce((a, t) => a + t[f], 0)/tot.length) : 0;
  const sess = state.training.sessions.filter(s => days.includes(s.date) && s.items.some(it => it.sets.length));
  const ws = state.training.weights.filter(w => w.date >= days[0]).sort((a,b) => a.date < b.date ? -1 : 1);
  const h = state.health, sl = sleepAvg(7), stepsDays = days.map(k => (h.steps || {})[k]).filter(Boolean), waterDays = days.map(k => (h.water || {})[k]).filter(Boolean);
  return {goal: p.goal, diet: p.diet || "standard", daysLogged: logged.length, calorieTarget: c.target, avgCalories: avg("kcal"), proteinTarget: c.protein, avgProtein: avg("p"),
    avgCarbs: avg("c"), avgFat: avg("f"), avgSugar: avg("s"), workouts: sess.length, setsDone: sess.reduce((a, s) => a + s.items.reduce((b, it) => b + it.sets.length, 0), 0),
    weightChange: ws.length > 1 ? r1(wDisp(ws.at(-1).kg - ws[0].kg)) : null, weightUnit: wUnit(), sleepAvgHours: sl ? r1(sl.avg) : null,
    avgSteps: stepsDays.length ? Math.round(stepsDays.reduce((a,b) => a+b, 0)/stepsDays.length) : null, avgWaterGlasses: waterDays.length ? r1(waterDays.reduce((a,b) => a+b, 0)/waterDays.length) : null,
    fasts: (h.fastLog || []).filter(f => f.start > Date.now() - 7*864e5).length, lifestyle: p.lifestyle || "regular"};
}
const weekKey = () => dkey(addDays(new Date(), -((new Date().getDay() + 6) % 7)));   // Monday of this week
const weekly = {busy:false, err:""};
function weeklyCard(){
  const r = state.profile.weekly, fresh = r && r.wk === weekKey();
  if (!isPremium()) return `<section class="card stack"><div class="row"><span class="qi">${ICON.spark || ICON.progress}</span><div style="flex:1"><h2>Your weekly coach review</h2><p class="small muted">Every week, AI reads your food, training, sleep and weight and tells you what went well and the one thing to change.</p></div></div><button class="btn sm" data-act="upgrade" data-f="Weekly AI review">${LOCK} Unlock with Premium</button></section>`;
  if (!fresh) return `<section class="card stack weekly"><div class="row"><span class="qi">${ICON.spark || ICON.progress}</span><div style="flex:1"><h2>Your weekly coach review</h2><p class="small muted">A quick read on last week: wins, the one thing to focus on, and a tip.</p></div></div>
    ${weekly.err ? `<p class="small" style="color:var(--bad)">${esc(weekly.err)}</p>` : ""}<button class="btn primary sm" data-act="weeklyRun" ${weekly.busy ? "disabled" : ""}>${weekly.busy ? `<span class="spin"></span> Reading your week…` : "Get my review"}</button></section>`;
  const d = r.data;
  return `<section class="card stack weekly"><div class="card-head" style="margin:0"><h2>Weekly review</h2><span class="small muted">Week of ${shortDate(r.wk)}</span></div>
    <p><b>${esc(d.headline || "")}</b></p>
    ${(d.wins || []).length ? `<ul class="small" style="margin:0;padding-left:18px">${d.wins.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}
    ${d.focus ? `<div class="daynote"><b>Focus this week:</b> ${esc(d.focus)}</div>` : ""}${d.tip ? `<p class="small muted">Tip: ${esc(d.tip)}</p>` : ""}
    <div class="row"><button class="btn sm ghost" data-act="weeklyRun">Refresh</button></div></section>`;
}
A.weeklyRun = async () => {
  if (!premiumGate("Weekly AI review")) return;
  weekly.busy = true; weekly.err = ""; render();
  try { const j = await api("ai/weekly", {stats: weekStats()}); state.profile.weekly = {wk: weekKey(), data: j}; persist("profile"); }
  catch (e){ weekly.err = e.message; }
  weekly.busy = false; render();
};

/* ---------- Today: habits and weekly review ---------- */
const _todayW = RENDER.today;
RENDER.today = () => {
  return _todayW() + habitsCard() + weeklyCard();
};

/* ---------- Progress: sleep and photos ---------- */
const photos = {list:null, err:"", busy:false, cmp:null};
async function photosLoad(route = "photos/list", body = {}){ photos.busy = true; try { photos.list = (await api(route, body)).photos; photos.err = ""; } catch (e){ photos.err = e.message; if (photos.list === null) photos.list = []; } photos.busy = false; if (ui.view === "progress" && !isTyping()) render(); }
function photosCard(){
  if (!isPremium() && !(photos.list && photos.list.length)) return `<section class="card stack"><h2>Progress photos</h2><p class="small muted">Private before-and-after photos, side by side, so you can see changes the scale misses.</p><button class="btn sm" data-act="upgrade" data-f="Progress photos">${LOCK} Unlock with Premium</button></section>`;
  if (photos.list === null && !photos.busy) photosLoad();
  const L = photos.list || [], first = L[0], last = L.at(-1);
  return `<section class="card stack"><div class="card-head" style="margin:0"><h2>Progress photos</h2><span class="small muted">Only you can see these</span></div>
    ${L.length >= 2 ? `<div class="grid g-2 photocmp"><figure><img src="/api/photo/${first.id}" alt="First photo" loading="lazy"><figcaption>${shortDate(first.date)}${first.weight ? ` · ${fmt1(first.weight)} ${wUnit()}` : ""}</figcaption></figure><figure><img src="/api/photo/${last.id}" alt="Latest photo" loading="lazy"><figcaption>${shortDate(last.date)}${last.weight ? ` · ${fmt1(last.weight)} ${wUnit()}` : ""}</figcaption></figure></div>` : ""}
    ${L.length ? `<div class="photostrip">${L.slice().reverse().map(p => `<div class="ph"><img src="/api/photo/${p.id}" alt="Photo from ${shortDate(p.date)}" loading="lazy"><small>${shortDate(p.date)} · ${p.pose}</small><button class="btn sm ghost" data-act="photoDel" data-id="${p.id}" aria-label="Delete photo">✕</button></div>`).join("")}</div>` : `<p class="small muted">No photos yet. Same spot, same light, once a week works best.</p>`}
    ${photos.err ? `<p class="small" style="color:var(--bad)">${esc(photos.err)}</p>` : ""}
    <div class="row"><select id="photoPose" aria-label="Pose"><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option></select>
      <label class="btn sm primary" style="position:relative">${photos.busy ? `<span class="spin"></span> Saving…` : `${ICON.camera} Add photo`}<input type="file" accept="image/*" data-field="progPhoto" style="position:absolute;inset:0;opacity:0;cursor:pointer" ${photos.busy ? "disabled" : ""}></label></div></section>`;
}
A.photoDel = el => { if (confirm("Delete this photo? This can't be undone.")) photosLoad("photos/delete", {id: el.dataset.id}); };
document.addEventListener("change", async e => { const el = e.target; if (!(el.dataset && el.dataset.field === "progPhoto" && el.files[0])) return;
  if (!premiumGate("Progress photos")) return;
  photos.busy = true; render();
  try { const w = state.training.weights.at(-1); await photosLoad("photos/upload", {image: await shrinkImage(el.files[0], 1200), date: todayKey(), pose: ($("#photoPose") || {}).value, weight: w ? r1(wDisp(w.kg)) : null}); toast("Photo saved"); }
  catch (x){ photos.busy = false; toast(x.message || "Couldn't save that photo"); render(); } });
const _progW = RENDER.progress;
RENDER.progress = () => _progW() + `<section class="card stack"><div class="card-head" style="margin:0"><h2>Sleep</h2>${isPremium() ? "" : `<button class="btn sm" data-act="upgrade" data-f="Sleep tracking">${LOCK} Premium</button>`}</div>${isPremium() ? sleepCard(false) : `<p class="small muted">Log your sleep and see how it lines up with your weight, hunger and training.</p>`}</section>` + photosCard();

/* ---------- offline indicator ---------- */
function offlineBadge(){
  let el = document.getElementById("offlineBadge");
  const n = window.RR_OFFLINE ? RR_OFFLINE.pending() : 0, off = !navigator.onLine;
  if (!off && !n){ if (el) el.remove(); return; }
  if (!el){ el = document.createElement("div"); el.id = "offlineBadge"; el.className = "offline"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = off ? `Offline · ${n ? `${n} change${n === 1 ? "" : "s"} will sync when you're back online` : "you can keep logging"}` : `Syncing ${n} change${n === 1 ? "" : "s"}…`;
}
window.addEventListener("rr-queue", offlineBadge); window.addEventListener("online", offlineBadge); window.addEventListener("offline", offlineBadge);
setTimeout(offlineBadge, 1500);
