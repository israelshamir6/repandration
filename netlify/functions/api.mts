import type { Context, Config } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import Stripe from "stripe";
import { scrypt as _scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (p: string, s: Buffer, n: number) => Promise<Buffer>;
const PRICE_CENTS = 1299;
const TRIAL_DAYS = 7;
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
function stripe() {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  return key ? new Stripe(key) : null;
}
function subActive(u: any) {
  if (!Netlify.env.get("STRIPE_SECRET_KEY")) return true; // billing not switched on yet: everyone gets in
  return u && ["trialing", "active", "past_due"].includes(u.sub_status || "");
}
const publicUser = (u: any) => ({
  id: u.id, email: u.email, name: u.name,
  sub: { status: u.sub_status || "none", trialEnd: u.trial_end, periodEnd: u.period_end, active: subActive(u), billing: !!Netlify.env.get("STRIPE_SECRET_KEY"), canTrial: !u.had_trial }
});


async function saveSub(db: any, sub: Stripe.Subscription) {
  const uid = (sub.metadata && sub.metadata.uid) || null;
  const anySub: any = sub;
  const periodEnd = anySub.current_period_end ?? anySub.items?.data?.[0]?.current_period_end ?? null;
  const cust = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await db.sql`UPDATE users SET sub_status = ${sub.status}, trial_end = ${sub.trial_end ? new Date(sub.trial_end * 1000) : null},
    period_end = ${periodEnd ? new Date(periodEnd * 1000) : null}, stripe_customer_id = ${cust}, had_trial = had_trial OR ${!!sub.trial_end}
    WHERE id = ${uid} OR stripe_customer_id = ${cust}`;
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

/* ---------- handler ---------- */
export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");
  const db = getDatabase();
  const body: any = req.method === "POST" && route !== "stripe/webhook" ? await req.json().catch(() => ({})) : {};

  // Stripe webhook (raw body, signature checked)
  if (route === "stripe/webhook") {
    const s = stripe(), secret = Netlify.env.get("STRIPE_WEBHOOK_SECRET");
    if (!s || !secret) return fail(503, "billing not configured");
    let event: Stripe.Event;
    try { event = await s.webhooks.constructEventAsync(await req.text(), req.headers.get("stripe-signature") || "", secret); }
    catch { return fail(400, "bad signature"); }
    const setSub = (sub: Stripe.Subscription) => saveSub(db, sub);
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.client_reference_id && cs.customer) await db.sql`UPDATE users SET stripe_customer_id = ${String(cs.customer)} WHERE id = ${cs.client_reference_id}`;
      if (cs.subscription) await setSub(await s.subscriptions.retrieve(String(cs.subscription)));
    } else if (event.type.startsWith("customer.subscription.")) {
      await setSub(event.data.object as Stripe.Subscription);
    }
    return json({ received: true });
  }

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
    } else {
      [user] = await db.sql`SELECT * FROM users WHERE email = ${email}`;
      if (!user || !(await checkPassword(pw, user.pass_hash))) { await new Promise(r => setTimeout(r, 400)); return fail(401, "Email or password is incorrect."); }
    }
    const token = newId(32);
    await db.sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${user.id}, ${new Date(Date.now() + SESSION_DAYS * 864e5)})`;
    return json({ user: publicUser(user) }, 200, { "set-cookie": cookieFor(token, SESSION_DAYS * 86400) });
  }
  if (route === "auth/reset-request") {
    const key = Netlify.env.get("RESEND_API_KEY"), from = Netlify.env.get("MAIL_FROM");
    if (!key || !from) return fail(503, "Password reset email isn't set up yet. Contact support.");
    const email = String(body.email || "").trim().toLowerCase();
    const [u] = await db.sql`SELECT id FROM users WHERE email = ${email}`;
    if (u) {
      const token = newId(32);
      await db.sql`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (${sha(token)}, ${u.id}, ${new Date(Date.now() + 3600e3)})`;
      const link = `${url.origin}/?reset=${token}`;
      await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({ from, to: email, subject: "Reset your Rep & Ration password", text: `Reset your password within the next hour:\n\n${link}\n\nIf you didn't ask for this, ignore this email.` }) });
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
  if (route === "me") return json({ user: me ? publicUser(me) : null });
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
    if (s && me.stripe_customer_id) {
      const subs = await s.subscriptions.list({ customer: me.stripe_customer_id, status: "all", limit: 20 });
      for (const sub of subs.data) if (!["canceled", "incomplete_expired"].includes(sub.status)) await s.subscriptions.cancel(sub.id);
    }
    await db.sql`DELETE FROM docs WHERE path LIKE ${`data/users/${me.id}/%`}`;
    await db.sql`DELETE FROM users WHERE id = ${me.id}`;
    return json({ ok: true }, 200, { "set-cookie": cookieFor("", 0) });
  }
  if (route === "billing/checkout") {
    const s = stripe(); if (!s) return fail(503, "Payments aren't switched on yet.");
    // One free trial per email, even if the account was deleted and re-created.
    let hadTrial = !!hadTrial;
    if (!hadTrial) {
      for (const c of (await s.customers.list({ email: me.email, limit: 10 })).data) {
        if ((await s.subscriptions.list({ customer: c.id, status: "all", limit: 20 })).data.some(x => x.trial_start)) { hadTrial = true; break; }
      }
      if (hadTrial) await db.sql`UPDATE users SET had_trial = true WHERE id = ${me.id}`;
    }
    const cs = await s.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: me.id,
      ...(me.stripe_customer_id ? { customer: me.stripe_customer_id } : { customer_email: me.email }),
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: PRICE_CENTS, recurring: { interval: "month" }, product_data: { name: "Rep & Ration" } } }],
      payment_method_collection: "always",
      subscription_data: { metadata: { uid: me.id }, ...(hadTrial ? {} : { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" } } }) },
      custom_text: { submit: { message: hadTrial ? "You'll be charged $12.99 today and every month until you cancel." : "Your card won't be charged today. After your 7-day free trial, it's charged $12.99 and every month after that until you cancel." } },
      allow_promotion_codes: true,
      success_url: `${url.origin}/?checkout=success`,
      cancel_url: `${url.origin}/?checkout=cancel`
    });
    return json({ url: cs.url });
  }
  if (route === "billing/sync") {
    // Pull the member's subscription straight from Stripe (backup for a missed or failed webhook).
    const s = stripe(); if (!s) return json({ user: publicUser(me) });
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
    return json({ user: publicUser(u) });
  }
  if (route === "billing/portal") {
    const s = stripe(); if (!s || !me.stripe_customer_id) return fail(400, "No billing account yet.");
    const ps = await s.billingPortal.sessions.create({ customer: me.stripe_customer_id, return_url: `${url.origin}/#profile` });
    return json({ url: ps.url });
  }
  if (!subActive(me)) return fail(402, "Start your free trial to use this.");

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
};

export const config: Config = { path: "/api/*" };
