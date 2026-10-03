window.RR_PUBLIC = true;
(function(){
  const api = async (route, body) => {
    const r = await fetch("/api/" + route, {method: body === undefined ? "GET" : "POST", headers: {"content-type": "application/json"}, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin"});
    const j = await r.json().catch(() => ({}));
    if (!r.ok){ const e = new Error(j.error || ("HTTP " + r.status)); e.status = r.status; e.code = r.status === 413 ? "invalid_argument" : r.status === 403 ? "invalid_argument" : "unavailable"; throw e; }
    return j;
  };
  window.RR_API = api;
  const ready = api("me").then(async j => {
    let u = j.user;
    // If Stripe shows a subscription the site hasn't recorded yet (e.g. right after checkout), sync it now.
    if (u && u.sub.billing && !u.sub.active) { try { u = (await api("billing/sync", {})).user || u; } catch {} }
    return (window.RR_USER = u);
  }).catch(() => null);
  window.RR_ME = ready;
  const listeners = new Set(), refresh = () => listeners.forEach(f => f());
  setInterval(refresh, 10000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  const snap = (id, exists, data) => ({id, exists, data: () => data === undefined ? undefined : JSON.parse(JSON.stringify(data)), metadata: {fromCache: false, hasPendingWrites: false}});
  const doc = path => ({
    id: path.split("/").pop(), path,
    get: async () => { const j = await api("db", {op: "get", path}); return snap(path.split("/").pop(), !!j.exists, j.data); },
    set: async data => { const j = await api("db", {op: "set", path, data}); setTimeout(refresh, 50); return j; },
    update: async data => { await api("db", {op: "update", path, data}); setTimeout(refresh, 50); },
    delete: async () => { await api("db", {op: "delete", path}); setTimeout(refresh, 50); },
    acquire: async () => ({acquired: true}),
    onSnapshot: (next, err) => { let last; const f = () => doc(path).get().then(s => { const k = JSON.stringify([s.exists, s.data()]); if (k !== last){ last = k; next(s); } }).catch(e => err && err(e)); listeners.add(f); f(); return () => listeners.delete(f); },
    collection: sub => coll(path + "/" + sub)
  });
  const coll = (path, filter) => ({
    path,
    where: (f, op, v) => coll(path, [f, op, v]),
    orderBy(){ return this; }, limit(){ return this; },
    get: async () => { const j = await api("db", {op: "query", collection: path, where: filter || []}); const docs = j.docs.map(d => snap(d.id, true, d.data)); return {docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {}}; },
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
  window.claude = {use: async name => { const u = await ready; if (!u || !u.sub.active) return null; return name === "db" ? db : name === "user" ? user : null; }};
})();
