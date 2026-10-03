/* ======================================================================
   Coach demo videos. Coaches upload up to 90-second exercise demos under an @handle;
   every member can watch, search, follow coaches and report. Each upload is re-encoded
   and safety-checked on the server before anyone else can see it.
   ====================================================================== */
const VV = {list:null, counts:{}, cats:{}, cat:"", q:"", following:false, handle:"", creator:null, busy:false, err:"", mine:null, up:null, poll:null};
async function vvLoad(){
  try { const j = await api("videos/list", {category:VV.cat, q:VV.q, following:VV.following, handle:VV.handle}); VV.list = j.videos; VV.counts = j.counts; VV.cats = j.cats; VV.creator = j.creator; VV.err = ""; }
  catch (e){ VV.err = e.message; VV.list = []; }
  if (ui.view === "workouts" && ui.woTab === "videos" && !isTyping()) render();
}
const vvSearch = debounce(() => { VV.list = null; vvLoad(); }, 350);
const fmtDur = s => `${Math.floor(s/60)}:${pad(Math.round(s % 60))}`;
function videoCard(v){
  return `<button class="vcard" data-act="vvOpen" data-id="${esc(v.id)}"><span class="vposter"><img src="/api/vp/${esc(v.id)}" alt="" loading="lazy" onerror="this.style.display='none'"><span class="vplay">${ICON.play}</span><span class="vdur">${fmtDur(v.duration)}</span></span>
    <b>${esc(v.title)}</b><small>@${esc(v.handle)} · ${esc(v.catLabel)}${v.views ? ` · ${v.views.toLocaleString()} views` : ""}</small></button>`;
}
function V_videos(){
  if (VV.list === null){ vvLoad(); }
  const cats = Object.entries(VV.cats || {});
  const total = Object.values(VV.counts || {}).reduce((a,b) => a + b, 0);
  return `<section class="card stack">
    <div class="row"><div style="flex:1;min-width:220px"><h2>Coach videos</h2><p class="small muted">Short demos from Rep &amp; Ration coaches. Every video is checked before it's published.</p></div>
      ${isCoachPlan() ? `<button class="btn primary sm" data-act="nav" data-view="coach">Upload a demo</button>` : ""}</div>
    <div class="fsearch">${ICON.search}<input type="search" placeholder="Search exercises or @coaches" value="${esc(VV.q)}" data-field="vvQ" aria-label="Search coach videos"></div>
    <div class="chips"><button class="chip" data-act="vvCat" data-c="" aria-pressed="${!VV.cat && !VV.following}">All${total ? ` · ${total}` : ""}</button><button class="chip" data-act="vvFollowing" aria-pressed="${VV.following}">Following</button>
      ${cats.map(([k,l]) => `<button class="chip" data-act="vvCat" data-c="${k}" aria-pressed="${VV.cat===k}">${esc(l)}${VV.counts[k] ? ` · ${VV.counts[k]}` : ""}</button>`).join("")}</div>
    ${VV.creator ? `<div class="creatorbar"><div style="flex:1"><b>@${esc(VV.creator.handle)}</b>${VV.creator.name ? ` · ${esc(VV.creator.name)}` : ""}<br><small class="muted">${VV.creator.followers} follower${VV.creator.followers === 1 ? "" : "s"}${VV.creator.bio ? ` · ${esc(VV.creator.bio)}` : ""}</small></div>
      ${VV.creator.id !== (me() || {}).id ? `<button class="btn sm ${VV.creator.following ? "" : "primary"}" data-act="vvFollow" data-c="${esc(VV.creator.id)}" data-on="${VV.creator.following ? 0 : 1}">${VV.creator.following ? "Following" : "Follow"}</button>` : ""}<button class="btn sm ghost" data-act="vvAll">All coaches</button></div>` : ""}</section>
    ${VV.list === null ? `<div class="loading"><span class="spin"></span> Loading videos…</div>` : VV.list.length ? `<div class="vgrid">${VV.list.map(videoCard).join("")}</div>` : `<section class="card"><p class="muted">${VV.err ? esc(VV.err) : VV.following ? "Follow coaches to see their newest demos here." : "No coach videos here yet. Check back soon."}</p></section>`}`;
}
document.addEventListener("input", e => { const el = e.target; if (el.dataset && el.dataset.field === "vvQ"){ VV.q = el.value; vvSearch(); } });
A.vvCat = el => { VV.cat = el.dataset.c; VV.following = false; VV.list = null; render(); };
A.vvFollowing = () => { VV.following = !VV.following; VV.cat = ""; VV.list = null; render(); };
A.vvAll = () => { VV.handle = ""; VV.creator = null; VV.list = null; render(); };
A.vvHandle = el => { closeSheet(); VV.handle = el.dataset.h; VV.cat = ""; VV.following = false; VV.list = null; ui.woTab = "videos"; go("workouts"); };
A.vvFollow = async el => { try { await api("videos/follow", {creator: el.dataset.c, on: el.dataset.on === "1"}); toast(el.dataset.on === "1" ? "Following" : "Unfollowed"); } catch (e){ toast(e.message); } VV.list = null; await vvLoad(); if (sheet.open && sheet.view === "video"){ const v = (VV.list || []).find(x => x.id === sheet.data.v.id); if (v) sheet.data.v = v; sheetRender(); } };
A.vvOpen = el => { const v = (VV.list || []).concat((VV.mine || {}).videos || []).find(x => x.id === el.dataset.id); if (!v) return; openSheet("video", {v}); if (v.status === "published") api("videos/view", {id:v.id}).catch(() => {}); };
SHEETS.video = d => { const v = d.v, mine = v.creator === (me() || {}).id;
  return {title: v.title, wide:true, body:`<div class="stack"><div class="demo"><video controls playsinline preload="metadata" poster="/api/vp/${esc(v.id)}" src="/api/v/${esc(v.id)}"></video></div>
    <div class="row"><button class="exlink" data-act="vvHandle" data-h="${esc(v.handle)}"><b>@${esc(v.handle)}</b></button>${v.name ? `<span class="muted">${esc(v.name)}</span>` : ""}<span class="spacer"></span>
      ${mine ? "" : `<button class="btn sm ${v.following ? "" : "primary"}" data-act="vvFollow" data-c="${esc(v.creator)}" data-on="${v.following ? 0 : 1}">${v.following ? "Following" : "Follow"}</button>`}</div>
    <div class="row" style="gap:6px"><span class="tag">${esc(v.catLabel)}</span><span class="tag">${fmtDur(v.duration)}</span></div>
    ${v.description ? `<p>${esc(v.description)}</p>` : ""}
    <p class="small muted">Move with control and stop if anything hurts. ${mine ? "" : `<button class="exlink small" data-act="vvReport" data-id="${esc(v.id)}" style="color:var(--bad)">Report this video</button>`}</p></div>`}; };
SHEETS.video.onClose = () => { const vEl = document.querySelector("#sheet video"); if (vEl){ vEl.pause(); vEl.removeAttribute("src"); vEl.load(); } };
A.vvReport = async el => { const why = prompt("What's wrong with this video? (optional)"); if (why === null) return; try { await api("videos/report", {id:el.dataset.id, reason:why}); toast("Thanks. We'll review it."); closeSheet(); } catch (e){ toast(e.message); } };

/* ---------- coach side: handle + uploads ---------- */
async function mineLoad(){ try { VV.mine = await api("creator/me"); } catch (e){ VV.mine = {err:e.message, videos:[]}; }
  const processing = (VV.mine.videos || []).some(v => v.status === "processing" || v.status === "uploading");
  clearTimeout(VV.poll); if (processing) VV.poll = setTimeout(mineLoad, 8000);
  if (ui.view === "coach" && !isTyping() && !VV.up) render(); }
const STATUS = {uploading:["Uploading","neutral"], processing:["Checking…","med"], published:["Live","low"], rejected:["Not published","high"], failed:["Failed","high"]};
function creatorStudio(){
  if (!isCoachPlan()) return "";
  if (!VV.mine){ mineLoad(); return `<section class="card"><div class="loading"><span class="spin"></span> Loading your videos…</div></section>`; }
  const c = VV.mine.creator, cats = VV.mine.cats || {};
  return `<section class="card stack"><div class="card-head" style="margin:0"><div><span class="eyebrow">Your demo videos</span><h2>${c ? `@${esc(c.handle)}` : "Set up your coach profile"}</h2>${c ? `<p class="small muted">${c.followers} follower${c.followers === 1 ? "" : "s"}</p>` : ""}</div></div>
    <form class="stack" data-form="creatorProfile"><div class="fields"><label class="f">@handle<input id="crHandle" type="text" maxlength="24" value="${esc(c ? c.handle : "")}" placeholder="e.g. coachsam" required></label><label class="f">Display name<input id="crName" type="text" maxlength="40" value="${esc(c ? c.name : (me() || {}).name || "")}"></label></div>
      <label class="f">Short bio<input id="crBio" type="text" maxlength="200" value="${esc(c ? c.bio : "")}" placeholder="e.g. NASM trainer · kettlebells & mobility"></label><button class="btn sm" style="align-self:flex-start">${c ? "Save profile" : "Create profile"}</button></form>
    ${c ? `<div class="divider"></div>${!VV.mine.aiOn ? `<p class="small" style="color:var(--warn)">Uploads open as soon as the automatic safety check is switched on.</p>` : ""}
    <form class="stack" data-form="vUpload"><h3>Upload a demo (up to 90 seconds)</h3>
      <label class="btn" style="position:relative;align-self:flex-start">${ICON.camera} Choose or record a video<input id="vFile" type="file" accept="video/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><small class="muted" id="vFileInfo"></small>
      <div class="fields"><label class="f">Exercise name<input id="vTitle" type="text" maxlength="70" required placeholder="e.g. Kettlebell swing"></label><label class="f">Category<select id="vCat" required><option value="" selected disabled>Choose</option>${Object.entries(cats).map(([k,l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></label></div>
      <label class="f">Coaching cues (optional)<textarea id="vDesc" rows="2" maxlength="400" placeholder="What to watch for, common mistakes, sets & reps"></textarea></label>
      ${VV.up ? `<div class="track"><i style="width:${VV.up.pct}%;background:var(--accent)"></i></div><p class="small muted">${esc(VV.up.msg)}</p>` : ""}
      <button class="btn primary" ${VV.up || !VV.mine.aiOn ? "disabled" : ""} style="align-self:flex-start">Upload & check</button>
      <p class="note">Every video is re-encoded and checked frame by frame before it goes live. Videos with nudity, sexual or provocative content, vulgar gestures or language on screen, alcohol, drugs, smoking, weapons or anything that isn't an exercise demo are rejected and deleted. Film in a clean, well-lit space with your whole body in frame.</p></form>
    <div class="list">${(VV.mine.videos || []).map(v => `<div class="li">${v.status === "published" ? `<button class="exlink" data-act="vvOpen" data-id="${esc(v.id)}"><img class="fthumb" src="/api/vp/${esc(v.id)}" alt=""></button>` : `<span class="fthumb ph">${ICON.play}</span>`}
      <div class="main"><b>${esc(v.title)}</b><small>${esc(v.catLabel)}${v.status === "published" ? ` · ${v.views} views` : ""}${v.reason ? ` · ${esc(v.reason)}` : ""}</small></div><span class="pill ${STATUS[v.status][1]}">${STATUS[v.status][0]}</span><button class="btn icon" data-act="vDel" data-id="${esc(v.id)}" aria-label="Delete">${ICON.trash}</button></div>`).join("") || `<p class="empty">No uploads yet.</p>`}</div>` : ""}</section>`;
}
document.addEventListener("change", e => { if (e.target.id !== "vFile") return; const f = e.target.files[0], info = $("#vFileInfo"); if (!f || !info) return;
  const v = document.createElement("video"); v.preload = "metadata"; v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); VV.file = {f, dur: v.duration}; info.textContent = `${f.name} · ${Math.round(v.duration)} s · ${(f.size/1048576).toFixed(1)} MB${v.duration > 90.5 ? " · too long: trim it to 90 seconds" : ""}`; };
  v.onerror = () => { VV.file = {f, dur: 0}; info.textContent = `${f.name} · ${(f.size/1048576).toFixed(1)} MB`; }; v.src = URL.createObjectURL(f); });
document.addEventListener("submit", async e => {
  const f = e.target.closest('[data-form="creatorProfile"],[data-form="vUpload"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  if (f.dataset.form === "creatorProfile"){
    try { await api("creator/profile", {handle:$("#crHandle").value, name:$("#crName").value, bio:$("#crBio").value}); toast("Profile saved"); await mineLoad(); } catch (x){ toast(x.message); } return;
  }
  const file = VV.file && VV.file.f; if (!file){ toast("Choose a video first."); return; }
  if (VV.file.dur > 90.5){ toast("Videos can be up to 90 seconds."); return; }
  const title = $("#vTitle").value.trim(), category = $("#vCat").value, description = $("#vDesc").value.trim();
  if (!title || !category){ toast("Name the exercise and pick a category."); return; }
  VV.up = {pct:0, msg:"Starting…"}; render();
  try {
    const s = await api("creator/start", {title, category, description, size:file.size, duration:VV.file.dur});
    const n = Math.ceil(file.size / s.chunk);
    for (let i = 0; i < n; i++){
      const part = file.slice(i*s.chunk, Math.min(file.size, (i+1)*s.chunk));
      for (let tries = 0; ; tries++){
        const r = await fetch(`/api/creator/chunk?id=${encodeURIComponent(s.id)}&n=${i}`, {method:"POST", headers:{"content-type":"application/octet-stream"}, body:part, credentials:"same-origin"});
        if (r.ok) break; if (tries >= 2){ const j = await r.json().catch(() => ({})); throw new Error(j.error || "Upload failed. Check your connection and try again."); }
      }
      VV.up = {pct: Math.round((i+1)/n*92), msg:`Uploading… ${Math.round((i+1)/n*100)}%`}; const bar = document.querySelector('[data-form="vUpload"] .track i'); if (bar) bar.style.width = VV.up.pct + "%"; const m = bar && bar.closest("form").querySelector(".track + p"); if (m) m.textContent = VV.up.msg;
    }
    await api("creator/finish", {id:s.id});
    VV.up = null; VV.file = null; toast("Uploaded. We're checking it now; it goes live in a few minutes if it passes.");
  } catch (x){ VV.up = null; toast(x.message); }
  await mineLoad(); render();
}, true);
A.vDel = async el => { if (!confirm("Delete this video? This can't be undone.")) return; try { await api("creator/delete", {id:el.dataset.id}); await mineLoad(); } catch (e){ toast(e.message); } };
