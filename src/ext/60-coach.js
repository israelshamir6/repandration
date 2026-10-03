/* ======================================================================
   Coach mode. Trainers on a Coach plan get a client dashboard with each client's
   meals, workouts and weight trend, plus messaging. Anyone can connect to a coach
   with the coach's code and choose exactly what that coach sees.
   ====================================================================== */
window.RR_COACH = {mine:null, clients:null, limit:0, code:"", sel:null, detail:null, unread:0, busy:false, err:""};
const CO = window.RR_COACH;
const isCoachPlan = () => !!(me() && me().coach);
const canPost = () => isCoachPlan();  // uploads are for members on a Coach plan only
async function coachLoad(){
  if (!PUB || !me() || !me().sub.active) return;
  try {
    const m = await api("coach/mine"); CO.mine = m.coaches || [];
    if (isCoachPlan()){
      const [c, k] = await Promise.all([api("coach/clients"), CO.code ? Promise.resolve({code:CO.code}) : api("coach/code")]);
      CO.clients = c.clients || []; CO.limit = c.limit; CO.code = k.code;
      if (CO.sel) CO.detail = await api("coach/client", {id:CO.sel}).catch(() => null);
    }
    CO.unread = (CO.clients || []).filter(c => c.unread).length + (CO.mine || []).filter(c => c.msgs.length && !c.msgs[c.msgs.length-1].mine && (c.msgs[c.msgs.length-1].at > (state.profile.coachSeen || ""))).length;
  } catch (e){ CO.err = e.message; }
  if (ui.view === "coach") { if (!isTyping()) render(); } else renderNav();
}
const isTyping = () => { const a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest("#view"); };
setInterval(() => { if (!document.hidden && ui.view === "coach") coachLoad(); }, 45000);
const msgList = msgs => `<div class="msgs">${msgs.length ? msgs.map(m => `<div class="msg ${m.mine ? "mine" : ""}"><p>${esc(m.text)}</p><small>${ago(new Date(m.at).getTime())}</small></div>`).join("") : `<p class="empty">No messages yet.</p>`}</div>`;
const msgForm = to => `<form class="row" data-form="coachMsg" data-to="${esc(to)}"><input type="text" name="t" maxlength="1000" placeholder="Write a message" style="flex:1;min-width:160px" aria-label="Message"><button class="btn primary">Send</button></form>`;

function clientDetail(d){
  const p = Object.assign(defaultProfile(), d.profile || {}), hasW = d.profile && d.profile.weightKg;
  const c = hasW ? calc(p) : null, us = p.units === "us", wd = kg => us ? kg*LB : kg, wu = us ? "lb" : "kg";
  const days = []; for (let i = 13; i >= 0; i--) days.push(dkey(addDays(new Date(), -i)));
  const tot = k => (d.food && d.food[k] || []).reduce((a,e) => { a.k += e.kcal*e.q; a.p += e.p*e.q; a.c += e.c*e.q; a.f += e.f*e.q; return a; }, {k:0,p:0,c:0,f:0});
  const w = (d.weights || []).slice().sort((a,b) => a.date < b.date ? -1 : 1);
  return `<section class="card stack"><div class="card-head" style="margin:0"><div><span class="eyebrow">Client</span><h2 style="font-size:1.3rem">${esc(d.name)}</h2><p class="small muted">${GOALS[p.goal] || ""}${p.age ? ` · ${p.age} y` : ""}${p.faith && p.faith !== "none" ? ` · ${esc((FAITHS[p.faith]||[p.faith])[0])}` : ""}${p.diet && p.diet !== "any" ? ` · ${esc((DIETS.find(x => x[0]===p.diet)||["",p.diet])[1])}` : ""}</p></div>
    <div class="row"><button class="btn sm" data-act="coBack">All clients</button><button class="btn sm danger" data-act="coRemove" data-id="${esc(CO.sel)}">Remove</button></div></div>
    ${c ? `<div class="grid g-3"><div class="kv" style="flex-direction:column;border:0"><span class="eyebrow">Target</span><span class="big" style="font-size:1.5rem">${fmt(c.target)} kcal</span></div><div class="kv" style="flex-direction:column;border:0"><span class="eyebrow">Protein</span><span class="big" style="font-size:1.5rem">${c.protein} g</span></div><div class="kv" style="flex-direction:column;border:0"><span class="eyebrow">Weight</span><span class="big" style="font-size:1.5rem">${fmt1(wd(p.weightKg))} ${wu}</span></div></div>` : ""}</section>
  ${d.food ? `<section class="card"><h2 style="margin-bottom:8px">Food · last 14 days</h2><div class="tablewrap"><table class="tbl"><thead><tr><th>Day</th><th>kcal</th><th>P</th><th>C</th><th>F</th></tr></thead><tbody>${days.slice().reverse().map(k => { const t = tot(k), off = c && t.k ? Math.abs(t.k - c.target)/c.target : 0; return `<tr><td>${shortDate(k)}</td><td class="num" style="${t.k ? (off > .15 ? "color:var(--warn);font-weight:700" : "color:var(--good);font-weight:700") : "color:var(--muted)"}">${t.k ? fmt(t.k) : "—"}</td><td class="num">${t.k ? fmt(t.p) : ""}</td><td class="num">${t.k ? fmt(t.c) : ""}</td><td class="num">${t.k ? fmt(t.f) : ""}</td></tr>`; }).join("")}</tbody></table></div></section>` : `<section class="card"><p class="muted">${esc(d.name)} isn't sharing food logs with you.</p></section>`}
  ${d.weights ? `<section class="card"><h2 style="margin-bottom:8px">Weight</h2>${lineChart([{pts:w.map(x => [pkey(x.date).getTime(), wd(x.kg)]), color:"var(--accent)", end:true, dots:true, area:true}], {h:180, label:"Client weight"})}</section>` : ""}
  ${d.sessions ? `<section class="card"><h2 style="margin-bottom:8px">Workouts</h2><div class="list">${d.sessions.slice(-12).reverse().map(s => `<div class="li"><div class="main"><b>${esc(s.name)}</b><small>${shortDate(s.date)} · ${s.items.map(it => `${esc((EX[it.ex]||{name:it.ex}).name)} ${it.sets.map(x => x.v + (x.load ? `@${fmt1(wd(x.load))}` : "")).join("/")}`).join(" · ")}</small></div></div>`).join("") || `<p class="empty">No workouts logged yet.</p>`}</div></section>` : ""}
  <section class="card stack"><h2>Messages</h2>${msgList(d.msgs || [])}${msgForm(CO.sel)}</section>`;
}
function V_coach(){
  const head = (t, s) => `<div class="pagehead"><div><h1>${t}</h1><p class="sub">${s}</p></div></div>`;
  if (!PUB) return head("Coach", "Coach mode is available in your account.") ;
  if (CO.mine === null){ coachLoad(); return head("Coach", "Loading…") + `<div class="loading">Loading…</div>`; }
  let out = "";
  if (isCoachPlan()){
    if (CO.sel && CO.detail) return head("Coach", "Client dashboard") + clientDetail(CO.detail);
    const cl = CO.clients || [];
    out = head("Your clients", `${cl.length} of ${CO.limit >= 100000 ? "unlimited" : CO.limit} clients · they still keep their own membership`);
    out += `<div class="grid g-side"><section class="card stack"><h2>Clients</h2>${cl.length ? `<div class="list">${cl.map(c => { const s = c.sum || {}; return `<button class="li morelink" data-act="coOpen" data-id="${esc(c.id)}"><span class="main"><b>${esc(c.name)}${c.unread ? ` <span class="navbadge" style="margin-left:6px">new</span>` : ""}</b><small>${[s.workouts7 != null ? `${s.workouts7} workouts this week` : "", s.foodDays7 != null ? `${s.foodDays7}/7 days logged` : "", s.avgKcal7 ? `avg ${fmt(s.avgKcal7)} kcal` : "", s.weightChange30 != null ? `${s.weightChange30 > 0 ? "+" : ""}${s.weightChange30} kg in 30 days` : ""].filter(Boolean).join(" · ") || "No data shared yet"}</small></span>${ICON.right}</button>`; }).join("")}</div>` : `<p class="muted">No clients yet. Give them your coach code; they enter it on their Coach page.</p>`}</section>
      <div class="stack"><section class="card stack"><span class="eyebrow">Your coach code</span><div class="codebox"><b class="num">${esc(CO.code || "…")}</b></div><p class="small muted">Clients open Rep &amp; Ration → Coach → Connect to a coach, and enter this code. They choose what you see and can disconnect any time.</p><button class="btn sm" data-act="coCopy">Copy invite message</button></section>
      <section class="card stack"><h2>How coaches use it</h2><ul class="small" style="margin:0;padding-left:18px;line-height:1.7"><li>Check each client's calories and macros against their target</li><li>See every set, rep and load they log</li><li>Watch their weight trend and adherence</li><li>Message them right in the app</li><li>Post exercise demo videos for everyone to follow</li></ul></section></div></div>`;
    out += creatorStudio();
  } else { out += head("Coach", "Work with a personal trainer or nutrition coach"); if (canPost()) out += creatorStudio(); }
  // client side
  const mine = CO.mine || [];
  out += `<div class="grid g-2">${mine.map(c => `<section class="card stack"><div class="row"><div style="flex:1"><span class="eyebrow">Your coach</span><h2>${esc(c.name)}</h2></div><button class="btn sm danger" data-act="coLeave" data-id="${esc(c.id)}">Disconnect</button></div>
      <div><span class="eyebrow">What ${esc(c.name)} can see</span>${[["food","Food logs and calories"],["workouts","Workouts, sets and loads"],["weight","Weight and trend"]].map(([k,l]) => `<label class="check"><input type="checkbox" data-act="coShare" data-id="${esc(c.id)}" data-k="${k}" ${c.share && c.share[k] ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">${l}</span></label>`).join("")}</div>
      <h3>Messages</h3>${msgList(c.msgs)}${msgForm(c.id)}</section>`).join("")}
    <section class="card stack"><h2>Connect to a coach</h2><p class="small muted">Got a code from your trainer? Enter it here. Your coach sees your logs (you choose which), and you can message each other.</p>
      <form class="row" data-form="coJoin"><input id="coCode" type="text" maxlength="8" placeholder="Coach code" autocomplete="off" style="text-transform:uppercase;letter-spacing:.2em;flex:1;min-width:140px" aria-label="Coach code"><button class="btn primary">Connect</button></form></section>
    ${isCoachPlan() ? "" : `<section class="card stack"><span class="eyebrow">For trainers</span><h2>Coach your clients here</h2><p class="small muted">See every client's meals, macros, workouts and weight in one dashboard and message them in the app. Coach $29.99/month for up to 25 clients, or Coach Unlimited $49.99/month.</p><button class="btn" data-act="openPlans">See coach plans</button></section>`}</div>`;
  if (mine.length){ const last = mine.flatMap(c => c.msgs).map(m => m.at).sort().pop(); if (last && last !== state.profile.coachSeen){ state.profile.coachSeen = last; persist("profile"); CO.unread = 0; setTimeout(renderNav, 0); } }
  return out;
}
RENDER.coach = () => V_coach();
A.coOpen = async el => { CO.sel = el.dataset.id; CO.detail = null; render(); try { CO.detail = await api("coach/client", {id:CO.sel}); } catch (e){ toast(e.message); CO.sel = null; } render(); window.scrollTo(0,0); };
A.coBack = () => { CO.sel = null; CO.detail = null; coachLoad(); render(); };
A.coRemove = async el => { if (!confirm("Remove this client? They'll stop sharing with you.")) return; await api("coach/remove", {id:el.dataset.id}).catch(e => toast(e.message)); CO.sel = null; CO.detail = null; coachLoad(); };
A.coLeave = async el => { if (!confirm("Disconnect from this coach? They'll stop seeing your logs.")) return; await api("coach/leave", {coach:el.dataset.id}).catch(e => toast(e.message)); coachLoad(); };
A.coShare = async el => { const c = CO.mine.find(x => x.id === el.dataset.id); c.share = Object.assign({}, c.share, {[el.dataset.k]: el.checked}); await api("coach/share", {coach:c.id, share:c.share}).catch(e => toast(e.message)); };
A.coCopy = async () => { const t = `I coach on Rep & Ration. Open ${location.origin}, start your free trial, then go to Coach and enter my code ${CO.code}.`; try { await navigator.clipboard.writeText(t); toast("Invite copied"); } catch { toast(t); } };
document.addEventListener("submit", async e => {
  const f = e.target.closest('[data-form="coJoin"],[data-form="coachMsg"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const btn = f.querySelector("button"); btn.disabled = true;
  try {
    if (f.dataset.form === "coJoin"){ const j = await api("coach/join", {code: $("#coCode").value}); toast(`Connected to ${j.coach}`); }
    else { const t = f.querySelector("input").value.trim(); if (!t) { btn.disabled = false; return; } await api("coach/msg", {to: f.dataset.to, text: t}); f.querySelector("input").value = ""; }
    await coachLoad();
  } catch (x){ toast(x.message); }
  btn.disabled = false;
}, true);
