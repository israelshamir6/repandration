window.RR_PUBLIC = true;
(function(){
  const api = async (route, body) => {
    const r = await fetch("/api/" + route, {method: body === undefined ? "GET" : "POST", headers: {"content-type": "application/json"}, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin"});
    const j = await r.json().catch(() => ({}));
    if (route === "auth/logout" || route === "account/delete" || route === "auth/login" || route === "auth/signup"){ try { for (const k of Object.keys(localStorage)) if (/^rr-(doc|q|user)/.test(k) || (k === "rr-queue" && /logout|delete/.test(route))) localStorage.removeItem(k); } catch {} }
    if (!r.ok){ const e = new Error(j.error || ("HTTP " + r.status)); e.status = r.status; e.code = r.status === 413 ? "invalid_argument" : r.status === 403 ? "invalid_argument" : "unavailable"; throw e; }
    return j;
  };
  window.RR_API = api;
  /* ---------- offline: cached reads, queued writes that sync when the connection is back ---------- */
  const LS = {get(k){ try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k){ try { localStorage.removeItem(k); } catch {} }};
  const isNet = e => e && !e.status && (e instanceof TypeError || /fetch|network|Load failed/i.test(e.message));
  let queue = LS.get("rr-queue") || [];
  const saveQ = () => { LS.set("rr-queue", queue); window.dispatchEvent(new Event("rr-queue")); };
  window.RR_OFFLINE = {pending: () => queue.length, online: () => navigator.onLine};
  const merge = (a, b) => { const o = Object.assign({}, a || {}); for (const [k, v] of Object.entries(b || {})){ if (k.includes(".")){ const ps = k.split("."); let t = o; for (const p of ps.slice(0, -1)){ t[p] = Object.assign({}, t[p]); t = t[p]; } t[ps.at(-1)] = v; } else o[k] = v; } return o; };
  let flushing = false;
  async function flush(){
    if (flushing || !queue.length || !navigator.onLine) return; flushing = true;
    try { while (queue.length){ await api("db", queue[0]); queue.shift(); saveQ(); } }
    catch (e){ if (!isNet(e)){ queue.shift(); saveQ(); } }
    flushing = false;
    if (!queue.length) setTimeout(refresh, 50);
  }
  window.addEventListener("online", () => { flush(); window.dispatchEvent(new Event("rr-queue")); });
  window.addEventListener("offline", () => window.dispatchEvent(new Event("rr-queue")));
  setInterval(flush, 15000);
  async function write(op){
    const key = "rr-doc:" + op.path, cur = LS.get(key);
    LS.set(key, op.op === "delete" ? {exists: false} : {exists: true, data: op.op === "set" ? op.data : merge(cur && cur.data, op.data)});
    if (queue.length || !navigator.onLine){ queue.push(op); saveQ(); flush(); return {ok: true, queued: true}; }
    try { return await api("db", op); } catch (e){ if (!isNet(e)) throw e; queue.push(op); saveQ(); return {ok: true, queued: true}; }
  }
  const ready = api("me").then(async j => {
    let u = j.user;
    if (u) LS.set("rr-user", u); else LS.del("rr-user");
    // If Stripe shows a subscription the site hasn't recorded yet (e.g. right after checkout), sync it now.
    // Right after checkout (or once per visit) pull the subscription straight from Stripe in case the webhook is late.
    let synced = false; try { synced = sessionStorage.getItem("rrSynced") === "1"; } catch {}
    if (u && u.sub.billing && !u.sub.active && (/checkout=success/.test(location.search) || !synced)) { try { sessionStorage.setItem("rrSynced", "1"); } catch {} try { u = (await api("billing/sync", {})).user || u; } catch {} }
    return (window.RR_USER = u);
  }).catch(e => isNet(e) ? (window.RR_USER = LS.get("rr-user")) : null);
  window.RR_ME = ready;
  const listeners = new Set(), refresh = () => listeners.forEach(f => f());
  setInterval(refresh, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  const snap = (id, exists, data) => ({id, exists, data: () => data === undefined ? undefined : JSON.parse(JSON.stringify(data)), metadata: {fromCache: false, hasPendingWrites: false}});
  const doc = path => ({
    id: path.split("/").pop(), path,
    get: async () => {
      const key = "rr-doc:" + path;
      // while writes are waiting to sync, the local copy is the newest
      if (queue.some(q => q.path === path)){ const c = LS.get(key); if (c) return snap(path.split("/").pop(), !!c.exists, c.data); }
      try { const j = await api("db", {op: "get", path}); LS.set(key, {exists: !!j.exists, data: j.data}); return snap(path.split("/").pop(), !!j.exists, j.data); }
      catch (e){ const c = LS.get(key); if (isNet(e) && c) return snap(path.split("/").pop(), !!c.exists, c.data); throw e; }
    },
    set: async data => { const j = await write({op: "set", path, data}); setTimeout(refresh, 50); return j; },
    update: async data => { await write({op: "update", path, data}); setTimeout(refresh, 50); },
    delete: async () => { await write({op: "delete", path}); setTimeout(refresh, 50); },
    acquire: async () => ({acquired: true}),
    onSnapshot: (next, err) => { let last; const f = () => doc(path).get().then(s => { const k = JSON.stringify([s.exists, s.data()]); if (k !== last){ last = k; next(s); } }).catch(e => err && err(e)); listeners.add(f); f(); return () => listeners.delete(f); },
    collection: sub => coll(path + "/" + sub)
  });
  const coll = (path, filter) => ({
    path,
    where: (f, op, v) => coll(path, [f, op, v]),
    orderBy(){ return this; }, limit(){ return this; },
    get: async () => { const key = "rr-q:" + path + JSON.stringify(filter || []); let j;
      try { j = await api("db", {op: "query", collection: path, where: filter || []}); LS.set(key, j); } catch (e){ j = isNet(e) && LS.get(key); if (!j) throw e; }
      const docs = j.docs.map(d => snap(d.id, true, d.data)); return {docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {}}; },
    onSnapshot(next, err){ let last; const f = () => this.get().then(q => { const k = JSON.stringify(q.docs.map(d => [d.id, d.data()])); if (k !== last){ last = k; next(q); } }).catch(e => err && err(e)); listeners.add(f); f(); return () => listeners.delete(f); },
    doc: id => doc(path + "/" + (id || Math.random().toString(36).slice(2)))
  });
  const db = {doc, collection: p => coll(p)};
  const names = {};
  const user = {
    id: async () => { const u = await ready; return u ? u.id : null; },
    me: async () => { const u = await ready; return {id: u ? u.id : null, name: u ? u.name : "", email: u ? u.email : null, avatarUrl: "", color: "#0B7A5E", isOwner: false, canEdit: false}; },
    isOwner: async () => false, canEdit: async () => false, can: async () => null,
    profiles: async ids => {
      ids = [].concat(ids); const u = await ready; const need = ids.filter(i => !(i in names));
      if (need.length){ try { const j = await api("profiles", {ids: need}); for (const i of need) names[i] = j.names[i] || ""; } catch {} }
      return Object.fromEntries(ids.map(i => [i, {id: i, name: u && i === u.id ? (u.name || "You") : (names[i] || ""), avatarUrl: "", color: "#0B7A5E", email: null, isMe: !!u && i === u.id}]));
    },
    search: async () => []
  };
  window.claude = {use: async name => { const u = await ready; if (!u) return null; return name === "db" ? db : name === "user" ? user : null; }};
})();
