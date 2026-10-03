import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import Stripe from "stripe";
import { ACTIVE, PLANS, FLEET_MIN, FLEET_MAX, fleetSeatPrice, isPlan, money, stripe, priceFor, planOfSub, sendMail, mailReady, vapid, pushTo, type PlanKey } from "../lib/shared.mts";
import { searchFoods, barcode, aiMeal, aiReady, claudeJSON, menuScan, chainMenu, pantryScan, weeklyReview } from "../lib/food.mts";
import { videoRoutes, deleteVideoBlobs } from "../lib/videos.mts";
import { photoRoutes, deleteAllPhotos } from "../lib/photos.mts";
import { marketRoutes } from "../lib/market.mts";
import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, n: number) => Promise<Buffer>;
const TRIAL_DAYS = 7;
const AI_PER_DAY = 40;
const SESSION_DAYS = 60;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
const fail = (status: number, error: string) => json({ error }, status);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const newId = (n = 16) => randomBytes(n).toString("base64url");

async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `s1:${salt.toString("hex")}:${key.toString("hex")}`;
}
async function checkPassword(pw: string, stored: string) {
  const [, saltHex, keyHex] = stored.split(":");
  const key = await scrypt(pw, Buffer.from(saltHex, "hex"), 64);
  const want = Buffer.from(keyHex, "hex");
  return want.length === key.length && timingSafeEqual(want, key);
}
function cookieFor(token: string, maxAge: number) {
  return `rr_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function readCookie(req: Request, name: string) {
  const c = req.headers.get("cookie") || "";
  const m = c.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : null;
}
/** Who can use the app: their own subscription, or a seat on an active family plan. Never free when the payment key is missing. */
async function access(db: any, u: any): Promise<{ active: boolean; via?: string; plan?: string; owner?: string }> {
  if (!u || !Netlify.env.get("STRIPE_SECRET_KEY")) return { active: false };
  if (ACTIVE.includes(u.sub_status || "")) return { active: true, via: "own", plan: u.plan || "individual_month" };
  // complimentary Premium for the owner's own account(s): the support address plus any listed in COMP_EMAILS
  const comp = ["repandration27@gmail.com", ...String(Netlify.env.get("COMP_EMAILS") || "").toLowerCase().split(/[\s,;]+/)].filter(Boolean);
  if (comp.includes(String(u.email || "").toLowerCase())) return { active: true, via: "comp", plan: "individual_year", owner: "Rep & Ration" };
  const [f] = await db.sql`SELECT o.name, o.email, o.plan FROM family_members m JOIN users o ON o.id = m.owner_id
    WHERE m.email = ${u.email} AND o.sub_status IN ('trialing','active','past_due') AND o.plan LIKE 'family%' LIMIT 1`;
  if (f) return { active: true, via: "family", plan: f.plan, owner: f.name || f.email };
  // a driver seat on an active fleet plan; seats beyond what the company pays for (oldest first) don't count
  const [fl] = await db.sql`SELECT o.company, o.name, o.email FROM fleet_members m JOIN users o ON o.id = m.owner_id
    WHERE m.email = ${u.email} AND o.sub_status IN ('trialing','active','past_due') AND o.plan = 'fleet_month'
      AND (SELECT COUNT(*) FROM fleet_members m2 WHERE m2.owner_id = m.owner_id AND m2.added_at < m.added_at) < COALESCE(o.seats, 1) LIMIT 1`;
  if (fl) return { active: true, via: "fleet", plan: "fleet_month", owner: fl.company || fl.name || fl.email };
  return { active: false };
}
async function publicUser(db: any, u: any) {
  const a = await access(db, u);
  const plan = a.plan || u.plan || null;
  return {
    id: u.id, email: u.email, name: u.name,
    sub: { status: u.sub_status || "none", trialEnd: u.trial_end, periodEnd: u.period_end, active: a.active, via: a.via || null, familyOwner: a.owner || null, fleetCompany: a.via === "fleet" ? a.owner : null,
      plan, ownPlan: u.plan || (ACTIVE.includes(u.sub_status || "") ? "individual_month" : null), legacy: ACTIVE.includes(u.sub_status || "") && !u.plan,
      billing: !!Netlify.env.get("STRIPE_SECRET_KEY"), canTrial: !u.had_trial, tier: a.active ? "premium" : "free" },
    coach: a.active && a.via === "own" && String(plan || "").startsWith("coach") ? { clients: PLANS[plan as PlanKey]?.clients || 0 } : null,
    family: a.active && a.via === "own" && String(plan || "").startsWith("family") ? { seats: 4 } : null,
    fleet: a.active && a.via === "own" && plan === "fleet_month" ? { seats: u.seats || 1, company: u.company || "" } : null,
    features: { ai: aiReady(), mail: mailReady() }
  };
}


async function saveSub(db: any, sub: Stripe.Subscription) {
  const uid = (sub.metadata && sub.metadata.uid) || null;
  const anySub: any = sub;
  const periodEnd = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end ?? null;
  const cust = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const anyPrice: any = anySub.items?.data?.[0]?.price;
  const plan = anyPrice && anyPrice.lookup_key ? planOfSub(sub) : (sub.metadata?.plan && isPlan(sub.metadata.plan) ? sub.metadata.plan : null);
  const seats = anySub.items?.data?.[0]?.quantity || 1;
  await db.sql`UPDATE users SET sub_status = ${sub.status}, trial_end = ${sub.trial_end ? new Date(sub.trial_end * 1000) : null},
    period_end = ${periodEnd ? new Date(periodEnd * 1000) : null}, stripe_customer_id = ${cust}, had_trial = had_trial OR ${!!sub.trial_end}, plan = ${plan}, seats = ${seats}
    WHERE id = ${uid} OR stripe_customer_id = ${cust}`;
}

// A customer saved while Stripe was in test mode doesn't exist in live mode: forget it (and its test trial).
async function checkCustomer(s: Stripe, db: any, me: any) {
  if (!me.stripe_customer_id) return;
  try {
    const c: any = await s.customers.retrieve(me.stripe_customer_id);
    if (!c.deleted) return;
  } catch (e: any) {
    if (!(e && (e.code === "resource_missing" || e.statusCode === 404 || /No such customer/.test(String(e.message))))) throw e;
  }
  await db.sql`UPDATE users SET stripe_customer_id = NULL, sub_status = NULL, trial_end = NULL, period_end = NULL, had_trial = false WHERE id = ${me.id}`;
  me.stripe_customer_id = null; me.sub_status = null; me.trial_end = null; me.period_end = null; me.had_trial = false;
}
async function bestSub(s: Stripe, me: any): Promise<Stripe.Subscription | null> {
  if (!me.stripe_customer_id) return null;
  let best: Stripe.Subscription | null = null;
  for (const sub of (await s.subscriptions.list({ customer: me.stripe_customer_id, status: "all", limit: 20 })).data)
    if (!best || (SUB_RANK[sub.status] ?? 0) > (SUB_RANK[best.status] ?? 0) || ((SUB_RANK[sub.status] ?? 0) === (SUB_RANK[best.status] ?? 0) && sub.created > best.created)) best = sub;
  return best;
}
const SUB_RANK: Record<string, number> = { active: 5, trialing: 5, past_due: 4, unpaid: 3, incomplete: 2, canceled: 1, incomplete_expired: 0 };

/* ---------- document store with server-side access rules ---------- */
const validPath = (p: unknown): p is string => typeof p === "string" && /^[A-Za-z0-9_\-.~:@+]{1,200}(\/[A-Za-z0-9_\-.~:@+]{1,200}){1,15}$/.test(p) && p.split("/").length % 2 === 0;
function merge(a: any, b: any) {
  for (const k of Object.keys(b)) {
    const v = b[k];
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) merge(a[k], v);
    else a[k] = v;
  }
  return a;
}
const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const sortedArr = (x: unknown) => (Array.isArray(x) ? [...x].map(String).sort() : []);

async function getDoc(db: any, path: string) {
  const rows = await db.sql`SELECT data FROM docs WHERE path = ${path}`;
  return rows[0] ? rows[0].data : undefined;
}
async function isMember(db: any, gid: string, uid: string) {
  const g = await getDoc(db, `groups/${gid}`);
  return !!g && Array.isArray(g.members) && g.members.includes(uid);
}
async function canRead(db: any, path: string, uid: string) {
  const [a, b, c] = path.split("/");
  if (a === "data" && b === "users") return c === uid;
  if (a === "codes" || a === "groups") return true; // ids are long and random; knowing one is how you join
  if (a === "feeds") return isMember(db, b, uid);
  return false;
}
async function canWrite(db: any, op: string, path: string, uid: string, oldDoc: any, next: any): Promise<string | null> {
  const [a, b, c] = path.split("/");
  if (a === "data" && b === "users") return c === uid ? null : "not yours";
  if (op === "delete") return "not allowed";
  if (a === "codes") return oldDoc ? "code taken" : next && next.gid && next.by === uid ? null : "bad code";
  if (a === "groups") {
    if (!oldDoc) return next && next.owner === uid && same(next.members, [uid]) && typeof next.code === "string" ? null : "bad group";
    if (next.code !== oldDoc.code || next.created !== oldDoc.created) return "code is permanent";
    const members: string[] = oldDoc.members || [];
    if (members.includes(uid)) return null;
    const onlyChanged = (keys: string[]) => Object.keys({ ...oldDoc, ...next }).every(k => keys.includes(k) || same(oldDoc[k], next[k]));
    const joined = same(sortedArr(next.members), sortedArr([...members, uid])) && !(next.pending || []).includes(uid);
    const coachesOk = same(sortedArr(next.coaches), sortedArr(oldDoc.coaches)) || same(sortedArr(next.coaches), sortedArr([...(oldDoc.coaches || []), uid]));
    if (joined && coachesOk && onlyChanged(["members", "pending", "coaches"])) return null;
    const declined = (oldDoc.pending || []).includes(uid) && same(sortedArr(next.pending), sortedArr((oldDoc.pending || []).filter((x: string) => x !== uid)));
    if (declined && onlyChanged(["pending"])) return null;
    return "not a member";
  }
  if (a === "feeds") return (await isMember(db, b, uid)) ? null : "not a member";
  return "not allowed";
}

/* ---------- coach helpers ---------- */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const coachCode = () => Array.from(randomBytes(8)).map(b => CODE_CHARS[b % CODE_CHARS.length]).join("");
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
async function userDocs(db: any, uid: string) {
  const rows = await db.sql`SELECT path, data FROM docs WHERE path IN (${`data/users/${uid}/profile`}, ${`data/users/${uid}/food`}, ${`data/users/${uid}/training`})`;
  const o: any = {};
  for (const r of rows) o[r.path.split("/").pop()] = r.data;
  return o;
}
function clientSummary(d: any, share: any) {
  const now = Date.now(), since = (n: number) => dayKey(new Date(now - n * 864e5));
  const log = (d.food && d.food.log) || {}, sessions = (d.training && d.training.sessions) || [], weights = (d.training && d.training.weights) || [];
  const w7 = since(6);
  const foodDays = Object.keys(log).filter(k => k >= w7 && (log[k] || []).length);
  const kcal = foodDays.map(k => (log[k] || []).reduce((a: number, e: any) => a + (e.kcal || 0) * (e.q || 1), 0));
  const ws = [...weights].sort((a: any, b: any) => (a.date < b.date ? -1 : 1));
  const recentW = ws.filter((x: any) => x.date >= since(30));
  return {
    workouts7: share.workouts ? sessions.filter((s: any) => s.date >= w7).length : null,
    lastWorkout: share.workouts && sessions.length ? sessions[sessions.length - 1].date : null,
    foodDays7: share.food ? foodDays.length : null,
    avgKcal7: share.food && kcal.length ? Math.round(kcal.reduce((a: number, b: number) => a + b, 0) / kcal.length) : null,
    weightKg: share.weight && ws.length ? ws[ws.length - 1].kg : null,
    weightChange30: share.weight && recentW.length > 1 ? Math.round((recentW[recentW.length - 1].kg - recentW[0].kg) * 10) / 10 : null,
    goal: d.profile ? d.profile.goal : null
  };
}
async function linkFor(db: any, me: any, otherId: string) {
  const [l] = await db.sql`SELECT * FROM coach_links WHERE (coach_id = ${me.id} AND client_id = ${otherId}) OR (client_id = ${me.id} AND coach_id = ${otherId})`;
  return l || null;
}

/* ---------- handler ---------- */
async function handle(req: Request, context: Context): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");
  const db = getDatabase();
  const body: any = req.method === "POST" && route !== "stripe/webhook" && route !== "creator/chunk" ? await req.json().catch(() => ({})) : {};

  // Stripe webhook (raw body, signature checked)
  if (route === "stripe/webhook") {
    const s = stripe(), secret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
    if (!s || !secret) return fail(503, "billing not configured");
    let event: Stripe.Event;
    try { event = await s.webhooks.constructEventAsync(await req.text(), req.headers.get("stripe-signature") || "", secret); }
    catch { return fail(400, "bad signature"); }
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.client_reference_id && cs.customer) await db.sql`UPDATE users SET stripe_customer_id = ${String(cs.customer)} WHERE id = ${cs.client_reference_id}`;
      if (cs.subscription) await saveSub(db, await s.subscriptions.retrieve(String(cs.subscription)));
    } else if (event.type.startsWith("customer.subscription.")) {
      await saveSub(db, event.data.object as Stripe.Subscription);
    }
    return json({ received: true });
  }

  // public plan list for the landing page
  if (route === "plans") return json({ plans: Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, { amount: p.amount, interval: p.interval, label: p.label, clients: p.clients }])) });

  // auth without a session
  if (route === "auth/signup" || route === "auth/login") {
    const email = String(body.email || "").trim().toLowerCase(), pw = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(400, "Enter a valid email address.");
    if (pw.length < 8) return fail(400, "Passwords need at least 8 characters.");
    let user: any;
    if (route === "auth/signup") {
      const exists = await db.sql`SELECT 1 FROM users WHERE email = ${email}`;
      if (exists.length) return fail(409, "An account with that email already exists. Log in instead.");
      const id = "u_" + newId(12);
      [user] = await db.sql`INSERT INTO users (id, email, name, pass_hash) VALUES (${id}, ${email}, ${String(body.name || "").trim().slice(0, 40)}, ${await hashPassword(pw)}) RETURNING *`;
      if (mailReady()) {
        const ok = await sendMail(email, "Welcome to Rep & Ration", [
          `Hi${user.name ? " " + user.name : ""}, welcome to Rep & Ration.`,
          "Your next step takes two minutes: answer a few questions and we'll build your calorie and macro targets, a 7-day menu, a grocery list and your workout week.",
          "Tip: add Rep & Ration to your home screen so it opens like an app, and turn on reminders in Profile so you never miss a meal log or a workout."
        ], { label: "Open Rep & Ration", url: url.origin });
        if (ok) await db.sql`UPDATE users SET welcome_sent = true WHERE id = ${id}`;
      }
    } else {
      [user] = await db.sql`SELECT * FROM users WHERE email = ${email}`;
      if (!user || !(await checkPassword(pw, user.pass_hash))) { await new Promise(r => setTimeout(r, 400)); return fail(401, "Email or password is incorrect."); }
    }
    const token = newId(32);
    await db.sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${user.id}, ${new Date(Date.now() + SESSION_DAYS * 864e5)})`;
    return json({ user: await publicUser(db, user) }, 200, { "set-cookie": cookieFor(token, SESSION_DAYS * 86400) });
  }
  if (route === "auth/reset-request") {
    if (!mailReady()) return fail(503, "Password reset email isn't set up yet. Email Repandration27@gmail.com and we'll help you get back in.");
    const email = String(body.email || "").trim().toLowerCase();
    const [u] = await db.sql`SELECT id FROM users WHERE email = ${email}`;
    if (u) {
      const token = newId(32);
      await db.sql`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${u.id}, ${new Date(Date.now() + 3600e3)})`;
      await sendMail(email, "Reset your Rep & Ration password", ["Someone asked to reset the password for your Rep & Ration account. The link below works for one hour.", "If you didn't ask for this, you can ignore this email; your password won't change."], { label: "Choose a new password", url: `${url.origin}/?reset=${token}` });
    }
    return json({ ok: true });
  }
  if (route === "auth/reset") {
    const pw = String(body.password || "");
    if (pw.length < 8) return fail(400, "Passwords need at least 8 characters.");
    const [r] = await db.sql`DELETE FROM password_resets WHERE token_hash = ${sha(String(body.token || ""))} AND expires_at > NOW() RETURNING user_id`;
    if (!r) return fail(400, "That reset link has expired. Request a new one.");
    await db.sql`UPDATE users SET pass_hash = ${await hashPassword(pw)} WHERE id = ${r.user_id}`;
    await db.sql`DELETE FROM sessions WHERE user_id = ${r.user_id}`;
    return json({ ok: true });
  }

  // everything else needs a session
  const token = readCookie(req, "rr_session");
  const [me] = token ? await db.sql`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${sha(token)} AND s.expires_at > NOW()` : [];
  if (route === "me") return json({ user: me ? await publicUser(db, me) : null });
  if (!me) return fail(401, "Log in first.");

  if (route === "auth/logout") {
    await db.sql`DELETE FROM sessions WHERE token_hash = ${sha(token!)}`;
    return json({ ok: true }, 200, { "set-cookie": cookieFor("", 0) });
  }
  if (route === "account/name") {
    await db.sql`UPDATE users SET name = ${String(body.name || "").trim().slice(0, 40)} WHERE id = ${me.id}`;
    return json({ ok: true });
  }
  if (route === "account/delete") {
    const s = stripe();
    if (s) await checkCustomer(s, db, me);
    if (s && me.stripe_customer_id) {
      const subs = await s.subscriptions.list({ customer: me.stripe_customer_id, status: "all", limit: 20 });
      for (const sub of subs.data) if (!["canceled", "incomplete_expired"].includes(sub.status)) await s.subscriptions.cancel(sub.id);
    }
    for (const v of await db.sql`SELECT id FROM videos WHERE user_id = ${me.id}`) await deleteVideoBlobs(v.id).catch(() => {});
    await deleteAllPhotos(db, me.id).catch(() => {});
    await db.sql`DELETE FROM docs WHERE path LIKE ${`data/users/${me.id}/%`}`;
    await db.sql`DELETE FROM coach_msgs WHERE coach_id = ${me.id} OR client_id = ${me.id}`;
    await db.sql`DELETE FROM fleet_members WHERE email = ${me.email}`;
    await db.sql`DELETE FROM family_members WHERE email = ${me.email}`;
    await db.sql`DELETE FROM users WHERE id = ${me.id}`;
    return json({ ok: true }, 200, { "set-cookie": cookieFor("", 0) });
  }
  if (route === "billing/checkout") {
    const s = stripe(); if (!s) return fail(503, "Payments aren't switched on yet.");
    const plan: PlanKey = isPlan(body.plan) ? body.plan : "individual_month";
    const fleet = plan === "fleet_month", qty = fleet ? Math.round(Number(body.seats) || 0) : 1;
    if (fleet) {
      if (!(qty >= FLEET_MIN && qty <= FLEET_MAX)) return fail(400, `Fleet plans start at ${FLEET_MIN} seats (up to ${FLEET_MAX}).`);
      const company = String(body.company || "").trim().slice(0, 80);
      if (company.length < 2) return fail(400, "Enter your company name.");
      await db.sql`UPDATE users SET company = ${company} WHERE id = ${me.id}`;
    }
    await checkCustomer(s, db, me);
    // One free trial per email, even if the account was deleted and re-created.
    let hadTrial = !!me.had_trial;
    if (!hadTrial) {
      for (const c of (await s.customers.list({ email: me.email, limit: 10 })).data) {
        if ((await s.subscriptions.list({ customer: c.id, status: "all", limit: 20 })).data.some(x => x.trial_start)) { hadTrial = true; break; }
      }
      if (hadTrial) await db.sql`UPDATE users SET had_trial = true WHERE id = ${me.id}`;
    }
    const P = PLANS[plan], per = P.interval === "year" ? "year" : "month", unit = fleet ? fleetSeatPrice(qty) : P.amount, total = unit * qty;
    const tax = Netlify.env.get("STRIPE_TAX") === "on";
    const cs = await s.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: me.id,
      ...(me.stripe_customer_id ? { customer: me.stripe_customer_id, ...(tax ? { customer_update: { address: "auto", name: "auto" } } : {}) } : { customer_email: me.email }),
      line_items: [{ quantity: qty, price: await priceFor(s, db, plan) }],
      payment_method_collection: "always",
      ...(tax ? { automatic_tax: { enabled: true }, billing_address_collection: "required" as const } : {}),
      subscription_data: { metadata: { uid: me.id, plan }, ...(hadTrial ? {} : { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }) },
      custom_text: { submit: { message: hadTrial ? `You'll be charged ${money(total)}${fleet ? ` (${qty} seats × ${money(unit)})` : ""} today and every ${per} until you cancel.` : `Your card won't be charged today. After your 7-day free trial it's charged ${money(total)}${fleet ? ` (${qty} seats × ${money(unit)})` : ""}, then every ${per} until you cancel.` } },
      allow_promotion_codes: true,
      success_url: `${url.origin}/?checkout=success`,
      cancel_url: `${url.origin}/?checkout=cancel`
    });
    return json({ url: cs.url });
  }
  if (route === "billing/change") {
    // Switch an existing membership to another plan (monthly ↔ annual, individual ↔ family/coach). Stripe prorates the difference.
    const s = stripe(); if (!s) return fail(503, "Payments aren't switched on yet.");
    if (!isPlan(body.plan)) return fail(400, "Pick a plan.");
    const chQty = body.plan === "fleet_month" ? Math.round(Number(body.seats) || 0) : 1;
    if (body.plan === "fleet_month") {
      if (!(chQty >= FLEET_MIN && chQty <= FLEET_MAX)) return fail(400, `Fleet plans start at ${FLEET_MIN} seats (up to ${FLEET_MAX}).`);
      const company = String(body.company || me.company || "").trim().slice(0, 80);
      if (company.length < 2) return fail(400, "Enter your company name.");
      await db.sql`UPDATE users SET company = ${company} WHERE id = ${me.id}`;
    }
    await checkCustomer(s, db, me);
    const sub = await bestSub(s, me);
    if (!sub || !ACTIVE.includes(sub.status)) return fail(400, "You don't have an active membership to change. Start one instead.");
    const item = sub.items.data[0];
    const price = await priceFor(s, db, body.plan);
    if (item.price.id === price) return fail(400, "You're already on that plan.");
    const upd = await s.subscriptions.update(sub.id, { items: [{ id: item.id, price, quantity: chQty }], proration_behavior: sub.status === "trialing" ? "none" : "create_prorations", metadata: { ...(sub.metadata || {}), uid: me.id, plan: body.plan } });
    await saveSub(db, upd);
    const [u] = await db.sql`SELECT * FROM users WHERE id = ${me.id}`;
    return json({ user: await publicUser(db, u) });
  }
  if (route === "billing/sync") {
    // Pull the member's subscription straight from Stripe (backup for a missed or failed webhook).
    const s = stripe(); if (!s) return json({ user: await publicUser(db, me) });
    await checkCustomer(s, db, me);
    const custIds: string[] = me.stripe_customer_id ? [me.stripe_customer_id] : (await s.customers.list({ email: me.email, limit: 10 })).data.map(c => c.id);
    let best: Stripe.Subscription | null = null;
    for (const cid of custIds) {
      for (const sub of (await s.subscriptions.list({ customer: cid, status: "all", limit: 20 })).data) {
        if (!me.stripe_customer_id && sub.metadata?.uid !== me.id) continue;
        if (!best || (SUB_RANK[sub.status] ?? 0) > (SUB_RANK[best.status] ?? 0) || ((SUB_RANK[sub.status] ?? 0) === (SUB_RANK[best.status] ?? 0) && sub.created > best.created)) best = sub;
      }
    }
    if (best) {
      if (!best.metadata?.uid) await s.subscriptions.update(best.id, { metadata: { uid: me.id } });
      await saveSub(db, { ...best, metadata: { ...(best.metadata || {}), uid: me.id } } as Stripe.Subscription);
    }
    const [u] = await db.sql`SELECT * FROM users WHERE id = ${me.id}`;
    return json({ user: await publicUser(db, u) });
  }
  if (route === "billing/portal") {
    const s = stripe(); if (s) await checkCustomer(s, db, me);
    if (!s || !me.stripe_customer_id) return fail(400, "No billing account yet.");
    const ps = await s.billingPortal.sessions.create({ customer: me.stripe_customer_id, return_url: `${url.origin}/#profile` });
    return json({ url: ps.url });
  }

  const acc = await access(db, me);
  // Free accounts: food logging by search, workout logging, buddies, progress and the meal plan. Everything else needs Premium.
  const FREE_ROUTES = new Set(["db", "profiles", "food/search", "fleet/join", "fleet/mine"]);
  // a member's own photos stay viewable (and deletable) even after Premium lapses
  if (route.startsWith("photo/") || route === "photos/list" || route === "photos/delete") { const pr = await photoRoutes(route, db, me, body, true); if (pr) return pr; }
  const mctx = (premium: boolean) => ({ premium, isCoach: acc.via === "own" && String(acc.plan || "").startsWith("coach"), s: stripe(), ai: claudeJSON, aiOn: aiReady(), mail: sendMail, mailOn: mailReady(), origin: url.origin });
  // things people already paid for stay reachable even if their membership lapses
  if (route.startsWith("mimg/") || route === "market/purchases" || route === "market/confirm") { const mr = await marketRoutes(route, req, db, me, body, mctx(true)); if (mr) return mr; }
  if (!acc.active && !FREE_ROUTES.has(route)) return fail(402, "This feature isn't available in free mode. Upgrade to Premium to use it.");
  const plan = acc.plan || "";
  const vr = await videoRoutes(route, req, url, db, me, acc.via === "own" && plan.startsWith("coach"), body, aiReady());
  if (vr) return vr;
  const pr = await photoRoutes(route, db, me, body, acc.active);
  if (pr) return pr;
  const mr = await marketRoutes(route, req, db, me, body, mctx(acc.active));
  if (mr) return mr;

  /* ----- food search, barcodes, AI ----- */
  if (route === "food/search") return json({ items: await searchFoods(db, String(body.q || "")) });
  if (route === "food/barcode") {
    const it = await barcode(db, String(body.code || ""));
    return it ? json({ item: it }) : fail(404, "We couldn't find that barcode. Search by name or add it as a custom food.");
  }
  if (route === "food/ai") {
    if (!aiReady()) return fail(503, "Photo and voice logging are switching on soon. Search or scan a barcode for now.");
    if (body.image && String(body.image).length > 4_500_000) return fail(413, "That photo is too large.");
    const [u] = await db.sql`INSERT INTO ai_usage (user_id, day, n) VALUES (${me.id}, CURRENT_DATE, 1)
      ON CONFLICT (user_id, day) DO UPDATE SET n = ai_usage.n + 1 RETURNING n`;
    if (u.n > AI_PER_DAY) return fail(429, `You've used today's ${AI_PER_DAY} AI scans. Search or scan a barcode, or try again tomorrow.`);
    try { return json(await aiMeal({ image: body.image ? String(body.image) : undefined, text: body.text ? String(body.text) : undefined })); }
    catch (e: any) { return fail(e.status || 500, e.message || "Couldn't read that meal."); }
  }

  if (["food/menu", "food/chain", "food/pantry", "ai/weekly"].includes(route)) {
    if (!aiReady()) return fail(503, "AI features are switching on soon.");
    if (body.image && String(body.image).length > 4_500_000) return fail(413, "That photo is too large.");
    if (route !== "food/chain") {
      const [u] = await db.sql`INSERT INTO ai_usage (user_id, day, n) VALUES (${me.id}, CURRENT_DATE, 1) ON CONFLICT (user_id, day) DO UPDATE SET n = ai_usage.n + 1 RETURNING n`;
      if (u.n > AI_PER_DAY) return fail(429, `You've used today's ${AI_PER_DAY} AI requests. Try again tomorrow.`);
    }
    try {
      if (route === "food/menu") return json(await menuScan({ image: body.image ? String(body.image) : undefined, restaurant: body.restaurant ? String(body.restaurant) : "", left: body.left, diet: String(body.diet || ""), avoid: Array.isArray(body.avoid) ? body.avoid.slice(0, 20).map(String) : [] }));
      if (route === "food/chain") return json(await chainMenu(db, String(body.name || ""), String(body.country || "")));
      if (route === "food/pantry") return json(await pantryScan(String(body.image || "")));
      return json(await weeklyReview(body.stats || {}));
    } catch (e: any) { return fail(e.status || 500, e.message || "Something went wrong."); }
  }

  /* ----- reminders & push ----- */
  if (route === "push/key") return json({ key: (await vapid(db)).publicKey });
  if (route === "push/subscribe") {
    const sub = body.subscription;
    if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys) return fail(400, "bad subscription");
    await db.sql`INSERT INTO push_subs (endpoint, user_id, data) VALUES (${sub.endpoint}, ${me.id}, ${JSON.stringify(sub)}::jsonb)
      ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, data = EXCLUDED.data`;
    return json({ ok: true });
  }
  if (route === "push/unsubscribe") {
    await db.sql`DELETE FROM push_subs WHERE user_id = ${me.id} AND endpoint = ${String(body.endpoint || "")}`;
    return json({ ok: true });
  }
  if (route === "push/test") return json({ sent: await pushTo(db, me.id, { title: "Rep & Ration", body: "Reminders are on. You'll get a nudge at the times you picked.", url: "/#today", tag: "test" }) });
  if (route === "reminders/get") {
    const [r] = await db.sql`SELECT tz, items FROM reminders WHERE user_id = ${me.id}`;
    const [n] = await db.sql`SELECT COUNT(*)::int AS n FROM push_subs WHERE user_id = ${me.id}`;
    return json({ tz: r ? r.tz : null, items: r ? r.items : [], devices: n.n });
  }
  if (route === "reminders/set") {
    const tz = String(body.tz || "America/Los_Angeles").slice(0, 60);
    try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); } catch { return fail(400, "bad time zone"); }
    const items = (Array.isArray(body.items) ? body.items : []).slice(0, 20).map((x: any) => ({
      id: String(x.id || "").slice(0, 20), on: !!x.on, time: /^\d{2}:\d{2}$/.test(x.time) ? x.time : "12:00",
      days: Array.isArray(x.days) ? x.days.filter((d: any) => Number.isInteger(d) && d >= 0 && d <= 6) : [0, 1, 2, 3, 4, 5, 6],
      title: String(x.title || "Rep & Ration").slice(0, 60), body: String(x.body || "").slice(0, 160), url: String(x.url || "/").slice(0, 60)
    }));
    await db.sql`INSERT INTO reminders (user_id, tz, items) VALUES (${me.id}, ${tz}, ${JSON.stringify(items)}::jsonb)
      ON CONFLICT (user_id) DO UPDATE SET tz = EXCLUDED.tz, items = EXCLUDED.items`;
    await db.sql`UPDATE users SET tz = ${tz} WHERE id = ${me.id}`;
    return json({ ok: true });
  }

  /* ----- fleet / company seats ----- */
  if (route.startsWith("fleet/")) {
    if (route === "fleet/mine") return json({ via: acc.via, company: acc.via === "fleet" ? acc.owner : null });
    if (route === "fleet/join") {
      const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (code.length < 6) return fail(400, "Enter the code your company gave you.");
      const [o] = await db.sql`SELECT id, company, seats, sub_status, plan FROM users WHERE fleet_code = ${code}`;
      if (!o || o.plan !== "fleet_month" || !ACTIVE.includes(o.sub_status || "")) return fail(404, "That code isn't active. Check it with your company.");
      if (acc.active && acc.via === "own") return fail(400, "You already have your own membership. Cancel it first if your company is covering you.");
      const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM fleet_members WHERE owner_id = ${o.id}`;
      const [already] = await db.sql`SELECT 1 FROM fleet_members WHERE owner_id = ${o.id} AND email = ${me.email}`;
      if (!already && n >= (o.seats || 1)) return fail(400, `${o.company || "Your company"} has used all its seats. Ask them to add one.`);
      await db.sql`INSERT INTO fleet_members (owner_id, email) VALUES (${o.id}, ${me.email}) ON CONFLICT DO NOTHING`;
      const [u] = await db.sql`SELECT * FROM users WHERE id = ${me.id}`;
      return json({ user: await publicUser(db, u), company: o.company });
    }
    if (acc.via !== "own" || plan !== "fleet_month") return fail(403, "Driver seats are managed by your company's fleet account.");
    if (!me.fleet_code) {
      for (let i = 0; i < 5 && !me.fleet_code; i++) {
        const c = Array.from(randomBytes(8)).map(b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
        try { await db.sql`UPDATE users SET fleet_code = ${c} WHERE id = ${me.id}`; me.fleet_code = c; } catch {}
      }
    }
    const seats = me.seats || 1;
    const [{ used }] = await db.sql`SELECT COUNT(*)::int AS used FROM fleet_members WHERE owner_id = ${me.id}`;
    if (route === "fleet/add") {
      const emails = [...new Set(String(body.emails || "").toLowerCase().split(/[\s,;]+/).map(x => x.trim()).filter(Boolean))];
      const bad = emails.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e));
      if (!emails.length || bad.length) return fail(400, bad.length ? `Check these emails: ${bad.slice(0, 3).join(", ")}` : "Enter at least one driver email.");
      const existing = new Set((await db.sql`SELECT email FROM fleet_members WHERE owner_id = ${me.id}`).map((r: any) => r.email));
      const fresh = emails.filter(e => !existing.has(e) && e !== me.email);
      if (used + fresh.length > seats) return fail(400, `You have ${seats - used} open seat${seats - used === 1 ? "" : "s"}. Add seats first, then invite more drivers.`);
      for (const e of fresh) {
        await db.sql`INSERT INTO fleet_members (owner_id, email) VALUES (${me.id}, ${e}) ON CONFLICT DO NOTHING`;
        if (mailReady()) await sendMail(e, `${me.company || "Your company"} gave you Rep & Ration Premium`, [
          `${me.company || "Your company"} is covering a Rep & Ration Premium membership for you: meal plans, food logging, workouts, DOT physical prep, sleep and more.`,
          `Create your account with this email address (${e}) and you're in. No card needed. Your company sees only that you joined and when you last used the app, never your food, weight or health data.`
        ], { label: "Create my account", url: url.origin }).catch(() => {});
      }
    } else if (route === "fleet/remove") {
      await db.sql`DELETE FROM fleet_members WHERE owner_id = ${me.id} AND email = ${String(body.email || "").toLowerCase()}`;
    } else if (route === "fleet/company") {
      const company = String(body.company || "").trim().slice(0, 80);
      if (company.length < 2) return fail(400, "Enter your company name.");
      await db.sql`UPDATE users SET company = ${company} WHERE id = ${me.id}`; me.company = company;
    } else if (route === "fleet/newcode") {
      me.fleet_code = null;
      for (let i = 0; i < 5 && !me.fleet_code; i++) {
        const c = Array.from(randomBytes(8)).map(b => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");
        try { await db.sql`UPDATE users SET fleet_code = ${c} WHERE id = ${me.id}`; me.fleet_code = c; } catch {}
      }
    } else if (route === "fleet/seats") {
      const s = stripe(); if (!s) return fail(503, "Payments aren't switched on yet.");
      const want = Math.round(Number(body.seats) || 0);
      if (!(want >= FLEET_MIN && want <= FLEET_MAX)) return fail(400, `Fleet plans need at least ${FLEET_MIN} seats (up to ${FLEET_MAX}).`);
      if (want < used) return fail(400, `You have ${used} drivers on the plan. Remove some before going down to ${want} seats.`);
      const sub = await bestSub(s, me);
      if (!sub || !ACTIVE.includes(sub.status)) return fail(400, "Your fleet plan isn't active.");
      const upd = await s.subscriptions.update(sub.id, { items: [{ id: sub.items.data[0].id, quantity: want }], proration_behavior: sub.status === "trialing" ? "none" : "create_prorations" });
      await saveSub(db, upd);
      me.seats = want;
    }
    const rows = await db.sql`SELECT m.email, m.added_at, u.name, (u.id IS NOT NULL) AS joined,
        (SELECT MAX(d.updated_at) FROM docs d WHERE u.id IS NOT NULL AND d.path LIKE 'data/users/' || u.id || '/%') AS last_active
      FROM fleet_members m LEFT JOIN users u ON u.email = m.email WHERE m.owner_id = ${me.id} ORDER BY m.added_at`;
    const week = Date.now() - 7 * 864e5;
    const drivers = rows.map((r: any) => ({ email: r.email, name: r.name || "", joined: r.joined, lastActive: r.last_active, added: r.added_at }));
    return json({ company: me.company || "", code: me.fleet_code, seats: me.seats || 1, used: drivers.length, price: fleetSeatPrice(me.seats || FLEET_MIN), min: FLEET_MIN,
      activeWeek: drivers.filter((d: any) => d.lastActive && +new Date(d.lastActive) > week).length, drivers });
  }

  /* ----- family plan ----- */
  if (route.startsWith("family/")) {
    if (route === "family/mine") return json({ via: acc.via, owner: acc.owner || null });
    if (acc.via !== "own" || !plan.startsWith("family")) return fail(403, "Family members are managed by the family plan owner.");
    if (route === "family/add") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(400, "Enter a valid email address.");
      if (email === me.email) return fail(400, "You're already on the plan.");
      const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM family_members WHERE owner_id = ${me.id}`;
      if (n >= 4) return fail(400, "Your family plan covers you plus 4 people. Remove someone to add another.");
      await db.sql`INSERT INTO family_members (owner_id, email) VALUES (${me.id}, ${email}) ON CONFLICT DO NOTHING`;
      if (mailReady()) await sendMail(email, `${me.name || me.email} added you to their Rep & Ration family plan`, [
        `${me.name || me.email} added you to their Rep & Ration family membership, so you get the full app at no cost.`,
        `Create your account with this email address (${email}) and you're in. No card needed.`
      ], { label: "Create my account", url: url.origin });
    } else if (route === "family/remove") {
      await db.sql`DELETE FROM family_members WHERE owner_id = ${me.id} AND email = ${String(body.email || "").toLowerCase()}`;
    }
    const rows = await db.sql`SELECT m.email, m.added_at, u.name, (u.id IS NOT NULL) AS joined FROM family_members m LEFT JOIN users u ON u.email = m.email WHERE m.owner_id = ${me.id} ORDER BY m.added_at`;
    return json({ members: rows.map((r: any) => ({ email: r.email, name: r.name || "", joined: r.joined })) });
  }

  /* ----- coach mode ----- */
  if (route.startsWith("coach/")) {
    const isCoach = acc.via === "own" && plan.startsWith("coach");
    if (route === "coach/mine") {
      // the client's side: who coaches me, what they see, and our messages
      const rows = await db.sql`SELECT l.coach_id, l.share, u.name, u.email FROM coach_links l JOIN users u ON u.id = l.coach_id WHERE l.client_id = ${me.id}`;
      const out = [];
      for (const r of rows) {
        const msgs = await db.sql`SELECT by_id, text, created_at FROM coach_msgs WHERE coach_id = ${r.coach_id} AND client_id = ${me.id} ORDER BY created_at DESC LIMIT 30`;
        out.push({ id: r.coach_id, name: r.name || String(r.email).split("@")[0], share: r.share, msgs: msgs.reverse().map((m: any) => ({ mine: m.by_id === me.id, text: m.text, at: m.created_at })) });
      }
      return json({ coaches: out });
    }
    if (route === "coach/join") {
      const code = String(body.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const [c] = await db.sql`SELECT c.coach_id, u.plan, u.sub_status, u.name, u.email FROM coach_codes c JOIN users u ON u.id = c.coach_id WHERE c.code = ${code}`;
      if (!c || !ACTIVE.includes(c.sub_status || "") || !String(c.plan || "").startsWith("coach")) return fail(404, "No coach uses that code. Check it with your coach.");
      if (c.coach_id === me.id) return fail(400, "That's your own coach code.");
      const [{ n }] = await db.sql`SELECT COUNT(*)::int AS n FROM coach_links WHERE coach_id = ${c.coach_id}`;
      if (n >= (PLANS[c.plan as PlanKey]?.clients || 0)) return fail(400, "Your coach's client list is full. Ask them to upgrade to Coach Unlimited.");
      await db.sql`INSERT INTO coach_links (coach_id, client_id) VALUES (${c.coach_id}, ${me.id}) ON CONFLICT DO NOTHING`;
      return json({ ok: true, coach: c.name || String(c.email).split("@")[0] });
    }
    if (route === "coach/leave" || route === "coach/share") {
      const coachId = String(body.coach || "");
      if (route === "coach/leave") await db.sql`DELETE FROM coach_links WHERE coach_id = ${coachId} AND client_id = ${me.id}`;
      else { const sh = { food: !!body.share?.food, workouts: !!body.share?.workouts, weight: !!body.share?.weight };
        await db.sql`UPDATE coach_links SET share = ${JSON.stringify(sh)}::jsonb WHERE coach_id = ${coachId} AND client_id = ${me.id}`; }
      return json({ ok: true });
    }
    if (route === "coach/msg") {
      const other = String(body.to || ""), text = String(body.text || "").trim().slice(0, 1000);
      if (!text) return fail(400, "Write a message first.");
      const l = await linkFor(db, me, other); if (!l) return fail(403, "You're not connected.");
      await db.sql`INSERT INTO coach_msgs (coach_id, client_id, by_id, text) VALUES (${l.coach_id}, ${l.client_id}, ${me.id}, ${text})`;
      await pushTo(db, other, { title: me.name || "Your coach", body: text.slice(0, 120), url: l.coach_id === me.id ? "/#coach" : "/#clients", tag: "coach" }).catch(() => 0);
      return json({ ok: true });
    }
    if (!isCoach) return fail(403, "Coach tools come with a Coach plan.");
    if (route === "coach/code") {
      let [c] = await db.sql`SELECT code FROM coach_codes WHERE coach_id = ${me.id}`;
      if (!c) { for (let i = 0; i < 10 && !c; i++) [c] = await db.sql`INSERT INTO coach_codes (code, coach_id) VALUES (${coachCode()}, ${me.id}) ON CONFLICT DO NOTHING RETURNING code`; }
      return json({ code: c.code });
    }
    if (route === "coach/clients") {
      const rows = await db.sql`SELECT l.client_id, l.share, l.created_at, u.name, u.email FROM coach_links l JOIN users u ON u.id = l.client_id WHERE l.coach_id = ${me.id} ORDER BY u.name`;
      const out = [];
      for (const r of rows) {
        const d = await userDocs(db, r.client_id);
        const [m] = await db.sql`SELECT by_id, created_at FROM coach_msgs WHERE coach_id = ${me.id} AND client_id = ${r.client_id} ORDER BY created_at DESC LIMIT 1`;
        out.push({ id: r.client_id, name: r.name || String(r.email).split("@")[0], since: r.created_at, share: r.share, sum: clientSummary(d, r.share), unread: !!(m && m.by_id !== me.id) });
      }
      return json({ clients: out, limit: PLANS[plan as PlanKey]?.clients || 0 });
    }
    if (route === "coach/client") {
      const cid = String(body.id || "");
      const [l] = await db.sql`SELECT * FROM coach_links WHERE coach_id = ${me.id} AND client_id = ${cid}`;
      if (!l) return fail(404, "That client isn't connected to you.");
      const d = await userDocs(db, cid), sh = l.share || {};
      const since = dayKey(new Date(Date.now() - 13 * 864e5));
      const log = (d.food && d.food.log) || {};
      const [u] = await db.sql`SELECT name, email FROM users WHERE id = ${cid}`;
      const msgs = await db.sql`SELECT by_id, text, created_at FROM coach_msgs WHERE coach_id = ${me.id} AND client_id = ${cid} ORDER BY created_at DESC LIMIT 50`;
      const p = d.profile || {};
      return json({
        name: u.name || String(u.email).split("@")[0], share: sh,
        profile: { sex: p.sex, age: p.age, heightCm: p.heightCm, weightKg: sh.weight ? p.weightKg : null, activity: p.activity, goal: p.goal, diet: p.diet, faith: p.faith, rate: p.rate, adaptive: p.adaptive, units: p.units, daysPerWeek: p.daysPerWeek, schedule: sh.workouts ? p.schedule : null },
        food: sh.food ? Object.fromEntries(Object.entries(log).filter(([k]) => k >= since)) : null,
        sessions: sh.workouts ? ((d.training && d.training.sessions) || []).slice(-40) : null,
        weights: sh.weight ? ((d.training && d.training.weights) || []).slice(-120) : null,
        msgs: msgs.reverse().map((m: any) => ({ mine: m.by_id === me.id, text: m.text, at: m.created_at }))
      });
    }
    if (route === "coach/remove") {
      await db.sql`DELETE FROM coach_links WHERE coach_id = ${me.id} AND client_id = ${String(body.id || "")}`;
      return json({ ok: true });
    }
    return fail(404, "not found");
  }

  if (route === "profiles") {
    const ids: string[] = Array.isArray(body.ids) ? body.ids.slice(0, 200).map(String) : [];
    const groups = await db.sql`SELECT data FROM docs WHERE path LIKE 'groups/%' AND (data->'members' @> ${JSON.stringify([me.id])}::jsonb OR data->'pending' @> ${JSON.stringify([me.id])}::jsonb)`;
    const known = new Set<string>([me.id]);
    for (const g of groups) for (const k of ["members", "pending", "coaches"]) for (const x of g.data[k] || []) known.add(x);
    for (const g of groups) known.add(g.data.owner);
    const allowed = ids.filter(i => known.has(i));
    const rows = allowed.length ? await db.sql`SELECT id, name, email FROM users WHERE id = ANY(${allowed})` : [];
    const out: Record<string, string> = {};
    for (const r of rows) out[r.id] = r.name || String(r.email).split("@")[0];
    return json({ names: out });
  }
  if (route === "db") {
    const { op, path } = body;
    if (op === "query") {
      const coll = String(body.collection || ""), [field, oper, value] = body.where || [];
      if (coll === "groups" && ["members", "pending"].includes(field) && oper === "array-contains" && value === me.id) {
        const rows = await db.sql`SELECT path, data FROM docs WHERE path LIKE 'groups/%' AND data->${field} @> ${JSON.stringify([me.id])}::jsonb`;
        return json({ docs: rows.map((r: any) => ({ id: r.path.split("/")[1], data: r.data })) });
      }
      return fail(403, "query not allowed");
    }
    if (!validPath(path)) return fail(400, "bad path");
    if (!(await canRead(db, path, me.id))) return op === "get" ? json({ exists: false }) : fail(403, "not allowed");
    const oldDoc = await getDoc(db, path);
    if (op === "get") return json(oldDoc === undefined ? { exists: false } : { exists: true, data: oldDoc });
    if (op === "set" || op === "update") {
      if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) return fail(400, "bad body");
      if (JSON.stringify(body.data).length > 256 * 1024) return fail(413, "too big");
      if (op === "update" && oldDoc === undefined) return fail(404, "missing");
      const next = op === "set" ? body.data : merge(JSON.parse(JSON.stringify(oldDoc)), body.data);
      const why = await canWrite(db, op, path, me.id, oldDoc, next);
      if (why === "code taken") return json({ ok: false, conflict: true });
      if (why) return fail(403, why);
      if (path.startsWith("codes/")) {
        const ins = await db.sql`INSERT INTO docs (path, data) VALUES (${path}, ${JSON.stringify(next)}::jsonb) ON CONFLICT (path) DO NOTHING RETURNING path`;
        return json({ ok: ins.length > 0, conflict: ins.length === 0 });
      }
      await db.sql`INSERT INTO docs (path, data, updated_at) VALUES (${path}, ${JSON.stringify(next)}::jsonb, NOW())
        ON CONFLICT (path) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`;
      return json({ ok: true });
    }
    if (op === "delete") {
      const why = await canWrite(db, op, path, me.id, oldDoc, null);
      if (why) return fail(403, why);
      await db.sql`DELETE FROM docs WHERE path = ${path}`;
      return json({ ok: true });
    }
    return fail(400, "bad op");
  }
  return fail(404, "not found");
}

export default async (req: Request, context: Context) => {
  try { return await handle(req, context); }
  catch (e: any) {
    console.error(e);
    const stripeKey = e && (e.type === "StripeAuthenticationError" || /api key/i.test(String(e.message)));
    return fail(stripeKey ? 503 : 500, stripeKey ? "Payments are temporarily unavailable. Please try again soon." : "Something went wrong. Please try again.");
  }
};

export const config: Config = { path: "/api/*" };
