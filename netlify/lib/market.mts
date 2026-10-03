// Coach marketplace: verified coaches sell programs and products through their own Stripe account.
// Rep & Ration is not the seller: each sale is a direct charge on the coach's Stripe account, and the
// platform takes an application fee. The coach handles delivery, shipping, refunds, taxes and support.
import { getStore } from "@netlify/blobs";
import { randomBytes, createHash, randomInt } from "node:crypto";
import type Stripe from "stripe";

export const SELLER_TERMS_VERSION = "2026-10-03";
const imgStore = () => getStore({ name: "market-images", consistency: "strong" });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (s: number, error: string) => json({ error }, s);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const newId = () => randomBytes(9).toString("base64url");
export const feePct = () => { const n = Number(Netlify.env.get("MARKETPLACE_FEE_PCT")); return n >= 0 && n <= 30 ? n : 10; };
export const CATS: Record<string, string> = { program: "Training program", meal: "Meal plan", coaching: "Coaching package", ebook: "Guide or e-book", apparel: "Apparel", gear: "Gear & equipment", other: "Other" };
const DIGITAL = new Set(["program", "meal", "coaching", "ebook"]);
export const twilioReady = () => !!(Netlify.env.get("TWILIO_ACCOUNT_SID") && Netlify.env.get("TWILIO_AUTH_TOKEN") && Netlify.env.get("TWILIO_VERIFY_SID"));

function e164(raw: string) {
  const s = String(raw || "").trim(), d = s.replace(/\D/g, "");
  if (s.startsWith("+") && d.length >= 8 && d.length <= 15) return "+" + d;
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return null;
}
async function twilio(path: string, form: Record<string, string>) {
  const sid = Netlify.env.get("TWILIO_ACCOUNT_SID")!, tok = Netlify.env.get("TWILIO_AUTH_TOKEN")!, svc = Netlify.env.get("TWILIO_VERIFY_SID")!;
  const r = await fetch(`https://verify.twilio.com/v2/Services/${svc}/${path}`, { method: "POST", headers: { authorization: "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("twilio", r.status, JSON.stringify(j).slice(0, 200)); throw Object.assign(new Error(j.code === 60200 ? "That phone number isn't valid." : "We couldn't send a text right now. Try again in a minute."), { status: 400 }); }
  return j;
}
async function rateCheck(db: any, uid: string, kind: string, target: string) {
  const [r] = await db.sql`SELECT target, sent_count, expires_at FROM verify_codes WHERE user_id = ${uid} AND kind = ${kind}`;
  const recent = r && r.target === target && new Date(r.expires_at).getTime() > Date.now() - 45 * 60e3;
  if (recent && r.sent_count >= 5) throw Object.assign(new Error("Too many codes sent. Wait an hour and try again."), { status: 429 });
  return recent ? r.sent_count + 1 : 1;
}

function sellerState(s: any, isCoach: boolean) {
  const steps = {
    coach: isCoach,
    details: !!(s && s.legal_name && s.phone && s.email),
    phone: !!(s && s.phone_verified_at), email: !!(s && s.email_verified_at),
    agreement: !!(s && s.agreed_at && s.agreed_version === SELLER_TERMS_VERSION),
    payouts: !!(s && s.charges_enabled)
  };
  return { steps, ready: Object.values(steps).every(Boolean) };
}
const pubListing = (l: any) => ({ id: l.id, kind: l.kind, category: l.category, catLabel: CATS[l.category] || "Other", title: l.title, description: l.description, price: l.price_cents, ships: l.ships,
  image: l.has_image ? `/api/mimg/${l.id}?v=${new Date(l.updated_at).getTime()}` : null, seller: l.business_name || l.legal_name || l.name || "Coach", handle: l.handle || null, sellerId: l.seller_id, sales: l.sales, status: l.status, reason: l.reason || null });

type Ctx = { premium: boolean; isCoach: boolean; s: Stripe | null; ai: (system: string, content: any[], max?: number) => Promise<any>; aiOn: boolean;
  mail: (to: string, subject: string, p: string[], cta?: { label: string; url: string }) => Promise<any>; mailOn: boolean; origin: string };

async function moderate(ctx: Ctx, l: { title: string; description: string; delivery: string; category: string; price: number }) {
  if (!ctx.aiOn) return { status: "pending", reason: "Waiting for review." };
  const r = await ctx.ai(`You review listings for a fitness and nutrition app's coach marketplace. Coaches sell training programs, meal plans, coaching packages, guides, apparel and gear.
REJECT anything that: sells or promotes drugs, controlled substances, anabolic steroids, SARMs, prohormones, injectable peptides, prescription or weight-loss medications (including GLP-1s), alcohol, tobacco, vapes or cannabis; weapons; sexual or adult content; claims to cure, treat or prevent a disease; promotes very low calorie diets (under 1,000 kcal/day), purging, or extreme dehydration; counterfeit or branded goods the seller clearly doesn't own; gift cards, money, crypto or get-rich offers; hateful or harassing content; anything asking buyers to pay or contact off-platform; personal contact details.
Allow ordinary fitness programs, meal plans, coaching, supplements like protein powder, creatine or vitamins without disease claims, apparel and equipment.
Reply with ONLY JSON: {"allowed":true|false,"reason":"if rejected, one short sentence the coach can act on"}`,
    [{ type: "text", text: JSON.stringify({ category: CATS[l.category], price: "$" + (l.price / 100).toFixed(2), title: l.title, description: l.description, whatBuyersGet: l.delivery }).slice(0, 6000) }], 200).catch(() => null);
  if (!r || typeof r.allowed !== "boolean") return { status: "pending", reason: "Waiting for review." };
  return r.allowed ? { status: "live", reason: null } : { status: "rejected", reason: String(r.reason || "This listing breaks the marketplace rules.").slice(0, 200) };
}

async function confirmOrder(db: any, ctx: Ctx, o: any) {
  if (!ctx.s || o.status !== "pending" || !o.stripe_session) return o;
  const cs: any = await ctx.s.checkout.sessions.retrieve(o.stripe_session, {}, { stripeAccount: o.stripe_account }).catch(() => null);
  if (!cs) return o;
  if (cs.payment_status === "paid") {
    const ship = cs.collected_information?.shipping_details || cs.shipping_details || null;
    const [u] = await db.sql`UPDATE orders SET status = 'paid', shipping = ${ship ? JSON.stringify(ship) : null}::jsonb, buyer_email = ${cs.customer_details?.email || o.buyer_email}
      WHERE id = ${o.id} AND status = 'pending' RETURNING *`;
    if (u) {
      await db.sql`UPDATE listings SET sales = sales + 1 WHERE id = ${o.listing_id}`;
      const [seller] = await db.sql`SELECT s.email FROM sellers s WHERE s.user_id = ${o.seller_id}`;
      if (ctx.mailOn && seller?.email) await ctx.mail(seller.email, `New order: ${o.title}`, [
        `You made a sale on Rep & Ration: ${o.title} for $${(o.amount / 100).toFixed(2)}.`,
        ship ? `Ship to: ${ship.name}, ${[ship.address?.line1, ship.address?.line2, ship.address?.city, ship.address?.state, ship.address?.postal_code, ship.address?.country].filter(Boolean).join(", ")}.` : `The buyer can see what you included in the listing under Shop → My purchases. Reach out through the app if the program needs anything else.`,
        `Mark it fulfilled under Shop → Sell once it's delivered. You're responsible for delivery, support and any refund, which you can issue from your Stripe dashboard.`
      ], { label: "Open my seller dashboard", url: ctx.origin + "/#market" }).catch(() => {});
      return u;
    }
  } else if (cs.status === "expired") {
    await db.sql`UPDATE orders SET status = 'expired' WHERE id = ${o.id} AND status = 'pending'`;
    return { ...o, status: "expired" };
  }
  return o;
}

export async function marketRoutes(route: string, req: Request, db: any, me: any, body: any, ctx: Ctx): Promise<Response | null> {
  if (route.startsWith("mimg/")) {
    const id = route.slice(5).replace(/[^\w-]/g, "");
    const buf = await imgStore().get(id, { type: "arrayBuffer" });
    return buf ? new Response(buf, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=86400" } }) : new Response("Not found", { status: 404 });
  }
  if (!route.startsWith("market/") && !route.startsWith("seller/")) return null;
  if (!ctx.premium) return fail(402, "The coach shop isn't available in free mode. Upgrade to Premium to use it.");
  try {
    /* ---------- buying ---------- */
    if (route === "market/list") {
      const q = String(body.q || "").trim().toLowerCase().slice(0, 60), cat = CATS[body.cat] ? body.cat : null;
      const rows = await db.sql`SELECT l.*, s.business_name, s.legal_name, c.handle FROM listings l JOIN sellers s ON s.user_id = l.seller_id LEFT JOIN creators c ON c.user_id = l.seller_id
        WHERE l.status = 'live' AND s.charges_enabled AND (${cat}::text IS NULL OR l.category = ${cat})
          AND (${q} = '' OR lower(l.title || ' ' || l.description || ' ' || coalesce(s.business_name,'')) LIKE ${"%" + q + "%"})
        ORDER BY l.sales DESC, l.created_at DESC LIMIT 60`;
      return json({ items: rows.map(pubListing), cats: CATS, fee: feePct() });
    }
    if (route === "market/buy") {
      if (!ctx.s) return fail(503, "Payments aren't switched on yet.");
      const [l] = await db.sql`SELECT l.*, s.stripe_account, s.charges_enabled FROM listings l JOIN sellers s ON s.user_id = l.seller_id WHERE l.id = ${String(body.id || "")} AND l.status = 'live'`;
      if (!l || !l.charges_enabled || !l.stripe_account) return fail(404, "That item isn't available right now.");
      if (l.seller_id === me.id) return fail(400, "You can't buy your own listing.");
      if (!body.agree) return fail(400, "Please confirm you understand the coach is the seller.");
      const id = newId(), fee = Math.round(l.price_cents * feePct() / 100);
      const cs = await ctx.s.checkout.sessions.create({
        mode: "payment", customer_email: me.email, client_reference_id: me.id,
        line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: l.price_cents, product_data: { name: l.title.slice(0, 120), description: (CATS[l.category] || "") + " · sold by " + (l.business_name || "your coach") } } }],
        payment_intent_data: { application_fee_amount: fee, metadata: { order: id, listing: l.id, app: "repandration" } },
        ...(l.ships ? { shipping_address_collection: { allowed_countries: ["US", "CA"] as any } } : {}),
        metadata: { order: id, listing: l.id, buyer: me.id },
        custom_text: { submit: { message: "You're buying from an independent coach, who is the seller and handles delivery, support and refunds." } },
        success_url: `${ctx.origin}/?market=paid&order=${id}#market`, cancel_url: `${ctx.origin}/#market`
      }, { stripeAccount: l.stripe_account });
      await db.sql`INSERT INTO orders (id, listing_id, buyer_id, seller_id, title, amount, fee, stripe_session, stripe_account, buyer_email)
        VALUES (${id}, ${l.id}, ${me.id}, ${l.seller_id}, ${l.title}, ${l.price_cents}, ${fee}, ${cs.id}, ${l.stripe_account}, ${me.email})`;
      return json({ url: cs.url });
    }
    if (route === "market/purchases" || route === "market/confirm") {
      const pend = await db.sql`SELECT * FROM orders WHERE buyer_id = ${me.id} AND status = 'pending' AND created_at > NOW() - INTERVAL '2 days'`;
      for (const o of pend) await confirmOrder(db, ctx, o);
      const rows = await db.sql`SELECT o.*, l.delivery, l.kind, l.category, l.has_image, l.updated_at AS lu, s.business_name, s.legal_name, s.email AS seller_email
        FROM orders o LEFT JOIN listings l ON l.id = o.listing_id LEFT JOIN sellers s ON s.user_id = o.seller_id WHERE o.buyer_id = ${me.id} AND o.status IN ('paid','fulfilled') ORDER BY o.created_at DESC`;
      return json({ orders: rows.map((o: any) => ({ id: o.id, title: o.title, amount: o.amount, status: o.status, at: o.created_at, seller: o.business_name || o.legal_name || "Coach", sellerEmail: o.seller_email,
        delivery: o.delivery || "", category: o.category, catLabel: CATS[o.category] || "", image: o.has_image ? `/api/mimg/${o.listing_id}?v=${new Date(o.lu).getTime()}` : null })), confirmed: body.order ? rows.some((o: any) => o.id === body.order) : undefined });
    }
    if (route === "market/report") {
      await db.sql`INSERT INTO listing_reports (listing_id, user_id, reason) VALUES (${String(body.id)}, ${me.id}, ${String(body.reason || "").slice(0, 300)}) ON CONFLICT DO NOTHING`;
      const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM listing_reports WHERE listing_id = ${String(body.id)}`;
      if (n >= 3) await db.sql`UPDATE listings SET status = 'pending', reason = 'Hidden after reports. Edit and save it to have it reviewed again.' WHERE id = ${String(body.id)} AND status = 'live'`;
      return json({ ok: true });
    }

    /* ---------- selling ---------- */
    if (!ctx.isCoach) return fail(403, "Selling in the shop is part of the Coach plan.");
    let [s] = await db.sql`SELECT * FROM sellers WHERE user_id = ${me.id}`;
    if (route === "seller/start") {
      const legal = String(body.legal_name || "").trim().replace(/\s+/g, " ").slice(0, 100), biz = String(body.business_name || "").trim().slice(0, 80);
      const phone = e164(body.phone), email = String(body.email || "").trim().toLowerCase();
      if (!/^\S+(\s+\S+)+$/.test(legal)) return fail(400, "Enter your full legal name (first and last).");
      if (!phone) return fail(400, "Enter a valid mobile number, like (555) 123-4567.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(400, "Enter a valid email address.");
      const keepPhone = s && s.phone === phone && s.phone_verified_at, keepEmail = s && s.email === email && s.email_verified_at;
      [s] = await db.sql`INSERT INTO sellers (user_id, legal_name, business_name, phone, email) VALUES (${me.id}, ${legal}, ${biz}, ${phone}, ${email})
        ON CONFLICT (user_id) DO UPDATE SET legal_name = EXCLUDED.legal_name, business_name = EXCLUDED.business_name, phone = EXCLUDED.phone, email = EXCLUDED.email,
          phone_verified_at = ${keepPhone ? s.phone_verified_at : null}, email_verified_at = ${keepEmail ? s.email_verified_at : null} RETURNING *`;
    } else if (route === "seller/phone/send") {
      if (!s || !s.phone) return fail(400, "Enter your details first.");
      if (!twilioReady()) return fail(503, "Phone verification is switching on soon. Check back shortly.");
      const n = await rateCheck(db, me.id, "phone", s.phone);
      await twilio("Verifications", { To: s.phone, Channel: "sms" });
      await db.sql`INSERT INTO verify_codes (user_id, kind, target, expires_at, sent_count) VALUES (${me.id}, 'phone', ${s.phone}, NOW() + INTERVAL '10 minutes', ${n})
        ON CONFLICT (user_id, kind) DO UPDATE SET target = EXCLUDED.target, expires_at = EXCLUDED.expires_at, tries = 0, sent_count = EXCLUDED.sent_count`;
      return json({ sent: true, to: s.phone.replace(/\d(?=\d{4})/g, "•") });
    } else if (route === "seller/phone/check") {
      if (!s || !twilioReady()) return fail(400, "Send a code first.");
      const [v] = await db.sql`UPDATE verify_codes SET tries = tries + 1 WHERE user_id = ${me.id} AND kind = 'phone' RETURNING *`;
      if (!v || v.target !== s.phone) return fail(400, "Send a code first.");
      if (v.tries > 6) return fail(429, "Too many tries. Send a new code.");
      const r = await twilio("VerificationCheck", { To: s.phone, Code: String(body.code || "").replace(/\D/g, "").slice(0, 10) }).catch(() => ({ status: "failed" }));
      if (r.status !== "approved") return fail(400, "That code didn't match. Check the text and try again.");
      [s] = await db.sql`UPDATE sellers SET phone_verified_at = NOW() WHERE user_id = ${me.id} RETURNING *`;
      await db.sql`DELETE FROM verify_codes WHERE user_id = ${me.id} AND kind = 'phone'`;
    } else if (route === "seller/email/send") {
      if (!s || !s.email) return fail(400, "Enter your details first.");
      if (!ctx.mailOn) return fail(503, "Email verification is switching on soon. Check back shortly.");
      const n = await rateCheck(db, me.id, "email", s.email);
      const code = String(randomInt(0, 1e6)).padStart(6, "0");
      await db.sql`INSERT INTO verify_codes (user_id, kind, target, code_hash, expires_at, sent_count) VALUES (${me.id}, 'email', ${s.email}, ${sha(me.id + ":" + code)}, NOW() + INTERVAL '15 minutes', ${n})
        ON CONFLICT (user_id, kind) DO UPDATE SET target = EXCLUDED.target, code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, tries = 0, sent_count = EXCLUDED.sent_count`;
      await ctx.mail(s.email, `Your Rep & Ration seller code: ${code}`, [`Your verification code is <b>${code}</b>. It expires in 15 minutes.`, `If you didn't ask to sell on Rep & Ration, ignore this email.`]);
      return json({ sent: true, to: s.email });
    } else if (route === "seller/email/check") {
      const [v] = await db.sql`UPDATE verify_codes SET tries = tries + 1 WHERE user_id = ${me.id} AND kind = 'email' RETURNING *`;
      if (!s || !v || v.target !== s.email) return fail(400, "Send a code first.");
      if (v.tries > 6) return fail(429, "Too many tries. Send a new code.");
      if (new Date(v.expires_at).getTime() < Date.now()) return fail(400, "That code expired. Send a new one.");
      if (v.code_hash !== sha(me.id + ":" + String(body.code || "").replace(/\D/g, ""))) return fail(400, "That code didn't match. Check the email and try again.");
      [s] = await db.sql`UPDATE sellers SET email_verified_at = NOW() WHERE user_id = ${me.id} RETURNING *`;
      await db.sql`DELETE FROM verify_codes WHERE user_id = ${me.id} AND kind = 'email'`;
    } else if (route === "seller/agree") {
      if (!s || !s.phone_verified_at || !s.email_verified_at) return fail(400, "Verify your phone and email first.");
      if (body.version !== SELLER_TERMS_VERSION || !body.agree) return fail(400, "Please read and accept the Seller Agreement.");
      [s] = await db.sql`UPDATE sellers SET agreed_at = NOW(), agreed_version = ${SELLER_TERMS_VERSION} WHERE user_id = ${me.id} RETURNING *`;
    } else if (route === "seller/connect") {
      if (!ctx.s) return fail(503, "Payments aren't switched on yet.");
      if (!sellerState(s, true).steps.agreement || !s.phone_verified_at || !s.email_verified_at) return fail(400, "Finish the steps above first.");
      let acct = s.stripe_account;
      if (!acct) {
        const a = await ctx.s.accounts.create({ type: "standard", email: s.email, business_profile: { name: s.business_name || s.legal_name, product_description: "Fitness programs, coaching and products sold through Rep & Ration" }, metadata: { uid: me.id, app: "repandration" } });
        acct = a.id; await db.sql`UPDATE sellers SET stripe_account = ${acct} WHERE user_id = ${me.id}`;
      }
      const link = await ctx.s.accountLinks.create({ account: acct, type: "account_onboarding", refresh_url: `${ctx.origin}/?seller=refresh#market`, return_url: `${ctx.origin}/?seller=return#market` });
      return json({ url: link.url });
    } else if (route === "seller/listing/save") {
      if (!sellerState(s, true).ready) return fail(400, "Finish seller setup before listing items.");
      const cat = CATS[body.category] ? body.category : "other", price = Math.round(Number(body.price) * 100);
      const title = String(body.title || "").trim().slice(0, 90), desc = String(body.description || "").trim().slice(0, 3000);
      let delivery = String(body.delivery || "").trim().slice(0, 8000);
      if (!delivery && body.id) { const [old] = await db.sql`SELECT delivery FROM listings WHERE id = ${String(body.id)} AND seller_id = ${me.id}`; if (old) delivery = old.delivery; }
      if (title.length < 4) return fail(400, "Give it a title.");
      if (desc.length < 20) return fail(400, "Describe what buyers get (at least a sentence).");
      if (!(price >= 100 && price <= 200000)) return fail(400, "Set a price between $1 and $2,000.");
      const ships = !DIGITAL.has(cat) || !!body.ships;
      if (!ships && delivery.length < 20) return fail(400, "For a digital item, add what buyers receive after paying: the program, a link, or how you'll deliver it.");
      const mod = await moderate(ctx, { title, description: desc, delivery, category: cat, price });
      const id = body.id ? String(body.id) : newId();
      if (body.id) {
        const [own] = await db.sql`SELECT 1 FROM listings WHERE id = ${id} AND seller_id = ${me.id}`; if (!own) return fail(404, "Listing not found.");
        await db.sql`UPDATE listings SET kind = ${ships ? "product" : "digital"}, category = ${cat}, title = ${title}, description = ${desc}, delivery = ${delivery}, price_cents = ${price}, ships = ${ships}, status = ${mod.status}, reason = ${mod.reason}, updated_at = NOW() WHERE id = ${id}`;
      } else {
        const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM listings WHERE seller_id = ${me.id}`; if (n >= 50) return fail(400, "You can have up to 50 listings.");
        await db.sql`INSERT INTO listings (id, seller_id, kind, category, title, description, delivery, price_cents, ships, status, reason) VALUES (${id}, ${me.id}, ${ships ? "product" : "digital"}, ${cat}, ${title}, ${desc}, ${delivery}, ${price}, ${ships}, ${mod.status}, ${mod.reason})`;
      }
      const m = /^data:image\/jpeg;base64,(.+)$/.exec(String(body.image || ""));
      if (m) { const b = Buffer.from(m[1], "base64"); if (b.length < 2_000_000) { await imgStore().set(id, b); await db.sql`UPDATE listings SET has_image = true WHERE id = ${id}`; } }
    } else if (route === "seller/listing/delete") {
      await db.sql`UPDATE listings SET status = 'removed' WHERE id = ${String(body.id)} AND seller_id = ${me.id}`;
      await imgStore().delete(String(body.id)).catch(() => {});
    } else if (route === "seller/listing/hide") {
      await db.sql`UPDATE listings SET status = CASE WHEN status = 'live' THEN 'hidden' WHEN status = 'hidden' THEN 'live' ELSE status END WHERE id = ${String(body.id)} AND seller_id = ${me.id}`;
    } else if (route === "seller/order/fulfill") {
      await db.sql`UPDATE orders SET status = 'fulfilled', fulfilled_at = NOW() WHERE id = ${String(body.id)} AND seller_id = ${me.id} AND status = 'paid'`;
    }
    // refresh payout status from Stripe when it isn't on yet
    if (s && s.stripe_account && !s.charges_enabled && ctx.s) {
      const a: any = await ctx.s.accounts.retrieve(s.stripe_account).catch(() => null);
      if (a && a.charges_enabled) [s] = await db.sql`UPDATE sellers SET charges_enabled = true WHERE user_id = ${me.id} RETURNING *`;
    }
    const st = sellerState(s, true);
    const listings = s ? await db.sql`SELECT l.*, ${s.business_name}::text AS business_name FROM listings l WHERE seller_id = ${me.id} AND status <> 'removed' ORDER BY created_at DESC` : [];
    const orders = s ? await db.sql`SELECT o.id, o.title, o.amount, o.fee, o.status, o.shipping, o.buyer_email, o.created_at, u.name AS buyer FROM orders o LEFT JOIN users u ON u.id = o.buyer_id
      WHERE o.seller_id = ${me.id} AND o.status IN ('paid','fulfilled') ORDER BY o.created_at DESC LIMIT 100` : [];
    return json({ seller: s ? { legalName: s.legal_name, businessName: s.business_name, phone: s.phone, email: s.email, stripe: !!s.stripe_account } : null, ...st,
      terms: SELLER_TERMS_VERSION, fee: feePct(), phoneOn: twilioReady(), mailOn: ctx.mailOn, cats: CATS,
      listings: listings.map(pubListing), orders: orders.map((o: any) => ({ id: o.id, title: o.title, amount: o.amount, fee: o.fee, status: o.status, at: o.created_at, buyer: o.buyer || "", email: o.buyer_email, shipping: o.shipping })),
      earned: orders.reduce((a: number, o: any) => a + o.amount - o.fee, 0) });
  } catch (e: any) {
    console.error("market", route, e?.message);
    return fail(e?.status || 500, e?.status ? e.message : "Something went wrong. Try again.");
  }
}
