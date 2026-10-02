# Rep & Ration — public site

This folder is the whole app: the site (`public/`), the server API with login, database and Stripe billing (`netlify/functions/api.mts`), and the database setup (`netlify/database/migrations`).

## 1. Put it online (one time, about 10 minutes)

1. Install Node.js LTS from https://nodejs.org (use the default options).
2. Unzip this folder, for example to `Documents\rr-netlify`.
3. Open **Command Prompt** (Windows key, type `cmd`) and run:

```
cd %USERPROFILE%\Documents\rr-netlify
npm install
npx netlify-cli login
npx netlify-cli link --id a6721461-7a73-4c94-ab4f-e215a4cc9f9c
npx netlify-cli deploy --prod
```

`login` opens your browser to approve access to your Netlify account. `link` connects this folder to the **repandration** project already created in your account. After `deploy --prod` the app is live at https://repandration.netlify.app.

4. In Netlify → repandration → **Extensions / Database**, make sure Netlify Database is enabled (the tables are created automatically from `netlify/database/migrations` on deploy).

Until Stripe keys are added, anyone who signs up gets in free (handy for testing). Adding the keys switches the paywall on.

## 2. Turn on payments (Stripe)

1. Create an account at https://dashboard.stripe.com and finish business verification.
2. **Developers → API keys**: copy the *Secret key* (`sk_live_…`, or `sk_test_…` to test first).
3. **Developers → Webhooks → Add endpoint**
   - URL: `https://YOUR-DOMAIN/api/stripe/webhook` (or `https://repandration.netlify.app/api/stripe/webhook`)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the *Signing secret* (`whsec_…`).
4. **Settings → Billing → Customer portal**: turn on "Cancel subscriptions" and "Update payment methods", then Save.
5. Netlify → repandration → **Site configuration → Environment variables**, add:
   - `STRIPE_SECRET_KEY` = your secret key (mark as secret)
   - `STRIPE_WEBHOOK_SECRET` = your signing secret (mark as secret)
6. Run `npx netlify-cli deploy --prod` again (or Deploys → Trigger deploy).

Price ($12.99/month) and trial (7 days, once per customer) are set in `netlify/functions/api.mts` (`PRICE_CENTS`, `TRIAL_DAYS`).

Test with card `4242 4242 4242 4242` while using `sk_test_` keys, then swap to live keys.

## 3. Password-reset emails (recommended)

Create a free account at https://resend.com, verify your domain, then add env vars `RESEND_API_KEY` and `MAIL_FROM` (e.g. `Rep & Ration <support@yourdomain.com>`).

## 4. Your own domain

Netlify → repandration → **Domain management → Add a domain**. Buy one there, or enter one you own elsewhere and follow the DNS instructions. HTTPS is set up automatically. Update the Stripe webhook URL to the new domain.

## 5. Before launch

Fill in the bracketed items in `public/terms.html` and `public/privacy.html` and have a lawyer review them.

## Updating the app later

Replace files, then run `npx netlify-cli deploy --prod` from this folder.
