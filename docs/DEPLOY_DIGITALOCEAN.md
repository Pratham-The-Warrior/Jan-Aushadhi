# Deploy everything on one DigitalOcean server

Everything runs on one Droplet: the three sites, the API, PostgreSQL + PostGIS, Redis, **Meilisearch**,
and nginx with free HTTPS from Let's Encrypt.

The server never builds anything. GitHub Actions builds the four app images on every merge to `master`,
and the server downloads them. That is what lets the whole stack run on the smallest workable Droplet.

## What it costs

| Item | Plan | Cost |
|---|---|---|
| Server | DigitalOcean Basic Droplet, Regular, **2 GB RAM / 1 vCPU / 50 GB**, Bangalore (BLR1) | about **$12/month** |
| Domain | the cheapest you like, e.g. a `.in` | a few hundred ₹ the first year |
| HTTPS, CI, images, backups | Let's Encrypt, GitHub Actions + GHCR, nightly dumps kept on the server | free |
| Sign-in | Firebase Spark (free) plan | free (see the note on phone OTP below) |

Measured memory use:

| Part | Memory |
|---|---|
| PostgreSQL | ~250 MB |
| Meilisearch | ~560 MB idle, ~680 MB peak while indexing |
| API | ~250 MB, ~500 MB max |
| Redis | 64 MB cap |
| Sites + nginx | ~50 MB |

That fits in 2 GB, and setup also adds 2 GB of swap for peaks. Don't pick the $6 (1 GB) Droplet: it
can't hold PostgreSQL and Meilisearch together. When traffic grows, resize the Droplet in one click
(Droplet → Resize).

**Phone OTP:** Google and email sign-in are free on Firebase's Spark plan. Phone (SMS) sign-in on Spark
has a small daily allowance. For real traffic you'll need the Blaze plan, which charges per SMS.

---

## 1. Buy a domain
Any registrar works (Hostinger, GoDaddy, Namecheap, BigRock…). Below, `example.in` stands for your domain.

## 2. Add the site settings to GitHub
These are baked into the website images when CI builds them.

Go to the repo → **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret | Value |
|---|---|
| `VITE_API_URL` | `https://api.example.in` |
| `VITE_SITE_URL` | `https://app.example.in` |
| `VITE_FIREBASE_API_KEY` | from Firebase Console → Project settings → Your apps → Web app → Config |
| `VITE_FIREBASE_AUTH_DOMAIN` | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | 〃 |
| `VITE_FIREBASE_STORAGE_BUCKET` | 〃 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 〃 |
| `VITE_FIREBASE_APP_ID` | 〃 |

## 3. Build the images and make them public
1. **Build the images.** Go to **Actions**, open the latest *Jan Aushadhi CI/CD* run on `master`, and click
   **Re-run all jobs**. The images now include the secrets above. Wait for it to turn green (about 5 minutes).
2. **Make the four packages public.** Go to **your GitHub profile → Packages**. For each of
   `jan-aushadhi/backend`, `frontend`, `seller` and `admin`, open **Package settings** and set
   **Change visibility → Public**.
   - They contain no secrets: Firebase web keys are public by design.
   - Public packages download for free with no login.
   - Packages of a private repo would otherwise count against GitHub's free 500 MB.

Repeat the re-run whenever you change one of the secrets.

## 4. Create the Droplet
DigitalOcean → **Create → Droplets**:
- **Region:** Bangalore (BLR1)
- **Image:** Ubuntu 24.04 LTS
- **Size:** Basic → Regular → **$12/mo (2 GB / 1 CPU)**
- **Authentication:** SSH key (add yours). This is safer than a password.
- **Add-ons:** none needed. Paid backups are optional; the free nightly dump below covers the database.

Note the Droplet's IP address.

## 5. Point the domain at the Droplet
At your registrar's DNS settings, add four **A records**, each pointing to the Droplet IP:

| Name | Type | Value |
|---|---|---|
| `app` | A | `<droplet IP>` |
| `seller` | A | `<droplet IP>` |
| `admin` | A | `<droplet IP>` |
| `api` | A | `<droplet IP>` |

DNS can take from a few minutes to an hour. Check with `ping app.example.in`.

## 6. Set up the server (one time)
```bash
ssh root@<droplet IP>
git clone https://github.com/Pratham-The-Warrior/Jan-Aushadhi.git
cd Jan-Aushadhi
./deploy/setup-server.sh
```
If the repository is private, `git clone` asks for a username and a GitHub token
(GitHub → Settings → Developer settings → Personal access tokens).

`setup-server.sh` sets up the server and then stops so you can fill in the settings. It:
- installs Docker
- adds 2 GB of swap
- turns on the firewall (SSH, HTTP and HTTPS only) and fail2ban
- schedules the nightly backup
- creates `deploy/.env.production`

It then ends with an error saying the file still contains `CHANGE_ME` values. That's expected: fill them in next.

## 7. Fill in the settings
```bash
nano deploy/.env.production
```

| Setting | Value |
|---|---|
| `DOMAIN` | `example.in` |
| `POSTGRES_PASSWORD` | output of `openssl rand -hex 32` |
| `REDIS_PASSWORD` | output of `openssl rand -hex 24` |
| `MEILI_MASTER_KEY` | output of `openssl rand -hex 32` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase Console → Project settings → Service accounts → Generate new private key; paste the JSON on one line |
| `CORS_ORIGIN` | `https://app.example.in,https://seller.example.in,https://admin.example.in` |
| `VITE_*` lines | can stay empty: the published images already contain them |

Leave `IMAGE_REGISTRY` and `IMAGE_TAG` as they are. Remove every `CHANGE_ME`; the deploy script refuses to run while one is left.

## 8. Deploy
```bash
./deploy/deploy.sh
```
On the first run it:
1. downloads the four images
2. starts PostgreSQL, Redis and Meilisearch
3. creates the database tables
4. **loads the medicine catalogue and all 19,294 Kendras** (once, about 1–2 minutes)
5. gets the HTTPS certificates
6. starts everything and waits until the API reports healthy

When the API starts, it builds the Meilisearch index by itself (under a minute).

Check it at **https://api.example.in/api/v1/health/ready**. It should show `database`, `cache` and `search` all
`healthy`; `search` healthy means Meilisearch is live.

## 9. Firebase
In Firebase Console → **Authentication**:
1. Under **Sign-in method**, enable **Phone**, **Google** and **Email/Password**.
   Kendra operators log in with their store code, which uses Email/Password.
2. Under **Settings → Authorized domains**, add `app.example.in`, `seller.example.in` and `admin.example.in`.

## 10. Make yourself admin
Sign in once on https://app.example.in, then on the server:
```bash
cd ~/Jan-Aushadhi && set -a && source deploy/.env.production && set +a
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "UPDATE users SET role='SUPER_ADMIN' WHERE email='you@example.com';"
```
If you signed in with your phone, use `WHERE phone='+91XXXXXXXXXX'` instead.

Then open https://admin.example.in. To switch on online ordering, assign an operator to a Kendra under
**Stores → Assign operator**.

## 11. Automatic deploys (optional)
Add these repository secrets:
- `DEPLOY_HOST`: the Droplet IP
- `DEPLOY_USER`: `root`
- `DEPLOY_SSH_KEY`: a private key whose public half is in the server's `~/.ssh/authorized_keys`

From then on, every merge to `master` builds new images and deploys them.

## 12. Turn off the old hosting
Once everything works on the new domain, delete the Render service, the Supabase project, the Upstash
database and the three Vercel projects. Do it in that order and after checking the new site, so nothing
is lost while you switch.

---

## Day to day
- **Redeploy:** `./deploy/deploy.sh`. This happens automatically if step 11 is set up.
- **Roll back:** set `IMAGE_TAG=<older commit SHA>` in `deploy/.env.production` and run `./deploy/deploy.sh`.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f backend`
- **Backups:**
  - Nightly at 02:30 into `/opt/backups`, keeping 7 days.
  - Run one now with `./deploy/backup.sh`.
  - `deploy/backup.sh` explains how to restore.
  - Copy one to your computer now and then: `scp root@<IP>:/opt/backups/<file> .`
    A backup on the server is lost if the server is.
- **Memory:** `free -h` and `docker stats --no-stream`.
- **Reload the catalogue** after updating the CSVs:
  `docker compose -f docker-compose.prod.yml run --rm migrator node dist/scripts/etl_pipeline.js`.
  It upserts, so product ids stay the same.
