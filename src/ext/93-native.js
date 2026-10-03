/* ======================================================================
   Native iPhone / Android app: when Rep & Ration runs inside the app shell (Capacitor),
   read Apple Health or Health Connect (steps, sleep, resting heart rate, HRV, weight,
   blood pressure) and fill the same logs the web app uses. On the web, offer the app.
   ====================================================================== */
const NATIVE = !!(window.Capacitor && typeof Capacitor.isNativePlatform === "function" && Capacitor.isNativePlatform());
const HealthP = () => NATIVE && Capacitor.Plugins && Capacitor.Plugins.Health;
const PLATFORM = NATIVE ? Capacitor.getPlatform() : "web";
const hs = {busy:false, err:"", last:null};
try { hs.last = +localStorage.getItem("rr-hsync") || null; } catch {}
const listOf = r => (r && (r.samples || r.buckets || r.results || r.data)) || (Array.isArray(r) ? r : []);
const numOf = x => +(x.value ?? x.sum ?? x.average ?? x.quantity ?? 0);
const dayOf = x => dkey(new Date(x.startDate || x.start || x.date));
async function healthSync(prompt){
  const H = HealthP(); if (!H) return;
  if (!isPremium()) return prompt && premiumGate("Apple Health & Health Connect sync");
  hs.busy = true; hs.err = ""; if (prompt) render();
  try {
    const av = await H.isAvailable(); if (av && av.available === false) throw new Error(PLATFORM === "android" ? "Install Health Connect from the Play Store, then try again." : "Health data isn't available on this device.");
    const types = ["steps","sleep","restingHeartRate","heartRateVariability","weight","bloodPressure"];
    if (prompt) await H.requestAuthorization({read: types, write: []});
    const end = new Date(), start = addDays(new Date(), -14); start.setHours(0,0,0,0);
    const span = {startDate: start.toISOString(), endDate: end.toISOString()}, h = state.health; let n = 0;
    // steps: daily totals
    try { for (const b of listOf(await H.queryAggregated({...span, dataType:"steps", bucket:"day", aggregation:"sum"}))){ const v = Math.round(numOf(b)); if (v > 0){ h.steps[dayOf(b)] = v; n++; } } } catch {}
    // sleep: add up asleep time per night (credited to the morning it ends)
    try { const per = {}; for (const s of listOf(await H.readSamples({...span, dataType:"sleep", limit:2000}))){ const st = String(s.sleepState || s.stage || s.value || "").toLowerCase(); if (/awake|inbed|in_bed/.test(st)) continue;
        const a = new Date(s.startDate), z = new Date(s.endDate), hrs = (z - a)/36e5; if (hrs > 0 && hrs < 16){ const k = dkey(z); per[k] = (per[k] || 0) + hrs; } }
      for (const [k, v] of Object.entries(per)) if (v >= 1){ h.sleep[k] = r1(Math.min(v, 14)); n++; } } catch {}
    // resting heart rate and HRV: daily averages
    for (const [type, key] of [["restingHeartRate","rhr"],["heartRateVariability","hrv"]]){
      try { const per = {}; for (const s of listOf(await H.readSamples({...span, dataType:type, limit:1000}))){ const k = dayOf(s); (per[k] ||= []).push(numOf(s)); }
        for (const [k, v] of Object.entries(per)){ h[key][k] = r1(v.reduce((a,b) => a+b, 0)/v.length); n++; } } catch {}
    }
    // blood pressure readings
    try { for (const s of listOf(await H.readSamples({...span, dataType:"bloodPressure", limit:200}))){ const sys = +(s.systolic ?? (s.value && s.value.systolic)), dia = +(s.diastolic ?? (s.value && s.value.diastolic)); const t = new Date(s.startDate).getTime();
        if (sys > 60 && dia > 30 && !h.bp.some(x => Math.abs(x[0] - t) < 60000)){ h.bp.push([t, sys, dia]); n++; } } h.bp.sort((a,b) => a[0]-b[0]); } catch {}
    // weight (kg) into the weigh-in log, one per day
    try { const ws = state.training.weights; for (const s of listOf(await H.readSamples({...span, dataType:"weight", limit:200}))){ let kg = numOf(s); if (/lb/i.test(s.unit || "")) kg *= 0.453592; const k = dayOf(s);
        if (kg > 25 && kg < 400 && !ws.some(w => w.date === k)){ ws.push({date:k, kg: r1(kg)}); n++; } } ws.sort((a,b) => a.date < b.date ? -1 : 1); persist("training"); } catch {}
    if (!h.devices.includes(PLATFORM === "ios" ? "applehealth" : "healthconnect")) h.devices.push(PLATFORM === "ios" ? "applehealth" : "healthconnect");
    persist("health"); hs.last = Date.now(); try { localStorage.setItem("rr-hsync", String(hs.last)); } catch {}
    if (prompt) toast(n ? `Synced ${n} readings from ${PLATFORM === "ios" ? "Apple Health" : "Health Connect"}` : "Connected. New readings will appear as your watch records them.");
  } catch (e){ hs.err = e.message || "Couldn't read health data."; if (prompt) toast(hs.err); }
  hs.busy = false; render();
}
A.healthSync = () => healthSync(true);
A.healthSettings = () => { const H = HealthP(); if (H && H.openHealthConnectSettings) H.openHealthConnectSettings().catch(() => {}); };
function nativeCard(){
  if (NATIVE) return `<section class="card stack"><div class="row"><span class="qi">${ICON.heart || ICON.progress}</span><div style="flex:1"><h2>${PLATFORM === "ios" ? "Apple Health" : "Health Connect"}</h2>
      <p class="small muted">Steps, sleep, resting heart rate, HRV, weight and blood pressure from your ${PLATFORM === "ios" ? "iPhone and Apple Watch" : "phone and watch (Galaxy, Pixel, Fitbit, Garmin and more)"}.${hs.last ? ` Last synced ${new Date(hs.last).toLocaleString([], {month:"short", day:"numeric", hour:"numeric", minute:"2-digit"})}.` : ""}</p></div></div>
    ${hs.err ? `<p class="small" style="color:var(--bad)">${esc(hs.err)}</p>` : ""}
    <div class="row"><button class="btn primary sm" data-act="healthSync" ${hs.busy ? "disabled" : ""}>${hs.busy ? `<span class="spin"></span> Syncing…` : hs.last ? "Sync now" : "Connect"}</button>${PLATFORM === "android" ? `<button class="btn sm ghost" data-act="healthSettings">Health Connect settings</button>` : ""}</div></section>`;
  return `<section class="card stack"><div class="row"><span class="qi">${ICON.heart || ICON.progress}</span><div style="flex:1"><h2>Sync your watch automatically</h2>
    <p class="small muted">The Rep &amp; Ration app for iPhone and Android reads Apple Health or Health Connect, so steps, sleep, heart rate, weight and blood pressure from Apple Watch, Galaxy Watch, Pixel Watch, Fitbit and Garmin fill in on their own. It's included in Premium.</p></div></div>
    <p class="small muted">Coming soon to the App Store and Google Play. Until then, install the web app from your browser and use Import on this page.</p></section>`;
}
const _devN = RENDER.devices; RENDER.devices = () => { const html = _devN(), i = html.indexOf("</div></div>"); return i < 0 ? nativeCard() + html : html.slice(0, i + 12) + nativeCard() + html.slice(i + 12); };
if (NATIVE){
  document.documentElement.classList.add("native", "native-" + PLATFORM);
  // sync quietly when the app opens or comes back to the front, at most once an hour
  const quiet = () => { if (hs.last && Date.now() - hs.last < 36e5) return; if (typeof state !== "undefined" && state && state.health && isPremium()) healthSync(false); };
  setTimeout(quiet, 4000); document.addEventListener("visibilitychange", () => { if (!document.hidden) quiet(); });
}
