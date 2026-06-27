# Jan Aushadhi Platform - Deployment & Migration Blueprint

## 1. Executive Summary
This document provides a complete record of the deployment infrastructure, linked cloud accounts, current live endpoints, and technical fixes for the Jan Aushadhi platform. It serves as an exact reference manual for migrating the entire stack to dedicated infrastructure (AWS EC2 or DigitalOcean) when production resources and custom domains are provisioned.

---

## 2. Linked Accounts & Deployment Services Summary

Below is the complete reference table of all cloud platforms, account links, repositories, and active live endpoints currently power-hosting the staging environment:

| Component | Platform / Provider | Linked Account / Identifier | Live URL / Connection String | Deployment Method |
| :--- | :--- | :--- | :--- | :--- |
| **Code Repository** | GitHub | `Pratham-The-Warrior/Jan-Aushadhi` (Branch: `master`) | `https://github.com/Pratham-The-Warrior/Jan-Aushadhi` | Git Version Control |
| **Backend API** | Render | Account connected to `Pratham-The-Warrior` repo | `https://jan-aushadhi-090l.onrender.com` | Automated GitHub Webhook Build |
| **Patient Frontend** | Vercel | Account connected to `Pratham-The-Warrior` repo | `https://jan-aushadhi-frontend.vercel.app` | Automated Vercel GitHub Integration |
| **Seller Central** | Vercel / Staging Host | Connected to frontend workspace build | Accessible via subpaths / Vite build | Static Web Hosting |
| **Admin Console** | Vercel / Staging Host | Connected to frontend workspace build | Accessible via subpaths / Vite build | Static Web Hosting |
| **Database (PostGIS)**| Supabase | Tenant/Project Ref: `bhwhmcukranhguctwajh` (Region: `ap-northeast-1`) | `aws-1-ap-northeast-1.pooler.supabase.com:6543` | Managed Cloud PostgreSQL |
| **Cache (Redis)** | Upstash | Managed Serverless Redis Instance | Upstash Redis Cloud Host | Managed Serverless Redis |

---

## 3. Current Architecture & Infrastructure (Free-Tier Demonstration)

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
* **Database Schemas Active**: `users`, `branded_meds`, `generic_meds`, `stores`, `requirements`, `store_inventory`, `order_status_log`.
* **Automated Cloud Seeding**: Built-in background engine (`backend/src/shared/infra/autoseed.ts`) checks database tables on container boot. If empty, it ingests `A_Z_medicines_dataset_of_India.csv`, `Product List.csv`, and `kendra_stores.csv` directly into Supabase.
* **Search Engine Fallback**: Operating via direct SQL `ILIKE` pattern matching on PostGIS data tables while running in single-container mode without a dedicated Meilisearch instance.
* **Auth Resilience**: Configured with fallback mechanisms (`firebase.js` and `authStore.js`) to support guest mode and local session states when production Firebase keys are unpopulated.

---

## 4. Deployment Troubleshooting & Engineering Modifications

During initial deployment, several technical barriers were resolved and locked into the repository:

1. **IPv6 vs IPv4 Routing (Supabase Connection)**:
   * **Issue**: Render containers run on IPv4 infrastructure and failed to resolve direct Supabase IPv6 endpoints (`db.xxx.supabase.co`), throwing `ENETUNREACH` network errors.
   * **Resolution**: Reconfigured connection strings to utilize Supabase's IPv4 Pooler host (`aws-1-ap-northeast-1.pooler.supabase.com:6543`) with `ssl: { rejectUnauthorized: false }` enabled in `backend/src/shared/infra/database.ts`.
2. **Docker Build Context & CSV Ingestion**:
   * **Issue**: Docker build processes failed because `.dockerignore` and `.gitignore` excluded `.csv` files. Furthermore, filenames containing spaces and `@` symbols broke standard `COPY` instructions.
   * **Resolution**: Un-ignored data files, updated repository tracking, and refactored `Dockerfile` `COPY` steps to use JSON array formatting (`COPY ["Product List_3_4_2026 @ 16_33_44.csv", "/app/"]`).
3. **Frontend API URL Sanitization**:
   * **Issue**: Deployment environments occasionally injected trailing slashes or duplicate subpaths into `VITE_API_URL`.
   * **Resolution**: Added string sanitization in `apps/admin/src/services/api-client.js` and counterpart frontend files to automatically normalize API endpoints prior to making HTTP calls.

---

## 5. Migration Blueprint to Dedicated VPS (AWS / DigitalOcean)

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
Connect to your fresh Ubuntu instance via SSH and execute the automated setup script included in the codebase:

```bash
# Clone repository onto VPS
git clone https://github.com/Pratham-The-Warrior/Jan-Aushadhi.git /opt/jan-aushadhi
cd /opt/jan-aushadhi

# Grant execution permissions and run setup script
chmod +x ./deploy/setup-server.sh
./deploy/setup-server.sh
```
*The `setup-server.sh` script automatically installs Docker Engine, Docker Compose, Nginx, and Certbot for SSL generation.*

### Step 3: Production Environment File Configuration
Create the production environment file at `/opt/jan-aushadhi/.env.production` containing full production keys:

```env
NODE_ENV=production
PORT=5000

# Database & Cache
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/jan_aushadhi?sslmode=require
REDIS_URL=redis://:[PASSWORD]@[REDIS_HOST]:6379

# Search Engine (Dedicated Container)
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_KEY=your_secure_production_master_key

# External Integrations
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-client-email@gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 4: Launch Full Production Container Stack
Deploy the multi-container stack via Docker Compose:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
*This starts the Fastify API backend, dedicated Meilisearch engine, Redis cache instance, and Nginx reverse proxy simultaneously.*

### Step 5: SSL Certificate Provisioning
Issue SSL certificates using Certbot for secure HTTPS communication:

```bash
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com -d seller.yourdomain.com -d admin.yourdomain.com
```

### Step 6: Automated CI/CD Setup (GitHub Actions)
To enable automated deployments whenever changes are pushed to the `master` branch, configure the following Secrets in your GitHub Repository Settings (`Settings -> Secrets and variables -> Actions`):
* `DEPLOY_HOST`: `[VPS_IP_ADDRESS]`
* `DEPLOY_USER`: `ubuntu` (or your SSH username)
* `DEPLOY_SSH_KEY`: Content of your private SSH key matching the public key stored in `~/.ssh/authorized_keys` on the VPS.

---

## 6. Verification Checklist After Migration

| Component | Test Command / Action | Expected Result |
| :--- | :--- | :--- |
| **Backend API Health** | `curl https://api.yourdomain.com/health` | `{"status":"ok"}` |
| **Database Connection** | Check logs via `docker-compose -f docker-compose.prod.yml logs api` | `PostgreSQL (PostGIS) Connected` |
| **Meilisearch Indexing**| `curl https://api.yourdomain.com/api/v1/search?query=Paracetamol` | Instant JSON response from Meilisearch index |
| **SSL Verification** | Inspect browser certificate on `https://app.yourdomain.com` | Valid SSL issued by Let's Encrypt |
