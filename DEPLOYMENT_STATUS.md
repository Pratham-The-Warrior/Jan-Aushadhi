# Jan Aushadhi Platform - Deployment & Migration Blueprint

## 1. Executive Summary
This document provides a complete record of the deployment infrastructure, linked cloud accounts, current live endpoints, and technical fixes for the Jan Aushadhi platform. It serves as an exact reference manual for migrating the entire stack to dedicated infrastructure (AWS EC2 or DigitalOcean) when production resources and custom domains are provisioned.

---

> Every environment variable, where it is set and why, is listed in **docs/ENVIRONMENT.md**.
> To move everything onto one DigitalOcean server (~$12/month, Meilisearch included), follow **docs/DEPLOY_DIGITALOCEAN.md**.

## 2. Current Operational Status & Project State (Where Things Stand Right Now)

* **Live Cloud Staging Deployment**: The complete application stack is 100% online, functional, and publicly accessible across free-tier cloud providers.
* **Cloud Database Population**: Supabase PostgreSQL + PostGIS database is populated with over 250,000+ medicine records and 19,000+ Jan Aushadhi Kendras.
* **Automated CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) is active and passing all workspace validation checks and Docker image builds for GHCR.
* **Frontend Resiliency & Demonstration Mode**: All three web applications (Patient Portal, Seller Central, Admin Console) are running on Vercel with built-in guest session fallbacks.
* **Local Workstation State**: All local background development Node processes have been safely terminated; the project is operating independently in cloud environments.
* **Pending Milestones (Planned Transfer)**: Migration to dedicated VPS infrastructure (AWS/DigitalOcean), domain name mapping (`api.yourdomain.com`), and dedicated Meilisearch indexing are scheduled for next week when hardware resources are allocated.

---

## 3. Linked Accounts & Deployment Services Summary

Below is the complete reference table of all cloud platforms, account links, repositories, and active live endpoints currently power-hosting the staging environment:

| Component | Platform / Provider | Linked Account / Identifier | Live URL / Connection String | Deployment Method |
| :--- | :--- | :--- | :--- | :--- |
| **Code Repository** | GitHub | `Pratham-The-Warrior/Jan-Aushadhi` (Branch: `master`) | `https://github.com/Pratham-The-Warrior/Jan-Aushadhi` | Git Version Control |
| **Backend API** | Render | Account connected to `Pratham-The-Warrior` repo | `https://jan-aushadhi-090l.onrender.com` | Automated GitHub Webhook Build |
| **Patient Frontend** | Vercel | Account connected to `Pratham-The-Warrior` repo | `https://jan-aushadhi-frontend.vercel.app` | Automated Vercel GitHub Integration |
| **Seller Central** | Vercel | Separate Vercel project, root `apps/seller` | Its own domain (not a subpath) | Static Web Hosting + SPA rewrites (`vercel.json`) |
| **Admin Console** | Vercel | Separate Vercel project, root `apps/admin` | Its own domain (not a subpath) | Static Web Hosting + SPA rewrites (`vercel.json`) |
| **Database (PostGIS)**| Supabase | Tenant/Project Ref: `bhwhmcukranhguctwajh` (Region: `ap-northeast-1`) | `aws-1-ap-northeast-1.pooler.supabase.com:6543` | Managed Cloud PostgreSQL |
| **Cache (Redis)** | Upstash | Managed Serverless Redis Instance | Upstash Redis Cloud Host | Managed Serverless Redis |

---

## 4. Current Architecture & Infrastructure (Free-Tier Demonstration)

```
+-----------------------------------+        +-----------------------------------+
|     Patient / Seller / Admin      |        |          Fastify API              |
|        Frontends (Vercel)         |------->|        Backend (Render)          |
|  https://jan-aushadhi-frontend... |        | https://jan-aushadhi-090l...      |
+-----------------------------------+        +-----------------------------------+
                                                       |               |
                                     +-----------------+               +-----------------+
                                     |                                                   |
                                     v                                                   v
                        +--------------------------+                        +--------------------------+
                        |  Supabase PostgreSQL     |                        |  Upstash Serverless      |
                        |       + PostGIS          |                        |          Redis           |
                        | (aws-1-ap-northeast-1...) |                        |  (Cache & Session store) |
                        +--------------------------+                        +--------------------------+
```

### Detailed Component Operations
* **Database Schemas Active**: Versioned SQL migrations `backend/migrations/001`–`007`, tracked in `schema_migrations`. The server applies pending migrations at startup (advisory-locked, safe through the Supabase pooler); set `RUN_MIGRATIONS_ON_START=false` to run `npm run db:migrate` yourself. Tables: `users`, `branded_meds`, `generic_meds`, `medicine_matches`, `stores`, `requirements`, `store_inventory`, `order_status_log`.
* **Boot-time maintenance**: On boot the server (re)builds `medicine_matches` when the matcher version changed, re-imports store locations that lack verified coordinates, and rebuilds the Meilisearch index when it is missing or outdated. It does **not** load the medicine catalogue into an empty database: run `npm run etl:run` and `npm run etl:stores` once (the ETL upserts, so re-running it is safe).
* **Search Engine**: Dual-mode — high-speed Meilisearch fuzzy indexing (Tier 1 exact match via `salt_strength_hash` and Tier 2 via `salt_hash`) with automatic SQL fallback.
* **Auth Resilience**: Configured with fallback mechanisms (`firebase.js` and `authStore.js`) to support guest mode and local session states when production Firebase keys are unpopulated.

---

## 5. Deployment Troubleshooting & Engineering Modifications

During initial deployment and production hardening, several technical barriers were resolved and locked into the repository:

1. **IPv6 vs IPv4 Routing (Supabase Connection)**:
   * **Issue**: Render containers run on IPv4 infrastructure and failed to resolve direct Supabase IPv6 endpoints (`db.xxx.supabase.co`), throwing `ENETUNREACH` network errors.
   * **Resolution**: Reconfigured connection strings to utilize Supabase's IPv4 Pooler host (`aws-1-ap-northeast-1.pooler.supabase.com:6543`) and TLS configured from env: `DB_SSL_REJECT_UNAUTHORIZED=false` on Render (or `DB_SSL_CA` with Supabase's CA to verify the certificate). A `?sslmode=` in the URL no longer overrides these.
2. **Docker Build Context & CSV Ingestion**:
   * **Issue**: Docker build processes failed when large CSV files were scattered across the root directory.
   * **Resolution**: Consolidated datasets into a dedicated `data/` directory, added path resolution via `resolveDataPath()`, and updated `backend/Dockerfile` to copy datasets cleanly into `/app/data/`.
3. **Database Transaction Safety & Schema Migrations**:
   * **Issue**: Manual migration scripts (`setup_db.ts`, `migrate_v2.ts`) lacked rollback protection and version tracking.
   * **Resolution**: Implemented `withTransaction<T>` ACID transaction engine in `database.ts`, created versioned migrations in `backend/migrations/`, and added the automated `migrator` service in `docker-compose.prod.yml`.
4. **Frontend API URL Sanitization & Modular Layouts**:
   * **Issue**: Deployment environments occasionally injected trailing slashes or duplicate subpaths into `VITE_API_URL`.
   * **Resolution**: Added string sanitization in API clients and extracted monolithic `App.jsx` layout logic into dedicated `components/layout/` suites (`Sidebar`, `TopBar`, `Loader`, `AccessDenied`, and layout shells).

5. **Node ESM Module Resolution in Compiled Production**:
   * **Issue**: Docker production images running `node dist/src/index.js` or `node dist/scripts/migrate.js` failed with `ERR_MODULE_NOT_FOUND` because native Node ESM requires bundled dependencies or `.js` extension specifiers.
   * **Resolution**: Integrated `esbuild` production bundling into `backend/package.json` (`npm run build:backend`), generating self-contained ESM bundles in 38ms that execute flawlessly in Node 20/22.
6. **Meilisearch Production Configuration & Memory Guarding**:
   * **Issue**: When `MEILI_ENV=production`, Meilisearch strictly crashes if `MEILI_MASTER_KEY` is not set or is shorter than 16 bytes. Furthermore, indexing 250k medicines without memory constraints could trigger Linux OOMKilled errors on small VPS instances.
   * **Resolution**: Added `validateStartupConfig()` to enforce key length, added `MEILI_MAX_INDEXING_MEMORY: 500Mb` and `MEILI_NO_ANALYTICS: "true"` in `docker-compose.prod.yml`, restored `backend/scripts/seed_meilisearch.ts`, and enhanced `checkMeiliHealth()` to verify authentication via `getIndexes()`.
7. **Nginx SSL Bootstrap & Single-Command Deployment**:
   * **Issue**: Nginx refused to boot without SSL certificates, blocking Certbot from running ACME challenges on port 80.
   * **Resolution**: Created `deploy/init-ssl.sh` for automated dummy-to-real certificate bootstrapping and unified the entire workflow into `deploy/deploy.sh`.

---

## 6. Migration Blueprint to Dedicated VPS (AWS / DigitalOcean)

When transferring the project to a dedicated server with custom domains, follow this exact procedure.

### Hardware Requirements
* **Provider**: AWS EC2 (t3.medium or t3.large) or DigitalOcean Droplet.
* **OS**: Ubuntu 22.04 LTS or 24.04 LTS.
* **Specs**: Minimum 2 vCPU, 4GB RAM, 50GB SSD.

### Step 1: DNS Configuration
Set up DNS A-Records with your domain registrar pointing to the static IP of your VPS:
* `api.yourdomain.com` -> `[VPS_IP_ADDRESS]`
* `app.yourdomain.com` -> `[VPS_IP_ADDRESS]`
* `seller.yourdomain.com` -> `[VPS_IP_ADDRESS]`
* `admin.yourdomain.com` -> `[VPS_IP_ADDRESS]`

### Step 2: Server Provisioning & Initialization
Connect to your fresh Ubuntu instance via SSH:

```bash
# Clone repository onto VPS
git clone https://github.com/Pratham-The-Warrior/Jan-Aushadhi.git ~/Jan-Aushadhi
cd ~/Jan-Aushadhi

# Run server setup script (installs Docker, Docker Compose, UFW, Fail2Ban)
chmod +x ./deploy/setup-server.sh
./deploy/setup-server.sh
```

### Step 3: Production Environment Configuration
Configure `deploy/.env.production` with real credentials:

```bash
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```

Ensure `DOMAIN=yourdomain.com` and all `CHANGE_ME` placeholders are replaced with strong generated passwords (e.g. `openssl rand -base64 48`). Note that `MEILI_MASTER_KEY` must be at least 16 characters.

### Step 4: One-Command Automated Deployment
Execute the self-validating, automated deployment script:

```bash
chmod +x deploy/deploy.sh deploy/init-ssl.sh
./deploy/deploy.sh
```

This single command will:
1. Run pre-flight checks validating `.env.production` secrets and format.
2. Generate domain-specific Nginx reverse proxy configuration.
3. Build all production container images using `esbuild` and Vite.
4. Launch PostgreSQL, Redis, and Meilisearch, and run versioned database migrations.
5. Bootstrap SSL certificates via Let's Encrypt (`deploy/init-ssl.sh`).
6. Launch all web and backend services.
7. Poll the backend readiness probe (`/api/v1/health/ready`) until HTTP 200 is confirmed.

---

## 7. Verification Checklist After Migration

| Component | Test Command / Action | Expected Result |
| :--- | :--- | :--- |
| **Backend Liveness** | `curl https://api.yourdomain.com/api/v1/health/live` | `{"status":"ok","uptime":...}` (HTTP 200) |
| **Backend Readiness** | `curl https://api.yourdomain.com/api/v1/health/ready` | `{"ready":true,"dependencies":{...}}` (HTTP 200) |
| **Full Health Diagnostics** | `curl https://api.yourdomain.com/api/v1/health` | Comprehensive component health report |
| **Database Connection** | Check logs via `docker compose -f docker-compose.prod.yml logs backend` | `PostgreSQL (PostGIS) Connected` |
| **Meilisearch Search** | `curl https://api.yourdomain.com/api/v1/search?query=Paracetamol` | Instant JSON response from Meilisearch index |
| **SSL Verification** | Inspect browser certificate on `https://app.yourdomain.com` | Valid SSL issued by Let's Encrypt |

