// Shared helpers for the API and the scheduled job.
import Stripe from "stripe";

export const ACTIVE = ["trialing", "active", "past_due"];

/* ---------- plans ---------- */
export type PlanKey = "individual_month" | "individual_year" | "family_month" | "family_year" | "coach_month" | "coach_unlimited_month" | "fleet_month";
export const PLANS: Record<PlanKey, { label: string; product: string; amount: number; interval: "month" | "year"; seats: number; clients: number }> = {
  individual_month: { label: "Monthly", product: "Rep & Ration", amount: 1599, interval: "month", seats: 1, clients: 0 },
  individual_year: { label: "Annual", product: "Rep & Ration", amount: 12000, interval: "year", seats: 1, clients: 0 },
  family_month: { label: "Family monthly", product: "Rep & Ration Family", amount: 2499, interval: "month", seats: 5, clients: 0 },
  family_year: { label: "Family annual", product: "Rep & Ration Family", amount: 19900, interval: "year", seats: 5, clients: 0 },
  coach_month: { label: "Coach", product: "Rep & Ration Coach", amount: 2999, interval: "month", seats: 1, clients: 25 },
  coach_unlimited_month: { label: "Coach Unlimited", product: "Rep & Ration Coach Unlimited", amount: 4999, interval: "month", seats: 1, clients: 100000 },
  // priced per driver seat; the subscription quantity is the number of seats
  fleet_month: { label: "Fleet seat", product: "Rep & Ration Fleet", amount: 1000, interval: "month", seats: 1, clients: 0 }
};
// Fleet pricing (volume tiers): 20 seats minimum; 20–50 seats are $10 each, 51+ seats are $8 each.
export const FLEET_MIN = 20, FLEET_MAX = 5000;
export const fleetSeatPrice = (n: number) => (n > 50 ? 800 : 1000);
export const isPlan = (p: unknown): p is PlanKey => typeof p === "string" && p in PLANS;
export const money = (c: number) => "$" + (c / 100).toFixed(2);
const LOOKUP = (p: PlanKey) => `rr_${p}_v2`;

export function stripe() {
  const key = Netlify.env.get("STRIPE_SECRET_KEY");
  return key ? new Stripe(key) : null;
}

/** Stripe price for a plan, created once (by lookup key) and remembered. */
export async function priceFor(s: Stripe, db: any, plan: PlanKey): Promise<string> {
  const mode = (Netlify.env.get("STRIPE_SECRET_KEY") || "").includes("_test_") ? "test" : "live";
  const kvKey = `price:${mode}:${plan}`;
  const [row] = await db.sql`SELECT v FROM kv WHERE k = ${kvKey}`;
  if (row && row.v && row.v.id) return row.v.id;
  const found = await s.prices.list({ lookup_keys: [LOOKUP(plan)], active: true, limit: 1 });
  let id = found.data[0]?.id;
  if (!id) {
    const P = PLANS[plan];
    const prodKey = `product:${mode}:${P.product}`;
    const [pr] = await db.sql`SELECT v FROM kv WHERE k = ${prodKey}`;
    let productId = pr && pr.v && pr.v.id;
    if (!productId) {
      productId = (await s.products.create({ name: P.product, metadata: { app: "repandration" } })).id;
      await db.sql`INSERT INTO kv (k, v) VALUES (${prodKey}, ${JSON.stringify({ id: productId })}::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
    }
    id = plan === "fleet_month"
      ? (await s.prices.create({ product: productId, currency: "usd", billing_scheme: "tiered", tiers_mode: "volume", tiers: [{ up_to: 50, unit_amount: 1000 }, { up_to: "inf", unit_amount: 800 }], recurring: { interval: P.interval }, lookup_key: LOOKUP(plan), nickname: P.label, metadata: { plan } })).id
      : (await s.prices.create({ product: productId, currency: "usd", unit_amount: P.amount, recurring: { interval: P.interval }, lookup_key: LOOKUP(plan), nickname: P.label, metadata: { plan } })).id;
  }
  await db.sql`INSERT INTO kv (k, v) VALUES (${kvKey}, ${JSON.stringify({ id })}::jsonb) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
  return id;
}
export function planOfSub(sub: any): string | null {
  const price = sub?.items?.data?.[0]?.price;
  const lk = price?.lookup_key || "";
  const m = /^rr_(.+)_v2$/.exec(lk);
  if (m && isPlan(m[1])) return m[1];
  if (sub?.metadata?.plan && isPlan(sub.metadata.plan)) return sub.metadata.plan;
  if (price?.metadata?.plan && isPlan(price.metadata.plan)) return price.metadata.plan;
  return price?.recurring?.interval === "year" ? "individual_year" : "individual_month";
}

/* ---------- email (Resend) ---------- */
export const mailReady = () => !!(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("MAIL_FROM"));
const escH = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
export async function sendMail(to: string, subject: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const key = Netlify.env.get("RESEND_API_KEY"), from = Netlify.env.get("MAIL_FROM");
  if (!key || !from) return false;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#12201B;line-height:1.55">
    <p style="font-weight:800;font-size:20px;color:#0B7A5E;margin:0 0 16px">Rep &amp; Ration</p>
    ${paragraphs.map(p => `<p style="margin:0 0 14px">${escH(p)}</p>`).join("")}
    ${cta ? `<p style="margin:22px 0"><a href="${escH(cta.url)}" style="background:#0B7A5E;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">${escH(cta.label)}</a></p>` : ""}
    <p style="margin:24px 0 0;font-size:12px;color:#5A6A64">Questions? Reply to this email or write to Repandration27@gmail.com.</p></div>`;
  const text = paragraphs.join("\n\n") + (cta ? `\n\n${cta.label}: ${cta.url}` : "");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: "Repandration27@gmail.com" })
  }).catch(() => null);
  return !!(r && r.ok);
}

/* ---------- web push ---------- */
export async function vapid(db: any) {
  const [row] = await db.sql`SELECT v FROM kv WHERE k = 'vapid'`;
  if (row && row.v && row.v.publicKey) return row.v as { publicKey: string; privateKey: string };
  const webpush: any = (await import("web-push")).default;
  const keys = webpush.generateVAPIDKeys();
  await db.sql`INSERT INTO kv (k, v) VALUES ('vapid', ${JSON.stringify(keys)}::jsonb) ON CONFLICT (k) DO NOTHING`;
  const [again] = await db.sql`SELECT v FROM kv WHERE k = 'vapid'`;
  return again.v as { publicKey: string; privateKey: string };
}
export async function pushTo(db: any, userId: string, payload: { title: string; body: string; url?: string; tag?: string }) {
  const subs = await db.sql`SELECT endpoint, data FROM push_subs WHERE user_id = ${userId}`;
  if (!subs.length) return 0;
  const webpush: any = (await import("web-push")).default;
  const v = await vapid(db);
  webpush.setVapidDetails("mailto:Repandration27@gmail.com", v.publicKey, v.privateKey);
  let n = 0;
  for (const s of subs) {
    try { await webpush.sendNotification(s.data, JSON.stringify(payload), { TTL: 3600 }); n++; }
    catch (e: any) { if (e && (e.statusCode === 404 || e.statusCode === 410)) await db.sql`DELETE FROM push_subs WHERE endpoint = ${s.endpoint}`; }
  }
  return n;
}
