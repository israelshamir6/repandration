#!/usr/bin/env python3
"""Assemble public/index.html from the app source + public-mode shim, gate and patches."""
import pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else str(root / "src/app.html")).read_text()
shim = (root / "src/shim.js").read_text()
gate = (root / "src/gate.html").read_text()

def rep(s, old, new, count=1):
    assert s.count(old) >= 1, f"missing: {old[:70]}"
    return s.replace(old, new, count)

# public-mode patches
s = rep(src, 'const APP_URL = "https://claude.ai/artifact/72ewqghJbUCu7HDfHGCrD2";',
        'const APP_URL = window.RR_PUBLIC ? location.origin : "https://claude.ai/artifact/72ewqghJbUCu7HDfHGCrD2";')
s = rep(s, '${bud.user ? `<div class="divider"></div><label class="f">Or add someone from your organization',
        '${bud.user && !window.RR_PUBLIC ? `<div class="divider"></div><label class="f">Or add someone from your organization')
s = rep(s, 'Open the app while signed in to claude.ai and your groups, invites and feed will appear here.',
        'Log in or start your free trial and your groups, invites and feed will appear here.')
account = '''${window.RR_PUBLIC && window.RR_USER ? rrAccountCard() : ""}<!--RR_EXTRAS-->
      <section class="card row"><div style="flex:1;min-width:200px"><h2>Devices & health alerts</h2>'''
s = rep(s, '''
      <section class="card row"><div style="flex:1;min-width:200px"><h2>Devices & health alerts</h2>''', "\n      " + account)

# ---- public mode: no demo data, no placeholder stats; new members enter their own numbers first ----
s = rep(s, "  state = demoState();\n  runCoach(false);",
  "  state = window.RR_PUBLIC ? rrFreshState() : demoState();\n  runCoach(false);")
s = rep(s, "  setSync();\n  initBuddies();\n}",
  "  if (window.RR_PUBLIC && !loaded) render();\n  setSync();\n  initBuddies();\n}")
s = rep(s, "  $(\"#view\").innerHTML = RENDER[ui.view]();",
  "  $(\"#view\").innerHTML = state.meta.welcome ? (store.mode === \"cloud\" || store.mode === \"local\" ? V_welcome() : `<div class=\"loading\">Loading your plan…</div>`) : RENDER[ui.view]();")
s = rep(s, "function demoBanner(){", r"""function rrFreshState(){ const st = freshState(defaultProfile()); st.training.weights = []; st.meta.welcome = true; return st; }
function demoBanner(){""")

s = rep(s, 'sd?(future||dk===k?"Planned":"Missed"):"Recovery"', 'sd?(future||dk===k?"Planned":(state.profile.startDate && dk < state.profile.startDate ? "Before you joined" : "Missed")):"Recovery"')
# ---- devices: automatic phone sync only (coming soon); no manual entry or file imports on the public site ----
s = rep(s, "function coachCard(){", """function coachCard(){ if (window.RR_PUBLIC) return ""; return coachCard0(); }
function coachCard0(){""")
s = rep(s, "function V_devices(){", """function V_devices(){ if (window.RR_PUBLIC) return rrDevicesSoon(); return V_devices0(); }
function rrDevicesSoon(){
  return `<div class="pagehead"><div><h1>Devices</h1><p class="sub">Automatic sync with your phone and smartwatch.</p></div><button class="btn" data-act="nav" data-view="profile">Back to profile</button></div>
  <section class="card stack" style="max-width:720px"><span class="pill neutral" style="align-self:flex-start">Coming soon</span>
    <h2>Watch sync is on the way</h2>
    <p class="muted">The Rep &amp; Ration phone app for iPhone and Android is in development. Once it's out, it will sync automatically in the background with Apple Health and Health Connect / Samsung Health, bringing in heart rate, steps, sleep, blood pressure and stress from your Apple Watch, Galaxy Watch and other devices. Nothing to type in.</p>
    <p class="muted">When it's ready, you'll turn on health tips here: one clear message when something needs attention, like drinking water, resting, or checking in when your heart rate runs high. You'll be able to switch them off any time.</p>
    <p class="small muted">The phone app will be included in your membership at no extra cost.</p>
  </section>`;
}
function V_devices0(){""")
s = rep(s, '${state.health.devices.length ? `', '${window.RR_PUBLIC ? "Automatic Apple Watch and Galaxy Watch sync is coming soon with our phone app." : state.health.devices.length ? `')
s = rep(s, 'function runCoach(', 'function runCoach(force){ if (window.RR_PUBLIC) return; return runCoach0(force); }\nfunction runCoach0(')

# ---- Niche Hive shop shelves (real Amazon products from thenichehive.netlify.app, Associates tag nichepickshq-20) ----
import json as _json
_rows = [l.rstrip("\n").split("|") for l in open(root / "src/nh_products.txt") if l.strip() and not l.startswith("#")]
_nh = {}
for sec, asin, title, img, sub, tags in _rows:
    _nh.setdefault(sec, []).append({"a": asin, "t": title, "i": img, "s": sub, "g": [t for t in tags.split(",") if t]})
nh_js = "\n/* ---------------- Niche Hive shop shelves ---------------- */\nconst NH_TAG = \"nichepickshq-20\";\nconst NH = " + _json.dumps(_nh, ensure_ascii=False) + ";\n" + r"""
const NH_SHELF = {food:["Stock your kitchen","Meal prep containers, food scales and pantry staples for your plan"], workout:["Gear up for your workouts","Equipment and apparel for the exercises in your week"], supp:["Daily essentials","Vitamins, electrolytes and recovery"], track:["Track your progress","Smart scales, fitness trackers and smart rings"]};
function nhPick(sec, n){
  const b = blockedSet(state.profile), list = (NH[sec] || []).filter(x => !x.g.some(t => b.has(t)));
  let seed = 0; for (const c of todayKey() + sec) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const a = list.slice(); for (let i = a.length - 1; i > 0; i--){ seed = (seed * 1103515245 + 12345) >>> 0; const j = seed % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  const seen = new Set(), first = [], rest = []; for (const x of a) (seen.has(x.s) ? rest : (seen.add(x.s), first)).push(x);
  return first.concat(rest).slice(0, n);
}
function nhShelf(sec){
  const items = nhPick(sec, 10); if (!items.length) return "";
  const [h, sub] = NH_SHELF[sec];
  return `<section class="card stack nhshelf"><div class="card-head"><div><span class="eyebrow">Shop · The Niche Hive</span><h2 style="margin-top:2px">${h}</h2><p class="small muted">${sub}</p></div><a class="btn sm" href="https://thenichehive.netlify.app/" target="_blank" rel="noopener">See more</a></div>
    <div class="nhrow">${items.map(x => `<a class="nhitem" href="https://www.amazon.com/dp/${x.a}?tag=${NH_TAG}" target="_blank" rel="sponsored noopener"><span class="nhimg"><img src="https://m.media-amazon.com/images/I/${x.i}" alt="" loading="lazy"></span><small class="nhsub">${esc(x.s)}</small><b>${esc(x.t)}</b><span class="nhcta">View on Amazon</span></a>`).join("")}</div>
    <p class="small muted">As an Amazon Associate, Rep &amp; Ration earns from qualifying purchases. Prices and availability are shown on Amazon.</p></section>`;
}
if (window.RR_PUBLIC){
  const _wrap = (view, secs) => { const f = RENDER[view]; RENDER[view] = () => f() + `<div class="stack" style="margin-top:16px">${secs.map(nhShelf).join("")}</div>`; };
  _wrap("today", ["supp"]); _wrap("nutrition", ["food"]); _wrap("plan", ["food"]); _wrap("workouts", ["workout"]); _wrap("progress", ["track"]); _wrap("devices", ["track"]);
}
"""
s = rep(s, "const RENDER = {today:V_today, plan:V_plan, nutrition:V_nutrition, workouts:V_workouts, progress:V_progress, buddies:V_buddies, devices:V_devices, profile:V_profile};",
  "const RENDER = {today:V_today, plan:V_plan, nutrition:V_nutrition, workouts:V_workouts, progress:V_progress, buddies:V_buddies, devices:V_devices, profile:V_profile};" + nh_js)
s = rep(s, "</style>", """.nhrow{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(150px,170px);gap:12px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
.nhitem{display:flex;flex-direction:column;gap:4px;text-decoration:none;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--surface);scroll-snap-align:start}
.nhitem:hover{border-color:var(--accent)}
.nhimg{display:flex;align-items:center;justify-content:center;height:120px;background:#fff;border-radius:8px}
.nhimg img{max-width:100%;max-height:112px;object-fit:contain}
.nhitem b{font-size:.82rem;line-height:1.3;font-weight:650;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.nhsub{color:var(--muted);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}
.nhshelf a.btn{text-decoration:none;color:var(--ink)}
.nhcta{margin-top:auto;font-size:.78rem;font-weight:700;color:var(--accent)}
</style>""")

acct_js = r'''
/* ---------------- public account & billing ---------------- */
let rrDel = false;
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-rr]"); if (!b) return; const a = b.dataset.rr;
  try {
    if (a === "portal"){ const j = await RR_API("billing/portal", {}); location.href = j.url; }
    else if (a === "logout"){ await RR_API("auth/logout", {}); location.href = "/"; }
    else if (a === "delAsk" || a === "delNo"){ rrDel = a === "delAsk"; render(); }
    else if (a === "delYes"){ b.disabled = true; await RR_API("account/delete", {}); location.href = "/"; }
  } catch (x){ toast(x.message); }
});
'''
s = rep(s, "const RENDER = {", acct_js + "const RENDER = {")


# ---- rename functions the extensions replace (ext/*.js define the new versions) ----
for old, new in [("function renderNav(){", "function renderNav0(){"), ("function V_nutrition(){", "function V_nutrition0(){"),
                 ("function V_workouts(){", "function V_workouts0(){"), ("function V_plan(){", "function V_plan0(){"),
                 ("function V_profile(){", "function V_profile0(){"), ("function V_today(){", "function V_today0(){"),
                 ("function generatePlan(p){", "function generatePlan0(p){"), ("function groceries(plan, from=0, to=7){", "function groceries0(plan, from=0, to=7){"),
                 ("function calc(p){", "function calc0(p){"), ("function mealPool(slot, p){", "function mealPool0(slot, p){"),
                 ("function makeDraft(di){", "function makeDraft0(di){"), ("function perfText(exId){", "function perfText0(exId){"),
                 ("function buildWeek(p, seed){", "function buildWeek0(p, seed){"), ("const srcBadge = k =>", "const srcBadge0 = k =>"),
                 ("const blockedSet = p =>", "const blockedSet0 = p =>"), ("function prepSteps(plan, from, to){", "function prepSteps0(plan, from, to){"), ("function lineChart(series, opt={}){", "function lineChart0(series, opt={}){"), ("function V_progress(){", "function V_progress0(){"), ("function mealCard(m, di, mi, logged){", "function mealCard0(m, di, mi, logged){"), ("function calBars(target){", "function calBars0(target, w){")]:
    s = rep(s, old, new)
# charts are drawn at the real on-screen width so labels stay crisp and readable
s = rep(s, "const W=640, H=opt.h||220, L=46, R=16, T=14, B=28;", "const W=opt.w||640, H=opt.h||220, L=46, R=16, T=14, B=30;")
s = rep(s, "const W=640,H=200,L=46,R=12,T=14,B=28, days=[];", "const W=w||640,H=200,L=46,R=12,T=14,B=30, days=[];")
# y-axis labels: thin them out on short charts so numbers never crowd or overlap
s = rep(s, '  for (const v of t) g += `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end">${fmt1(v)}</text>`;',
  '  { let lastY = 1e9; for (const v of t){ const y = Y(v), show = lastY - y >= 18; if (show) lastY = y; g += `<line x1="${L}" x2="${W-R}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>${show ? `<text x="${L-8}" y="${y+4}" text-anchor="end">${fmt1(v)}</text>` : ""}`; } }')
# date labels: one per distinct day, spaced by the real width, never stacked on top of each other
s = rep(s, '  const xt = [x0, x0+(x1-x0)/2, x1];\n  xt.forEach((x,i) => { const d = new Date(x); g += `<text x="${X(x)}" y="${H-8}" text-anchor="${i===0?"start":i===2?"end":"middle"}">${MON[d.getMonth()]} ${d.getDate()}</text>`; });',
  '  { const day = x => { const d = new Date(x); d.setHours(0,0,0,0); return +d; }, d0 = day(x0), d1 = day(x1), span = Math.round((d1-d0)/864e5);\n'
  '    const slots = Math.max(1, Math.min(span, Math.floor((W-L-R)/110))), seen = new Set(), xt = [];\n'
  '    for (let i = 0; i <= slots; i++){ const d = slots ? day(d0 + (d1-d0)*i/slots + 432e5) : d0; if (!seen.has(d)){ seen.add(d); xt.push(d); } if (!span) break; }\n'
  '    let lastR = -1e9; xt.forEach((x,i) => { const px = span ? X(clamp(x, x0, x1)) : (L+W-R)/2, dt = new Date(x), lab = `${MON[dt.getMonth()]} ${dt.getDate()}`, wd = lab.length*6.6;\n'
  '      const anc = !span ? "middle" : i===0 ? "start" : i===xt.length-1 ? "end" : "middle", left = anc==="start" ? px : anc==="end" ? px-wd : px-wd/2;\n'
  '      if (left < lastR + 10) return; lastR = left + wd; g += `<text x="${px}" y="${H-8}" text-anchor="${anc}">${lab}</text>`; }); }')
# health benefits on every suggested meal
s = rep(s, '<span class="num" style="font-weight:700">${fmt(m.t.kcal)} kcal</span></div>${srcBadge(m.tpl.src)}<ul>', '<span class="num" style="font-weight:700">${fmt(m.t.kcal)} kcal</span></div>${srcBadge(m.tpl.src)}${benefitHTML(m.items)}<ul>')
# exercises referenced by saved plans always resolve, even before the gym library loads
s = rep(s, "const EX = Object.fromEntries(EXS.map(e => [e.id,e]));",
  'const EX = new Proxy(Object.fromEntries(EXS.map(e => [e.id,e])), {get(t, k){ if (typeof k !== "string" || k in t) return t[k]; return {id:k, name: String(k).replace(/^fx-|^wg-|^cx-/, "").replace(/_/g, " "), impact:1, pattern:"core", equip:[], metric:"reps", loaded:false, muscles:"", dose:10, cue:"", gen:false}; }});')
s = rep(s, '<h1>Workouts</h1><p class="sub">Calisthenics and home equipment · ', '<h1>Train</h1><p class="sub">Home, gym or on the road · ')
s = rep(s, '`<div class="logex"><div class="row"><h3 style="flex:1">${esc(e.name)}</h3>', '`<div class="logex"><div class="row"><h3 style="flex:1">${esc(e.name)}</h3><button class="btn sm" data-act="exInfo" data-id="${esc(it.ex)}">${ICON.play} How to</button>')
s = rep(s, '<span class="nm" title="${esc(e.name)}">${esc(e.name)} ', '<span class="nm" title="${esc(e.name)}"><button class="exlink" data-act="exInfo" data-id="${esc(it.ex)}">${esc(e.name)}</button> ')
# ---- extensions go just before boot, and boot waits briefly for the gym exercise library ----
ext = "\n".join((root / "src/ext" / f).read_text() for f in sorted(x.name for x in (root / "src/ext").glob("*.js")))
s = rep(s, "/* ---------------- boot ---------------- */", ext + "\n/* ---------------- boot ---------------- */")
s = rep(s, "(function boot(){", "(async function boot(){\n  try { await Promise.race([RR_EXLOAD, new Promise(r => setTimeout(r, 6000))]); } catch {}")
s = rep(s, "</style>", (root / "src/ext/ext.css").read_text() + "\n.exlink{border:0;background:none;padding:0;font:inherit;color:inherit;cursor:pointer;text-align:left}.exlink:hover{color:var(--accent-strong);text-decoration:underline}\n</style>")

head = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Rep & Ration is a calorie counter, meal planner and workout app in one: barcode scanning, AI photo logging, adaptive calorie targets, 1,700+ exercises with demos, and menus for every diet and faith. 7-day free trial.">
<meta name="theme-color" content="#0B7A5E">
<link rel="canonical" href="https://repandration.netlify.app/">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Rep & Ration"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta property="og:type" content="website"><meta property="og:site_name" content="Rep & Ration">
<meta property="og:title" content="Rep & Ration · Calorie counter, meal planner & workout app">
<meta property="og:description" content="Train it. Eat it. Track both. Adaptive calorie targets, barcode scanning, AI meal photos, 1,700+ exercises and menus for every diet. 7-day free trial.">
<meta property="og:image" content="https://repandration.netlify.app/og.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/icon-192.png" type="image/png">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Rep & Ration","applicationCategory":"HealthApplication","operatingSystem":"Web, iOS, Android","description":"Calorie counter, meal planner and workout tracker with adaptive calorie targets, barcode scanning, AI photo logging and 1,700+ exercises.","offers":[{"@type":"Offer","price":"15.99","priceCurrency":"USD","name":"Monthly"},{"@type":"Offer","price":"120.00","priceCurrency":"USD","name":"Annual"},{"@type":"Offer","price":"24.99","priceCurrency":"USD","name":"Family"},{"@type":"Offer","price":"29.99","priceCurrency":"USD","name":"Coach"}]}</script>
<script>''' + shim + '''</script>
'''
# the source starts with <title>...; everything before the app shell <div class="app"> is head content
i = s.index('<div class="app">')
out = head + s[:i] + "</head><body>\n" + s[i:]
j = out.rindex("</script>") + len("</script>")
out = out[:j] + "\n" + gate + "\n</body></html>\n"
(root / "public").mkdir(exist_ok=True)
(root / "public/index.html").write_text(out)
print("wrote", len(out), "bytes")
