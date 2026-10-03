/* ======================================================================
   Coach Shop: verified coaches sell programs and products. The coach is the seller;
   payments go straight to the coach's Stripe account and Rep & Ration takes a platform fee.
   ====================================================================== */
const mk = {tab:"browse", items:null, q:"", cat:"", err:"", busy:false, buys:null, sell:null, form:null, codeSent:{}};
const SELLER_TERMS = "2026-10-03";
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>').replace(/\n/g, "<br>");
const cents = c => money(c/100);
async function mkLoad(what){
  mk.busy = true; mk.err = "";
  try {
    if (what === "browse"){ const j = await api("market/list", {q: mk.q, cat: mk.cat}); mk.items = j.items; mk.cats = j.cats; }
    else if (what === "buys"){ mk.buys = (await api("market/purchases", {})).orders; }
    else if (what === "sell"){ mk.sell = await api("seller/me", {}); }
  } catch (e){ mk.err = e.message; if (what === "browse" && !mk.items) mk.items = []; if (what === "buys" && !mk.buys) mk.buys = []; }
  mk.busy = false; if (ui.view === "market" && !isTyping()) render();
}
async function sellerCall(route, body = {}){
  try { mk.sell = await api(route, body); render(); return true; } catch (e){ toast(e.message); return false; }
}
function V_market(){
  const u = me(), coach = !!(u && u.coach);
  const tabs = [["browse","Browse"],["buys","My purchases"],["sell","Sell"]];
  if (mk.tab === "browse" && mk.items === null && !mk.busy) mkLoad("browse");
  if (mk.tab === "buys" && mk.buys === null && !mk.busy) mkLoad("buys");
  if (mk.tab === "sell" && coach && mk.sell === null && !mk.busy) mkLoad("sell");
  const body = mk.tab === "browse" ? mkBrowse() : mk.tab === "buys" ? mkBuys() : coach ? mkSell() : `<section class="card stack"><h2>Sell your programs and gear</h2><p class="muted">Coaches and trainers on a Coach plan can sell training programs, meal plans, coaching packages, guides, apparel and equipment here. Buyers pay you directly through Stripe.</p><button class="btn primary" data-act="openPlans" style="align-self:flex-start">See Coach plans</button></section>`;
  return `<div class="pagehead"><div><h1>Coach Shop</h1><p class="sub">Programs and gear from Rep &amp; Ration coaches</p></div></div>
    <div class="seg" role="tablist" style="margin-bottom:14px">${tabs.map(([k,l]) => `<button data-act="mkTab" data-t="${k}" aria-pressed="${mk.tab === k}">${l}</button>`).join("")}</div>
    ${mk.err ? `<p class="small" style="color:var(--bad)">${esc(mk.err)}</p>` : ""}${body}`;
}
function mkBrowse(){
  const cats = mk.cats || {};
  return `<section class="card stack"><form class="row" data-form="mkSearch"><input id="mkQ" type="search" value="${esc(mk.q)}" placeholder="Search programs, plans, gear" style="flex:1;min-width:160px" aria-label="Search the shop"><button class="btn sm">Search</button></form>
    <div class="chips"><button class="chip" data-act="mkCat" data-c="" aria-pressed="${!mk.cat}">All</button>${Object.entries(cats).map(([k,l]) => `<button class="chip" data-act="mkCat" data-c="${k}" aria-pressed="${mk.cat === k}">${esc(l)}</button>`).join("")}</div></section>
    ${mk.items === null || (mk.busy && !mk.items.length) ? `<div class="loading"><span class="spin"></span> Loading the shop…</div>` : !mk.items.length ? `<section class="card"><p class="muted">Nothing here yet${mk.q || mk.cat ? " for that search" : ""}. Coaches are setting up their shops; check back soon.</p></section>`
    : `<div class="mkgrid">${mk.items.map(it => `<button class="card mkcard" data-act="mkOpen" data-id="${it.id}">${it.image ? `<img src="${it.image}" alt="" loading="lazy">` : `<span class="mkph">${ICON.cart || ""}</span>`}
        <span class="eyebrow">${esc(it.catLabel)}</span><b>${esc(it.title)}</b><span class="small muted">by ${esc(it.seller)}${it.handle ? ` · @${esc(it.handle)}` : ""}</span><span class="num"><b>${cents(it.price)}</b>${it.sales ? `<small class="muted"> · ${it.sales} sold</small>` : ""}</span></button>`).join("")}</div>`}
    <p class="small muted">Items are sold by independent coaches, not by Rep &amp; Ration. The coach handles delivery, support and refunds. <a href="/terms.html" target="_blank">Terms</a></p>`;
}
SHEETS.mkItem = d => { const it = d.it;
  return {title: it.title, wide:true, body:`<div class="stack">${it.image ? `<img src="${it.image}" alt="" class="mkhero">` : ""}
    <div class="row"><span class="pill neutral">${esc(it.catLabel)}</span>${it.ships ? `<span class="pill neutral">Ships to you</span>` : `<span class="pill low">Digital · instant access</span>`}<span class="spacer"></span><span class="big" style="font-size:1.6rem">${cents(it.price)}</span></div>
    <p class="small muted">Sold by <b>${esc(it.seller)}</b>${it.handle ? ` (@${esc(it.handle)})` : ""}</p>
    <div class="mkdesc">${linkify(it.description)}</div>
    <label class="check" style="border:0;padding:0"><input type="checkbox" id="mkAgree"><span style="text-decoration:none;color:var(--ink)">I understand ${esc(it.seller)} is the seller and is responsible for this item, its delivery and refunds, not Rep &amp; Ration.</span></label>
    <div class="row"><button class="btn primary" data-act="mkBuy" data-id="${it.id}">Buy for ${cents(it.price)}</button><button class="btn ghost sm" data-act="mkReport" data-id="${it.id}">Report</button></div>
    <p class="small muted">Checkout is handled by Stripe. Talk to your doctor before starting a new program.</p></div>`}; };
A.mkTab = el => { mk.tab = el.dataset.t; mk.err = ""; if (mk.tab === "buys") mk.buys = null; render(); };
A.mkCat = el => { mk.cat = el.dataset.c; mk.items = null; render(); };
A.mkOpen = el => { const it = (mk.items || []).find(x => x.id === el.dataset.id); if (it) openSheet("mkItem", {it}); };
A.mkBuy = async el => {
  if (!premiumGate("Coach Shop")) return;
  if (!($("#mkAgree") || {}).checked) return toast("Tick the box to confirm who the seller is");
  el.disabled = true; try { const j = await api("market/buy", {id: el.dataset.id, agree: true}); location.href = j.url; } catch (e){ toast(e.message); el.disabled = false; }
};
A.mkReport = async el => { const r = prompt("What's wrong with this listing?"); if (!r) return; try { await api("market/report", {id: el.dataset.id, reason: r}); toast("Thanks. We'll take a look."); closeSheet(); } catch (e){ toast(e.message); } };
document.addEventListener("submit", e => { const f = e.target.closest('[data-form="mkSearch"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation(); mk.q = $("#mkQ").value; mk.items = null; render(); }, true);

function mkBuys(){
  if (mk.buys === null) return `<div class="loading"><span class="spin"></span> Loading your purchases…</div>`;
  if (!mk.buys.length) return `<section class="card"><p class="muted">You haven't bought anything yet.</p></section>`;
  return mk.buys.map(o => `<section class="card stack"><div class="row"><div style="flex:1"><h2>${esc(o.title)}</h2><p class="small muted">${esc(o.seller)} · ${cents(o.amount)} · ${new Date(o.at).toLocaleDateString()}${o.status === "fulfilled" ? " · delivered" : ""}</p></div>${o.image ? `<img src="${o.image}" alt="" class="mkthumb">` : ""}</div>
    ${o.delivery ? `<div class="mkdesc"><span class="eyebrow">What you get</span><br>${linkify(o.delivery)}</div>` : `<p class="small muted">The seller will ship this to the address you gave at checkout.</p>`}
    <p class="small muted">Questions or a refund? Contact the seller${o.sellerEmail ? `: <a href="mailto:${esc(o.sellerEmail)}">${esc(o.sellerEmail)}</a>` : ""}.</p></section>`).join("");
}

/* ---------- selling ---------- */
function mkSell(){
  const d = mk.sell; if (!d) return `<div class="loading"><span class="spin"></span> Loading your shop…</div>`;
  if (!d.ready) return mkOnboard(d);
  return `<section class="card stack"><div class="grid g-3 fleetstats"><div><b>${cents(d.earned)}</b><small>earned after fees</small></div><div><b>${d.orders.length}</b><small>orders</small></div><div><b>${d.listings.filter(l => l.status === "live").length}</b><small>live listings</small></div></div>
      <div class="row"><button class="btn primary" data-act="mkNew">New listing</button><a class="btn" href="https://dashboard.stripe.com/" target="_blank" rel="noopener">Payouts & refunds (Stripe)</a></div>
      <p class="small muted">Platform fee: ${d.fee}% of each sale, taken automatically. You're the seller: you handle delivery, support, refunds and taxes. <a href="/seller-terms.html" target="_blank">Seller Agreement</a></p></section>
    <section class="card stack"><h2>Your listings</h2>${d.listings.length ? `<div class="list">${d.listings.map(l => `<div class="li"><div class="main"><b>${esc(l.title)}</b><small>${cents(l.price)} · ${esc(l.catLabel)} · ${l.sales} sold · <span class="${l.status === "live" ? "" : "warn"}">${{live:"Live",pending:"In review",rejected:"Not approved",hidden:"Hidden"}[l.status] || l.status}</span>${l.reason ? ` · ${esc(l.reason)}` : ""}</small></div>
        <button class="btn sm" data-act="mkEdit" data-id="${l.id}">Edit</button>${["live","hidden"].includes(l.status) ? `<button class="btn sm ghost" data-act="mkHide" data-id="${l.id}">${l.status === "live" ? "Hide" : "Show"}</button>` : ""}<button class="btn sm danger" data-act="mkDel" data-id="${l.id}">Delete</button></div>`).join("")}</div>` : `<p class="muted">No listings yet. Add your first program or product.</p>`}</section>
    <section class="card stack"><h2>Orders</h2>${d.orders.length ? `<div class="list">${d.orders.map(o => { const a = o.shipping && o.shipping.address; return `<div class="li"><div class="main"><b>${esc(o.title)}</b><small>${esc(o.buyer || o.email || "Buyer")} · ${cents(o.amount)} (you get ${cents(o.amount - o.fee)}) · ${new Date(o.at).toLocaleDateString()}${a ? ` · Ship to ${esc([o.shipping.name, a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(", "))}` : ""}${o.email ? ` · <a href="mailto:${esc(o.email)}">${esc(o.email)}</a>` : ""}</small></div>
        ${o.status === "paid" ? `<button class="btn sm primary" data-act="mkFulfill" data-id="${o.id}">Mark delivered</button>` : `<span class="pill low">Delivered</span>`}</div>`; }).join("")}</div>` : `<p class="muted">No orders yet.</p>`}</section>`;
}
function mkOnboard(d){
  const s = d.seller || {}, st = d.steps, step = (ok, n, title, inner) => `<div class="mkstep ${ok ? "done" : ""}"><span class="mkn">${ok ? "✓" : n}</span><div style="flex:1" class="stack"><b>${title}</b>${ok ? "" : inner}</div></div>`;
  const first = !st.details ? 1 : !st.phone ? 2 : !st.email ? 3 : !st.agreement ? 4 : 5;
  return `<section class="card stack"><h2>Set up your coach shop</h2><p class="small muted">Sell programs, meal plans, coaching and gear. Buyers pay you directly through your own Stripe account. Rep &amp; Ration keeps a ${d.fee}% platform fee and isn't the seller: you're responsible for what you sell, delivery, support and refunds.</p>
    ${step(st.details, 1, "Your details", `<form class="stack" data-form="mkDetails"><label class="f">Full legal name<input id="sdLegal" type="text" autocomplete="name" value="${esc(s.legalName || "")}" required></label>
      <label class="f">Business or brand name <span class="muted">(shown to buyers, optional)</span><input id="sdBiz" type="text" autocomplete="organization" value="${esc(s.businessName || "")}"></label>
      <label class="f">Mobile phone<input id="sdPhone" type="tel" autocomplete="tel" value="${esc(s.phone || "")}" placeholder="(555) 123-4567" required></label>
      <label class="f">Email for orders<input id="sdEmail" type="email" autocomplete="email" value="${esc(s.email || me().email)}" required></label><button class="btn primary" style="align-self:flex-start">Save and continue</button></form>`)}
    ${step(st.phone, 2, "Verify your phone", first !== 2 ? "" : `<p class="small muted">We'll text a 6-digit code to ${esc(s.phone || "")}.${d.phoneOn ? "" : " (Text codes are switching on soon.)"}</p><div class="row"><button class="btn sm" data-act="mkSend" data-k="phone">${mk.codeSent.phone ? "Send again" : "Text me a code"}</button></div>
      ${mk.codeSent.phone ? `<form class="row" data-form="mkCode" data-k="phone"><input id="codephone" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Code" style="width:130px"><button class="btn sm primary">Verify</button></form>` : ""}<button class="btn sm ghost" data-act="mkEditDetails" style="align-self:flex-start">Change number</button>`)}
    ${step(st.email, 3, "Verify your email", first !== 3 ? "" : `<p class="small muted">We'll email a 6-digit code to ${esc(s.email || "")}.</p><div class="row"><button class="btn sm" data-act="mkSend" data-k="email">${mk.codeSent.email ? "Send again" : "Email me a code"}</button></div>
      ${mk.codeSent.email ? `<form class="row" data-form="mkCode" data-k="email"><input id="codeemail" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Code" style="width:130px"><button class="btn sm primary">Verify</button></form>` : ""}`)}
    ${step(st.agreement, 4, "Accept the Seller Agreement", first !== 4 ? "" : `<p class="small">In short: you are the seller and merchant of record. You alone are responsible and liable for your listings, products, programs, delivery, refunds, taxes and any claims, and you indemnify Rep &amp; Ration. No drugs, steroids, SARMs, prescription or weight-loss medications, or disease claims. We take a ${d.fee}% platform fee.</p>
      <a href="/seller-terms.html" target="_blank" class="small">Read the full Seller Agreement</a><label class="check" style="border:0;padding:0"><input type="checkbox" id="mkTerms"><span style="text-decoration:none;color:var(--ink)">I've read and agree to the Seller Agreement</span></label><button class="btn primary sm" data-act="mkAgree" style="align-self:flex-start">Accept</button>`)}
    ${step(st.payouts, 5, "Connect Stripe for payouts", first !== 5 ? "" : `<p class="small muted">Stripe verifies your identity and sends your earnings to your bank. You'll manage payouts and refunds in your own Stripe dashboard.</p><div class="row"><button class="btn primary sm" data-act="mkConnect">${s.stripe ? "Continue Stripe setup" : "Connect with Stripe"}</button>${s.stripe ? `<button class="btn sm ghost" data-act="mkRefresh">I've finished</button>` : ""}</div>`)}</section>`;
}
A.mkEditDetails = () => { mk.sell.steps.details = false; render(); };
A.mkSend = async el => { const k = el.dataset.k; el.disabled = true; try { const j = await api(`seller/${k}/send`, {}); mk.codeSent[k] = true; toast(`Code sent to ${j.to}`); render(); } catch (e){ toast(e.message); el.disabled = false; } };
A.mkAgree = () => { if (!($("#mkTerms") || {}).checked) return toast("Tick the box to accept the agreement"); sellerCall("seller/agree", {agree: true, version: SELLER_TERMS}); };
A.mkConnect = async el => { el.disabled = true; try { const j = await api("seller/connect", {}); location.href = j.url; } catch (e){ toast(e.message); el.disabled = false; } };
A.mkRefresh = () => sellerCall("seller/me");
A.mkHide = el => sellerCall("seller/listing/hide", {id: el.dataset.id});
A.mkDel = el => { if (confirm("Delete this listing? Past buyers keep what they bought.")) sellerCall("seller/listing/delete", {id: el.dataset.id}); };
A.mkFulfill = el => sellerCall("seller/order/fulfill", {id: el.dataset.id});
A.mkNew = () => { mk.form = {category:"program", price:"", title:"", description:"", delivery:"", ships:false}; openSheet("mkForm"); };
A.mkEdit = el => { const l = mk.sell.listings.find(x => x.id === el.dataset.id); if (!l) return; mk.form = {id:l.id, category:l.category, price:(l.price/100).toFixed(2), title:l.title, description:l.description, delivery:"", ships:l.ships, keepDelivery:true}; openSheet("mkForm"); };
SHEETS.mkForm = () => { const f = mk.form, cats = mk.sell.cats || {};
  return {title: f.id ? "Edit listing" : "New listing", wide:true, body:`<form class="stack" data-form="mkSave">
    <label class="f">Type<select id="lfCat">${Object.entries(cats).map(([k,l]) => `<option value="${k}" ${f.category === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <label class="f">Title<input id="lfTitle" type="text" maxlength="90" value="${esc(f.title)}" placeholder="12-Week Strength Builder" required></label>
    <label class="f">Price (USD)<input id="lfPrice" type="number" min="1" max="2000" step="0.01" value="${esc(f.price)}" required></label>
    <label class="f">Description<textarea id="lfDesc" rows="5" maxlength="3000" placeholder="Who it's for, what's included, how long it takes, your refund policy">${esc(f.description)}</textarea></label>
    <label class="f">What buyers get after paying <span class="muted">(only buyers see this: the program itself, a download link, or how you'll deliver it)</span><textarea id="lfDelivery" rows="5" maxlength="8000" placeholder="${f.keepDelivery ? "Leave blank to keep what you entered before" : "Week 1: …  or  https://…"}">${esc(f.delivery)}</textarea></label>
    <label class="check" style="border:0;padding:0"><input type="checkbox" id="lfShips" ${f.ships ? "checked" : ""}><span style="text-decoration:none;color:var(--ink)">This is a physical item I'll ship (collect a shipping address)</span></label>
    <label class="btn sm" style="position:relative;align-self:flex-start">${ICON.camera} Photo (optional)<input type="file" accept="image/*" id="lfImg" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label>
    <p class="small muted">Listings are checked automatically. No drugs, steroids, SARMs, prescription or weight-loss medications, or claims to cure or treat disease.</p>
    <button class="btn primary">${f.id ? "Save changes" : "Publish listing"}</button></form>`}; };
document.addEventListener("submit", async e => {
  const f = e.target.closest('[data-form="mkDetails"],[data-form="mkCode"],[data-form="mkSave"]'); if (!f) return; e.preventDefault(); e.stopImmediatePropagation();
  const btn = f.querySelector("button:last-of-type"); if (btn) btn.disabled = true;
  if (f.dataset.form === "mkDetails") await sellerCall("seller/start", {legal_name: $("#sdLegal").value, business_name: $("#sdBiz").value, phone: $("#sdPhone").value, email: $("#sdEmail").value});
  else if (f.dataset.form === "mkCode"){ const k = f.dataset.k; if (await sellerCall(`seller/${k}/check`, {code: $("#code" + k).value})) toast(k === "phone" ? "Phone verified" : "Email verified"); }
  else {
    const file = $("#lfImg").files[0], body = {id: mk.form.id, category: $("#lfCat").value, title: $("#lfTitle").value, price: $("#lfPrice").value, description: $("#lfDesc").value, delivery: $("#lfDelivery").value, ships: $("#lfShips").checked};
    if (mk.form.keepDelivery && !body.delivery.trim()){ const l = mk.sell.listings.find(x => x.id === mk.form.id); body.keepDelivery = true; }
    try { if (file) body.image = await shrinkImage(file, 1200); mk.sell = await api("seller/listing/save", body); const l = mk.sell.listings.find(x => x.title === body.title.trim());
      closeSheet(); render(); toast(l && l.status === "live" ? "Your listing is live" : l && l.status === "rejected" ? "Not approved: " + (l.reason || "") : "Saved. It's in review."); }
    catch (x){ toast(x.message); }
  }
  if (btn && document.body.contains(btn)) btn.disabled = false;
}, true);

RENDER.market = () => V_market();
VIEWS.splice(Math.max(0, VIEWS.findIndex(v => v.id === "devices")), 0, {id:"market", label:"Coach Shop"});
ICON.market = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h16l-1 11H5L4 9z"/><path d="M8 9V7a4 4 0 0 1 8 0v2"/></svg>';
// back from Stripe checkout or Stripe onboarding
(() => { const q = new URLSearchParams(location.search);
  if (q.get("market") === "paid"){ mk.tab = "buys"; api("market/confirm", {order: q.get("order")}).then(j => { mk.buys = j.orders; toast(j.confirmed ? "Payment received. Your purchase is below." : "Payment is processing. It'll show here in a moment."); render(); }).catch(() => {}); }
  if (q.get("seller")){ mk.tab = "sell"; }
  if (q.get("market") || q.get("seller")) history.replaceState(null, "", "/#market");
})();
