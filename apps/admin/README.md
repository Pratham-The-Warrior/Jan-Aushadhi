# 🛡️ Jan Aushadhi — Operations & Super Admin Console (`apps/admin`)

The central mission control platform for network administrators and operations teams. It provides platform-wide telemetry, Kendra registry management, Flipkart-style operator onboarding, user account auditing, global order oversight, and drug catalog synchronization stats.

---

## 🌟 Key Features

* **Command Center Telemetry**: Real-time aggregated platform metrics: total users, active stores, order count, platform GMV, total citizen savings, and 7/30-day growth trends.
* **Kendra Store Registry**: Searchable, paginated directory of all 19,000+ Kendras across India with status toggles (Active, Suspended, Closed).
* **Automated Operator Provisioning**: Super Admins onboard new pharmacists by providing their store code, name, and phone. The system provisions Firebase Auth accounts under `${pmbjk_code}@seller.janaushadhi.local` and binds them in PostgreSQL atomically.
* **User Directory & RBAC Management**: View customer profiles, order history, spend, and toggle roles (`CUSTOMER`, `STORE_OWNER`, `SUPER_ADMIN`) or account suspension.
* **Global Order Operations**: Monitor live feeds of orders nationwide with the capability to view audit trails or apply administrative status overrides.
* **Catalog Health & Match Rate Telemetry**: Tracks branded commercial medicines, generic replacements, and the percentage of commercial drugs mapped to low-cost generic salts.

---

## 🏗️ Directory Architecture

```
apps/admin/src/
├── assets/                 # Icons and platform branding
├── components/
│   └── layout/             # Modular enterprise layout architecture
│       ├── Sidebar.jsx     # Navigation links and administrator profile badge
│       ├── TopBar.jsx      # Live systems status indicator and header
│       ├── ConsoleLayout.jsx# Protected shell with animated page routing
│       ├── Loader.jsx      # Shield hydration spinner
│       └── AccessDenied.jsx# RBAC guard for non-admin accounts
├── pages/                  # Routed views
│   ├── Login.jsx           # Administrator authentication
│   ├── Dashboard.jsx       # Command Center overview metrics and live feed
│   ├── Stores.jsx          # Kendra store directory and operator assignment modal
│   ├── Users.jsx           # User management, role promotion, suspension
│   ├── Catalog.jsx         # Catalog stats, match rate percentage, database sync
│   ├── Orders.jsx          # Global order viewer and admin override
│   └── Settings.jsx        # Platform parameters and server telemetry
├── services/               # API clients (`admin.api.js`)
├── store/                  # State management
│   └── authStore.js        # Admin credentials and RBAC verification
├── App.jsx                 # Lightweight 34-line root coordinator
└── main.jsx                # React DOM entrypoint
```

---

## 💻 Available Scripts

Run commands from the monorepo root or within `apps/admin`:

```bash
# Run local Vite development server (http://localhost:5175)
npm run dev:admin

# Validate code syntax and styling via ESLint
npm run lint:admin

# Build optimized production bundle to dist/
npm run build:admin
```
