# Environment variables

Every setting the platform reads, where to set it, and what breaks without it.
Current hosting: **API on Render** (Docker), **database on Supabase**, **Redis on
Upstash**, and the **three web apps on Vercel** (one Vercel project each, with
the root directory set to `apps/frontend`, `apps/seller` or `apps/admin`).

Vite variables (`VITE_*`) are baked into the JavaScript at build time: after
changing one on Vercel, **redeploy** that project.

---

## 1. Backend API (Render → service → Environment)

| Variable | Required? | Example / value | Why |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `postgresql://postgres.<ref>:<password>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres` | Supabase connection (use the IPv4 pooler; Render has no IPv6). |
| `DB_SSL_REJECT_UNAUTHORIZED` | **Yes on Supabase** | `false` | Supabase's pooler certificate isn't in Node's trust store; without this (or `DB_SSL_CA`) the API can't connect. |
| `DB_SSL_CA` | Optional (more secure) | PEM text, or base64 of it | Supabase's CA certificate (Dashboard → Database → SSL). When set, the certificate is verified and `DB_SSL_REJECT_UNAUTHORIZED` is ignored. |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | **Yes** for sign-in | Service-account JSON on one line, or base64 | Verifies sign-ins. Without it, everything that needs an account (checkout, orders, account page, Seller Central, Admin Console) answers "Authentication service unavailable". Firebase Console → Project settings → Service accounts → Generate new private key. |
| `CORS_ORIGIN` | Recommended | `https://janaushadhi.in,https://seller.janaushadhi.in,https://admin.janaushadhi.in` | Only these sites may call the API. Unset = any site (works, but logs a warning). |
| `REDIS_URL` | Optional | `rediss://default:<password>@<host>.upstash.io:6379` | Caches search and roles. Note `rediss://` (TLS) for Upstash. Without it the API still works, just with no cache. |
| `MEILI_HOST` + `MEILI_MASTER_KEY` | Optional | `https://<your-meili-host>` + key of 16+ chars | Typo-tolerant search engine. Without it search uses PostgreSQL (still typo-tolerant, slightly slower). The index builds itself on first start. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | Optional | from console.twilio.com | Sends the customer a WhatsApp confirmation when they order. Without it, no message is sent (orders still work). |
| `NODE_ENV` | Set by `render.yaml` | `production` | Production error masking and config checks. |

Advanced (defaults are fine): `RUN_MIGRATIONS_ON_START` (default `true`: pending
database migrations are applied at boot), `TRUST_PROXY` (default trusts the
proxy chain; set `1` behind exactly one proxy you control), `DB_POOL_MAX` (20),
`RATE_LIMIT_MAX` (100/min; search has its own 600/min), `RATE_LIMIT_WINDOW`,
`REDIS_TTL`, `DB_SSL` (force TLS on/off).

`render.yaml` in the repo root declares this service (Dockerfile path, health
check `/api/v1/health/live`, and the variables above, with secrets left for you
to fill in).

## 2. Patient site (Vercel project for `apps/frontend`)

| Variable | Required? | Example | Why |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | `https://jan-aushadhi-090l.onrender.com` | Where the site calls the API. Unset = it calls `localhost` and nothing loads (the browser console says so). A trailing `/api/v1` is ignored. |
| `VITE_FIREBASE_API_KEY` | **Yes** for sign-in | from Firebase | Phone/Google sign-in. Without the six Firebase values the site works in guest mode: search, compare and find Kendras, but no ordering. |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** for sign-in | `<project>.firebaseapp.com` | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** for sign-in | `<project>` | 〃 |
| `VITE_FIREBASE_STORAGE_BUCKET` | **Yes** for sign-in | `<project>.firebasestorage.app` | 〃 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** for sign-in | numeric | 〃 |
| `VITE_FIREBASE_APP_ID` | **Yes** for sign-in | `1:…:web:…` | 〃 |
| `VITE_SITE_URL` | Optional | `https://janaushadhi.in` | Absolute URL for link previews on WhatsApp/social media. On Vercel the production domain is used automatically when unset. |

The six Firebase values are in Firebase Console → Project settings → Your apps → Web app → Config.

## 3. Seller Central and Admin Console (one Vercel project each)

Both need `VITE_API_URL` and the same six `VITE_FIREBASE_*` values as the
patient site (same Firebase project). Without Firebase nobody can log in.

## 4. Firebase console (not variables, but required)

1. **Authentication → Sign-in method**: enable **Phone**, **Google** (patients)
   and **Email/Password** (Kendra operators log in with their store code, which
   is an email/password account created by Admin → Stores → Assign operator).
2. **Authentication → Settings → Authorized domains**: add your three site domains.
3. **First admin**: sign in once on the patient site, then in Supabase run
   `UPDATE users SET role = 'SUPER_ADMIN' WHERE email = '<your email>';`
   (or by `phone`). After that, manage everyone from the Admin Console.

## 5. One-time data load (only for a new, empty database)

The API applies schema migrations itself, but it does not load the medicine
catalogue. With `DATABASE_URL` pointing at the database, run from the repo root:

```
npm ci
npm run etl:run      # medicines + generic matches (+ search index if Meilisearch is set)
npm run etl:stores   # Kendra list with locations
```

Both are safe to re-run (they upsert; product ids never change).

## 6. Self-hosted on one server (docker-compose)

**Step-by-step guide for DigitalOcean: [DEPLOY_DIGITALOCEAN.md](DEPLOY_DIGITALOCEAN.md)**
(about $12/month for everything, Meilisearch included). In that setup the
`VITE_*` values are GitHub Actions secrets, because CI builds the site images.

Copy `deploy/.env.production.example` to `deploy/.env.production`, fill in
`DOMAIN`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `MEILI_MASTER_KEY`,
`FIREBASE_SERVICE_ACCOUNT_KEY`, `CORS_ORIGIN`, `VITE_API_URL` and the
`VITE_FIREBASE_*` values, then run `deploy/setup-server.sh` once and
`deploy/deploy.sh` for each release.
